// OPT-02 (T21) — Adenda de la atención firmada. RLS ENABLE+FORCE y
// `aplicar_marco_inmutabilidad` en la migración 0020. El original no se
// actualiza: esta fila solo referencia `atenciones.id`.
// `motivo` y `nuevo_valor` se guardan cifrados (contrato T11).
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { CAMPOS_REFRACCION_ADENDA } from '../../dominio/adenda-atencion';
import { atenciones } from './atenciones';
import { documentosFirma } from './firma';
import { tenants, usuarios } from './nucleo';

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((valor) => `'${valor}'`).join(', '));

export const atencionAdendas = pgTable(
  'atencion_adendas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    atencion_id: uuid('atencion_id')
      .notNull()
      .references(() => atenciones.id),
    numero: integer('numero').notNull(),
    campo_ref: text('campo_ref').notNull(),
    valor_anterior_ref: text('valor_anterior_ref').notNull(),
    nuevo_valor: text('nuevo_valor').notNull(),
    motivo: text('motivo').notNull(),
    autor_id: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id),
    tipo_nota: text('tipo_nota').notNull(),
    estado: text('estado').notNull().default('borrador'),
    contenido: text('contenido').notNull(),
    firmado_por: uuid('firmado_por').references(() => usuarios.id),
    firmado_en: timestamp('firmado_en', { withTimezone: true }),
    hash_contenido: text('hash_contenido'),
    firma_documento_id: uuid('firma_documento_id')
      .notNull()
      .references(() => documentosFirma.id),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('atencion_adendas_tenant_id_idx').on(tabla.tenant_id),
    index('atencion_adendas_atencion_id_idx').on(tabla.atencion_id),
    uniqueIndex('atencion_adendas_numero_unico').on(tabla.atencion_id, tabla.numero),
    check('atencion_adendas_numero_positivo', sql`${tabla.numero} >= 1`),
    check('atencion_adendas_campo_valido', sql`${tabla.campo_ref} in (${listaSql(CAMPOS_REFRACCION_ADENDA)})`),
    check('atencion_adendas_tipo_valido', sql`${tabla.tipo_nota} in ('correccion', 'complementaria')`),
    check('atencion_adendas_estado_valido', sql`${tabla.estado} in ('borrador', 'firmada')`),
    check('atencion_adendas_motivo_no_vacio', sql`length(btrim(${tabla.motivo})) > 0`),
    check('atencion_adendas_valor_no_vacio', sql`length(btrim(${tabla.nuevo_valor})) > 0`),
    check(
      'atencion_adendas_ref_valida',
      sql`${tabla.valor_anterior_ref} ~ '^(examenes_optometricos\\.[a-z_]+|atencion_adendas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'`,
    ),
  ],
);
