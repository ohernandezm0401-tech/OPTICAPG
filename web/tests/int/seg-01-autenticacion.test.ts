// SEG-01 (T07) — Autenticación contra PostgreSQL real (I + S).
// - AC-SEG-01-2: cinco contraseñas erróneas bloquean 15 min, queda el evento
//   y la respuesta no distingue un usuario inexistente.
// - AC-SEG-01-3: una sesión revocada deja de ser válida en la consulta
//   siguiente (la petición HTTP está en la E2E).
// - AC-SEG-01-5: el hash guardado no es la contraseña y la respuesta no la trae.
// - S: fuerza bruta, enumeración, fijación de sesión, rotación y cierre total.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { obtenerAuthPort } from '../../lib/auth/authjs';
import { MENSAJE_CREDENCIALES_INVALIDAS, cuerpoHttpInicio, respuestaPublica } from '../../lib/auth/puerto';
import { cerrarPool, obtenerPool } from '../../db';
import { asignarMembresia, crearSede, crearTenant, crearUsuario } from '../../db/nucleo';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

const nitUnico = () => `900.${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 10)}`;
const correoUnico = (prefijo: string) =>
  `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.invalid`;

const CLAVE = 'una-frase-larga-local';
const AHORA = new Date('2026-10-03T15:00:00.000Z');

async function preparar(rol: 'admin' | 'optometra' | 'asesor' = 'admin') {
  const tenant = await crearTenant({ razon_social: 'Óptica Auth Sintética S.A.S.', nit: nitUnico() });
  const sede = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Auth', ciudad: 'Bogotá' });
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
  return { tenant, sede, usuario, correo, port };
}

describe('SEG-01 autenticación en PostgreSQL real', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error(
        'Falta DATABASE_URL_TEST. Local: levanta PostgreSQL y exporta la variable (ver web/.env.example).',
      );
    }
    const { obtenerDb } = await import('../../db');
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    delete process.env.AUTH_LIMITE_INTENTOS_IP;
    await cerrarPool();
  });

  it('I: guarda Argon2id, abre sesión y no devuelve la contraseña', async () => {
    const { usuario, correo, port } = await preparar();
    const resultado = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    expect(resultado.ok).toBe(true);
    expect(JSON.stringify(resultado)).not.toContain(CLAVE);
    expect(resultado.sesion && Object.keys(resultado.sesion).sort()).toEqual(
      ['correo', 'expiraEn', 'id', 'rol', 'sedeId', 'sedes', 'tenantId', 'usuarioId'].sort(),
    );
    const fila = await obtenerPool().query<{ hash_password: string }>('select hash_password from usuarios where id = $1', [
      usuario.id,
    ]);
    expect(fila.rows[0].hash_password.startsWith('$argon2id$')).toBe(true);
    expect(fila.rows[0].hash_password).not.toBe(CLAVE);
  });

  it('AC-SEG-01-2 I/S: cinco fallos bloquean 15 min, hay evento y no se enumera', async () => {
    const { usuario, correo, port } = await preparar();
    const desconocido = await port.iniciarSesion({
      correo: correoUnico('nadie'),
      contrasena: 'clave-que-no-existe',
      ahora: AHORA,
    });
    let conocido = desconocido;
    for (let i = 0; i < 5; i += 1) {
      conocido = await port.iniciarSesion({ correo, contrasena: 'clave-que-no-existe', ahora: AHORA });
    }
    expect(respuestaPublica(desconocido)).toEqual(respuestaPublica(conocido));
    expect(cuerpoHttpInicio(desconocido)).toEqual(cuerpoHttpInicio(conocido));
    expect(cuerpoHttpInicio(conocido)).toEqual({ error: MENSAJE_CREDENCIALES_INVALIDAS });
    expect(JSON.stringify(cuerpoHttpInicio(conocido))).not.toContain('clave-que-no-existe');

    const estado = await obtenerPool().query<{
      estado: string;
      nivel_bloqueo: number;
      bloqueado_hasta: Date;
    }>('select estado, nivel_bloqueo, bloqueado_hasta from usuarios where id = $1', [usuario.id]);
    expect(estado.rows[0].estado).toBe('bloqueado');
    expect(estado.rows[0].nivel_bloqueo).toBe(1);
    expect(new Date(estado.rows[0].bloqueado_hasta).getTime() - AHORA.getTime()).toBe(15 * 60_000);

    const eventos = await obtenerPool().query<{ tipo: string }>(
      `select tipo from eventos_autenticacion where usuario_id = $1 and tipo = 'cuenta_bloqueada'`,
      [usuario.id],
    );
    expect(eventos.rows).toHaveLength(1);

    const conClaveBuena = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    expect(conClaveBuena.ok).toBe(false);
    expect(respuestaPublica(conClaveBuena)).toEqual(respuestaPublica(desconocido));
  });

  it('S: el bloqueo siguiente dura 30 min', async () => {
    const { usuario, correo, port } = await preparar();
    for (let i = 0; i < 5; i += 1) {
      await port.iniciarSesion({ correo, contrasena: 'clave-que-no-existe', ahora: AHORA });
    }
    await obtenerPool().query(`update usuarios set bloqueado_hasta = $2 where id = $1`, [
      usuario.id,
      new Date(AHORA.getTime() - 60_000).toISOString(),
    ]);
    const despues = new Date(AHORA.getTime() + 60_000);
    for (let i = 0; i < 5; i += 1) {
      await port.iniciarSesion({ correo, contrasena: 'clave-que-no-existe', ahora: despues });
    }
    const estado = await obtenerPool().query<{ nivel_bloqueo: number; bloqueado_hasta: Date }>(
      'select nivel_bloqueo, bloqueado_hasta from usuarios where id = $1',
      [usuario.id],
    );
    expect(estado.rows[0].nivel_bloqueo).toBe(2);
    expect(new Date(estado.rows[0].bloqueado_hasta).getTime() - despues.getTime()).toBe(30 * 60_000);
  });

  it('AC-SEG-01-3 I: la sesión revocada no sirve en la consulta siguiente', async () => {
    const { correo, port } = await preparar();
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const sesionId = inicio.sesion?.id;
    expect(sesionId).toBeTruthy();
    expect(await port.sesionVigente(sesionId!, AHORA)).toBe(true);
    expect(await port.revocarSesion(sesionId!, AHORA)).toBe(true);
    expect(await port.sesionVigente(sesionId!, AHORA)).toBe(false);
  });

  it('S: el cliente no fija el id; rotar invalida la anterior; cerrar todas también', async () => {
    const { usuario, correo, port } = await preparar();
    const plantada = '11111111-1111-4111-8111-111111111111';
    const inicio = await port.iniciarSesion({
      correo,
      contrasena: CLAVE,
      ahora: AHORA,
      sesionId: plantada,
    } as never);
    expect(inicio.sesion?.id).not.toBe(plantada);
    const existe = await obtenerPool().query('select 1 from sesiones where id = $1', [plantada]);
    expect(existe.rowCount).toBe(0);

    const rotada = await port.rotarSesion(inicio.sesion!.id, {}, AHORA);
    expect(rotada).toBeTruthy();
    expect(rotada).not.toBe(inicio.sesion!.id);
    expect(await port.sesionVigente(inicio.sesion!.id, AHORA)).toBe(false);
    expect(await port.sesionVigente(rotada!, AHORA)).toBe(true);

    const segunda = await port.iniciarSesion({
      correo,
      contrasena: CLAVE,
      ahora: new Date(AHORA.getTime() + 1000),
    });
    const cerradas = await port.revocarTodas(usuario.id, AHORA);
    expect(cerradas).toBeGreaterThanOrEqual(2);
    expect(await port.sesionVigente(rotada!, AHORA)).toBe(false);
    expect(await port.sesionVigente(segunda.sesion!.id, AHORA)).toBe(false);
  });

  it('I: la inactividad de un rol clínico vence a los 15 min', async () => {
    const { correo, port } = await preparar('optometra');
    const inicio = await port.iniciarSesion({ correo, contrasena: CLAVE, ahora: AHORA });
    const dentro = new Date(AHORA.getTime() + 14 * 60_000);
    const fuera = new Date(AHORA.getTime() + 16 * 60_000);
    expect(await port.sesionVigente(inicio.sesion!.id, fuera)).toBe(false);
    expect(new Date(inicio.sesion!.expiraEn).getTime() - AHORA.getTime()).toBe(15 * 60_000);
    expect(dentro.getTime()).toBeLessThan(new Date(inicio.sesion!.expiraEn).getTime());
  });

  it('S: el límite por IP, si está configurado, corta sin decir si el correo existe', async () => {
    process.env.AUTH_LIMITE_INTENTOS_IP = '2';
    const { port } = await preparar();
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const correo = correoUnico('ip');
    await port.iniciarSesion({ correo, contrasena: 'clave-que-no-existe', direccionIp: ip, ahora: AHORA });
    await port.iniciarSesion({ correo, contrasena: 'clave-que-no-existe', direccionIp: ip, ahora: AHORA });
    const tercero = await port.iniciarSesion({
      correo,
      contrasena: 'clave-que-no-existe',
      direccionIp: ip,
      ahora: AHORA,
    });
    delete process.env.AUTH_LIMITE_INTENTOS_IP;
    expect(cuerpoHttpInicio(tercero)).toEqual({ error: MENSAJE_CREDENCIALES_INVALIDAS });
    const eventos = await obtenerPool().query(
      `select 1 from eventos_autenticacion where direccion_ip = $1 and tipo = 'limite_ip'`,
      [ip],
    );
    expect(eventos.rowCount).toBe(1);
  });

  it('I: no reutiliza una de las últimas contraseñas', async () => {
    const { usuario, tenant, port } = await preparar();
    const repetida = await port.establecerContrasena({
      usuarioId: usuario.id,
      tenantId: tenant.id,
      contrasena: CLAVE,
      ahora: AHORA,
    });
    expect(repetida).toEqual({
      ok: false,
      mensaje: 'No puedes reutilizar una de tus últimas 5 contraseñas.',
    });
    const nueva = await port.establecerContrasena({
      usuarioId: usuario.id,
      tenantId: tenant.id,
      contrasena: 'otra-frase-distinta-2',
      ahora: AHORA,
    });
    expect(nueva.ok).toBe(true);
    const otraVez = await port.establecerContrasena({
      usuarioId: usuario.id,
      tenantId: tenant.id,
      contrasena: CLAVE,
      ahora: AHORA,
    });
    expect(otraVez.ok).toBe(false);
  });

  it('R: optisaas_app no lee otro tenant y sí puede buscar por correo', async () => {
    const { usuario, correo, tenant } = await preparar();
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('SET ROLE optisaas_app');
      await cliente.query('BEGIN');
      const tabla = await cliente.query('select id from usuarios where id = $1', [usuario.id]);
      expect(tabla.rows).toHaveLength(0);
      const porCorreo = await cliente.query('select id from buscar_usuarios_por_correo($1)', [correo]);
      expect(porCorreo.rows.map((fila) => fila.id)).toContain(usuario.id);
      const ajenos = await cliente.query('select id from eventos_autenticacion where usuario_id = $1', [
        usuario.id,
      ]);
      expect(ajenos.rows).toHaveLength(0);
      await cliente.query(`SET LOCAL app.tenant_id = '${tenant.id}'`);
      const propios = await cliente.query('select id from eventos_autenticacion where usuario_id = $1', [
        usuario.id,
      ]);
      expect(propios.rows.length).toBeGreaterThan(0);
      await cliente.query('ROLLBACK');
    } finally {
      await cliente.query('RESET ROLE');
      cliente.release();
    }
  });
});
