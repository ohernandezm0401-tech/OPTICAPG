// SEG-03 (T10) — Tipos de la cadena. La implementación vive en `cadena.mjs`
// para que el verificador (`node`) y la app compartan el mismo SHA-256.
import {
  aCsv as aCsvJs,
  aHex as aHexJs,
  calcularHash as calcularHashJs,
  eventoDesdeFila as eventoDesdeFilaJs,
  payloadCanonico as payloadCanonicoJs,
  tsCanonico as tsCanonicoJs,
  verificarCadena as verificarCadenaJs,
} from './cadena.mjs';

export interface EventoCanonico {
  tenant_id: string;
  ts: Date | string;
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

export interface FilaCadena {
  id: string | number;
  hash_previo: Buffer | null;
  hash: Buffer;
  evento: EventoCanonico;
}

export type ResultadoCadena =
  | { ok: true; eventos: number }
  | { ok: false; posicion: number; id: string; motivo: 'hash_previo' | 'hash' };

export function tsCanonico(valor: Date | string): string {
  return tsCanonicoJs(valor as never) as string;
}

export function payloadCanonico(evento: EventoCanonico): string {
  return payloadCanonicoJs(evento as never) as string;
}

export function calcularHash(previo: Buffer | null, evento: EventoCanonico): Buffer {
  return calcularHashJs(previo, evento as never) as Buffer;
}

export function verificarCadena(filas: FilaCadena[]): ResultadoCadena {
  return verificarCadenaJs(filas as never) as ResultadoCadena;
}

export function eventoDesdeFila(fila: Record<string, unknown>): EventoCanonico {
  return eventoDesdeFilaJs(fila) as EventoCanonico;
}

export function aHex(valor: Buffer | null | undefined): string {
  return aHexJs(valor) as string;
}

export function aCsv(filas: Array<Record<string, unknown>>): string {
  return aCsvJs(filas) as string;
}
