#!/usr/bin/env node
// SEG-03 (T10) — Recorre la cadena SHA-256 de `auditoria` por tenant.
// Uso: `npm run auditoria:verificar` o `npm run audit:verify` [-- --tenant=<uuid>]
// Informa la posición 1-based de la primera fila rota y sale con código 1.
import { Client } from 'pg';

import { eventoDesdeFila, verificarCadena } from '../lib/auditoria/cadena.mjs';

function leerUrlBd() {
  const url = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: falta DATABASE_URL_TEST (o DATABASE_URL).');
    process.exit(1);
  }
  return url;
}

const argumento = process.argv.find((item) => item.startsWith('--tenant='));
const tenant = argumento ? argumento.slice('--tenant='.length) : null;

const cliente = new Client({ connectionString: leerUrlBd() });
await cliente.connect();

try {
  const consulta = tenant
    ? await cliente.query(
        `select id::text, tenant_id::text, ts, actor_id::text, rol, sede_id::text, recurso, recurso_id,
                accion, resultado, ip, agente, request_id, hash_previo, hash
           from auditoria
          where tenant_id = $1::uuid
          order by auditoria.id`,
        [tenant],
      )
    : await cliente.query(
        `select id::text, tenant_id::text, ts, actor_id::text, rol, sede_id::text, recurso, recurso_id,
                accion, resultado, ip, agente, request_id, hash_previo, hash
           from auditoria
          order by tenant_id, auditoria.id`,
      );

  if (consulta.rows.length === 0) {
    console.log('OK sin eventos');
    process.exit(0);
  }

  const porTenant = new Map();
  for (const fila of consulta.rows) {
    const lista = porTenant.get(fila.tenant_id) ?? [];
    lista.push(fila);
    porTenant.set(fila.tenant_id, lista);
  }

  let rotas = 0;
  for (const [tenantId, filas] of porTenant) {
    const resultado = verificarCadena(
      filas.map((fila) => ({
        id: fila.id,
        hash_previo: fila.hash_previo,
        hash: fila.hash,
        evento: eventoDesdeFila(fila),
      })),
    );
    if (resultado.ok) {
      console.log(`OK tenant=${tenantId} eventos=${resultado.eventos}`);
    } else {
      rotas += 1;
      console.error(
        `ROTA tenant=${tenantId} posicion=${resultado.posicion} id=${resultado.id} motivo=${resultado.motivo}`,
      );
    }
  }
  if (rotas > 0) process.exit(1);
} finally {
  await cliente.end();
}
