// PLT-07 (T28) — Metadatos del respaldo lógico. Sin tenant_id: el volcado
// es de toda la base. RLS ENABLE+FORCE en la migración 0027.
// TODO(Q-07): rpo y rto nacen nulos y con rótulo provisional.
import { sql } from 'drizzle-orm';
import { bigint, check, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ESTADOS_RESPALDO = ['programado', 'ejecutado', 'verificado', 'expirado'] as const;
export const RESULTADOS_RESPALDO = ['ok', 'fallo'] as const;

export const parametrosContinuidad = pgTable(
  'parametros_continuidad',
  {
    clave: text('clave').primaryKey(),
    valor: text('valor'),
    unidad: text('unidad'),
    rotulo: text('rotulo').notNull(),
    actualizado_en: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check('parametros_continuidad_clave', sql`${tabla.clave} in ('rpo', 'rto')`),
    check('parametros_continuidad_rotulo', sql`${tabla.rotulo} = 'provisional'`),
    check('parametros_continuidad_valor', sql`${tabla.valor} is null or char_length(${tabla.valor}) > 0`),
  ],
);

export const respaldos = pgTable(
  'respaldos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: text('tipo').notNull(),
    inicio: timestamp('inicio', { withTimezone: true }).notNull(),
    fin: timestamp('fin', { withTimezone: true }),
    tamano: bigint('tamano', { mode: 'number' }),
    hash_sha256: text('hash_sha256'),
    destino: text('destino'),
    cifrado: text('cifrado').notNull().default('AES-256-GCM'),
    resultado: text('resultado'),
    estado: text('estado').notNull(),
  },
  (tabla) => [
    check('respaldos_tipo', sql`${tabla.tipo} in ('logico_pg_dump')`),
    check('respaldos_estado', sql`${tabla.estado} in ('programado', 'ejecutado', 'verificado', 'expirado')`),
    check('respaldos_resultado', sql`${tabla.resultado} is null or ${tabla.resultado} in ('ok', 'fallo')`),
    check('respaldos_cifrado', sql`${tabla.cifrado} = 'AES-256-GCM'`),
    check('respaldos_tamano', sql`${tabla.tamano} is null or ${tabla.tamano} >= 0`),
    check('respaldos_hash', sql`${tabla.hash_sha256} is null or ${tabla.hash_sha256} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const pruebasRestauracion = pgTable(
  'pruebas_restauracion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    respaldo_id: uuid('respaldo_id')
      .notNull()
      .references(() => respaldos.id),
    resultado: text('resultado').notNull(),
    evidencia: jsonb('evidencia').notNull(),
    ejecutada_en: timestamp('ejecutada_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('pruebas_restauracion_respaldo_id_idx').on(tabla.respaldo_id),
    check('pruebas_restauracion_resultado', sql`${tabla.resultado} in ('ok', 'fallo')`),
  ],
);
