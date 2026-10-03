// OPT-06 (T25) — Reglas de la copia electrónica de la historia clínica.
// La entrega a terceros no existe hasta SEG-14 (F3): la regla niega, no implementa.
// TODO(Q-07): el plazo del enlace no tiene valor por defecto.
// TODO(Q-22): el PDF reutilizado no es PDF/A.
// BORRADOR – requiere revisión jurídica.
import type { AppEnv } from '../lib/entorno';

/** La copia no genera cobro. No es una tarifa: es cero. */
export const COSTO_COPIA_HC_COP = 0;

export const MENSAJE_TERCERO =
  'No se entrega a terceros sin base registrada. La entrega a terceros queda bloqueada hasta SEG-14.';

export const CLAVE_PLAZO_ENLACE = 'entrega_hc_enlace_horas';

export type ClaseSolicitante = 'titular' | 'representante' | 'tercero';

export interface AtencionOrdenable {
  id: string;
  folio: number;
  firmado_en: string;
}

export function claseSolicitante(valor: string): ClaseSolicitante {
  const limpio = valor.trim().toLowerCase();
  if (limpio === 'titular' || limpio === 'representante') return limpio;
  return 'tercero';
}

/** SEG-14 no está: ninguna base de tercero habilita la entrega. */
export function entregaATerceroPermitida(): false {
  return false;
}

/**
 * Horas del enlace si el tenant las configuró. Sin fila, sin cero y sin
 * texto no hay plazo: no se inventa una duración.
 */
export function plazoEnlaceHoras(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor;
  if (typeof valor === 'string' && /^[1-9]\d*$/.test(valor.trim())) return Number(valor.trim());
  return null;
}

export function ordenCronologico<T extends AtencionOrdenable>(filas: readonly T[]): T[] {
  return [...filas].sort((a, b) => a.firmado_en.localeCompare(b.firmado_en) || a.folio - b.folio || a.id.localeCompare(b.id));
}

/** El código solo vuelve en la respuesta fuera de producción. El correo de desarrollo lo registra. */
export function codigoParaRespuesta(entorno: AppEnv, codigo: string): string | null {
  if (entorno === 'produccion') return null;
  return codigo;
}
