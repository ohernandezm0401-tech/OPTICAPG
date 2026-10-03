// SEG-03 (T10) — Registro y consulta de la bitácora. El hash se calcula con
// `node:crypto` antes de insertar. La historia clínica aún no existe: la
// lectura reutilizable está en `lecturas.ts` y se prueba con un recurso R3.
// TODO(Q-07): sin plazo de conservación ni umbral de lecturas anómalas
// (no hay cifra en PREGUNTAS_ABIERTAS; no se inventa).
import 'server-only';

import type { PoolClient } from 'pg';

import { obtenerPool } from '../../db/index';
import { EsquemaContextoTenant, type ContextoTenant } from '../../db/tenant';
import { MATRIZ, rolMatriz } from '../authz/matrix';
import { aCsv, calcularHash, type EventoCanonico } from './cadena';
import {
  accionAuditable,
  agenteAuditable,
  ErrorAuditoria,
  ipAuditable,
  recursoAuditable,
  recursoIdAuditable,
  requestIdAuditable,
  resultadoAuditable,
  resultadoDeAutenticacion,
  rolAuditable,
  type AccionAuditoria,
  type ResultadoAuditoria,
} from './contenido';

export interface EventoAuditoria {
  ts?: Date;
  actor_id?: string | null;
  rol?: string | null;
  sede_id?: string | null;
  recurso: string;
  recurso_id?: string | null;
  accion: string;
  resultado: string;
  ip?: string | null;
  agente?: string | null;
  request_id?: string | null;
}

export interface FilaConsulta {
  id: string;
  tenant_id: string;
  ts: Date;
  actor_id: string | null;
  rol: string | null;
  sede_id: string | null;
  recurso: string;
  recurso_id: string | null;
  accion: string;
  resultado: string;
  ip: string | null;
  agente: string | null;
  request_id: string | null;
  hash_previo: Buffer | null;
  hash: Buffer;
}

const ZONA = 'America/Bogota';

function presentar(ts: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(ts);
}

async function fijarContexto(cliente: PoolClient, contexto: ContextoTenant): Promise<void> {
  const sedes = contexto.sedes ?? (contexto.sede_id ? [contexto.sede_id] : []);
  const sede = contexto.sede_id ?? sedes[0] ?? '';
  await cliente.query(`select set_config('app.tenant_id', $1, true)`, [contexto.tenant_id]);
  await cliente.query(`select set_config('app.usuario_id', $1, true)`, [contexto.usuario_id ?? '']);
  await cliente.query(`select set_config('app.sede_id', $1, true)`, [sede]);
  await cliente.query(`select set_config('app.sedes', $1, true)`, [sedes.join(',')]);
  await cliente.query(`select set_config('app.rol', $1, true)`, [contexto.rol ?? '']);
  await cliente.query(`select set_config('app.role', $1, true)`, [contexto.rol ?? '']);
}

function normalizar(contexto: ContextoTenant, evento: EventoAuditoria): EventoCanonico {
  const accion = accionAuditable(evento.accion);
  const resultado = resultadoAuditable(evento.resultado);
  return {
    tenant_id: contexto.tenant_id,
    ts: evento.ts ?? new Date(),
    actor_id: evento.actor_id ?? null,
    rol: rolAuditable(evento.rol),
    sede_id: evento.sede_id ?? null,
    recurso: recursoAuditable(evento.recurso),
    recurso_id: recursoIdAuditable(evento.recurso_id),
    accion,
    resultado,
    ip: ipAuditable(evento.ip),
    agente: agenteAuditable(evento.agente),
    request_id: requestIdAuditable(evento.request_id),
  };
}

export async function registrarEventos(contextoEntrada: ContextoTenant, eventos: EventoAuditoria[]): Promise<number[]> {
  if (eventos.length === 0) return [];
  const contexto = EsquemaContextoTenant.parse(contextoEntrada);
  const preparados = eventos.map((evento) => normalizar(contexto, evento));
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await fijarContexto(cliente, contexto);
    const ultimo = await cliente.query<{ hash: Buffer | null }>(
      `select ultimo_hash_auditoria($1::uuid) as hash`,
      [contexto.tenant_id],
    );
    await cliente.query('SET LOCAL ROLE optisaas_audit_writer');
    let previo: Buffer | null = ultimo.rows[0]?.hash ?? null;
    const ids: number[] = [];
    for (const evento of preparados) {
      const hash = calcularHash(previo, evento);
      const insertado = await cliente.query<{ id: string }>(
        `select registrar_fila_auditoria(
           $1::uuid, $2::timestamptz, $3::uuid, $4, $5::uuid, $6, $7, $8, $9, $10, $11, $12, $13, $14
         ) as id`,
        [
          evento.tenant_id,
          evento.ts instanceof Date ? evento.ts.toISOString() : evento.ts,
          evento.actor_id,
          evento.rol,
          evento.sede_id,
          evento.recurso,
          evento.recurso_id,
          evento.accion,
          evento.resultado,
          evento.ip,
          evento.agente,
          evento.request_id,
          previo,
          hash,
        ],
      );
      ids.push(Number(insertado.rows[0].id));
      previo = hash;
    }
    await cliente.query('COMMIT');
    return ids;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // La transacción ya estaba cerrada.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

export async function registrarEvento(contexto: ContextoTenant, evento: EventoAuditoria): Promise<number> {
  const [id] = await registrarEventos(contexto, [evento]);
  return id;
}

export async function anexarBitacoraAutenticacion(entrada: {
  tenantId: string | null;
  usuarioId: string | null;
  tipo: string;
  direccionIp: string | null;
  ahora: Date;
}): Promise<void> {
  if (!entrada.tenantId) return;
  await registrarEvento(
    { tenant_id: entrada.tenantId, usuario_id: entrada.usuarioId, rol: null },
    {
      ts: entrada.ahora,
      actor_id: entrada.usuarioId,
      rol: null,
      sede_id: null,
      recurso: 'autenticacion',
      recurso_id: entrada.tipo,
      accion: 'autenticacion',
      resultado: resultadoDeAutenticacion(entrada.tipo),
      ip: entrada.direccionIp,
    },
  );
}

export async function anexarIntentoDenegado(entrada: {
  tenant_id: string;
  usuario_id: string;
  rol: string;
  sede_id?: string | null;
  recurso: string;
  recurso_id?: string | null;
  accion: string;
}): Promise<void> {
  await registrarEvento(
    {
      tenant_id: entrada.tenant_id,
      usuario_id: entrada.usuario_id,
      sede_id: entrada.sede_id ?? null,
      rol: entrada.rol,
    },
    {
      actor_id: entrada.usuario_id,
      rol: entrada.rol,
      sede_id: entrada.sede_id ?? null,
      recurso: entrada.recurso,
      recurso_id: entrada.recurso_id ?? null,
      accion: entrada.accion,
      resultado: 'denegado',
    },
  );
}

export type AlcanceBitacora = 'sedes' | 'propios' | 'ninguno';

export function alcanceBitacora(rol: string, accion: 'leer' | 'exportar' = 'leer'): AlcanceBitacora {
  const canonico = rolMatriz(rol);
  if (!canonico) return 'ninguno';
  const celda = MATRIZ[canonico].R19.acciones[accion];
  if (celda === 'sedes_autorizadas') return 'sedes';
  if (celda === 'propios') return accion === 'leer' ? 'propios' : 'ninguno';
  return 'ninguno';
}

export interface FiltroBitacora {
  recurso?: string | null;
  accion?: string | null;
  limite?: number;
}

function filtroSeguro(filtro: FiltroBitacora): { recurso: string | null; accion: AccionAuditoria | null } {
  const recurso = filtro.recurso ? recursoAuditable(filtro.recurso) : null;
  const accion = filtro.accion ? accionAuditable(filtro.accion) : null;
  return { recurso, accion };
}

async function leerFilas(
  contextoEntrada: ContextoTenant,
  filtro: FiltroBitacora,
  orden: 'asc' | 'desc',
): Promise<FilaConsulta[]> {
  const contexto = EsquemaContextoTenant.parse(contextoEntrada);
  if (!contexto.rol || !contexto.usuario_id) {
    throw new ErrorAuditoria('la consulta exige actor y rol');
  }
  if (alcanceBitacora(contexto.rol, 'leer') === 'ninguno') {
    throw new ErrorAuditoria('No tiene permiso para consultar la bitácora.');
  }
  const seguro = filtroSeguro(filtro);
  const limite = Math.min(Math.max(filtro.limite ?? 100, 1), 20000);
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await fijarContexto(cliente, contexto);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await cliente.query<FilaConsulta>(
      `select id::text, tenant_id, ts, actor_id, rol, sede_id, recurso, recurso_id,
              accion, resultado, ip, agente, request_id, hash_previo, hash
         from auditoria
        where ($1::text is null or recurso = $1)
          and ($2::text is null or accion = $2)
        order by auditoria.id ${orden === 'asc' ? 'asc' : 'desc'}
        limit $3`,
      [seguro.recurso, seguro.accion, limite],
    );
    await cliente.query('COMMIT');
    return resultado.rows.map((fila) => ({
      ...fila,
      ts: new Date(fila.ts),
      hash_previo: fila.hash_previo,
      hash: fila.hash,
    }));
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se informa el error original.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarBitacora(contexto: ContextoTenant, filtro: FiltroBitacora = {}) {
  const filas = await leerFilas(contexto, { ...filtro, limite: filtro.limite ?? 100 }, 'desc');
  return filas.map((fila) => ({
    id: fila.id,
    ts_utc: fila.ts.toISOString(),
    ts_bogota: presentar(fila.ts),
    actor_id: fila.actor_id,
    rol: fila.rol,
    sede_id: fila.sede_id,
    recurso: fila.recurso,
    recurso_id: fila.recurso_id,
    accion: fila.accion,
    resultado: fila.resultado,
    ip: fila.ip,
    hash: Buffer.from(fila.hash).toString('hex'),
  }));
}

export async function exportarBitacoraCsv(contextoEntrada: ContextoTenant, filtro: FiltroBitacora = {}): Promise<string> {
  const contexto = EsquemaContextoTenant.parse(contextoEntrada);
  if (!contexto.rol || alcanceBitacora(contexto.rol, 'exportar') !== 'sedes') {
    throw new ErrorAuditoria('No tiene permiso para exportar la bitácora.');
  }
  const filas = await leerFilas(contexto, { ...filtro, limite: filtro.limite ?? 20000 }, 'asc');
  return aCsv(filas as unknown as Array<Record<string, unknown>>);
}

export { ErrorAuditoria };
export type { AccionAuditoria, ResultadoAuditoria };
