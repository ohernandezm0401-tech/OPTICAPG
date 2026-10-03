// SEG-11 (T29) — Incidentes de plataforma y aviso por óptica.
// `incidentes` no lleva tenant_id: lo opera un rol de plataforma.
// `incidentes_tenants` y `notificaciones_internas` sí, con RLS.
// TODO(Q-07): aviso_optica_horas nace nulo.
// TODO(Q-32): sin festivos cargados, el plazo excluye solo sábado y domingo.
import { sql } from 'drizzle-orm';
import { boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants } from './nucleo';

export const ESTADOS_INCIDENTE_TABLA = [
  'detectado',
  'contenido',
  'notificado_responsable',
  'reportado_sic',
  'cerrado',
] as const;

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const parametrosIncidente = pgTable(
  'parametros_incidente',
  {
    clave: text('clave').primaryKey(),
    valor: text('valor'),
    fuente: text('fuente'),
    rotulo: text('rotulo').notNull(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check('parametros_incidente_clave', sql`${tabla.clave} = 'plazo_sic_dias_habiles'`),
    check(
      'parametros_incidente_forma',
      sql`${tabla.valor} ~ '^[1-9][0-9]{0,2}$' AND ${tabla.rotulo} = 'verificado' AND ${tabla.fuente} IS NOT NULL`,
    ),
  ],
);

export const operadoresPlataforma = pgTable(
  'operadores_plataforma',
  {
    usuario_id: uuid('usuario_id').primaryKey(),
    rol: text('rol').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [check('operadores_plataforma_rol', sql`${tabla.rol} in ('owner_plataforma', 'soporte_plataforma')`)],
);

export const incidentes = pgTable(
  'incidentes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    detectado_en: timestamp('detectado_en', { withTimezone: true }).notNull(),
    dia_deteccion: date('dia_deteccion', { mode: 'string' }).notNull(),
    descripcion: text('descripcion').notNull(),
    alcance: text('alcance').notNull(),
    datos_afectados: text('datos_afectados').notNull(),
    severidad: text('severidad').notNull(),
    causa: text('causa'),
    contencion: text('contencion'),
    cierre_nota: text('cierre_nota'),
    estado: text('estado').notNull().default('detectado'),
    notif_responsable_en: timestamp('notif_responsable_en', { withTimezone: true }),
    reporte_sic_en: timestamp('reporte_sic_en', { withTimezone: true }),
    cerrado_en: timestamp('cerrado_en', { withTimezone: true }),
    plazo_sic: date('plazo_sic', { mode: 'string' }).notNull(),
    plazo_sic_dias: integer('plazo_sic_dias').notNull(),
    fuente_plazo: text('fuente_plazo').notNull(),
    festivos_cargados: boolean('festivos_cargados').notNull(),
    aviso_festivos: text('aviso_festivos'),
    festivos_aplicados: jsonb('festivos_aplicados').notNull(),
    creado_por: uuid('creado_por'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check('incidentes_estado', sql`${tabla.estado} in (${listaSql(ESTADOS_INCIDENTE_TABLA)})`),
    check('incidentes_plazo_positivo', sql`${tabla.plazo_sic_dias} > 0`),
  ],
);

export const alertasIncidente = pgTable(
  'alertas_incidente',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incidente_id: uuid('incidente_id')
      .notNull()
      .references(() => incidentes.id),
    codigo: text('codigo').notNull(),
    dias_habiles_antes: integer('dias_habiles_antes').notNull(),
    fecha: date('fecha', { mode: 'string' }).notNull(),
    creada_en: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('alertas_incidente_codigo_unico').on(tabla.incidente_id, tabla.codigo),
    check('alertas_incidente_codigo', sql`${tabla.codigo} in ('T-5', 'T-2', 'T-0')`),
    check('alertas_incidente_dias', sql`${tabla.dias_habiles_antes} in (5, 2, 0)`),
  ],
);

export const incidentesTenants = pgTable(
  'incidentes_tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    incidente_id: uuid('incidente_id')
      .notNull()
      .references(() => incidentes.id),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    notificado_en: timestamp('notificado_en', { withTimezone: true }).notNull(),
    aviso_borrador: text('aviso_borrador').notNull(),
    dia_deteccion: date('dia_deteccion', { mode: 'string' }).notNull(),
    plazo_sic: date('plazo_sic', { mode: 'string' }).notNull(),
    plazo_sic_dias: integer('plazo_sic_dias').notNull(),
    fuente_plazo: text('fuente_plazo').notNull(),
    festivos_cargados: boolean('festivos_cargados').notNull(),
    aviso_festivos: text('aviso_festivos'),
    alertas: jsonb('alertas').notNull(),
    descripcion: text('descripcion').notNull(),
    alcance: text('alcance').notNull(),
    datos_afectados: text('datos_afectados').notNull(),
    severidad: text('severidad').notNull(),
    estado: text('estado').notNull(),
  },
  (tabla) => [
    index('incidentes_tenants_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('incidentes_tenants_unico').on(tabla.incidente_id, tabla.tenant_id),
  ],
);

export const notificacionesInternas = pgTable(
  'notificaciones_internas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id').notNull(),
    incidente_id: uuid('incidente_id').notNull(),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    cuerpo: text('cuerpo').notNull(),
    creada_en: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('notificaciones_internas_tenant_id_idx').on(tabla.tenant_id),
    check('notificaciones_internas_tipo', sql`${tabla.tipo} = 'aviso_incidente'`),
  ],
);
