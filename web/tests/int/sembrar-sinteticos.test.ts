// PLT-10 (T05) — Semilla sintética contra PostgreSQL real (I).
//
// AC-PLT-10-3: `seed:demo` es idempotente (dos siembras dejan la base igual)
// y ningún dato sembrado parece real (NIT con prefijo reservado, correos del
// dominio reservado). Además la siembra se niega con `APP_ENV=produccion`.
// Solo datos sintéticos; nunca datos reales de pacientes.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { sembrarDatosSinteticos } from '../../db/seeds/sinteticos/sembrar';
import {
  DOMINIO_RESERVADO,
  NIT_RESERVADO_PREFIJO,
  obtenerDatosSinteticos,
} from '../../db/seeds/sinteticos/reservados';

const MIGRACIONES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db',
  'migrations',
);

describe('semilla sintética idempotente y reservada', () => {
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
    vi.unstubAllEnvs();
    await cerrarPool();
  });

  it('AC-PLT-10-3: dos siembras dejan la misma base (idempotente)', async () => {
    const primera = await sembrarDatosSinteticos();
    expect(primera).toEqual({ tenants: 2, sedes: 3, usuarios: 5, membresias: 5 });

    const contar = async (tabla: string) => {
      const r = await obtenerPool().query(`select count(*)::int as n from ${tabla}`);
      return r.rows[0].n as number;
    };
    const antes = {
      tenants: await contar('tenants'),
      sedes: await contar('sedes'),
      usuarios: await contar('usuarios'),
      membresias: await contar('membresias'),
    };

    const segunda = await sembrarDatosSinteticos();
    expect(segunda).toEqual(primera);
    expect(await contar('tenants')).toBe(antes.tenants);
    expect(await contar('sedes')).toBe(antes.sedes);
    expect(await contar('usuarios')).toBe(antes.usuarios);
    expect(await contar('membresias')).toBe(antes.membresias);
  });

  it('AC-PLT-10-3: lo sembrado usa el patrón reservado (nada parece real)', async () => {
    await sembrarDatosSinteticos();
    const pool = obtenerPool();
    const datos = obtenerDatosSinteticos();

    for (const esperado of datos.tenants) {
      const r = await pool.query('select nit from tenants where id = $1', [esperado.id]);
      expect(r.rows[0]?.nit).toBe(esperado.nit);
      expect(String(r.rows[0]?.nit).startsWith(NIT_RESERVADO_PREFIJO)).toBe(true);
    }
    for (const esperado of datos.usuarios) {
      const r = await pool.query('select email from usuarios where id = $1', [esperado.id]);
      expect(r.rows[0]?.email).toBe(esperado.email);
      expect(String(r.rows[0]?.email).toLowerCase().endsWith(DOMINIO_RESERVADO)).toBe(true);
    }
    for (const esperado of datos.membresias) {
      const r = await pool.query(
        'select count(*)::int as n from membresias where id = $1',
        [esperado.id],
      );
      expect(r.rows[0]?.n).toBe(1);
    }
  });

  it('la siembra se niega con APP_ENV=produccion', async () => {
    vi.stubEnv('APP_ENV', 'produccion');
    await expect(sembrarDatosSinteticos()).rejects.toThrow(/produccion/);
    vi.unstubAllEnvs();
  });
});
