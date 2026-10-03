// SEG-12 (T11) — Claves de datos por tenant y sobres de aplicación.
// `claves_datos.estado`: activa → rotada → retirada.
// `activa` es verdadera solo cuando el estado es `activa` (la spec nombra
// ambos). RLS ENABLE+FORCE en la migración 0010.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';

export const clavesDatos = pgTable(
  'claves_datos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    version: integer('version').notNull(),
    dek_cifrada: text('dek_cifrada').notNull(),
    version_kek: integer('version_kek').notNull(),
    estado: text('estado').notNull(),
    activa: boolean('activa').notNull(),
    creada_en: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('claves_datos_tenant_version').on(tabla.tenant_id, tabla.version),
    index('claves_datos_tenant_id_idx').on(tabla.tenant_id),
    check('claves_datos_version_positiva', sql`${tabla.version} >= 1`),
    check('claves_datos_kek_positiva', sql`${tabla.version_kek} >= 1`),
    check('claves_datos_estado_valido', sql`${tabla.estado} in ('activa', 'rotada', 'retirada')`),
    check('claves_datos_activa_coherente', sql`(${tabla.estado} = 'activa') = ${tabla.activa}`),
  ],
);

export const contenidosCifrados = pgTable(
  'contenidos_cifrados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    clase: text('clase').notNull(),
    campo: text('campo').notNull(),
    referencia: text('referencia').notNull(),
    version_dek: integer('version_dek').notNull(),
    sobre: text('sobre').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('contenidos_cifrados_referencia').on(tabla.tenant_id, tabla.clase, tabla.campo, tabla.referencia),
    index('contenidos_cifrados_tenant_id_idx').on(tabla.tenant_id),
    check('contenidos_cifrados_clase_valida', sql`${tabla.clase} in ('anexo', 'texto_clinico')`),
    check('contenidos_cifrados_campo_valido', sql`${tabla.campo} ~ '^[a-z0-9_.]{1,80}$'`),
    check('contenidos_cifrados_version_positiva', sql`${tabla.version_dek} >= 1`),
  ],
);

export const secretosAdaptador = pgTable(
  'secretos_adaptador',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    adaptador: text('adaptador').notNull(),
    nombre: text('nombre').notNull(),
    version_dek: integer('version_dek').notNull(),
    sobre: text('sobre').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('secretos_adaptador_unico').on(tabla.tenant_id, tabla.adaptador, tabla.nombre),
    index('secretos_adaptador_tenant_id_idx').on(tabla.tenant_id),
    check('secretos_adaptador_adaptador_valido', sql`${tabla.adaptador} in ('facturacion', 'rda')`),
    check('secretos_adaptador_nombre_valido', sql`${tabla.nombre} in ('token', 'client_id', 'client_secret')`),
    check('secretos_adaptador_version_positiva', sql`${tabla.version_dek} >= 1`),
  ],
);
