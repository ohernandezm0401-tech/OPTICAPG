// ADM-01 (T16) — Certificado de la sede. La sede misma se extiende en `nucleo.ts`
// (`director_cientifico_id`, `responsable_tecnovigilancia_id`, `certificado_numero`,
// `certificado_vence`). `tipo` sigue siendo el tipo de establecimiento.
// TODO(Q-19), TODO(Q-20), TODO(Q-01): ver `dominio/sedes.ts`.
import { check, date, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { sedes, tenants } from './nucleo';

export const TIPOS_CERTIFICADO_SEDE = ['dispensacion', 'adecuacion', 'produccion'] as const;

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(', '));

export const certificadosSede = pgTable(
  'certificados_sede',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    numero: text('numero').notNull(),
    entidad: text('entidad'),
    expedido: date('expedido', { mode: 'string' }),
    vence: date('vence', { mode: 'string' }).notNull(),
    adjunto_id: uuid('adjunto_id'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('certificados_sede_tenant_id_idx').on(tabla.tenant_id),
    index('certificados_sede_sede_id_idx').on(tabla.sede_id),
    uniqueIndex('certificados_sede_tipo_unico').on(tabla.sede_id, tabla.tipo),
    check('certificados_sede_tipo_valido', sql`${tabla.tipo} in (${listaSql(TIPOS_CERTIFICADO_SEDE)})`),
  ],
);
