// ASE-01 / SEG-06 (T13) — Pacientes, representantes y el vínculo histórico.
// `num_doc` guarda el sobre de T11 (no el documento en claro). La búsqueda
// exacta usa `num_doc_hash` (HMAC). RLS ENABLE+FORCE en la migración 0012.
// TODO(Q-17): `negativa_autorizacion` registra la negativa y no bloquea
// la identificación. BORRADOR – requiere revisión jurídica.
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { ESTADOS_PACIENTE, TIPOS_DOCUMENTO, TIPOS_VINCULACION } from '../../dominio/pacientes';
import { sedes, tenants } from './nucleo';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const pacientes = pgTable(
  'pacientes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    num_hc: integer('num_hc').notNull(),
    tipo_doc: text('tipo_doc').notNull(),
    num_doc: text('num_doc').notNull(),
    num_doc_hash: text('num_doc_hash').notNull(),
    nombres: text('nombres').notNull(),
    apellidos: text('apellidos').notNull(),
    fecha_nacimiento: date('fecha_nacimiento').notNull(),
    sexo: text('sexo').notNull(),
    estado_civil: text('estado_civil').notNull(),
    ocupacion: text('ocupacion').notNull(),
    direccion: text('direccion').notNull(),
    telefono: text('telefono').notNull(),
    email: text('email'),
    acompanante: text('acompanante').notNull(),
    responsable: text('responsable').notNull(),
    aseguradora: text('aseguradora').notNull(),
    tipo_vinculacion: text('tipo_vinculacion').notNull(),
    sede_alta_id: uuid('sede_alta_id')
      .notNull()
      .references(() => sedes.id),
    fecha_ultima_atencion: date('fecha_ultima_atencion'),
    estado: text('estado').notNull().default('activo'),
    fusionado_en_id: uuid('fusionado_en_id'),
    negativa_autorizacion: boolean('negativa_autorizacion').notNull().default(false),
    negativa_autorizacion_en: timestamp('negativa_autorizacion_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('pacientes_tenant_id_idx').on(tabla.tenant_id),
    index('pacientes_sede_alta_id_idx').on(tabla.sede_alta_id),
    uniqueIndex('pacientes_num_hc_unico').on(tabla.tenant_id, tabla.num_hc),
    uniqueIndex('pacientes_documento_activo_unico')
      .on(tabla.tenant_id, tabla.tipo_doc, tabla.num_doc_hash)
      .where(sql`${tabla.estado} <> 'fusionado'`),
    check('pacientes_tipo_doc_valido', sql`${tabla.tipo_doc} in (${listaSql(TIPOS_DOCUMENTO)})`),
    check('pacientes_estado_valido', sql`${tabla.estado} in (${listaSql(ESTADOS_PACIENTE)})`),
    check('pacientes_vinculacion_valida', sql`${tabla.tipo_vinculacion} in (${listaSql(TIPOS_VINCULACION)})`),
    check('pacientes_num_hc_positivo', sql`${tabla.num_hc} > 0`),
    check('pacientes_num_doc_hash', sql`${tabla.num_doc_hash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const secuenciasHc = pgTable(
  'secuencias_hc',
  {
    tenant_id: uuid('tenant_id')
      .primaryKey()
      .references(() => tenants.id),
    ultimo: integer('ultimo').notNull(),
  },
  (tabla) => [check('secuencias_hc_no_negativo', sql`${tabla.ultimo} >= 0`)],
);

export const representantes = pgTable(
  'representantes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    nombre: text('nombre').notNull(),
    tipo_doc: text('tipo_doc').notNull(),
    num_doc: text('num_doc').notNull(),
    num_doc_hash: text('num_doc_hash').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('representantes_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('representantes_documento_unico').on(tabla.tenant_id, tabla.tipo_doc, tabla.num_doc_hash),
    check('representantes_tipo_doc_valido', sql`${tabla.tipo_doc} in (${listaSql(TIPOS_DOCUMENTO)})`),
    check('representantes_num_doc_hash', sql`${tabla.num_doc_hash} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const pacientesRepresentantes = pgTable(
  'pacientes_representantes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    representante_id: uuid('representante_id')
      .notNull()
      .references(() => representantes.id),
    parentesco: text('parentesco').notNull(),
    contacto: text('contacto').notNull(),
    vigente: boolean('vigente').notNull().default(true),
    es_quien_firmo: boolean('es_quien_firmo').notNull().default(true),
    escucho_menor: boolean('escucho_menor'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    cerrado_en: timestamp('cerrado_en', { withTimezone: true }),
  },
  (tabla) => [
    index('pacientes_representantes_tenant_id_idx').on(tabla.tenant_id),
    index('pacientes_representantes_paciente_id_idx').on(tabla.paciente_id),
  ],
);

// Diagnóstico mínimo para la prueba R de ASE-01. El modelo clínico completo
// es OPT-01. La descripción va cifrada (T11).
export const pacienteDiagnosticos = pgTable(
  'paciente_diagnosticos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    descripcion_cifrada: text('descripcion_cifrada').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('paciente_diagnosticos_tenant_id_idx').on(tabla.tenant_id),
    index('paciente_diagnosticos_paciente_id_idx').on(tabla.paciente_id),
  ],
);
