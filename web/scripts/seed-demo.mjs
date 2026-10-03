#!/usr/bin/env node
// PLT-10 (T05) — `npm run seed:demo`: siembra idempotente de datos sintéticos.
//
// Lee `db/seeds/sinteticos/datos.json` (cada fila con `es_sintetico: true` y
// identificadores reservados) e inserta con `ON CONFLICT DO NOTHING`: correr
// dos veces deja la base igual (AC-PLT-10-3). Se niega a correr con
// `APP_ENV=produccion`. Solo datos sintéticos; nunca datos reales de
// pacientes. Uso: `DATABASE_URL=... npm run seed:demo`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DIR_ACTUAL = path.dirname(fileURLToPath(import.meta.url));
const RUTA_DATOS = path.join(DIR_ACTUAL, '..', 'db', 'seeds', 'sinteticos', 'datos.json');
const NIT_RESERVADO = '900.000.';
const DOMINIO_RESERVADO = '@example.invalid';

function abortar(mensaje) {
  console.error(`seed:demo abortado: ${mensaje}`);
  process.exit(1);
}

if ((process.env.APP_ENV ?? '').trim() === 'produccion') {
  abortar('no corre con APP_ENV=produccion (ver docs/ENTORNOS.md).');
}

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_TEST;
if (!url) {
  abortar('falta DATABASE_URL (o DATABASE_URL_TEST). Ver web/.env.example.');
}

const datos = JSON.parse(readFileSync(RUTA_DATOS, 'utf8'));

for (const fila of [...datos.tenants, ...datos.sedes, ...datos.usuarios, ...datos.membresias]) {
  if (fila?.es_sintetico !== true) abortar('fila sin marcador es_sintetico=true.');
}
for (const fila of datos.tenants) {
  if (!String(fila.nit).startsWith(NIT_RESERVADO)) abortar(`NIT fuera del prefijo reservado: ${fila.nit}.`);
}
for (const fila of datos.usuarios) {
  if (!String(fila.email).toLowerCase().endsWith(DOMINIO_RESERVADO)) {
    abortar(`correo fuera del dominio reservado: ${fila.email}.`);
  }
}

const pool = new pg.Pool({ connectionString: url });
const tenantPorNit = new Map();
const sedePorClave = new Map();
const usuarioPorClave = new Map();

try {
  for (const fila of datos.tenants) {
    await pool.query(
      `insert into tenants (id, razon_social, nit, estado) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [fila.id, fila.razon_social, fila.nit, fila.estado],
    );
    tenantPorNit.set(fila.nit, fila.id);
  }
  for (const fila of datos.sedes) {
    const tenant_id = tenantPorNit.get(fila.tenant_nit);
    if (!tenant_id) abortar(`sede sin tenant: ${fila.nombre}.`);
    await pool.query(
      `insert into sedes (id, tenant_id, nombre, ciudad, direccion, tipo, estado)
       values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing`,
      [fila.id, tenant_id, fila.nombre, fila.ciudad, fila.direccion, fila.tipo, fila.estado],
    );
    sedePorClave.set(`${fila.tenant_nit}|${fila.nombre}`, fila.id);
  }
  for (const fila of datos.usuarios) {
    const tenant_id = tenantPorNit.get(fila.tenant_nit);
    if (!tenant_id) abortar(`usuario sin tenant: ${fila.email}.`);
    await pool.query(
      `insert into usuarios (id, tenant_id, email, estado) values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [fila.id, tenant_id, fila.email, fila.estado],
    );
    usuarioPorClave.set(`${fila.tenant_nit}|${fila.email}`, fila.id);
  }
  for (const fila of datos.membresias) {
    const tenant_id = tenantPorNit.get(fila.tenant_nit);
    const usuario_id = usuarioPorClave.get(`${fila.tenant_nit}|${fila.usuario_email}`);
    const sede_id = sedePorClave.get(`${fila.tenant_nit}|${fila.sede_nombre}`);
    if (!tenant_id || !usuario_id || !sede_id) abortar(`membresía sin referencia: ${fila.usuario_email}.`);
    await pool.query(
      `insert into membresias (id, tenant_id, usuario_id, sede_id, rol)
       values ($1, $2, $3, $4, $5) on conflict do nothing`,
      [fila.id, tenant_id, usuario_id, sede_id, fila.rol],
    );
  }
  console.log(
    `seed:demo OK (idempotente): ${datos.tenants.length} tenants, ${datos.sedes.length} sedes, ` +
      `${datos.usuarios.length} usuarios, ${datos.membresias.length} membresías sintéticas.`,
  );
} catch (error) {
  abortar(error instanceof Error ? error.message : String(error));
} finally {
  await pool.end();
}
