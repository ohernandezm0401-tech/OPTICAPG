// PLT-10 (T05) — Validadores puros de la semilla sintética (sin E/S ni BD).
//
// Este módulo no importa `server-only` para que las pruebas unitarias puedan
// usarlo directamente; `sembrar.ts` (solo servidor) lo reutiliza al insertar.
import datos from './datos.json';

export const NIT_RESERVADO_PREFIJO = '900.000.';
export const DOMINIO_RESERVADO = '@example.invalid';

export interface FilaSintetica {
  es_sintetico?: unknown;
  [clave: string]: unknown;
}

export function esFilaSintetica(fila: FilaSintetica): boolean {
  return fila.es_sintetico === true;
}

export function esNitReservado(nit: string): boolean {
  return nit.startsWith(NIT_RESERVADO_PREFIJO);
}

export function esCorreoReservado(email: string): boolean {
  return email.toLowerCase().endsWith(DOMINIO_RESERVADO);
}

// Toda fila de la semilla debe llevar el marcador y usar identificadores
// reservados; cualquier fila que parezca real se rechaza antes de insertar.
export function validarFilaSintetica(fila: FilaSintetica, entidad: string): void {
  if (!esFilaSintetica(fila)) {
    throw new Error(`Semilla ${entidad} sin marcador es_sintetico=true; se aborta antes de insertar.`);
  }
  if (typeof fila.nit === 'string' && !esNitReservado(fila.nit)) {
    throw new Error(`Semilla ${entidad} con NIT fuera del prefijo reservado (${NIT_RESERVADO_PREFIJO}); se aborta.`);
  }
  if (typeof fila.email === 'string' && !esCorreoReservado(fila.email)) {
    throw new Error(`Semilla ${entidad} con correo fuera del dominio reservado (${DOMINIO_RESERVADO}); se aborta.`);
  }
}

export function obtenerDatosSinteticos() {
  return datos;
}
