// SEG-08 (T14) — Firma electrónica simple y documento de ejemplo.
// Las HC, prescripciones y consentimientos todavía no existen: `tipo` solo
// admite `ejemplo_sintetico` y, desde T15, `autorizacion_datos`.
// RLS ENABLE+FORCE en la migración 0013.
// TODO(Q-22): sin PDF/A y sin TSA obligatoria.
import { sql } from 'drizzle-orm';
import { boolean, check, date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { sedes, tenants, usuarios } from './nucleo';

export const perfilesProfesionales = pgTable(
  'perfiles_profesionales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id),
    nombre_completo: text('nombre_completo').notNull(),
    registro_profesional: text('registro_profesional').notNull(),
    // Sin valor por defecto: null significa vigencia no declarada (no firma).
    vigente_hasta: date('vigente_hasta'),
    verificado_por: uuid('verificado_por').references(() => usuarios.id),
    verificado_en: timestamp('verificado_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('perfiles_profesionales_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('perfiles_profesionales_usuario_unico').on(tabla.tenant_id, tabla.usuario_id),
  ],
);

export const documentosFirma = pgTable(
  'documentos_firma',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    tipo: text('tipo').notNull(),
    estado: text('estado').notNull().default('pendiente'),
    titulo: text('titulo').notNull(),
    cuerpo: text('cuerpo').notNull(),
    hash_documento: text('hash_documento'),
    almacen_adaptador: text('almacen_adaptador'),
    almacen_id: text('almacen_id'),
    sello_tsa_proveedor: text('sello_tsa_proveedor').notNull().default('nulo'),
    sello_tsa_token: text('sello_tsa_token'),
    sellado_en: timestamp('sellado_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('documentos_firma_tenant_id_idx').on(tabla.tenant_id),
    index('documentos_firma_hash_idx').on(tabla.tenant_id, tabla.hash_documento),
    check(
      'documentos_firma_tipo_valido',
      sql`${tabla.tipo} in ('ejemplo_sintetico', 'autorizacion_datos')`,
    ),
    check('documentos_firma_estado_valido', sql`${tabla.estado} in ('pendiente', 'firmado', 'sellado')`),
    check(
      'documentos_firma_hash',
      sql`${tabla.hash_documento} is null or ${tabla.hash_documento} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      'documentos_firma_sello_proveedor',
      sql`${tabla.sello_tsa_proveedor} in ('nulo', 'servidor', 'tsa_externa')`,
    ),
  ],
);

export const firmas = pgTable(
  'firmas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    tipo_firmante: text('tipo_firmante').notNull(),
    firmante_id: uuid('firmante_id').references(() => usuarios.id),
    documento_tipo: text('documento_tipo').notNull(),
    documento_id: uuid('documento_id')
      .notNull()
      .references(() => documentosFirma.id),
    hash_documento: text('hash_documento'),
    trazo_png_cifrado: text('trazo_png_cifrado'),
    trazo_puntos_cifrado: text('trazo_puntos_cifrado'),
    nombre_firmante: text('nombre_firmante'),
    nombre_cifrado: text('nombre_cifrado'),
    documento_cifrado: text('documento_cifrado'),
    registro_profesional: text('registro_profesional'),
    otp_verificado: boolean('otp_verificado').notNull().default(false),
    otp_canal: text('otp_canal'),
    otp_verificado_en: timestamp('otp_verificado_en', { withTimezone: true }),
    ip: text('ip'),
    agente: text('agente'),
    acuerdo_aceptado: boolean('acuerdo_aceptado').notNull().default(false),
    sesion_id: uuid('sesion_id'),
    firmado_en: timestamp('firmado_en', { withTimezone: true }).notNull(),
  },
  (tabla) => [
    index('firmas_tenant_id_idx').on(tabla.tenant_id),
    index('firmas_documento_id_idx').on(tabla.documento_id),
    check('firmas_tipo_firmante_valido', sql`${tabla.tipo_firmante} in ('profesional', 'paciente')`),
    check(
      'firmas_documento_tipo_valido',
      sql`${tabla.documento_tipo} in ('ejemplo_sintetico', 'autorizacion_datos')`,
    ),
    check('firmas_hash', sql`${tabla.hash_documento} is null or ${tabla.hash_documento} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const codigosOtpFirma = pgTable(
  'codigos_otp_firma',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    documento_id: uuid('documento_id')
      .notNull()
      .references(() => documentosFirma.id),
    codigo_hash: text('codigo_hash').notNull(),
    canal: text('canal').notNull(),
    expira_en: timestamp('expira_en', { withTimezone: true }).notNull(),
    usado_en: timestamp('usado_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('codigos_otp_firma_tenant_id_idx').on(tabla.tenant_id),
    index('codigos_otp_firma_documento_id_idx').on(tabla.documento_id),
    check('codigos_otp_firma_hash', sql`${tabla.codigo_hash} ~ '^[a-f0-9]{64}$'`),
    check('codigos_otp_firma_canal', sql`${tabla.canal} = 'pantalla_prueba'`),
  ],
);
