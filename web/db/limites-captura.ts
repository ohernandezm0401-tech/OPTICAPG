// OPT-01 (T20) — Lectura y cambio de los límites de captura.
// El optómetra lee; el admin configura. Sin fila se usan los propuestos.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import {
  LIMITES_CAPTURA_PROPUESTOS,
  type LimitesCaptura,
  type RangoCaptura,
} from '../dominio/valores-opticos';
import { obtenerPool } from './index';

export class ErrorLimites extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorLimites';
    this.status = status;
  }
}

export interface ContextoLimites {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
}

const TOPE_OPTICO = 9999.99;
const TOPE_CORTO = 99.99;
const TOPE_ENTERO = 10000;

function rango(tope: number) {
  return z
    .object({
      min: z.number().gte(-tope).lte(tope),
      max: z.number().gte(-tope).lte(tope),
    })
    .refine((dato) => dato.min <= dato.max, 'El mínimo no puede superar el máximo.');
}

function rangoEntero(tope: number) {
  return z
    .object({
      min: z.number().int().gte(-tope).lte(tope),
      max: z.number().int().gte(-tope).lte(tope),
    })
    .refine((dato) => dato.min <= dato.max, 'El mínimo no puede superar el máximo.');
}

/** Topes de columna. No son límites clínicos ni normativos. */
export const esquemaGuardarLimites = z
  .object({
    esfera: rango(TOPE_OPTICO),
    cilindro: rango(TOPE_OPTICO),
    eje: rangoEntero(TOPE_ENTERO),
    adicion: rango(TOPE_CORTO),
    agudeza: rango(TOPE_CORTO),
    dip: rangoEntero(TOPE_ENTERO),
    dipMonocular: rangoEntero(TOPE_ENTERO),
  })
  .strict();

async function conApp<T>(ctx: ContextoLimites, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [ctx.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ctx.usuario_id]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [ctx.sede_id]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [ctx.sedes.join(',')]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [ctx.rol]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error original.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

function numero(valor: string | number): number {
  return typeof valor === 'number' ? valor : Number(valor);
}

function rangoDe(min: string | number, max: string | number): RangoCaptura {
  return { min: numero(min), max: numero(max) };
}

function filaALimites(fila: Record<string, string | number>): LimitesCaptura {
  return {
    esfera: rangoDe(fila.esfera_min, fila.esfera_max),
    cilindro: rangoDe(fila.cilindro_min, fila.cilindro_max),
    eje: rangoDe(fila.eje_min, fila.eje_max),
    adicion: rangoDe(fila.adicion_min, fila.adicion_max),
    agudeza: rangoDe(fila.agudeza_min, fila.agudeza_max),
    dip: rangoDe(fila.dip_min, fila.dip_max),
    dipMonocular: rangoDe(fila.dip_monocular_min, fila.dip_monocular_max),
  };
}

export async function leerLimitesCaptura(
  ctx: ContextoLimites,
): Promise<{ limites: LimitesCaptura; origen: 'configurado' | 'propuesto' }> {
  if (!z.uuid().safeParse(ctx.tenant_id).success) {
    throw new ErrorLimites(400, 'La sesión de demostración no puede abrir la atención.');
  }
  const fila = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<Record<string, string | number>>(
      `select esfera_min, esfera_max, cilindro_min, cilindro_max, eje_min, eje_max,
              adicion_min, adicion_max, agudeza_min, agudeza_max, dip_min, dip_max,
              dip_monocular_min, dip_monocular_max
         from limites_captura
        where tenant_id = $1`,
      [ctx.tenant_id],
    );
    return filas.rows[0] ?? null;
  });
  if (!fila) return { limites: LIMITES_CAPTURA_PROPUESTOS, origen: 'propuesto' };
  return { limites: filaALimites(fila), origen: 'configurado' };
}

export async function guardarLimitesCaptura(ctx: ContextoLimites, entrada: unknown): Promise<LimitesCaptura> {
  if (ctx.rol !== 'admin') {
    throw new ErrorLimites(403, 'Solo la administración configura los límites de captura.');
  }
  if (!z.uuid().safeParse(ctx.tenant_id).success) {
    throw new ErrorLimites(400, 'La sesión de demostración no puede abrir la atención.');
  }
  const parsed = esquemaGuardarLimites.safeParse(entrada);
  if (!parsed.success) {
    throw new ErrorLimites(400, parsed.error.issues[0]?.message ?? 'Los límites no son válidos.');
  }
  const limites = parsed.data;
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `insert into limites_captura (
         tenant_id, esfera_min, esfera_max, cilindro_min, cilindro_max, eje_min, eje_max,
         adicion_min, adicion_max, agudeza_min, agudeza_max, dip_min, dip_max,
         dip_monocular_min, dip_monocular_max
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (tenant_id) do update set
         esfera_min = excluded.esfera_min,
         esfera_max = excluded.esfera_max,
         cilindro_min = excluded.cilindro_min,
         cilindro_max = excluded.cilindro_max,
         eje_min = excluded.eje_min,
         eje_max = excluded.eje_max,
         adicion_min = excluded.adicion_min,
         adicion_max = excluded.adicion_max,
         agudeza_min = excluded.agudeza_min,
         agudeza_max = excluded.agudeza_max,
         dip_min = excluded.dip_min,
         dip_max = excluded.dip_max,
         dip_monocular_min = excluded.dip_monocular_min,
         dip_monocular_max = excluded.dip_monocular_max,
         actualizado_en = now()`,
      [
        ctx.tenant_id,
        limites.esfera.min,
        limites.esfera.max,
        limites.cilindro.min,
        limites.cilindro.max,
        limites.eje.min,
        limites.eje.max,
        limites.adicion.min,
        limites.adicion.max,
        limites.agudeza.min,
        limites.agudeza.max,
        limites.dip.min,
        limites.dip.max,
        limites.dipMonocular.min,
        limites.dipMonocular.max,
      ],
    );
  });
  return limites;
}
