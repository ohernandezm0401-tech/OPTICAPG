// PLT-02 (T03) — Esquema núcleo en español `snake_case` (spec §17.1).
// Tablas: `tenants`, `sedes`, `usuarios`, `membresias` (usuario × sede × rol),
// `sesiones`. Convenciones (spec §17): `id uuid pk default gen_random_uuid()`,
// `tenant_id uuid not null` en toda tabla de negocio, `creado_en` /
// `actualizado_en timestamptz`, dinero en COP enteros (sin dinero en el
// núcleo). RLS y `withTenantTx` llegan con PLT-01 (siguiente tarea); este
// esquema deja `tenant_id` y los índices listos para esas políticas.
// TODO(Q-06): valor por defecto aplicado — PostgreSQL estándar + Drizzle, sin
// SDK propietario, de modo que el hosting sea intercambiable.
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Estados de la spec: PLT-03 (`onboarding → activo → suspendido → en_cierre →
// cerrado`) y SEG-01 (`invitado → activo → bloqueado → desactivado`).
export const ESTADOS_TENANT = ['onboarding', 'activo', 'suspendido', 'en_cierre', 'cerrado'] as const;

// Tipos de sede de ADM-01 / §10.3 (D. 1030/2007). Sin valores inventados.
export const TIPOS_SEDE = [
  'optica_con_consultorio',
  'optica_sin_consultorio',
  'profesional_independiente',
  'ips',
  'taller_optico',
  'laboratorio_oftalmico',
  'laboratorio_lc_protesis',
] as const;

export const ESTADOS_SEDE = ['activa', 'inactiva', 'en_cierre'] as const;

export const ESTADOS_USUARIO = ['invitado', 'activo', 'bloqueado', 'desactivado'] as const;

// Roles de la matriz §4.4 / §17.1 (los adicionales P1/P2 llegan después).
export const ROLES_SEDE = [
  'admin',
  'asesor',
  'optometra',
  'oftalmologo',
  'auxiliar_clinico',
  'tecnico_lab',
  'auditor',
] as const;

const listaSql = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(', '));

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    razon_social: text('razon_social').notNull(),
    nit: text('nit').notNull(),
    digito_verificacion: varchar('digito_verificacion', { length: 1 }),
    estado: text('estado').notNull().default('onboarding'),
    plan_id: text('plan_id'),
    politica_url: text('politica_url'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('tenants_nit_unico').on(tabla.nit),
    check('tenants_estado_valido', sql`${tabla.estado} in (${listaSql(ESTADOS_TENANT)})`),
  ],
);

export const sedes = pgTable(
  'sedes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    nombre: text('nombre').notNull(),
    ciudad: text('ciudad').notNull(),
    direccion: text('direccion'),
    // `tipo` es el tipo de establecimiento de ADM-01 (spec §10.3). No se
    // duplica como `tipo_establecimiento`: el prompt de T16 dice «laboratorio»
    // y la spec/AC-ADM-01-4 usan `laboratorio_oftalmico`. Se conserva este enum.
    tipo: text('tipo').notNull().default('optica_sin_consultorio'),
    // TODO(Q-20): código REPS libre. Sin catálogo ni valor por defecto.
    reps_codigo: text('reps_codigo'),
    // TODO(Q-19): director científico y responsable de tecnovigilancia. Sin
    // ellos la sede queda incompleta; no se bloquea la atención clínica.
    director_cientifico_id: uuid('director_cientifico_id'),
    responsable_tecnovigilancia_id: uuid('responsable_tecnovigilancia_id'),
    certificado_numero: text('certificado_numero'),
    certificado_vence: date('certificado_vence', { mode: 'string' }),
    estado: text('estado').notNull().default('activa'),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('sedes_tenant_id_idx').on(tabla.tenant_id),
    index('sedes_director_cientifico_idx').on(tabla.tenant_id, tabla.director_cientifico_id),
    check('sedes_tipo_valido', sql`${tabla.tipo} in (${listaSql(TIPOS_SEDE)})`),
    check('sedes_estado_valido', sql`${tabla.estado} in (${listaSql(ESTADOS_SEDE)})`),
  ],
);

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text('email').notNull(),
    hash_password: text('hash_password'),
    estado: text('estado').notNull().default('invitado'),
    // SEG-01 (T07): bloqueo progresivo. El primer bloqueo dura 15 min (spec).
    intentos_fallidos: integer('intentos_fallidos').notNull().default(0),
    nivel_bloqueo: integer('nivel_bloqueo').notNull().default(0),
    bloqueado_hasta: timestamp('bloqueado_hasta', { withTimezone: true }),
    ultimo_login: timestamp('ultimo_login', { withTimezone: true }),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('usuarios_tenant_id_idx').on(tabla.tenant_id),
    uniqueIndex('usuarios_tenant_email_unico').on(tabla.tenant_id, tabla.email),
    check('usuarios_estado_valido', sql`${tabla.estado} in (${listaSql(ESTADOS_USUARIO)})`),
    check('usuarios_intentos_no_negativos', sql`${tabla.intentos_fallidos} >= 0`),
    check('usuarios_nivel_bloqueo_no_negativo', sql`${tabla.nivel_bloqueo} >= 0`),
  ],
);

export const membresias = pgTable(
  'membresias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    sede_id: uuid('sede_id')
      .notNull()
      .references(() => sedes.id, { onDelete: 'cascade' }),
    rol: text('rol').notNull(),
    creado_en: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('membresias_tenant_id_idx').on(tabla.tenant_id),
    index('membresias_usuario_id_idx').on(tabla.usuario_id),
    index('membresias_sede_id_idx').on(tabla.sede_id),
    uniqueIndex('membresias_usuario_sede_rol_unica').on(tabla.usuario_id, tabla.sede_id, tabla.rol),
    check('membresias_rol_valido', sql`${tabla.rol} in (${listaSql(ROLES_SEDE)})`),
  ],
);

export const sesiones = pgTable(
  'sesiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    usuario_id: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    creada_en: timestamp('creada_en', { withTimezone: true }).notNull().defaultNow(),
    expira_en: timestamp('expira_en', { withTimezone: true }).notNull(),
    revocada_en: timestamp('revocada_en', { withTimezone: true }),
    ultima_actividad_en: timestamp('ultima_actividad_en', { withTimezone: true }).notNull().defaultNow(),
    // Minutos de inactividad. 15 en roles clínicos (SEG-01); se guarda en la fila.
    inactividad_minutos: integer('inactividad_minutos').notNull().default(15),
    direccion_ip: text('direccion_ip'),
    agente: text('agente'),
    // SEG-01 (T08): momento del segundo factor. Nulo si la sesión no pasó MFA.
    mfa_verificada_en: timestamp('mfa_verificada_en', { withTimezone: true }),
    // Pase de un solo uso para entregar la sesión al navegador tras el MFA.
    pase_hash: text('pase_hash'),
    pase_consumido_en: timestamp('pase_consumido_en', { withTimezone: true }),
  },
  (tabla) => [
    index('sesiones_tenant_id_idx').on(tabla.tenant_id),
    index('sesiones_usuario_id_idx').on(tabla.usuario_id),
    uniqueIndex('sesiones_pase_hash_unico').on(tabla.pase_hash),
    check('sesiones_inactividad_positiva', sql`${tabla.inactividad_minutos} > 0`),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type TenantNuevo = typeof tenants.$inferInsert;
export type Sede = typeof sedes.$inferSelect;
export type SedeNueva = typeof sedes.$inferInsert;
export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioNuevo = typeof usuarios.$inferInsert;
export type Membresia = typeof membresias.$inferSelect;
export type MembresiaNueva = typeof membresias.$inferInsert;
export type Sesion = typeof sesiones.$inferSelect;
export type SesionNueva = typeof sesiones.$inferInsert;
