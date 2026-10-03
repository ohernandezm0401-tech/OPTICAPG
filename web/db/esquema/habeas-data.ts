// SEG-07 (T26) — Solicitudes del titular, bitácora, banderas e historial
// demográfico. RLS ENABLE+FORCE en la migración 0025.
// TODO(Q-07): la causa de supresión clínica no guarda un plazo en años.
// TODO(Q-17): registrar la solicitud no resuelve la base legal de la HC.
// TODO(Q-32): `aviso_festivos` se llena si el tenant no cargó festivos.
import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { atenciones } from './atenciones';
import { atencionAdendas } from './atencion-adendas';
import { sedes, tenants, usuarios } from './nucleo';
import { pacientes } from './pacientes';

export const solicitudesTitular = pgTable(
  'solicitudes_titular',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    paciente_id: uuid('paciente_id').references(() => pacientes.id),
    radicado: text('radicado').notNull(),
    tipo: text('tipo').notNull(),
    canal: text('canal').notNull(),
    ambito: text('ambito'),
    descripcion: text('descripcion').notNull(),
    radicada_en: timestamp('radicada_en', { withTimezone: true }).notNull(),
    vence_en: date('vence_en', { mode: 'string' }).notNull(),
    plazo_dias_habiles: integer('plazo_dias_habiles').notNull(),
    festivos_cargados: boolean('festivos_cargados').notNull(),
    aviso_festivos: text('aviso_festivos'),
    estado: text('estado').notNull().default('radicada'),
    recurso: text('recurso'),
    recurso_id: uuid('recurso_id'),
    atencion_id: uuid('atencion_id').references(() => atenciones.id),
    adenda_id: uuid('adenda_id').references(() => atencionAdendas.id),
    campo_ref: text('campo_ref'),
    marca_limite_en: timestamp('marca_limite_en', { withTimezone: true }),
    marcada_en: timestamp('marcada_en', { withTimezone: true }),
    marcada_por: uuid('marcada_por').references(() => usuarios.id),
    prorroga_hasta: date('prorroga_hasta', { mode: 'string' }),
    respuesta: text('respuesta'),
    respondida_en: timestamp('respondida_en', { withTimezone: true }),
    respondida_por: uuid('respondida_por').references(() => usuarios.id),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('solicitudes_titular_radicado_unico').on(tabla.tenant_id, tabla.radicado),
    index('solicitudes_titular_tenant_id_idx').on(tabla.tenant_id),
    index('solicitudes_titular_paciente_id_idx').on(tabla.paciente_id),
    check(
      'solicitudes_titular_tipo',
      sql`${tabla.tipo} in ('consulta', 'reclamo', 'rectificacion', 'supresion', 'revocatoria')`,
    ),
    check('solicitudes_titular_canal', sql`${tabla.canal} in ('presencial', 'escrito', 'electronico')`),
    check('solicitudes_titular_ambito', sql`${tabla.ambito} is null or ${tabla.ambito} in ('clinico', 'demografico')`),
    check(
      'solicitudes_titular_estado',
      sql`${tabla.estado} in ('radicada', 'en_tramite', 'respondida', 'prorrogada', 'cerrada')`,
    ),
    check('solicitudes_titular_plazo_positivo', sql`${tabla.plazo_dias_habiles} > 0`),
  ],
);

export const bitacoraRespuestasTitular = pgTable(
  'bitacora_respuestas_titular',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    solicitud_id: uuid('solicitud_id')
      .notNull()
      .references(() => solicitudesTitular.id),
    tipo: text('tipo').notNull(),
    texto: text('texto').notNull(),
    registrada_en: timestamp('registrada_en', { withTimezone: true }).notNull(),
    registrada_por: uuid('registrada_por')
      .notNull()
      .references(() => usuarios.id),
  },
  (tabla) => [
    index('bitacora_respuestas_titular_tenant_id_idx').on(tabla.tenant_id),
    index('bitacora_respuestas_titular_solicitud_id_idx').on(tabla.solicitud_id),
    check(
      'bitacora_respuestas_titular_tipo',
      sql`${tabla.tipo} in ('respuesta', 'prorroga', 'marca', 'alerta', 'bloqueo_supresion')`,
    ),
  ],
);

export const banderasDato = pgTable(
  'banderas_dato',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    recurso: text('recurso').notNull(),
    recurso_id: uuid('recurso_id').notNull(),
    tipo: text('tipo').notNull(),
    leyenda: text('leyenda').notNull(),
    desde: timestamp('desde', { withTimezone: true }).notNull(),
    hasta: timestamp('hasta', { withTimezone: true }),
    solicitud_id: uuid('solicitud_id')
      .notNull()
      .references(() => solicitudesTitular.id),
  },
  (tabla) => [
    index('banderas_dato_tenant_id_idx').on(tabla.tenant_id),
    index('banderas_dato_recurso_idx').on(tabla.recurso, tabla.recurso_id),
    check('banderas_dato_tipo', sql`${tabla.tipo} = 'reclamo_en_tramite'`),
    check('banderas_dato_leyenda', sql`${tabla.leyenda} = 'reclamo en trámite'`),
  ],
);

export const historialDatosDemograficos = pgTable(
  'historial_datos_demograficos',
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
    solicitud_id: uuid('solicitud_id')
      .notNull()
      .references(() => solicitudesTitular.id),
    campo: text('campo').notNull(),
    valor_anterior: text('valor_anterior').notNull(),
    valor_nuevo: text('valor_nuevo').notNull(),
    registrado_en: timestamp('registrado_en', { withTimezone: true }).notNull(),
    registrado_por: uuid('registrado_por')
      .notNull()
      .references(() => usuarios.id),
  },
  (tabla) => [
    index('historial_datos_demograficos_tenant_id_idx').on(tabla.tenant_id),
    index('historial_datos_demograficos_paciente_id_idx').on(tabla.paciente_id),
  ],
);

export const secuenciasRadicadoHd = pgTable(
  'secuencias_radicado_hd',
  {
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    anio: integer('anio').notNull(),
    ultimo: integer('ultimo').notNull(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.tenant_id, tabla.anio] }),
    check('secuencias_radicado_hd_ultimo', sql`${tabla.ultimo} >= 0`),
  ],
);
