// SEG-04 (T12) — Tabla genérica de adendas. RLS ENABLE + FORCE en la
// migración 0011. Las historias todavía no existen: T19 debe llamar
// `aplicar_marco_inmutabilidad` sobre cada tabla clínica.
// TODO(Q-17): el borrador no es el registro oficial hasta firmar.
// TODO(Q-22): hash SHA-256, sin sello de tiempo.
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenants, usuarios } from './nucleo';

export const adendas = pgTable(
  'adendas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    entidad: text('entidad').notNull(),
    entidad_id: uuid('entidad_id').notNull(),
    adenda_de: uuid('adenda_de').notNull(),
    motivo: text('motivo').notNull(),
    contenido: text('contenido').notNull(),
    estado: text('estado').notNull().default('borrador'),
    firmado_por: uuid('firmado_por').references(() => usuarios.id),
    firmado_en: timestamp('firmado_en', { withTimezone: true }),
    hash_contenido: text('hash_contenido'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('adendas_tenant_entidad_idx').on(tabla.tenant_id, tabla.entidad, tabla.entidad_id),
    check('adendas_entidad_valida', sql`${tabla.entidad} ~ '^[a-z_][a-z0-9_]{0,62}$'`),
    check('adendas_motivo_largo', sql`char_length(${tabla.motivo}) between 1 and 4000`),
    check('adendas_contenido_largo', sql`char_length(${tabla.contenido}) between 1 and 20000`),
    check('adendas_adenda_de_original', sql`${tabla.adenda_de} = ${tabla.entidad_id}`),
  ],
);

export type FilaAdenda = typeof adendas.$inferSelect;
