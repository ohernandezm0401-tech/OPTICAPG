// SEG-03 (T10) — Bitácora append-only con hash encadenado por tenant.
// RLS ENABLE + FORCE en la migración 0009. Sin UPDATE ni DELETE.
// No hay columna de contenido clínico: solo referencias.
// TODO(Q-07): el plazo de conservación no tiene valor por defecto.
import { sql } from 'drizzle-orm';
import { bigint, check, customType, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { ACCIONES_AUDITORIA, RESULTADOS_AUDITORIA } from '../../lib/auditoria/contenido';
import { sedes, tenants, usuarios } from './nucleo';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const auditoria = pgTable(
  'auditoria',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    actor_id: uuid('actor_id').references(() => usuarios.id),
    rol: text('rol'),
    sede_id: uuid('sede_id').references(() => sedes.id),
    recurso: text('recurso').notNull(),
    recurso_id: text('recurso_id'),
    accion: text('accion').notNull(),
    resultado: text('resultado').notNull(),
    ip: text('ip'),
    agente: text('agente'),
    request_id: text('request_id'),
    hash_previo: bytea('hash_previo'),
    hash: bytea('hash').notNull(),
  },
  (tabla) => [
    index('auditoria_tenant_id_id_idx').on(tabla.tenant_id, tabla.id),
    check('auditoria_accion_valida', sql`${tabla.accion} in (${listaSql(ACCIONES_AUDITORIA)})`),
    check('auditoria_resultado_valido', sql`${tabla.resultado} in (${listaSql(RESULTADOS_AUDITORIA)})`),
    check('auditoria_recurso_referencia', sql`${tabla.recurso} ~ '^[A-Za-z0-9_]{1,40}$'`),
  ],
);

export type FilaAuditoria = typeof auditoria.$inferSelect;
