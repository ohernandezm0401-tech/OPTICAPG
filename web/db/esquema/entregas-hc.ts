// OPT-06 (T25) — Registro de la copia gratuita. RLS ENABLE+FORCE en la
// migración 0024. `costo_cop` solo admite 0. `expira_en` no tiene plazo
// sembrado. TODO(Q-07). TODO(Q-22).
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { anexos } from './cifrado';
import { sedes, tenants, usuarios } from './nucleo';
import { pacientes, representantes } from './pacientes';

export const entregasHc = pgTable(
  'entregas_hc',
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
    solicitante: text('solicitante').notNull(),
    representante_id: uuid('representante_id').references(() => representantes.id),
    medio: text('medio').notNull(),
    estado: text('estado').notNull().default('solicitada'),
    archivo_id: uuid('archivo_id').references(() => anexos.id),
    hash_pdf: text('hash_pdf'),
    entregada_en: timestamp('entregada_en', { withTimezone: true }),
    entregada_por: uuid('entregada_por').references(() => usuarios.id),
    costo_cop: integer('costo_cop').notNull().default(0),
    expira_en: timestamp('expira_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('entregas_hc_tenant_id_idx').on(tabla.tenant_id),
    index('entregas_hc_paciente_id_idx').on(tabla.paciente_id),
    check('entregas_hc_solicitante_valido', sql`${tabla.solicitante} in ('titular', 'representante')`),
    check('entregas_hc_medio_electronico', sql`${tabla.medio} = 'electronico'`),
    check('entregas_hc_estado_valido', sql`${tabla.estado} in ('solicitada', 'generada', 'entregada')`),
    check('entregas_hc_gratuita', sql`${tabla.costo_cop} = 0`),
  ],
);

export const codigosEntregaHc = pgTable(
  'codigos_entrega_hc',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id),
    entrega_id: uuid('entrega_id')
      .notNull()
      .references(() => entregasHc.id),
    codigo_hash: text('codigo_hash').notNull(),
    canal: text('canal').notNull(),
    expira_en: timestamp('expira_en', { withTimezone: true }).notNull(),
    usado_en: timestamp('usado_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('codigos_entrega_hc_tenant_id_idx').on(tabla.tenant_id),
    index('codigos_entrega_hc_entrega_id_idx').on(tabla.entrega_id),
    check('codigos_entrega_hc_canal', sql`${tabla.canal} = 'correo'`),
  ],
);
