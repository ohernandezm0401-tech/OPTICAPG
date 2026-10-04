// Arranque en producción: la piscina no puede ser superusuario ni BYPASSRLS.
// `instrumentation.ts` no puede importar `pg`, y `next.config.ts` no admite
// await en el nivel superior. `next start` lo ejecuta como proceso.
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

export async function rechazarConexionPrivilegiada(url) {
  const destino = url ?? process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST;
  if (!destino) {
    throw new Error('Falta DATABASE_URL para comprobar el rol de la conexión.');
  }
  const cliente = new pg.Client({ connectionString: destino, connectionTimeoutMillis: 10_000 });
  await cliente.connect();
  try {
    const fila = await cliente.query(
      'select rolsuper, rolbypassrls from pg_roles where rolname = current_user',
    );
    const rol = fila.rows[0];
    if (!rol || rol.rolsuper || rol.rolbypassrls) {
      throw new Error(
        'La aplicación no arranca con APP_ENV=produccion: la conexión de la base es superusuario o tiene BYPASSRLS.',
      );
    }
  } finally {
    await cliente.end();
  }
}

function rutaReal(valor) {
  try {
    return realpathSync(valor);
  } catch {
    return path.resolve(valor);
  }
}

const esCli =
  process.argv[1] != null && rutaReal(process.argv[1]) === rutaReal(fileURLToPath(import.meta.url));

if (esCli) {
  rechazarConexionPrivilegiada().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
