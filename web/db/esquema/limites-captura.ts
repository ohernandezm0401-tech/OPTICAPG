// OPT-01 (T20) — Límites de captura por tenant. RLS en la migración 0019.
// Los números propuestos viven en el dominio; esta fila los reemplaza.
import { sql } from 'drizzle-orm';
import { check, integer, numeric, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';

export const limitesCaptura = pgTable(
  'limites_captura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    esfera_min: numeric('esfera_min', { precision: 6, scale: 2 }).notNull(),
    esfera_max: numeric('esfera_max', { precision: 6, scale: 2 }).notNull(),
    cilindro_min: numeric('cilindro_min', { precision: 6, scale: 2 }).notNull(),
    cilindro_max: numeric('cilindro_max', { precision: 6, scale: 2 }).notNull(),
    eje_min: integer('eje_min').notNull(),
    eje_max: integer('eje_max').notNull(),
    adicion_min: numeric('adicion_min', { precision: 4, scale: 2 }).notNull(),
    adicion_max: numeric('adicion_max', { precision: 4, scale: 2 }).notNull(),
    agudeza_min: numeric('agudeza_min', { precision: 4, scale: 2 }).notNull(),
    agudeza_max: numeric('agudeza_max', { precision: 4, scale: 2 }).notNull(),
    dip_min: integer('dip_min').notNull(),
    dip_max: integer('dip_max').notNull(),
    dip_monocular_min: integer('dip_monocular_min').notNull(),
    dip_monocular_max: integer('dip_monocular_max').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('limites_captura_tenant_unico').on(tabla.tenant_id),
    check('limites_captura_esfera', sql`${tabla.esfera_min} <= ${tabla.esfera_max}`),
    check('limites_captura_cilindro', sql`${tabla.cilindro_min} <= ${tabla.cilindro_max}`),
    check('limites_captura_eje', sql`${tabla.eje_min} <= ${tabla.eje_max}`),
    check('limites_captura_adicion', sql`${tabla.adicion_min} <= ${tabla.adicion_max}`),
    check('limites_captura_agudeza', sql`${tabla.agudeza_min} <= ${tabla.agudeza_max}`),
    check('limites_captura_dip', sql`${tabla.dip_min} <= ${tabla.dip_max}`),
    check('limites_captura_dip_monocular', sql`${tabla.dip_monocular_min} <= ${tabla.dip_monocular_max}`),
  ],
);
