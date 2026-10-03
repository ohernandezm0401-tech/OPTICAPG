// OPT-10 (T18) — CIE-10 y CUPS son catálogos globales (sin tenant_id).
// TODO(Q-23): nacen vacíos; la licencia oficial no está verificada y no se
// redistribuyen. El glosario sí es por tenant y nace con RLS ENABLE+FORCE.
import { date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';

export const catalogoCie10 = pgTable(
  'catalogo_cie10',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    descripcion: text('descripcion').notNull(),
    version: text('version').notNull(),
    vigente_desde: date('vigente_desde', { mode: 'string' }).notNull(),
    vigente_hasta: date('vigente_hasta', { mode: 'string' }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [uniqueIndex('catalogo_cie10_codigo_version_unico').on(tabla.codigo, tabla.version)],
);

export const catalogoCups = pgTable(
  'catalogo_cups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    descripcion: text('descripcion').notNull(),
    version: text('version').notNull(),
    vigente_desde: date('vigente_desde', { mode: 'string' }).notNull(),
    vigente_hasta: date('vigente_hasta', { mode: 'string' }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [uniqueIndex('catalogo_cups_codigo_version_unico').on(tabla.codigo, tabla.version)],
);

export const glosarioAbreviaturas = pgTable(
  'glosario_abreviaturas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    abreviatura: text('abreviatura').notNull(),
    expansion: text('expansion').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('glosario_abreviaturas_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('glosario_abreviaturas_tenant_abreviatura_unica').on(tabla.tenant_id, tabla.abreviatura),
  ],
);
