// PLT-11 (T06) — Parámetros por tenant, festivos, tarifas e instantánea de
// impuesto en la línea. Español `snake_case`. Toda tabla lleva `tenant_id`
// (RLS ENABLE+FORCE en la migración posterior). Sin tarifa ni festivo de
// ejemplo: las filas las crea un humano.
// TODO(Q-31): `tarifas_impuesto.porcentaje_bp` no tiene valor por defecto.
// TODO(Q-32): `festivos` solo se llena desde el CSV humano.
// TODO(Q-07): los plazos provisionales nacen con valor nulo.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { ImpuestoSnapshot } from '../../dominio/impuestos';
import { tenants } from './nucleo';

export const parametrosTenant = pgTable(
  'parametros_tenant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    clave: text('clave').notNull(),
    valor: jsonb('valor').$type<string | number | boolean | null>(),
    rotulo: text('rotulo'),
    vigente_desde: timestamp('vigente_desde', { withTimezone: true }).notNull().defaultNow(),
    vigente_hasta: timestamp('vigente_hasta', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('parametros_tenant_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('parametros_tenant_clave_vigente_unica')
      .on(tabla.tenant_id, tabla.clave)
      .where(sql`${tabla.vigente_hasta} is null`),
  ],
);

export const festivos = pgTable(
  'festivos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    anio: integer('anio').notNull(),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    nombre: text('nombre').notNull(),
    fuente: text('fuente').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('festivos_tenant_id_idx').on(tabla.tenant_id),
    index('festivos_tenant_anio_idx').on(tabla.tenant_id, tabla.anio),
    uniqueIndex('festivos_tenant_fecha_unica').on(tabla.tenant_id, tabla.fecha),
    check('festivos_anio_coincide', sql`extract(year from ${tabla.fecha}) = ${tabla.anio}`),
  ],
);

export const tarifasImpuesto = pgTable(
  'tarifas_impuesto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    nombre: text('nombre').notNull(),
    // Sin `.default`: Q-31. El humano informa los puntos básicos.
    porcentaje_bp: integer('porcentaje_bp').notNull(),
    excluido: boolean('excluido').notNull(),
    exento: boolean('exento').notNull(),
    vigente_desde: timestamp('vigente_desde', { withTimezone: true }).notNull().defaultNow(),
    vigente_hasta: timestamp('vigente_hasta', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('tarifas_impuesto_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('tarifas_impuesto_nombre_vigente_unica')
      .on(tabla.tenant_id, tabla.nombre)
      .where(sql`${tabla.vigente_hasta} is null`),
    check(
      'tarifas_impuesto_porcentaje_bp_rango',
      sql`${tabla.porcentaje_bp} >= 0 and ${tabla.porcentaje_bp} <= 10000`,
    ),
  ],
);

// La venta (ADM/ASE) aún no existe. Esta tabla es el snapshot de la línea
// cerrada que ese módulo reutilizará (`impuesto_snapshot` de la spec §17.4).
export const instantaneasImpuestoLinea = pgTable(
  'instantaneas_impuesto_linea',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    tarifa_impuesto_id: uuid('tarifa_impuesto_id')
      .notNull()
      .references(() => tarifasImpuesto.id),
    impuesto_snapshot: jsonb('impuesto_snapshot').$type<ImpuestoSnapshot>().notNull(),
    cerrada_en: timestamp('cerrada_en', { withTimezone: true }).notNull().defaultNow(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('instantaneas_impuesto_linea_tenant_id_idx').on(tabla.tenant_id)],
);

// Historial de cambios de parámetros (vigencia + bitácora de la regla 3 de
// PLT-11). La bitácora clínica general llega con SEG-03.
export const bitacoraParametros = pgTable(
  'bitacora_parametros',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    clave: text('clave').notNull(),
    valor_anterior: jsonb('valor_anterior').$type<string | number | boolean | null>(),
    valor_nuevo: jsonb('valor_nuevo').$type<string | number | boolean | null>(),
    rotulo: text('rotulo'),
    registrado_en: timestamp('registrado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('bitacora_parametros_tenant_id_idx').on(tabla.tenant_id)],
);

export type ParametroTenant = typeof parametrosTenant.$inferSelect;
export type Festivo = typeof festivos.$inferSelect;
export type TarifaImpuesto = typeof tarifasImpuesto.$inferSelect;
export type InstantaneaImpuestoLinea = typeof instantaneasImpuestoLinea.$inferSelect;
export type BitacoraParametro = typeof bitacoraParametros.$inferSelect;
