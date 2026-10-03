// SEG-01 (T07) — Historial de contraseñas y eventos de autenticación.
// Español `snake_case`. Toda tabla con `tenant_id` nace con RLS ENABLE+FORCE
// (migración 0005). El evento de un correo sin cuenta lleva `tenant_id` nulo
// y solo lo inserta la función de servidor; la política del rol de aplicación
// no lo muestra. Nunca se guarda la contraseña en claro: solo hashes Argon2id
// en `historial_contrasenas` y el tipo de evento (sin secreto) aquí.
// MFA/TOTP es la tarea T08: esta tabla no guarda secretos TOTP.
import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { tenants, usuarios } from './nucleo';

export const TIPOS_EVENTO_AUTENTICACION = [
  'inicio_fallido',
  'cuenta_bloqueada',
  'inicio_ok',
  'sesion_revocada',
  'sesion_rotada',
  'cierre_todas',
  'limite_ip',
  'contrasena_actualizada',
] as const;

export const historialContrasenas = pgTable(
  'historial_contrasenas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    hash_password: text('hash_password').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('historial_contrasenas_tenant_id_idx').on(tabla.tenant_id),
    index('historial_contrasenas_usuario_id_idx').on(tabla.usuario_id),
  ],
);

export const eventosAutenticacion = pgTable(
  'eventos_autenticacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id').references(() => tenants.id),
    usuario_id: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    tipo: text('tipo').notNull(),
    correo: text('correo').notNull(),
    direccion_ip: text('direccion_ip'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('eventos_autenticacion_tenant_id_idx').on(tabla.tenant_id),
    index('eventos_autenticacion_usuario_id_idx').on(tabla.usuario_id),
    index('eventos_autenticacion_ip_idx').on(tabla.direccion_ip),
    check(
      'eventos_autenticacion_tipo_valido',
      sql`${tabla.tipo} in ('inicio_fallido', 'cuenta_bloqueada', 'inicio_ok', 'sesion_revocada', 'sesion_rotada', 'cierre_todas', 'limite_ip', 'contrasena_actualizada')`,
    ),
  ],
);

export type HistorialContrasena = typeof historialContrasenas.$inferSelect;
export type EventoAutenticacion = typeof eventosAutenticacion.$inferSelect;
