// OPT-04 (T22) — Plantillas versionadas y consentimientos de la atención.
// RLS ENABLE+FORCE y `aplicar_marco_inmutabilidad` en la migración 0021.
// La revocatoria es otra tabla: el original firmado no se edita ni se borra.
// TODO(Q-17): borrador jurídico. TODO(Q-22): el PDF no es PDF/A.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { PROCEDIMIENTOS_CON_CONSENTIMIENTO } from '../../dominio/consentimiento-clinico';
import { anexos } from './cifrado';
import { documentosFirma, firmas } from './firma';
import { tenants, usuarios } from './nucleo';
import { atenciones } from './atenciones';
import { pacientes, pacientesRepresentantes } from './pacientes';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const plantillasConsentimiento = pgTable(
  'plantillas_consentimiento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    procedimiento: text('procedimiento').notNull(),
    version: integer('version').notNull(),
    texto: text('texto').notNull(),
    hash: text('hash').notNull(),
    vigente: boolean('vigente').notNull().default(true),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('plantillas_consentimiento_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('plantillas_consentimiento_version_unica').on(tabla.tenant_id, tabla.procedimiento, tabla.version),
    check(
      'plantillas_consentimiento_procedimiento_valido',
      sql`${tabla.procedimiento} in (${listaSql(PROCEDIMIENTOS_CON_CONSENTIMIENTO)})`,
    ),
    check('plantillas_consentimiento_version_positiva', sql`${tabla.version} >= 1`),
    check('plantillas_consentimiento_hash', sql`${tabla.hash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const consentimientos = pgTable(
  'consentimientos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    plantilla_id: uuid('plantilla_id')
      .notNull()
      .references(() => plantillasConsentimiento.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    procedimiento: text('procedimiento').notNull(),
    version_plantilla: integer('version_plantilla').notNull(),
    hash_plantilla: text('hash_plantilla').notNull(),
    firmante: text('firmante').notNull(),
    representante_id: uuid('representante_id').references(() => pacientesRepresentantes.id),
    firma_id: uuid('firma_id').references(() => firmas.id),
    otorgado: boolean('otorgado').notNull(),
    documento_firma_id: uuid('documento_firma_id').references(() => documentosFirma.id),
    anexo_id: uuid('anexo_id').references(() => anexos.id),
    hash_anexo: text('hash_anexo'),
    estado: text('estado').notNull().default('firmado'),
    contenido: text('contenido').notNull(),
    firmado_por: uuid('firmado_por').references(() => usuarios.id),
    firmado_en: timestamp('firmado_en', { withTimezone: true }),
    hash_contenido: text('hash_contenido'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('consentimientos_tenant_id_idx').on(tabla.tenant_id),
    index('consentimientos_atencion_id_idx').on(tabla.atencion_id),
    index('consentimientos_paciente_id_idx').on(tabla.paciente_id),
    check(
      'consentimientos_procedimiento_valido',
      sql`${tabla.procedimiento} in (${listaSql(PROCEDIMIENTOS_CON_CONSENTIMIENTO)})`,
    ),
    check('consentimientos_firmante_valido', sql`${tabla.firmante} in ('paciente', 'representante')`),
    check('consentimientos_estado_valido', sql`${tabla.estado} in ('borrador', 'firmado')`),
  ],
);

export const consentimientosRevocatorias = pgTable(
  'consentimientos_revocatorias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    consentimiento_id: uuid('consentimiento_id')
      .notNull()
      .references(() => consentimientos.id),
    registrada_por: uuid('registrada_por')
      .notNull()
      .references(() => usuarios.id),
    registrada_en: timestamp('registrada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('consentimientos_revocatorias_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('consentimientos_revocatorias_unica').on(tabla.consentimiento_id),
  ],
);
