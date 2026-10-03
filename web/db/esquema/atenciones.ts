// OPT-01 / OPT-24 (T19) — Atención, examen, diagnóstico y plan.
// RLS ENABLE+FORCE y `aplicar_marco_inmutabilidad` en la migración 0018.
// TODO(Q-25): modalidad reservada; la aplicación solo guarda `presencial`.
// TODO(Q-26): el auxiliar escribe borrador; el optómetra firma.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { TIPOS_ATENCION } from '../../dominio/valores-opticos';
import { pacientes } from './pacientes';
import { documentosFirma } from './firma';
import { sedes, tenants, usuarios } from './nucleo';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

const columnasFirma = {
  estado: text('estado').notNull().default('borrador'),
  contenido: text('contenido').notNull(),
  firmado_por: uuid('firmado_por').references(() => usuarios.id),
  firmado_en: timestamp('firmado_en', { withTimezone: true }),
  hash_contenido: text('hash_contenido'),
};

export const atenciones = pgTable(
  'atenciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    cita_id: uuid('cita_id'),
    profesional_id: uuid('profesional_id')
      .notNull()
      .references(() => usuarios.id),
    tipo: text('tipo').notNull(),
    modalidad: text('modalidad').notNull().default('presencial'),
    folio: integer('folio'),
    fecha_atencion: timestamp('fecha_atencion', { withTimezone: true }).notNull().defaultNow(),
    schema_version: integer('schema_version').notNull().default(1),
    firma_documento_id: uuid('firma_documento_id').references(() => documentosFirma.id),
    version_borrador: integer('version_borrador').notNull().default(1),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    ...columnasFirma,
  },
  (tabla) => [
    index('atenciones_tenant_id_idx').on(tabla.tenant_id),
    index('atenciones_paciente_id_idx').on(tabla.paciente_id),
    uniqueIndex('atenciones_paciente_folio_unico').on(tabla.paciente_id, tabla.folio).where(sql`${tabla.folio} is not null`),
    check('atenciones_tipo_valido', sql`${tabla.tipo} in (${listaSql(TIPOS_ATENCION)})`),
    check('atenciones_modalidad_valida', sql`${tabla.modalidad} in ('presencial', 'telemedicina')`),
    check('atenciones_estado_valido', sql`${tabla.estado} in ('borrador', 'firmado')`),
    check('atenciones_schema_version', sql`${tabla.schema_version} >= 1`),
  ],
);

export const examenesOptometricos = pgTable(
  'examenes_optometricos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    esfera_od: numeric('esfera_od', { precision: 6, scale: 2 }),
    cilindro_od: numeric('cilindro_od', { precision: 6, scale: 2 }),
    eje_od: integer('eje_od'),
    adicion_od: numeric('adicion_od', { precision: 4, scale: 2 }),
    agudeza_od: numeric('agudeza_od', { precision: 4, scale: 2 }),
    esfera_oi: numeric('esfera_oi', { precision: 6, scale: 2 }),
    cilindro_oi: numeric('cilindro_oi', { precision: 6, scale: 2 }),
    eje_oi: integer('eje_oi'),
    adicion_oi: numeric('adicion_oi', { precision: 4, scale: 2 }),
    agudeza_oi: numeric('agudeza_oi', { precision: 4, scale: 2 }),
    dip: numeric('dip', { precision: 5, scale: 2 }),
    dip_monocular_od: numeric('dip_monocular_od', { precision: 5, scale: 2 }),
    dip_monocular_oi: numeric('dip_monocular_oi', { precision: 5, scale: 2 }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    ...columnasFirma,
  },
  (tabla) => [
    index('examenes_optometricos_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('examenes_optometricos_atencion_unica').on(tabla.atencion_id),
    check('examenes_optometricos_estado_valido', sql`${tabla.estado} in ('borrador', 'firmado')`),
  ],
);

export const diagnosticos = pgTable(
  'diagnosticos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    codigo_cie10: text('codigo_cie10').notNull(),
    descripcion: text('descripcion').notNull(),
    principal: boolean('principal').notNull().default(false),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    ...columnasFirma,
  },
  (tabla) => [
    index('diagnosticos_tenant_id_idx').on(tabla.tenant_id),
    index('diagnosticos_atencion_id_idx').on(tabla.atencion_id),
    uniqueIndex('diagnosticos_principal_unico').on(tabla.atencion_id).where(sql`${tabla.principal} = true`),
    check('diagnosticos_estado_valido', sql`${tabla.estado} in ('borrador', 'firmado')`),
    check('diagnosticos_codigo_formato', sql`${tabla.codigo_cie10} ~ '^[A-Z0-9][A-Z0-9.\\-]{0,31}$'`),
    check('diagnosticos_descripcion_no_vacia', sql`length(btrim(${tabla.descripcion})) > 0`),
  ],
);

export const planesManejo = pgTable(
  'planes_manejo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    conducta: text('conducta').notNull(),
    recomendaciones: text('recomendaciones'),
    remision: text('remision'),
    proximo_control: date('proximo_control', { mode: 'string' }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    ...columnasFirma,
  },
  (tabla) => [
    index('planes_manejo_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('planes_manejo_atencion_unica').on(tabla.atencion_id),
    check('planes_manejo_estado_valido', sql`${tabla.estado} in ('borrador', 'firmado')`),
    check('planes_manejo_conducta_no_vacia', sql`length(btrim(${tabla.conducta})) > 0`),
  ],
);
