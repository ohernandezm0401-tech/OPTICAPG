// PLT-02 (T03) — Conexión a PostgreSQL **solo en código de servidor**.
// `server-only` hace fallar el build si este módulo se importa desde un
// componente cliente. La URL sale de `DATABASE_URL` (desarrollo/producción) o
// `DATABASE_URL_TEST` (pruebas). Sin secretos en el repo: solo variables de
// entorno (ver `web/.env.example`).
// TODO(Q-06): hosting y residencia por defecto — PostgreSQL estándar + Drizzle
// (sin SDK propietario), destino en Colombia o país adecuado.
import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as autenticacion from './esquema/autenticacion';
import * as mfa from './esquema/mfa';
import * as nucleo from './esquema/nucleo';
import * as parametros from './esquema/parametros';

const esquema = { ...nucleo, ...parametros, ...autenticacion, ...mfa };

export function leerUrlBd(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL (o DATABASE_URL_TEST en pruebas). ' +
        'Local: `docker compose -f ../docker-compose.test.yml up -d` y exporta la variable (ver web/.env.example).',
    );
  }
  return url;
}

let pool: Pool | null = null;

export function obtenerPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: leerUrlBd() });
  }
  return pool;
}

export function obtenerDb() {
  return drizzle(obtenerPool(), { schema: esquema });
}

export type BdNucleo = ReturnType<typeof obtenerDb>;

// Solo pruebas: cierra el pool para que Vitest termine limpio.
export async function cerrarPool(): Promise<void> {
  if (pool) {
    const actual = pool;
    pool = null;
    await actual.end();
  }
}
