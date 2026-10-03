// OPT-10 (T18) — Catálogos y glosario contra PostgreSQL real (I).
// AC-OPT-10-1 y AC-OPT-10-3. Solo el CSV sintético.
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { buscarCatalogo, guardarAbreviatura, revisarTextoClinico } from '../../db/catalogos';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';

const exec = promisify(execFile);
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRACIONES = path.join(WEB, 'db', 'migrations');
const CSV = path.join(WEB, 'datos', 'catalogos', 'sintetico-prueba.csv');
const DESCRIPCION_H521 = 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10';

const TENANT_A = 'e1811111-1111-4111-8111-111111111181';
const TENANT_B = 'e1822222-2222-4222-8222-222222222282';

describe('catálogos OPT-10 en PostgreSQL', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error('Falta DATABASE_URL_TEST.');
    }
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await exec(process.execPath, ['scripts/catalogos-cargar.mjs', CSV], {
      cwd: WEB,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST,
      },
    });
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query(
        `insert into tenants (id, razon_social, nit, estado) values
          ($1, 'Óptica Sintética T18 A', '900.000.118-1', 'activo'),
          ($2, 'Óptica Sintética T18 B', '900.000.118-2', 'activo')
         on conflict (id) do nothing`,
        [TENANT_A, TENANT_B],
      );
    } finally {
      cliente.release();
    }
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-OPT-10-1: buscar H52.1 devuelve el código y la descripción del CSV sintético', async () => {
    const filas = await buscarCatalogo('cie10', 'H52.1');
    expect(filas[0]).toMatchObject({ codigo: 'H52.1', descripcion: DESCRIPCION_H521 });
  });

  it('el rol de aplicación lee el catálogo global y no puede escribirlo', async () => {
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const lectura = await cliente.query(`select descripcion from catalogo_cie10 where codigo = 'H52.1'`);
      expect(lectura.rows[0]?.descripcion).toBe(DESCRIPCION_H521);
      await expect(
        cliente.query(
          `insert into catalogo_cie10 (codigo, descripcion, version, vigente_desde)
           values ('ZZ1.1', 'no debe entrar', 'sintetica-prueba-2026', '2026-01-01')`,
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });

  it('AC-OPT-10-3: una abreviatura fuera del glosario del tenant avisa y no bloquea', async () => {
    await guardarAbreviatura(
      { tenant_id: TENANT_A, usuario_id: TENANT_A, rol: 'admin' },
      { abreviatura: 'AV', expansion: 'agudeza visual' },
    );
    const revision = await revisarTextoClinico(
      { tenant_id: TENANT_A, usuario_id: TENANT_A, rol: 'admin' },
      'AV 20/20. XYZ pendiente.',
    );
    expect(revision.bloquea).toBe(false);
    expect(revision.texto).toBe('AV 20/20. XYZ pendiente.');
    expect(revision.advertencias.map((item) => item.abreviatura)).toEqual(['XYZ']);
  });

  it('el glosario de otro tenant no se ve con el rol de aplicación', async () => {
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT_B]);
      const ajenas = await cliente.query(
        `select abreviatura from glosario_abreviaturas where tenant_id = $1`,
        [TENANT_A],
      );
      expect(ajenas.rows).toEqual([]);
      await expect(
        cliente.query(
          `insert into glosario_abreviaturas (tenant_id, abreviatura, expansion)
           values ($1, 'OD', 'ojo derecho')`,
          [TENANT_A],
        ),
      ).rejects.toThrow(/row-level security/i);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });
});
