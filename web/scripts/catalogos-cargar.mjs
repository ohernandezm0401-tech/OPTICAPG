#!/usr/bin/env node
// OPT-10 (T18) — `npm run catalogos:cargar -- archivo.csv`
// TODO(Q-23): toma un archivo local que el cliente descarga de la fuente
// oficial (Ministerio de Salud / SISPRO). No descarga nada y no redistribuye
// el catálogo. La conexión es la de administración (`DATABASE_URL`), no
// `optisaas_app`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

import { cargarFilasCatalogo } from '../db/catalogos-carga.mjs';
import { ErrorCatalogo, parsearCsvCatalogo } from '../dominio/catalogos.mjs';

function leerUrlBd() {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) {
    console.error(
      'ERROR: falta DATABASE_URL (o DATABASE_URL_TEST). La carga usa el rol de administración, no optisaas_app.',
    );
    process.exit(1);
  }
  return url;
}

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: npm run catalogos:cargar -- archivo.csv');
  process.exit(1);
}

let filas;
try {
  const texto = readFileSync(path.resolve(archivo), 'utf8');
  filas = parsearCsvCatalogo(texto);
} catch (error) {
  const mensaje = error instanceof ErrorCatalogo || error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${mensaje}`);
  process.exit(1);
}

const cliente = new Client({ connectionString: leerUrlBd() });
await cliente.connect();
try {
  const conteo = await cargarFilasCatalogo(cliente, filas);
  console.log(
    `catalogos:cargar OK. cie10=${conteo.cie10} cups=${conteo.cups} archivo=${path.resolve(archivo)}`,
  );
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: no se pudo cargar el catálogo. ${mensaje}`);
  process.exit(1);
} finally {
  await cliente.end();
}
