#!/usr/bin/env node
// PLT-01 (T04) — Verificación de RLS multi-tenant (AC-PLT-01-2).
// Recorre `information_schema`: falla (salida 1) si alguna tabla de `public`
// con columna `tenant_id` no tiene RLS habilitado + FORZADO
// (`pg_class.relrowsecurity` y `relforcerowsecurity`) o no tiene al menos una
// política (`pg_policy`). También exige el rol `optisaas_app` sin
// superusuario ni salto de RLS. Uso: `npm run db:check-rls` (desde `web/`,
// con la base ya migrada: `npm run db:migrate` antes).
// Solo datos sintéticos; lee únicamente el catálogo y `pg_roles`.
import { Client } from 'pg';

function leerUrlBd() {
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'ERROR: falta DATABASE_URL_TEST (o DATABASE_URL). Local: `docker compose -f ../docker-compose.test.yml up -d` y exporta la variable (ver web/.env.example). En CI la define el servicio postgres.',
    );
    process.exit(1);
  }
  return url;
}

const cliente = new Client({ connectionString: leerUrlBd() });
await cliente.connect();

try {
  const fallos = [];

  const tablas = (
    await cliente.query(
      `select table_name
         from information_schema.columns
        where table_schema = 'public' and column_name = 'tenant_id'
        group by table_name
        order by table_name`,
    )
  ).rows.map((fila) => fila.table_name);

  if (tablas.length === 0) {
    fallos.push('no hay tablas con columna tenant_id: la base no parece migrada (ejecuta `npm run db:migrate`)');
  }

  const estado = new Map(
    (
      await cliente.query(
        `select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as forzado
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r'`,
      )
    ).rows.map((fila) => [fila.tabla, fila]),
  );

  const politicas = new Map(
    (
      await cliente.query(
        `select c.relname as tabla, count(p.polname)::int as total
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           left join pg_policy p on p.polrelid = c.oid
          where n.nspname = 'public' and c.relkind = 'r'
          group by c.relname`,
      )
    ).rows.map((fila) => [fila.tabla, fila.total]),
  );

  for (const tabla of tablas) {
    const fila = estado.get(tabla);
    if (!fila?.rls) fallos.push(`${tabla}: sin ROW LEVEL SECURITY habilitado`);
    if (!fila?.forzado) fallos.push(`${tabla}: sin FORCE ROW LEVEL SECURITY`);
    if ((politicas.get(tabla) ?? 0) < 1) fallos.push(`${tabla}: sin política RLS`);
  }

  const rol = (
    await cliente.query(
      `select rolbypassrls as salto_rls, rolsuper as superusuario
         from pg_roles where rolname = 'optisaas_app'`,
    )
  ).rows[0];
  if (!rol) {
    fallos.push(`rol optisaas_app: no existe (ejecuta \`npm run db:migrate\`)`);
  } else {
    if (rol.salto_rls) fallos.push('rol optisaas_app: tiene salto de RLS (prohibido por la regla 3)');
    if (rol.superusuario) fallos.push('rol optisaas_app: es superusuario (prohibido por la regla 3)');
  }

  console.log(`rls: ${tablas.length} tablas con tenant_id auditadas, ${fallos.length} fallos`);
  for (const fallo of fallos) console.error(`ERROR: ${fallo}`);

  if (fallos.length > 0) {
    console.error('db:check-rls FALLÓ: hay tablas sin RLS FORCE o sin política.');
    process.exit(1);
  }
  console.log('db:check-rls OK.');
} finally {
  await cliente.end();
}
