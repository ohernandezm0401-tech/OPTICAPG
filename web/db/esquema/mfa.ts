// SEG-01 (T08) — Segundo factor. Español snake_case. Toda tabla con
// tenant_id nace con RLS ENABLE+FORCE (migración posterior). El secreto TOTP
// pasa por `ProteccionSecretoMfa` (TODO T11: hoy sin cifrado envelope).
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { tenants, usuarios } from './nucleo';

export const PROPOSITOS_DESAFIO = [
  'enrolar',
  'verificar',
  'reautenticar',
  'passkey_registro',
  'passkey_auth',
] as const;

export const factoresTotp = pgTable(
  'factores_totp',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    secreto_protegido: text('secreto_protegido').notNull(),
    ultimo_paso: integer('ultimo_paso'),
    confirmado_en: timestamp('confirmado_en', { withTimezone: true }).notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('factores_totp_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('factores_totp_usuario_unico').on(tabla.usuario_id),
  ],
);

export const codigosRecuperacion = pgTable(
  'codigos_recuperacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    hash_codigo: text('hash_codigo').notNull(),
    usado_en: timestamp('usado_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('codigos_recuperacion_tenant_id_idx').on(tabla.tenant_id),
    index('codigos_recuperacion_usuario_id_idx').on(tabla.usuario_id),
  ],
);

export const credencialesWebauthn = pgTable(
  'credenciales_webauthn',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    credencial_id: text('credencial_id').notNull(),
    clave_publica: text('clave_publica').notNull(),
    contador: integer('contador').notNull().default(0),
    transportes: text('transportes'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    ultimo_uso_en: timestamp('ultimo_uso_en', { withTimezone: true }),
  },
  (tabla) => [
    index('credenciales_webauthn_tenant_id_idx').on(tabla.tenant_id),
    index('credenciales_webauthn_usuario_id_idx').on(tabla.usuario_id),
    uniqueIndex('credenciales_webauthn_credencial_unica').on(tabla.credencial_id),
    check('credenciales_webauthn_contador_no_negativo', sql`${tabla.contador} >= 0`),
  ],
);

export const desafiosMfa = pgTable(
  'desafios_mfa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    proposito: text('proposito').notNull(),
    secreto_pendiente: text('secreto_pendiente'),
    codigos_hash: jsonb('codigos_hash').$type<string[]>(),
    codigos_entregados: integer('codigos_entregados').notNull().default(0),
    desafio_webauthn: text('desafio_webauthn'),
    direccion_ip: text('direccion_ip'),
    expira_en: timestamp('expira_en', { withTimezone: true }).notNull(),
    consumido_en: timestamp('consumido_en', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('desafios_mfa_tenant_id_idx').on(tabla.tenant_id),
    index('desafios_mfa_usuario_id_idx').on(tabla.usuario_id),
    check(
      'desafios_mfa_proposito_valido',
      sql`${tabla.proposito} in ('enrolar', 'verificar', 'reautenticar', 'passkey_registro', 'passkey_auth')`,
    ),
  ],
);
