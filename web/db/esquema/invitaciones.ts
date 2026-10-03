// ADM-02 (T17) — Invitación de un solo uso. No duplica `usuarios` ni
// `membresias`. El token en claro no se guarda: solo su hash SHA-256.
// RLS ENABLE+FORCE en la migración 0016.
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants, usuarios } from './nucleo';

export const invitacionesUsuario = pgTable(
  'invitaciones_usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    token_hash: text('token_hash').notNull(),
    expira_en: timestamp('expira_en', { withTimezone: true }).notNull(),
    usada_en: timestamp('usada_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('invitaciones_usuario_tenant_id_idx').on(tabla.tenant_id),
    index('invitaciones_usuario_usuario_id_idx').on(tabla.usuario_id),
    uniqueIndex('invitaciones_usuario_token_hash_unico').on(tabla.token_hash),
    check('invitaciones_usuario_hash', sql`${tabla.token_hash} ~ '^[a-f0-9]{64}$'`),
  ],
);
