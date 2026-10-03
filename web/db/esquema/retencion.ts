// SEG-09 (T27) — Política de retención y marcas por paciente.
// RLS ENABLE+FORCE en la migración 0026. La purga no tiene tabla.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { TIPOS_DOCUMENTO_RETENCION, TIPOS_MARCA_RETENCION } from '../../dominio/retencion';
import { pacientes } from './pacientes';
import { tenants, usuarios } from './nucleo';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const politicaRetencion = pgTable(
  'politica_retencion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    tipo_documento: text('tipo_documento').notNull(),
    anios: integer('anios'),
    base_normativa: text('base_normativa').notNull(),
    verificado: boolean('verificado').notNull(),
    aplica_contratante_no_prestador: boolean('aplica_contratante_no_prestador').notNull().default(true),
  },
  (tabla) => [
    index('politica_retencion_tenant_id_idx').on(tabla.tenant_id),
    unique('politica_retencion_tipo_unico').on(tabla.tenant_id, tabla.tipo_documento),
    check('politica_retencion_tipo', sql`${tabla.tipo_documento} in (${listaSql(TIPOS_DOCUMENTO_RETENCION)})`),
    check('politica_retencion_anios', sql`${tabla.anios} is null or ${tabla.anios} > 0`),
    check('politica_retencion_aplica_contratante', sql`${tabla.aplica_contratante_no_prestador}`),
    check(
      'politica_retencion_provisional',
      sql`${tabla.verificado} or ${tabla.base_normativa} like '%TODO(Q-07)%'`,
    ),
  ],
);

export const marcasRetencion = pgTable(
  'marcas_retencion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    tipo: text('tipo').notNull(),
    motivo: text('motivo').notNull(),
    registrada_por: uuid('registrada_por')
      .notNull()
      .references(() => usuarios.id),
    registrada_en: timestamp('registrada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('marcas_retencion_tenant_id_idx').on(tabla.tenant_id),
    index('marcas_retencion_paciente_id_idx').on(tabla.paciente_id),
    unique('marcas_retencion_paciente_tipo_unico').on(tabla.tenant_id, tabla.paciente_id, tabla.tipo),
    check('marcas_retencion_tipo', sql`${tabla.tipo} in (${listaSql(TIPOS_MARCA_RETENCION)})`),
    check('marcas_retencion_motivo', sql`char_length(${tabla.motivo}) between 1 and 500`),
  ],
);
