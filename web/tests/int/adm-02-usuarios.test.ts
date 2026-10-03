// ADM-02 (T17) — Usuarios, rol por sede y perfil contra PostgreSQL real.
// AC-ADM-02-1 a 02-4 (I, R, S). Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { ErrorFirma, firmarProfesional, type ContextoFirma } from '../../db/firma';
import { codigoHttpFirma } from '../../dominio/firma';
import {
  ErrorUsuario,
  aceptarInvitacion,
  cambiarRol,
  desactivarUsuario,
  guardarPerfilManual,
  invitarUsuario,
  listarFirmasHistoricas,
  type ContextoUsuario,
} from '../../db/usuarios-adm';
import { hashTokenInvitacion } from '../../dominio/usuarios-adm';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { iniciarSesion } from '../../lib/auth/servicio';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';
import { fijarCorreoPortParaPruebas, type CorreoPort, type MensajeInvitacion } from '../../lib/correo/puerto';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const CLAVE = 'Clave-Sintetica-17';

const TENANT = 'e1700000-0000-4000-8000-000000000017';
const OTRO = 'e1700000-0000-4000-8000-000000000099';
const SEDE = 'e1700000-0000-4000-8000-0000000000a1';
const SEDE_B = 'e1700000-0000-4000-8000-0000000000b1';
const ADMIN = 'e1700000-0000-4000-8000-0000000000c1';
const ADMIN_2 = 'e1700000-0000-4000-8000-0000000000c2';
const OPTO = 'e1700000-0000-4000-8000-0000000000d1';
const ASESOR = 'e1700000-0000-4000-8000-0000000000d2';
const SESION_ADMIN = 'e1700000-0000-4000-8000-0000000000e1';
const SESION_OPTO = 'e1700000-0000-4000-8000-0000000000e2';
const SESION_ADMIN_2 = 'e1700000-0000-4000-8000-0000000000e3';
const DOC = 'e1700000-0000-4000-8000-0000000000f1';
const FIRMA = 'e1700000-0000-4000-8000-0000000000f2';

const bandeja: MensajeInvitacion[] = [];
const correo: CorreoPort = {
  async enviarInvitacion(mensaje) {
    bandeja.push(mensaje);
  },
};

function ctx(parcial: Partial<ContextoUsuario> & Pick<ContextoUsuario, 'rol' | 'usuario_id'>): ContextoUsuario {
  return {
    tenant_id: TENANT,
    sede_id: SEDE,
    sedes: [SEDE],
    sesion_id: SESION_ADMIN,
    ...parcial,
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T17', '900.000.117-1', 'activo'),
        ($2, 'Óptica Sintética T17 B', '900.000.117-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T17', 'Bogotá'),
        ($2, $4, 'Sede T17 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_B, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $5, 'admin.t17@example.invalid', 'activo'),
        ($2, $5, 'admin2.t17@example.invalid', 'activo'),
        ($3, $5, 'opto.t17@example.invalid', 'activo'),
        ($4, $5, 'asesor.t17@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ADMIN, ADMIN_2, OPTO, ASESOR, TENANT],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values
        ($1, $2, $5, 'admin'),
        ($1, $3, $5, 'admin'),
        ($1, $4, $5, 'optometra'),
        ($1, $6, $5, 'asesor')
       on conflict (usuario_id, sede_id, rol) do nothing`,
      [TENANT, ADMIN, ADMIN_2, OPTO, SEDE, ASESOR],
    );
    await cliente.query(
      `update usuarios set estado = 'activo' where id = any($1::uuid[])`,
      [[ADMIN, ADMIN_2, OPTO, ASESOR]],
    );
    await cliente.query(`delete from invitaciones_usuario where tenant_id = $1`, [TENANT]);
    await cliente.query(
      `delete from usuarios where tenant_id = $1 and email = 'invitado.t17@example.invalid'`,
      [TENANT],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en)
       values ($1, $4, $5, $7, $8), ($2, $4, $6, $7, $8), ($3, $4, $9, $7, $8)
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en, revocada_en = null`,
      [SESION_ADMIN, SESION_OPTO, SESION_ADMIN_2, TENANT, ADMIN, OPTO, '2026-10-03T18:00:00.000Z', AHORA.toISOString(), ADMIN_2],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

describe('usuarios ADM-02 en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't17',
      claves: new Map([['t17', Buffer.alloc(32, 17)]]),
    });
    fijarCorreoPortParaPruebas(correo);
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
  }, 30000);

  afterAll(async () => {
    fijarCorreoPortParaPruebas(null);
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-ADM-02-1 I: un optómetra sin registro no firma y la API responde 403', async () => {
    const firmaCtx: ContextoFirma = {
      tenant_id: TENANT,
      usuario_id: OPTO,
      sede_id: SEDE,
      sedes: [SEDE],
      rol: 'optometra',
      sesion_id: SESION_OPTO,
    };
    const error = await firmarProfesional(firmaCtx, DOC, AHORA).then(
      () => null,
      (causa: unknown) => causa,
    );
    expect(error).toBeInstanceOf(ErrorFirma);
    expect(error).toMatchObject({ codigo: 'tarjeta' });
    if (!(error instanceof ErrorFirma)) return;
    expect(codigoHttpFirma(error.codigo, error.message)).toBe(403);
  });

  it('R: un optómetra no invita usuarios', async () => {
    await expect(
      invitarUsuario(ctx({ rol: 'optometra', usuario_id: OPTO, sesion_id: SESION_OPTO }), {
        email: 'otro.t17@example.invalid',
        sedeId: SEDE,
        rol: 'asesor',
      }, AHORA),
    ).rejects.toMatchObject({ codigo: 'permiso' });
  });

  it('AC-ADM-02-2 y AC-ADM-02-4: el admin no crea owner; el alta y el cambio de rol quedan en la bitácora', async () => {
    await expect(
      invitarUsuario(ctx({ rol: 'admin', usuario_id: ADMIN }), {
        email: 'owner.t17@example.invalid',
        sedeId: SEDE,
        rol: 'owner',
      }, AHORA),
    ).rejects.toBeInstanceOf(ErrorUsuario);

    const creado = await invitarUsuario(ctx({ rol: 'admin', usuario_id: ADMIN }), {
      email: 'invitado.t17@example.invalid',
      sedeId: SEDE,
      rol: 'asesor',
    }, AHORA);
    expect(bandeja.some((mensaje) => mensaje.enlace.endsWith(creado.enlace.split('/').pop() ?? 'x'))).toBe(true);
    const token = creado.enlace.split('/').pop() ?? '';
    const guardado = await obtenerPool().query<{ token_hash: string }>(
      `select token_hash from invitaciones_usuario where usuario_id = $1`,
      [creado.usuario_id],
    );
    expect(guardado.rows[0]?.token_hash).toBe(hashTokenInvitacion(token));
    expect(guardado.rows[0]?.token_hash).not.toContain(token);

    const primera = await aceptarInvitacion(token, CLAVE, AHORA);
    expect(primera.ok).toBe(true);
    const segunda = await aceptarInvitacion(token, CLAVE, AHORA);
    expect(segunda.ok).toBe(false);

    await cambiarRol(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      { usuarioId: creado.usuario_id, sedeId: SEDE, rolAnterior: 'asesor', rolNuevo: 'optometra' },
      AHORA,
    );

    const bitacora = await obtenerPool().query<{ accion: string; resultado: string }>(
      `select accion, resultado from auditoria where tenant_id = $1 and recurso = 'R18' and recurso_id = $2`,
      [TENANT, creado.usuario_id],
    );
    expect(bitacora.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accion: 'crear', resultado: 'ok' }),
        expect.objectContaining({ accion: 'cambio_rol', resultado: 'ok' }),
      ]),
    );
    const denegado = await obtenerPool().query<{ n: number }>(
      `select count(*)::int as n from auditoria
        where tenant_id = $1 and recurso = 'R18' and accion = 'crear' and resultado = 'denegado'`,
      [TENANT],
    );
    expect(denegado.rows[0]?.n).toBeGreaterThan(0);
  });

  it('S y R: otro tenant no lee la invitación', async () => {
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE_B]);
      await cliente.query(`select set_config('app.rol', 'admin', true)`);
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const ajenas = await cliente.query(`select id from invitaciones_usuario`);
      expect(ajenas.rows).toHaveLength(0);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });

  it('AC-ADM-02-3: desactivar conserva la firma histórica y cierra la sesión', async () => {
    await obtenerPool().query(
      `insert into documentos_firma (id, tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, $3, 'ejemplo_sintetico', 'firmado', 'Histórico sintético', 'Sin datos reales')
       on conflict (id) do nothing`,
      [DOC, TENANT, SEDE],
    );
    await obtenerPool().query(
      `insert into firmas
         (id, tenant_id, sede_id, tipo_firmante, firmante_id, documento_tipo, documento_id, registro_profesional, firmado_en)
       values ($1, $2, $3, 'profesional', $4, 'ejemplo_sintetico', $5, 'RP-HIST-17', $6)
       on conflict (id) do nothing`,
      [FIRMA, TENANT, SEDE, OPTO, DOC, AHORA.toISOString()],
    );
    const hash = await hashearContrasena(CLAVE);
    await obtenerPool().query(`update usuarios set hash_password = $2 where id = $1`, [OPTO, hash]);

    await desactivarUsuario(ctx({ rol: 'admin', usuario_id: ADMIN }), OPTO, AHORA);

    const firmas = await listarFirmasHistoricas(ctx({ rol: 'admin', usuario_id: ADMIN }), OPTO);
    expect(firmas.map((fila) => fila.id)).toContain(FIRMA);
    expect(firmas[0]?.estado_usuario).toBe('desactivado');
    const queda = await obtenerPool().query<{ estado: string; n: number }>(
      `select u.estado, (select count(*)::int from firmas f where f.firmante_id = u.id) as n
         from usuarios u where u.id = $1`,
      [OPTO],
    );
    expect(queda.rows[0]).toEqual({ estado: 'desactivado', n: 1 });
    const sesion = await obtenerPool().query<{ revocada_en: Date | null }>(
      `select revocada_en from sesiones where id = $1`,
      [SESION_OPTO],
    );
    expect(sesion.rows[0]?.revocada_en).not.toBeNull();
    const ingreso = await iniciarSesion({
      correo: 'opto.t17@example.invalid',
      contrasena: CLAVE,
      direccionIp: '192.0.2.17',
      ahora: AHORA,
    });
    expect(ingreso.ok).toBe(false);

    await expect(desactivarUsuario(ctx({ rol: 'admin', usuario_id: ADMIN }), ADMIN, AHORA)).resolves.toBeUndefined();
    await expect(
      desactivarUsuario(ctx({ rol: 'admin', usuario_id: ADMIN_2, sesion_id: SESION_ADMIN_2 }), ADMIN_2, AHORA),
    ).rejects.toMatchObject({
      codigo: 'ultimo_admin',
    });
  });

  it('el perfil manual guarda entidad, documento y firma cifrada', async () => {
    const guardado = await guardarPerfilManual(
      ctx({ rol: 'admin', usuario_id: ADMIN_2, sesion_id: SESION_ADMIN_2 }),
      {
        usuarioId: ASESOR,
        nombreCompleto: 'Optómetra Sintético T17',
        documento: '900000017',
        tipo: 'optometra',
        registroProfesional: 'RP-SINTETICO-17',
        entidad: 'Entidad declarada por el tenant',
        vigenteHasta: '2026-12-31',
        firmaPng: PNG,
        verificadoManual: true,
      },
      AHORA,
    );
    expect(guardado.estado).toBe('verificado');
    const fila = await obtenerPool().query<{ firma_png_cifrada: string; entidad: string }>(
      `select firma_png_cifrada, entidad from perfiles_profesionales where usuario_id = $1`,
      [ASESOR],
    );
    expect(fila.rows[0]?.entidad).toBe('Entidad declarada por el tenant');
    expect(fila.rows[0]?.firma_png_cifrada).toBeTruthy();
    expect(fila.rows[0]?.firma_png_cifrada).not.toContain(PNG.toString('base64'));
  });
});
