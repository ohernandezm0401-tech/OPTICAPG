// SEG-12 (T11) — Claves de datos, anexos y secretos de adaptadores.
// El plano no se guarda: `dek_cifrada`, `contenido_cifrado` y
// `valor_cifrado` son sobres AES-256-GCM. RLS ENABLE+FORCE en la
// migración 0010.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const ESTADOS_CLAVE_DATOS = ['activa', 'rotada', 'retirada'] as const;
export const ADAPTADORES_SECRETO = ['facturacion', 'rda'] as const;

export const clavesDatos = pgTable(
  'claves_datos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    version: integer('version').notNull(),
    dek_cifrada: text('dek_cifrada').notNull(),
    kek_id: text('kek_id').notNull(),
    estado: text('estado').notNull(),
    creada_en: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    activa: boolean('activa').notNull(),
  },
  (tabla) => [
    index('claves_datos_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('claves_datos_tenant_version').on(tabla.tenant_id, tabla.version),
    uniqueIndex('claves_datos_una_activa')
      .on(tabla.tenant_id)
      .where(sql`${tabla.activa}`),
    check('claves_datos_version_positiva', sql`${tabla.version} >= 1`),
    check('claves_datos_estado_valido', sql`${tabla.estado} in ('activa', 'rotada', 'retirada')`),
    check('claves_datos_activa_coherente', sql`(${tabla.estado} = 'activa') = ${tabla.activa}`),
  ],
);

export const anexos = pgTable(
  'anexos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    nombre: text('nombre').notNull(),
    mime: text('mime'),
    tamano: integer('tamano').notNull(),
    hash_sha256: text('hash_sha256').notNull(),
    contenido_cifrado: bytea('contenido_cifrado').notNull(),
    clave_version: integer('clave_version').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('anexos_tenant_id_idx').on(tabla.tenant_id),
    check('anexos_tamano_no_negativo', sql`${tabla.tamano} >= 0`),
    check('anexos_hash_sha256', sql`${tabla.hash_sha256} ~ '^[a-f0-9]{64}$'`),
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
    valor_cifrado: text('valor_cifrado').notNull(),
    clave_version: integer('clave_version').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('secretos_adaptador_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('secretos_adaptador_unico').on(tabla.tenant_id, tabla.adaptador, tabla.nombre),
    check('secretos_adaptador_adaptador_valido', sql`${tabla.adaptador} in ('facturacion', 'rda')`),
    check('secretos_adaptador_nombre', sql`char_length(${tabla.nombre}) between 1 and 80`),
  ],
);
