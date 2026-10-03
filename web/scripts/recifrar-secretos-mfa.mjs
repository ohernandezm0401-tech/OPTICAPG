#!/usr/bin/env node
// SEG-12 (T11) — Re-cifra secretos TOTP que T08 guardó en claro.
// Solo entornos de desarrollo y pruebas. Exige KEK fuera del repositorio
// (`APP_MASTER_KEY` o `APP_MASTER_KEY_FILE`). Idempotente: un sobre ya
// cifrado no se vuelve a tocar.
import pg from 'pg';

import { recifrarSecretosMfaLegados } from '../lib/cifrado/almacen.mjs';
import { ErrorCifrado } from '../lib/cifrado/aes.mjs';
import { leerRegistroKek } from '../lib/cifrado/kek.mjs';

const entorno = (process.env.APP_ENV ?? '').trim();
if (entorno === 'produccion') {
  console.error('cifrado:recifrar-mfa abortado: no corre con APP_ENV=produccion.');
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST;
if (!url) {
  console.error('cifrado:recifrar-mfa abortado: falta DATABASE_URL (o DATABASE_URL_TEST).');
  process.exit(1);
}

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  const factores = await cliente.query(
    `select 1 from factores_totp where secreto_protegido not like 'opt1:%' limit 1`,
  );
  const desafios = await cliente.query(
    `select 1 from desafios_mfa
      where secreto_pendiente is not null and secreto_pendiente not like 'opt1:%'
      limit 1`,
  );
  if ((factores.rowCount ?? 0) === 0 && (desafios.rowCount ?? 0) === 0) {
    console.log('cifrado:recifrar-mfa: no hay secretos en claro.');
  } else {
    let registro;
    try {
      registro = leerRegistroKek();
    } catch (error) {
      const mensaje = error instanceof ErrorCifrado ? error.message : 'no se pudo leer la clave maestra';
      throw new Error(mensaje);
    }
    const resultado = await recifrarSecretosMfaLegados(cliente, registro);
    console.log(`cifrado:recifrar-mfa: ${resultado.total} secreto(s) pasado(s) a sobre.`);
  }
} catch (error) {
  console.error('cifrado:recifrar-mfa falló.');
  console.error(error instanceof Error ? error.message : 'error desconocido');
  process.exitCode = 1;
} finally {
  await cliente.end();
}
