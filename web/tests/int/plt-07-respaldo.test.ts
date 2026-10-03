// PLT-07 (T28) — Respaldo y restauración contra PostgreSQL real.
// AC-PLT-07-1 (I), AC-PLT-07-2 (I), AC-PLT-07-3 (S, archivo real alterado).
// Solo datos sintéticos. La base temporal la elimina el propio script.
import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';

import { cerrarPool, obtenerDb } from '../../db/index';
import { verificarAutenticidad } from '../../lib/respaldo/formato.mjs';

const exec = promisify(execFile);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIGRACIONES = path.join(RAIZ, 'db', 'migrations');
const SCRIPT = path.join(RAIZ, 'scripts', 'respaldo.mjs');

function urlPruebas(): string {
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL_TEST. Local: `docker compose -f ../docker-compose.test.yml up -d` y ' +
        'exporta DATABASE_URL_TEST (ver web/.env.example). En CI la define el servicio postgres.',
    );
  }
  return url;
}

function leerSalida(texto: string): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const linea of texto.split(/\n/)) {
    const corte = linea.indexOf('=');
    if (corte > 0) mapa[linea.slice(0, corte)] = linea.slice(corte + 1);
  }
  return mapa;
}

describe('PLT-07 en PostgreSQL real', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'optisaas-plt07-'));
  const clave = randomBytes(32).toString('base64');
  const marca = `sintetico-t28-${randomBytes(8).toString('hex')}`;
  const tenantId = randomUUID();
  let url = '';

  beforeAll(async () => {
    url = urlPruebas();
    process.env.DATABASE_URL_TEST = url;
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    const cliente = new Client({ connectionString: url });
    await cliente.connect();
    try {
      await cliente.query(
        `insert into tenants (id, razon_social, nit, estado)
         values ($1, $2, $3, 'activo')`,
        [tenantId, marca, `900.28.${marca.slice(-6)}`],
      );
    } finally {
      await cliente.end();
    }
  }, 120_000);

  afterAll(async () => {
    const cliente = new Client({ connectionString: url });
    await cliente.connect();
    try {
      await cliente.query(`delete from tenants where id = $1`, [tenantId]);
    } finally {
      await cliente.end();
    }
    rmSync(dir, { recursive: true, force: true });
    await cerrarPool();
  });

  function entorno(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      APP_ENV: 'pruebas',
      DATOS_SINTETICOS: 'true',
      DATABASE_URL_RESPALDO: url,
      BACKUP_KEY: clave,
      BACKUP_DIR: dir,
      BACKUP_DESTINO: 'disco',
    };
  }

  it('AC-PLT-07-1: backup:run produce un archivo cifrado ilegible sin la clave', async () => {
    const { stdout } = await exec(process.execPath, [SCRIPT, 'run'], { env: entorno(), timeout: 120_000 });
    const salida = leerSalida(stdout);
    expect(salida.resultado).toBe('OK');
    expect(salida.cifrado).toBe('AES-256-GCM');
    expect(salida.nota).toContain('TODO(Q-07)');
    expect(salida.rpo).toBe('');
    expect(salida.rto).toBe('');
    expect(salida.rotulo).toBe('provisional');
    const archivo = salida.archivo;
    expect(archivo.startsWith(dir)).toBe(true);
    expect(statSync(archivo).mode & 0o777).toBe(0o600);
    const bytes = readFileSync(archivo);
    expect(bytes.includes(Buffer.from(marca))).toBe(false);
    expect(bytes.includes(Buffer.from('CREATE TABLE'))).toBe(false);
    const claveMala = randomBytes(32);
    expect(verificarAutenticidad(claveMala, bytes).autentico).toBe(false);
    const planos = readdirSync(dir).filter((nombre) => nombre.endsWith('.sql') || nombre.startsWith('.trabajo-'));
    expect(planos).toEqual([]);

    const cliente = new Client({ connectionString: url });
    await cliente.connect();
    try {
      await cliente.query('begin');
      await cliente.query('set local role optisaas_app');
      const visto = await cliente.query('select count(*)::int as n from respaldos');
      expect(visto.rows[0].n).toBe(0);
      await cliente.query('rollback');
      const continuidad = await cliente.query(
        `select clave, valor, rotulo from parametros_continuidad order by clave`,
      );
      expect(continuidad.rows.map((fila) => fila.valor)).toEqual([null, null]);
      expect(continuidad.rows.every((fila) => fila.rotulo === 'provisional')).toBe(true);
    } finally {
      await cliente.end();
    }
  }, 120_000);

  it('AC-PLT-07-3: un byte alterado del archivo real falla GCM', async () => {
    const enc = readdirSync(dir).find((nombre) => nombre.endsWith('.enc'));
    expect(enc).toBeTruthy();
    const bytes = readFileSync(path.join(dir, enc!));
    const alterado = Buffer.from(bytes);
    alterado[alterado.length - 1] ^= 0x01;
    const comprobacion = verificarAutenticidad(Buffer.from(clave, 'base64'), alterado);
    expect(comprobacion.autentico).toBe(false);
    if (!comprobacion.autentico) expect(comprobacion.motivo).toMatch(/alterado/);
  });

  it('AC-PLT-07-2: backup:restore-test restaura en una base temporal y reporta OK', async () => {
    const { stdout } = await exec(process.execPath, [SCRIPT, 'restore-test'], {
      env: entorno(),
      timeout: 180_000,
    });
    const salida = leerSalida(stdout);
    expect(salida.resultado).toBe('OK');
    expect(salida.coinciden).toBe('true');
    expect(salida.base_temporal_eliminada).toBe('true');
    expect(salida.nota).toContain('TODO(Q-07)');
    expect(salida.rpo).toBe('');
    expect(salida.rto).toBe('');
    const conteos = JSON.parse(salida.conteos) as Record<string, number>;
    expect(conteos.tenants).toBeGreaterThan(0);
    expect(conteos.respaldos).toBeGreaterThan(0);

    const cliente = new Client({ connectionString: url });
    await cliente.connect();
    try {
      const queda = await cliente.query(`select 1 from pg_database where datname = $1`, [salida.base_temporal]);
      expect(queda.rowCount).toBe(0);
      const prueba = await cliente.query(
        `select resultado, evidencia from pruebas_restauracion order by ejecutada_en desc limit 1`,
      );
      expect(prueba.rows[0].resultado).toBe('ok');
      const evidencia = prueba.rows[0].evidencia as {
        coinciden: boolean;
        rpo: string | null;
        rto: string | null;
        nota: string;
        conteos_origen: Record<string, number>;
        conteos_restaurados: Record<string, number>;
      };
      expect(evidencia.coinciden).toBe(true);
      expect(evidencia.rpo).toBeNull();
      expect(evidencia.rto).toBeNull();
      expect(evidencia.nota).toContain('TODO(Q-07)');
      expect(evidencia.conteos_restaurados).toEqual(evidencia.conteos_origen);
      expect(JSON.stringify(evidencia)).not.toContain(marca);
    } finally {
      await cliente.end();
    }

    const sql = path.join(dir, 'restaurado.sql');
    await exec(process.execPath, [SCRIPT, 'descifrar', salida.archivo, sql], { env: entorno() });
    expect(statSync(sql).mode & 0o777).toBe(0o600);
    expect(readFileSync(sql, 'utf8')).toContain(marca);
    rmSync(sql);
  }, 180_000);
});
