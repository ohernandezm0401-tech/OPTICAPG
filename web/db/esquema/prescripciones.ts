// OPT-05 (T23) — Prescripción del art. 17.
// RLS ENABLE+FORCE y `aplicar_marco_inmutabilidad` en la migración 0022.
// `sustituida` y `vencida` no son estados almacenados: la fila firmada no se
// actualiza (T12). TODO(Q-18): `vigencia_hasta` no tiene valor por defecto.
import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { TIPOS_PRESCRIPCION } from '../../dominio/prescripcion';
import { documentosFirma, firmas } from './firma';
import { tenants, usuarios, sedes } from './nucleo';
import { atenciones } from './atenciones';
import { pacientes } from './pacientes';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const secuenciasPrescripcion = pgTable(
  'secuencias_prescripcion',
  {
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    anio: integer('anio').notNull(),
    ultimo: integer('ultimo').notNull(),
  },
  (tabla) => [
    check('secuencias_prescripcion_anio', sql`${tabla.anio} between 2000 and 9999`),
    check('secuencias_prescripcion_ultimo', sql`${tabla.ultimo} >= 0 and ${tabla.ultimo} <= 999999`),
  ],
);

export const prescripciones = pgTable(
  'prescripciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    paciente_id: uuid('paciente_id')
      .notNull()
      .references(() => pacientes.id),
    profesional_id: uuid('profesional_id')
      .notNull()
      .references(() => usuarios.id),
    numero: text('numero'),
    anio: integer('anio'),
    consecutivo: integer('consecutivo'),
    tipo: text('tipo').notNull(),
    estado: text('estado').notNull().default('borrador'),
    contenido: text('contenido').notNull(),
    firmado_por: uuid('firmado_por').references(() => usuarios.id),
    firmado_en: timestamp('firmado_en', { withTimezone: true }),
    hash_contenido: text('hash_contenido'),
    sustituye_a: uuid('sustituye_a'),
    prestador_nombre: text('prestador_nombre'),
    direccion: text('direccion'),
    telefono: text('telefono'),
    correo: text('correo'),
    lugar: text('lugar'),
    fecha: date('fecha', { mode: 'string' }),
    paciente_nombre: text('paciente_nombre'),
    paciente_documento: text('paciente_documento'),
    numero_hc: text('numero_hc'),
    tipo_usuario: text('tipo_usuario'),
    dispositivo: text('dispositivo'),
    agudeza_visual: text('agudeza_visual'),
    forma_uso: text('forma_uso'),
    distancia_pupilar: text('distancia_pupilar'),
    filtro: text('filtro'),
    duracion_tratamiento: text('duracion_tratamiento'),
    cantidad_num: integer('cantidad_num'),
    cantidad_letras: text('cantidad_letras'),
    indicaciones: text('indicaciones'),
    // TODO(Q-18): sin default.
    vigencia_hasta: date('vigencia_hasta', { mode: 'string' }),
    nombre_prescriptor: text('nombre_prescriptor'),
    registro_profesional: text('registro_profesional'),
    firma_id: uuid('firma_id').references(() => firmas.id),
    documento_firma_id: uuid('documento_firma_id').references(() => documentosFirma.id),
    hash_pdf: text('hash_pdf'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('prescripciones_tenant_id_idx').on(tabla.tenant_id),
    index('prescripciones_atencion_id_idx').on(tabla.atencion_id),
    index('prescripciones_paciente_id_idx').on(tabla.paciente_id),
    uniqueIndex('prescripciones_numero_unico').on(tabla.tenant_id, tabla.numero).where(sql`${tabla.numero} is not null`),
    uniqueIndex('prescripciones_sustituye_unica').on(tabla.sustituye_a).where(sql`${tabla.sustituye_a} is not null`),
    check('prescripciones_tipo_valido', sql`${tabla.tipo} in (${listaSql(TIPOS_PRESCRIPCION)})`),
    check('prescripciones_estado_valido', sql`${tabla.estado} in ('borrador', 'firmada')`),
    check('prescripciones_numero_formato', sql`${tabla.numero} is null or ${tabla.numero} ~ '^RX-[0-9]{4}-[0-9]{6}$'`),
    check('prescripciones_hash_pdf', sql`${tabla.hash_pdf} is null or ${tabla.hash_pdf} ~ '^[a-f0-9]{64}$'`),
    check(
      'prescripciones_cantidad_rango',
      sql`${tabla.cantidad_num} is null or (${tabla.cantidad_num} >= 1 and ${tabla.cantidad_num} <= 999999)`,
    ),
  ],
);
