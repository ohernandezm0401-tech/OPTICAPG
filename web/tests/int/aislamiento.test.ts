// PLT-01 (T04) — Aislamiento multi-tenant con RLS FORCE (R + I + S).
// Contra PostgreSQL real, sin mocks de BD. Ejerce las políticas creadas en
// la migración 0001 como el rol `optisaas_app` (vía `SET ROLE`, sin
// contraseñas en el repo): la piscina de pruebas conecta como superusuario
// (que queda exento de RLS) y cada caso cambia a `optisaas_app` dentro de
// una transacción con `ROLLBACK`, igual que la conexión dedicada que usará
// producción. Solo datos sintéticos; nunca datos reales de pacientes.
//
// Cobertura por criterio:
// - AC-PLT-01-1: matriz por tabla (tenants, sedes, usuarios, membresias,
//   sesiones): SELECT/UPDATE/DELETE cruzados entre dos tenants → 0 filas,
//   sin error de permisos, y B queda intacto.
// - AC-PLT-01-2: toda tabla con `tenant_id` tiene RLS + FORCE + política
//   (espejo a nivel BD de `npm run db:check-rls`, que la CI ejecuta).
// - AC-PLT-01-3: sin variables `app.*`, toda consulta devuelve 0 filas.
// - AC-PLT-01-4: con sedes {S1}, nada de S2 en tablas por sede
//   (`membresias`; `sedes` restringe lectura/escritura a sedes autorizadas).
// - S (IDOR): acceso por `id` de otro tenant en cada acción existente
//   (obtenerTenantPorId, sedes/usuarios/membresías/sesiones por tenant o
//   usuario, revocarSesion) → 0 filas. Las rutas `/api/owner/*` siguen en
//   memoria (TODO T05) y se auditan en `tests/unit/plt-01-guardas.test.ts`.
// - `withTenantTx`: fija el contexto (`SET LOCAL`) y valida la entrada.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import type { PoolClient } from 'pg';

import { obtenerDb, obtenerPool, cerrarPool } from '../../db/index';
import { withTenantTx } from '../../db/tenant';
import {
  abrirSesion,
  asignarMembresia,
  crearSede,
  crearTenant,
  crearUsuario,
} from '../../db/nucleo';

const MIGRACIONES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db',
  'migrations',
);

const nitUnico = () => `900.${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 10)}`;
const emailUnico = (prefijo: string) => `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@ejemplo.co`;

interface ContextoApp {
  tenant_id: string;
  sedes?: string[];
  usuario_id?: string;
  rol?: string;
}

// Ejecuta `fn` como el rol de aplicación, con o sin contexto de tenant, y
// revierte todo al final. Los UUID vienen de la BD (no hay inyección).
async function comoApp<T>(ctx: ContextoApp | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('SET ROLE optisaas_app');
    await cliente.query('BEGIN');
    try {
      if (ctx) {
        await cliente.query(`SET LOCAL app.tenant_id = '${ctx.tenant_id}'`);
        await cliente.query(`SET LOCAL app.usuario_id = '${ctx.usuario_id ?? ''}'`);
        await cliente.query(`SET LOCAL app.sede_id = '${ctx.sedes?.[0] ?? ''}'`);
        await cliente.query(`SET LOCAL app.sedes = '${(ctx.sedes ?? []).join(',')}'`);
        await cliente.query(`SET LOCAL app.rol = '${ctx.rol ?? ''}'`);
      }
      const resultado = await fn(cliente);
      await cliente.query('ROLLBACK');
      return resultado;
    } catch (error) {
      try {
        await cliente.query('ROLLBACK');
      } catch {
        // Ya en error: se informa el original.
      }
      throw error;
    }
  } finally {
    try {
      await cliente.query('RESET ROLE');
    } catch {
      // Conexión en mal estado: igual se libera.
    }
    cliente.release();
  }
}

const contar = async (tabla: string, condicion: string, parametros: string[]) => {
  const db = obtenerPool();
  const resultado = await db.query(`select count(*)::int as n from ${tabla} where ${condicion}`, parametros);
  return resultado.rows[0].n as number;
};

describe('aislamiento multi-tenant con RLS FORCE', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error(
        'Falta DATABASE_URL_TEST. Local: `docker compose -f ../docker-compose.test.yml up -d` y ' +
          'exporta DATABASE_URL_TEST (ver web/.env.example). En CI la define el servicio postgres.',
      );
    }
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-PLT-01-2: toda tabla con tenant_id tiene RLS + FORCE + política', async () => {
    const db = obtenerPool();
    const tablas = (
      await db.query(
        `select table_name from information_schema.columns
          where table_schema = 'public' and column_name = 'tenant_id'
          group by table_name order by table_name`,
      )
    ).rows.map((f) => f.table_name as string);
    expect(tablas).toEqual(expect.arrayContaining(['sedes', 'usuarios', 'membresias', 'sesiones']));

    for (const tabla of tablas) {
      const estado = (
        await db.query(
          `select c.relrowsecurity as rls, c.relforcerowsecurity as forzado
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = $1`,
          [tabla],
        )
      ).rows[0];
      expect(estado?.rls, `${tabla} sin RLS`).toBe(true);
      expect(estado?.forzado, `${tabla} sin FORCE`).toBe(true);
      const politicas = (
        await db.query(
          `select count(*)::int as n from pg_policy p
            join pg_class c on c.oid = p.polrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname = $1`,
          [tabla],
        )
      ).rows[0].n as number;
      expect(politicas, `${tabla} sin política`).toBeGreaterThan(0);
    }

    const rol = (
      await db.query(
        `select rolbypassrls as salto, rolsuper as super from pg_roles where rolname = 'optisaas_app'`,
      )
    ).rows[0];
    expect(rol, 'falta el rol optisaas_app (migración 0001 sin aplicar)').toBeDefined();
    expect(rol.salto, 'optisaas_app no puede saltarse RLS').toBe(false);
    expect(rol.super, 'optisaas_app no puede ser superusuario').toBe(false);
  });

  it('AC-PLT-01-1: sesión de A no ve ni afecta filas de B (matriz por tabla)', async () => {
    const tenantA = await crearTenant({ razon_social: 'Empresa A Sintética S.A.S.', nit: nitUnico() });
    const tenantB = await crearTenant({ razon_social: 'Empresa B Sintética S.A.S.', nit: nitUnico() });
    const sedeA = await crearSede({ tenant_id: tenantA.id, nombre: 'Sede A', ciudad: 'Bogotá' });
    const sedeB = await crearSede({ tenant_id: tenantB.id, nombre: 'Sede B', ciudad: 'Medellín' });
    const usuarioA = await crearUsuario({ tenant_id: tenantA.id, email: emailUnico('a') });
    const usuarioB = await crearUsuario({ tenant_id: tenantB.id, email: emailUnico('b') });
    const membresiaB = await asignarMembresia({
      tenant_id: tenantB.id,
      usuario_id: usuarioB.id,
      sede_id: sedeB.id,
      rol: 'asesor',
    });
    const sesionB = await abrirSesion({
      tenant_id: tenantB.id,
      usuario_id: usuarioB.id,
      duracion_minutos: 15,
    });
    const ctxA = { tenant_id: tenantA.id, sedes: [sedeA.id], usuario_id: usuarioA.id, rol: 'admin' as const };

    // SELECT cruzado: 0 filas y sin error de permisos.
    const vistos = await comoApp(ctxA, async (c) => ({
      tenants: (await c.query('select id from tenants')).rows,
      sedes: (await c.query('select id from sedes')).rows,
      usuarios: (await c.query('select id from usuarios')).rows,
      membresias: (await c.query('select id from membresias')).rows,
      sesiones: (await c.query('select id from sesiones')).rows,
    }));
    expect(vistos.tenants.map((f) => f.id)).toEqual([tenantA.id]);
    expect(vistos.sedes.map((f) => f.id)).toContain(sedeA.id);
    expect(vistos.sedes.map((f) => f.id)).not.toContain(sedeB.id);
    expect(vistos.usuarios.map((f) => f.id)).toContain(usuarioA.id);
    expect(vistos.usuarios.map((f) => f.id)).not.toContain(usuarioB.id);
    expect(vistos.membresias.map((f) => f.id)).not.toContain(membresiaB.id);
    expect(vistos.sesiones.map((f) => f.id)).not.toContain(sesionB.id);

    // UPDATE por id de B: 0 filas.
    const actualizados = await comoApp(ctxA, async (c) => ({
      tenants: (await c.query('update tenants set razon_social = $1 where id = $2', ['Atacante', tenantB.id]))
        .rowCount,
      sedes: (await c.query('update sedes set nombre = $1 where id = $2', ['Atacante', sedeB.id])).rowCount,
      usuarios: (await c.query("update usuarios set estado = 'bloqueado' where id = $1", [usuarioB.id]))
        .rowCount,
      membresias: (await c.query("update membresias set rol = 'admin' where id = $1", [membresiaB.id]))
        .rowCount,
      sesiones: (await c.query('update sesiones set direccion_ip = $1 where id = $2', ['9.9.9.9', sesionB.id]))
        .rowCount,
    }));
    expect(Object.values(actualizados)).toEqual([0, 0, 0, 0, 0]);

    // DELETE por id de B: 0 filas.
    const borrados = await comoApp(ctxA, async (c) => ({
      sesiones: (await c.query('delete from sesiones where id = $1', [sesionB.id])).rowCount,
      membresias: (await c.query('delete from membresias where id = $1', [membresiaB.id])).rowCount,
      usuarios: (await c.query('delete from usuarios where id = $1', [usuarioB.id])).rowCount,
      sedes: (await c.query('delete from sedes where id = $1', [sedeB.id])).rowCount,
      tenants: (await c.query('delete from tenants where id = $1', [tenantB.id])).rowCount,
    }));
    expect(Object.values(borrados)).toEqual([0, 0, 0, 0, 0]);

    // INSERT en B desde A: la política WITH CHECK lo rechaza.
    await expect(
      comoApp(ctxA, async (c) => {
        await c.query('insert into sedes (tenant_id, nombre, ciudad) values ($1, $2, $3)', [
          tenantB.id,
          'Sede intrusa',
          'Cali',
        ]);
      }),
    ).rejects.toThrow(/row-level security/i);

    // B queda intacto.
    expect(await contar('tenants', 'id = $1', [tenantB.id])).toBe(1);
    expect(await contar('sedes', 'id = $1', [sedeB.id])).toBe(1);
    expect(await contar('usuarios', 'id = $1', [usuarioB.id])).toBe(1);
    expect(await contar('membresias', 'id = $1', [membresiaB.id])).toBe(1);
    expect(await contar('sesiones', 'id = $1', [sesionB.id])).toBe(1);
  });

  it('AC-PLT-01-3: sin variables app.*, toda consulta devuelve 0 filas', async () => {
    const tenant = await crearTenant({ razon_social: 'Empresa Sin Contexto S.A.S.', nit: nitUnico() });
    const sede = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Única', ciudad: 'Tunja' });
    const usuario = await crearUsuario({ tenant_id: tenant.id, email: emailUnico('ciego') });
    await asignarMembresia({ tenant_id: tenant.id, usuario_id: usuario.id, sede_id: sede.id, rol: 'asesor' });
    await abrirSesion({ tenant_id: tenant.id, usuario_id: usuario.id, duracion_minutos: 15 });

    const vacio = await comoApp(null, async (c) => ({
      tenants: (await c.query('select id from tenants')).rows,
      sedes: (await c.query('select id from sedes')).rows,
      usuarios: (await c.query('select id from usuarios')).rows,
      membresias: (await c.query('select id from membresias')).rows,
      sesiones: (await c.query('select id from sesiones')).rows,
    }));
    expect(vacio).toEqual({ tenants: [], sedes: [], usuarios: [], membresias: [], sesiones: [] });
  });

  it('AC-PLT-01-4: con sedes {S1} no lee ni escribe filas de S2 del mismo tenant', async () => {
    const tenant = await crearTenant({ razon_social: 'Empresa Dos Sedes S.A.S.', nit: nitUnico() });
    const sede1 = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Norte', ciudad: 'Bogotá' });
    const sede2 = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Sur', ciudad: 'Soacha' });
    const usuario = await crearUsuario({ tenant_id: tenant.id, email: emailUnico('sede') });
    const membresia1 = await asignarMembresia({
      tenant_id: tenant.id,
      usuario_id: usuario.id,
      sede_id: sede1.id,
      rol: 'asesor',
    });
    const membresia2 = await asignarMembresia({
      tenant_id: tenant.id,
      usuario_id: usuario.id,
      sede_id: sede2.id,
      rol: 'optometra',
    });
    const ctx = { tenant_id: tenant.id, sedes: [sede1.id], usuario_id: usuario.id, rol: 'asesor' };

    // Lectura: solo membresías de S1; sedes: solo S1.
    const lectura = await comoApp(ctx, async (c) => ({
      membresias: (await c.query('select id from membresias')).rows.map((f) => f.id as string),
      porId: (await c.query('select id from membresias where id = $1', [membresia2.id])).rows,
      sedes: (await c.query('select id from sedes')).rows.map((f) => f.id as string),
    }));
    expect(lectura.membresias).toEqual([membresia1.id]);
    expect(lectura.porId).toEqual([]);
    expect(lectura.sedes).toContain(sede1.id);
    expect(lectura.sedes).not.toContain(sede2.id);

    // Escritura sobre S2: 0 filas / rechazo.
    const afectoS2 = await comoApp(ctx, async (c) => ({
      upd: (await c.query("update membresias set rol = 'admin' where id = $1", [membresia2.id])).rowCount,
      del: (await c.query('delete from membresias where id = $1', [membresia2.id])).rowCount,
      updSede: (await c.query('update sedes set nombre = $1 where id = $2', ['Intrusa', sede2.id])).rowCount,
      delSede: (await c.query('delete from sedes where id = $1', [sede2.id])).rowCount,
    }));
    expect(Object.values(afectoS2)).toEqual([0, 0, 0, 0]);
    await expect(
      comoApp(ctx, async (c) => {
        await c.query('insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, $4)', [
          tenant.id,
          usuario.id,
          sede2.id,
          'auditor',
        ]);
      }),
    ).rejects.toThrow(/row-level security/i);

    // S2 sigue intacta y la escritura legítima en S1 funciona.
    expect(await contar('membresias', 'id = $1', [membresia2.id])).toBe(1);
    const propia = await comoApp(ctx, async (c) => {
      const r = await c.query(
        'insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, $4) returning id',
        [tenant.id, usuario.id, sede1.id, 'auditor'],
      );
      return r.rows[0].id as string;
    });
    expect(propia).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('S (IDOR): cada acción existente queda bloqueada por id de otro tenant', async () => {
    const tenantA = await crearTenant({ razon_social: 'Empresa IDOR A S.A.S.', nit: nitUnico() });
    const tenantB = await crearTenant({ razon_social: 'Empresa IDOR B S.A.S.', nit: nitUnico() });
    const sedeB = await crearSede({ tenant_id: tenantB.id, nombre: 'Sede B', ciudad: 'Bucaramanga' });
    const usuarioB = await crearUsuario({ tenant_id: tenantB.id, email: emailUnico('idor-b') });
    const sesionB = await abrirSesion({ tenant_id: tenantB.id, usuario_id: usuarioB.id, duracion_minutos: 15 });
    const sedeA = await crearSede({ tenant_id: tenantA.id, nombre: 'Sede A', ciudad: 'Cúcuta' });
    const ctxA = { tenant_id: tenantA.id, sedes: [sedeA.id] };

    // Equivale a obtenerTenantPorId(B) / listarSedesPorTenant(B) /
    // listarUsuariosPorTenant(B) / listarMembresiasPorUsuario(uB) /
    // listarSesionesActivasPorUsuario(uB) / revocarSesion(sB) desde A.
    const idor = await comoApp(ctxA, async (c) => ({
      tenant: (await c.query('select id from tenants where id = $1', [tenantB.id])).rows,
      sedes: (await c.query('select id from sedes where tenant_id = $1', [tenantB.id])).rows,
      usuarios: (await c.query('select id from usuarios where tenant_id = $1', [tenantB.id])).rows,
      membresias: (await c.query('select id from membresias where usuario_id = $1', [usuarioB.id])).rows,
      sesiones: (await c.query('select id from sesiones where usuario_id = $1', [usuarioB.id])).rows,
      revocar: (
        await c.query('update sesiones set revocada_en = now() where id = $1 and revocada_en is null', [
          sesionB.id,
        ])
      ).rowCount,
    }));
    expect(idor).toEqual({ tenant: [], sedes: [], usuarios: [], membresias: [], sesiones: [], revocar: 0 });
    expect(sedeB.id).toBeTruthy();
    expect(await contar('sesiones', 'id = $1 and revocada_en is null', [sesionB.id])).toBe(1);
  });

  it('withTenantTx fija el contexto y valida la entrada', async () => {
    const tenant = await crearTenant({ razon_social: 'Empresa Contexto S.A.S.', nit: nitUnico() });
    const sede = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Contexto', ciudad: 'Pasto' });

    const visto = await withTenantTx(
      { tenant_id: tenant.id, usuario_id: crypto.randomUUID(), sede_id: sede.id, rol: 'admin' },
      async (tx) => {
        const filas = (await tx.execute(
          sql.raw(`select current_setting('app.tenant_id') as tenant, current_setting('app.sedes') as sedes`),
        )) as unknown as Array<{ tenant: string; sedes: string }>;
        return Array.isArray(filas) ? filas[0] : (filas as { rows: Array<{ tenant: string; sedes: string }> }).rows[0];
      },
    );
    expect(visto).toEqual({ tenant: tenant.id, sedes: sede.id });

    await expect(withTenantTx({ tenant_id: 'no-es-uuid' }, async () => 'x')).rejects.toThrow();
    await expect(
      withTenantTx({ tenant_id: tenant.id, rol: 'Admin!' }, async () => 'x'),
    ).rejects.toThrow();
  });
});
