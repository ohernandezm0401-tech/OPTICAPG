// SEG-01 (T08) — MFA contra PostgreSQL real (I + S).
// AC-SEG-01-1: un optometra sin factor no abre sesión hasta enrolarlo.
// AC-SEG-01-4: firmar con MFA de más de 10 min exige reautenticación.
// La firma clínica (SEG-08) todavía no existe: se prueba la función reutilizable.
// S: fuerza bruta del segundo factor, no enumeración y pase de un solo uso.
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { obtenerAuthPort } from '../../lib/auth/authjs';
import { codigoTotpDePrueba } from '../../lib/auth/mfa/flujo';
import { MENSAJE_MFA_INVALIDO } from '../../lib/auth/puerto';
import { cerrarPool, obtenerPool } from '../../db';
import { asignarMembresia, crearSede, crearTenant, crearUsuario } from '../../db/nucleo';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
process.env.APP_MASTER_KEY ??= randomBytes(32).toString('base64');
process.env.APP_MASTER_KEY_VERSION ??= '1';
const CLAVE = 'una-frase-larga-local';
const AHORA = new Date('2026-10-03T18:00:00.000Z');

const nitUnico = () => `900.${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 10)}`;
const correoUnico = (prefijo: string) =>
  `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.invalid`;

async function preparar(rol: 'admin' | 'optometra' | 'asesor' | 'oftalmologo' = 'optometra') {
  const tenant = await crearTenant({ razon_social: 'Óptica MFA Sintética S.A.S.', nit: nitUnico() });
  const sede = await crearSede({ tenant_id: tenant.id, nombre: 'Sede MFA', ciudad: 'Bogotá' });
  const correo = correoUnico(rol);
  const usuario = await crearUsuario({ tenant_id: tenant.id, email: correo, estado: 'activo' });
  await asignarMembresia({ tenant_id: tenant.id, usuario_id: usuario.id, sede_id: sede.id, rol });
  const port = obtenerAuthPort();
  const alta = await port.establecerContrasena({
    usuarioId: usuario.id,
    tenantId: tenant.id,
    contrasena: CLAVE,
    ahora: AHORA,
  });
  expect(alta.ok).toBe(true);
  return { tenant, usuario, correo, port };
}

describe('SEG-01 MFA en PostgreSQL real', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error('Falta DATABASE_URL_TEST.');
    }
    const { obtenerDb } = await import('../../db');
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-SEG-01-1 I: el optometra sin MFA no completa el login y sí tras enrolar', async () => {
    const { usuario, correo, port } = await preparar('optometra');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    expect(inicio.ok).toBe(false);
    expect(inicio.pendiente).toBe('enrolar');
    expect(inicio.sesion).toBeUndefined();
    expect(JSON.stringify(inicio)).not.toContain(CLAVE);
    const abiertas = await obtenerPool().query('select 1 from sesiones where usuario_id = $1', [usuario.id]);
    expect(abiertas.rowCount).toBe(0);

    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    expect(alta.codigos).toHaveLength(10);
    const repetida = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(repetida.ok && repetida.codigos).toEqual([]);

    const confirmado = await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    expect(confirmado.ok).toBe(true);
    expect(confirmado.sesion?.id).toBeTruthy();
    expect(confirmado.sesion?.id).not.toBe(inicio.ticket);
    expect(confirmado.pase).toBeTruthy();
    const eventos = await obtenerPool().query(
      `select tipo from eventos_autenticacion where usuario_id = $1 and tipo = 'mfa_alta'`,
      [usuario.id],
    );
    expect(eventos.rowCount).toBe(1);
    const factor = await obtenerPool().query<{ secreto_protegido: string }>(
      'select secreto_protegido from factores_totp where usuario_id = $1',
      [usuario.id],
    );
    expect(factor.rows[0].secreto_protegido).not.toBe(alta.secreto);
    expect(factor.rows[0].secreto_protegido.startsWith('optisaas1.')).toBe(true);
    expect(factor.rows[0].secreto_protegido).not.toContain(alta.secreto);

    const despues = new Date(AHORA.getTime() + 31_000);
    const segundo = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: despues });
    expect(segundo.pendiente).toBe('verificar');
    expect(segundo.sesion).toBeUndefined();
    const conCodigo = await port.confirmarSegundoFactor({
      ticket: segundo.ticket!,
      codigo: alta.codigos[0],
      ahora: despues,
    });
    expect(conCodigo.ok).toBe(true);
    const reuso = await port.iniciarSesion({
      correo,
      contrasena: CLAVE,
      ahora: new Date(despues.getTime() + 31_000),
    });
    const otraVez = await port.confirmarSegundoFactor({
      ticket: reuso.ticket!,
      codigo: alta.codigos[0],
      ahora: new Date(despues.getTime() + 31_000),
    });
    expect(otraVez.ok).toBe(false);
    expect(otraVez.mensaje).toBe(MENSAJE_MFA_INVALIDO);
  });

  it('AC-SEG-01-4 I: más de 10 min exige reautenticación y la sesión no cambia de id', async () => {
    const { correo, port } = await preparar('optometra');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    const confirmado = await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    const sesionId = confirmado.sesion!.id;
    const limite = new Date(AHORA.getTime() + 10 * 60_000);
    const vencida = new Date(limite.getTime() + 1);
    expect(await port.exigirMfaParaFirmarAtencion(sesionId, limite)).toEqual({ ok: true });
    expect(await port.exigirMfaParaFirmarAtencion(sesionId, vencida)).toEqual({
      ok: false,
      requiereReautenticacion: true,
    });
    const reautenticada = await port.reautenticarMfa({
      sesionId,
      codigo: codigoTotpDePrueba(alta.secreto, vencida),
      ahora: vencida,
    });
    expect(reautenticada).toEqual({ ok: true });
    expect(await port.exigirMfaParaFirmarAtencion(sesionId, vencida)).toEqual({ ok: true });
    const fila = await obtenerPool().query<{ id: string }>('select id from sesiones where id = $1', [sesionId]);
    expect(fila.rows[0].id).toBe(sesionId);
  });

  it('S: cinco códigos malos bloquean 15 min y un ticket ajeno responde igual', async () => {
    const { usuario, correo, port } = await preparar('admin');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    const desconocido = await port.confirmarSegundoFactor({
      ticket: randomUUID(),
      codigo: '000000',
      ahora: AHORA,
    });
    let conocido = desconocido;
    for (let i = 0; i < 5; i += 1) {
      conocido = await port.confirmarSegundoFactor({
        ticket: inicio.ticket!,
        codigo: '000000',
        ahora: AHORA,
      });
    }
    expect(conocido).toEqual(desconocido);
    expect(conocido.mensaje).toBe(MENSAJE_MFA_INVALIDO);
    expect(JSON.stringify(conocido)).not.toMatch(/inexistente|ticket/i);
    const estado = await obtenerPool().query<{ estado: string; bloqueado_hasta: Date }>(
      'select estado, bloqueado_hasta from usuarios where id = $1',
      [usuario.id],
    );
    expect(estado.rows[0].estado).toBe('bloqueado');
    expect(new Date(estado.rows[0].bloqueado_hasta).getTime() - AHORA.getTime()).toBe(15 * 60_000);
    const eventos = await obtenerPool().query(
      `select tipo from eventos_autenticacion where usuario_id = $1 and tipo in ('mfa_fallo', 'cuenta_bloqueada')`,
      [usuario.id],
    );
    expect(eventos.rows.map((fila) => fila.tipo)).toContain('cuenta_bloqueada');
    const conBueno = await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    expect(conBueno).toEqual(desconocido);

    const primerPase = confirmadoPaseInexistente(port);
    expect(await primerPase).toBeNull();
  });

  it('S: el pase no se reutiliza y no fija la sesión', async () => {
    const { correo, port } = await preparar('optometra');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    const confirmado = await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    const primero = await port.canjearPase(confirmado.pase!, AHORA);
    expect(primero?.id).toBe(confirmado.sesion?.id);
    expect(primero?.id).not.toBe(inicio.ticket);
    expect(await port.canjearPase(confirmado.pase!, AHORA)).toBeNull();
    expect(await port.canjearPase('pase-inventado-por-el-cliente', AHORA)).toBeNull();
  });

  it('I: el asesor entra sin MFA hasta que el tenant lo exige; el oftalmólogo no', async () => {
    const libre = await preparar('asesor');
    const sinBandera = await libre.port.iniciarSesion({ correo: libre.correo, contrasena: CLAVE, ahora: AHORA });
    expect(sinBandera.ok).toBe(true);
    expect(sinBandera.pendiente).toBeUndefined();
    expect(await libre.port.exigirMfaParaFirmarAtencion(sinBandera.sesion!.id, AHORA)).toEqual({
      ok: false,
      requiereReautenticacion: true,
    });

    const obligado = await preparar('asesor');
    await obtenerPool().query(
      `insert into parametros_tenant (tenant_id, clave, valor, vigente_desde, creado_en, actualizado_en)
       values ($1, 'mfa_obligatoria_asesor', 'true'::jsonb, $2, $2, $2)`,
      [obligado.tenant.id, AHORA.toISOString()],
    );
    const conBandera = await obligado.port.iniciarSesion({
      correo: obligado.correo,
      contrasena: CLAVE,
      ahora: AHORA,
    });
    expect(conBandera.pendiente).toBe('enrolar');
    expect(conBandera.sesion).toBeUndefined();

    const clinica = await preparar('oftalmologo');
    const oftalmologo = await clinica.port.iniciarSesion({
      correo: clinica.correo,
      contrasena: CLAVE,
      ahora: AHORA,
    });
    expect(oftalmologo.pendiente).toBe('enrolar');
  });

  it('R: optisaas_app no lee el factor de otro tenant', async () => {
    const { usuario, tenant, correo, port } = await preparar('optometra');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('SET ROLE optisaas_app');
      await cliente.query('BEGIN');
      const ajeno = await cliente.query('select id from factores_totp where usuario_id = $1', [usuario.id]);
      expect(ajeno.rows).toHaveLength(0);
      await cliente.query(`SET LOCAL app.tenant_id = '${tenant.id}'`);
      const propio = await cliente.query('select id from factores_totp where usuario_id = $1', [usuario.id]);
      expect(propio.rows.length).toBe(1);
      await cliente.query('ROLLBACK');
    } finally {
      await cliente.query('RESET ROLE');
      cliente.release();
    }
  });

  it('I: dar de baja el TOTP deja el evento mfa_baja', async () => {
    const { usuario, correo, port } = await preparar('admin');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const alta = await port.prepararEnrolamientoTotp(inicio.ticket!, AHORA);
    expect(alta.ok).toBe(true);
    if (!alta.ok) return;
    const confirmado = await port.confirmarSegundoFactor({
      ticket: inicio.ticket!,
      codigo: codigoTotpDePrueba(alta.secreto, AHORA),
      ahora: AHORA,
    });
    const despues = new Date(AHORA.getTime() + 31_000);
    const baja = await port.darDeBajaTotp({
      sesionId: confirmado.sesion!.id,
      codigo: codigoTotpDePrueba(alta.secreto, despues),
      ahora: despues,
    });
    expect(baja).toEqual({ ok: true });
    const otra = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: despues });
    expect(otra.pendiente).toBe('enrolar');
    const eventos = await obtenerPool().query(
      `select tipo from eventos_autenticacion where usuario_id = $1 and tipo = 'mfa_baja'`,
      [usuario.id],
    );
    expect(eventos.rowCount).toBe(1);
  });
});

function confirmadoPaseInexistente(port: ReturnType<typeof obtenerAuthPort>) {
  return port.canjearPase('no-es-un-pase', AHORA);
}
