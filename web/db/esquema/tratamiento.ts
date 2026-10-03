// SEG-05 (T15) — Textos versionados, autorizaciones y política por tenant.
// RLS ENABLE+FORCE en la migración 0014. El rol optisaas_app no tiene salto de RLS.
// TODO(Q-17): la negativa se registra y no bloquea la atención.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';
import { firmas } from './firma';
import { pacientes, pacientesRepresentantes } from './pacientes';

export const textosLegales = pgTable(
  'textos_legales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    tipo: text('tipo').notNull(),
    codigo: text('codigo').notNull(),
    etiqueta: text('etiqueta').notNull(),
    opcional: boolean('opcional').notNull(),
    version: integer('version').notNull(),
    contenido: text('contenido').notNull(),
    hash: text('hash').notNull(),
    vigente_desde: timestamp('vigente_desde', { withTimezone: true }).notNull(),
    es_vigente: boolean('es_vigente').notNull().default(true),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('textos_legales_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('textos_legales_version_unica').on(tabla.tenant_id, tabla.codigo, tabla.version),
    check(
      'textos_legales_tipo_valido',
      sql`${tabla.tipo} in ('autorizacion_tratamiento', 'contacto_comercial', 'finalidad_opcional')`,
    ),
    check('textos_legales_version_positiva', sql`${tabla.version} >= 1`),
    check('textos_legales_hash', sql`${tabla.hash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const politicasTratamiento = pgTable('politicas_tratamiento', {
  tenant_id: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id),
  razon_social: text('razon_social'),
  domicilio: text('domicilio'),
  correo: text('correo'),
  telefono: text('telefono'),
  finalidades: text('finalidades'),
  derechos: text('derechos'),
  area_pqr: text('area_pqr'),
  procedimiento: text('procedimiento'),
  vigencia: text('vigencia'),
  url_publica: text('url_publica'),
  actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});

export const autorizaciones = pgTable(
  'autorizaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    texto_id: uuid('texto_id')
      .notNull()
      .references(() => textosLegales.id),
    finalidad: text('finalidad').notNull(),
    otorgada: boolean('otorgada').notNull(),
    estado: text('estado').notNull(),
    representante_id: uuid('representante_id').references(() => pacientesRepresentantes.id),
    medio: text('medio').notNull(),
    evidencia: jsonb('evidencia').notNull(),
    firma_id: uuid('firma_id').references(() => firmas.id),
    contenido_exacto: text('contenido_exacto').notNull(),
    hash_texto: text('hash_texto').notNull(),
    registrada_en: timestamp('registrada_en', { withTimezone: true }).notNull(),
    firmada_en: timestamp('firmada_en', { withTimezone: true }),
    revocada_en: timestamp('revocada_en', { withTimezone: true }),
    ip: text('ip'),
    agente: text('agente'),
  },
  (tabla) => [
    index('autorizaciones_tenant_id_idx').on(tabla.tenant_id),
    index('autorizaciones_paciente_id_idx').on(tabla.paciente_id),
    check('autorizaciones_estado_valido', sql`${tabla.estado} in ('pendiente', 'otorgada', 'negada', 'revocada')`),
    check('autorizaciones_hash', sql`${tabla.hash_texto} ~ '^[a-f0-9]{64}$'`),
    check('autorizaciones_medio_valido', sql`${tabla.medio} in ('presencial', 'electronico')`),
  ],
);
