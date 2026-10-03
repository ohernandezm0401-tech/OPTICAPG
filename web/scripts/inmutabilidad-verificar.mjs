#!/usr/bin/env node
// SEG-04 (T12) — Recalcula hash_contenido de una fila firmada.
// Uso: npm run inmutabilidad:verificar -- --tabla=<nombre> --id=<uuid>
// Sale 1 si el hash no coincide o la fila no está firmada.
import { Client } from 'pg';

function leerUrlBd() {
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: falta DATABASE_URL_TEST (o DATABASE_URL).');
    process.exit(1);
  }
  return url;
}

function argumento(nombre) {
  const prefijo = `--${nombre}=`;
  const hallado = process.argv.find((item) => item.startsWith(prefijo));
  return hallado ? hallado.slice(prefijo.length) : '';
}

const tabla = argumento('tabla');
const id = argumento('id');
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(tabla) || !/^[0-9a-f-]{36}$/i.test(id)) {
  console.error('ERROR: uso --tabla=<nombre> --id=<uuid>');
  process.exit(1);
}

const cliente = new Client({ connectionString: leerUrlBd() });
await cliente.connect();

try {
  const resultado = await cliente.query(
    `select coincide, almacenado, calculado, motivo
       from verificar_hash_contenido($1::regclass, $2::uuid)`,
    [tabla, id],
  );
  const fila = resultado.rows[0];
  if (!fila) {
    console.error(`ROTO tabla=${tabla} id=${id} motivo=fila_ausente`);
    process.exit(1);
  }
  if (fila.coincide) {
    console.log(`OK tabla=${tabla} id=${id}`);
  } else {
    console.error(`ROTO tabla=${tabla} id=${id} motivo=${fila.motivo}`);
    process.exit(1);
  }
} finally {
  await cliente.end();
}
