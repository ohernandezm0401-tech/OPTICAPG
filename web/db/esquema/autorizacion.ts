// SEG-02 (T09) — Excepciones de permiso e intentos de acceso denegado.
// Tablas nuevas con tenant_id: RLS ENABLE + FORCE en la migración 0008.
// Solo datos sintéticos. El intento persistido también entra en `auditoria` (T10).
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { sedes, tenants, usuarios } from './nucleo';

const ACCIONES_PERMISO = ['crear', 'leer', 'actualizar', 'firmar', 'anular', 'exportar', 'solicitar'] as const;
const RECURSOS = [
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12',
  'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24',
] as const;

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(', '));

export const permisosExtra = pgTable(
  'permisos_extra',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    sede_id: uuid('sede_id').references(() => sedes.id, { onDelete: 'cascade' }),
    recurso: text('recurso').notNull(),
    accion: text('accion').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('permisos_extra_tenant_id_idx').on(tabla.tenant_id),
    index('permisos_extra_usuario_id_idx').on(tabla.usuario_id),
    index('permisos_extra_sede_id_idx').on(tabla.sede_id),
    uniqueIndex('permisos_extra_unico').on(tabla.usuario_id, tabla.sede_id, tabla.recurso, tabla.accion),
    check('permisos_extra_recurso_valido', sql`${tabla.recurso} in (${listaSql(RECURSOS)})`),
    check('permisos_extra_accion_valida', sql`${tabla.accion} in (${listaSql(ACCIONES_PERMISO)})`),
  ],
);

export const intentosAutorizacion = pgTable(
  'intentos_autorizacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    rol: text('rol').notNull(),
    sede_id: uuid('sede_id').references(() => sedes.id),
    recurso: text('recurso').notNull(),
    recurso_id: text('recurso_id'),
    accion: text('accion').notNull(),
    resultado: text('resultado').notNull().default('denegado'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('intentos_autorizacion_tenant_id_idx').on(tabla.tenant_id),
    index('intentos_autorizacion_usuario_id_idx').on(tabla.usuario_id),
    check('intentos_autorizacion_resultado_valido', sql`${tabla.resultado} = 'denegado'`),
    check(
      'intentos_autorizacion_accion_valida',
      sql`${tabla.accion} in (${listaSql([...ACCIONES_PERMISO, 'cambiar_sede'])})`,
    ),
  ],
);

export type PermisoExtraFila = typeof permisosExtra.$inferSelect;
export type IntentoAutorizacionFila = typeof intentosAutorizacion.$inferSelect;
