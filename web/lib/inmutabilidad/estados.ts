// SEG-04 (T12) — Máquina de estados reutilizable.
// Almacenado: borrador → firmado (registro) o firmada (adenda).
// Visible: firmado con adendas se presenta como `adendado` sin UPDATE.
// TODO(Q-17): el borrador no es el registro oficial hasta firmar. El abogado
// confirma esa interpretación. No hay ventana de edición por horas.
// TODO(Q-22): esto no firma ni sella el tiempo; el hash lo calcula la BD.

export const ESTADOS_ALMACENADOS = ['borrador', 'firmado', 'firmada'] as const;
export type EstadoAlmacenado = (typeof ESTADOS_ALMACENADOS)[number];

export const ESTADOS_VISIBLES = ['borrador', 'firmado', 'firmada', 'adendado'] as const;
export type EstadoVisible = (typeof ESTADOS_VISIBLES)[number];

export const COLUMNAS_MARCO = [
  'id',
  'tenant_id',
  'estado',
  'contenido',
  'firmado_por',
  'firmado_en',
  'hash_contenido',
] as const;

/** Acción de bitácora cuando T19 borre un borrador. El trigger lo permite. */
export const ACCION_BORRADO_BORRADOR = 'anular' as const;

const FIRME = new Set(['firmado', 'firmada', 'adendado']);

export function esEstadoAlmacenado(estado: string): estado is EstadoAlmacenado {
  return (ESTADOS_ALMACENADOS as readonly string[]).includes(estado);
}

export function filaFirmadaInmutable(estado: string): boolean {
  return FIRME.has(estado);
}

/** Solo el borrador se edita. Firmar es la única salida. `adendado` no se escribe. */
export function transicionAlmacenada(desde: string, hacia: string): boolean {
  if (desde !== 'borrador') return false;
  return hacia === 'borrador' || hacia === 'firmado' || hacia === 'firmada';
}

export function estadoVisible(almacenado: EstadoAlmacenado, cantidadAdendas: number): EstadoVisible {
  if (almacenado === 'firmado' && cantidadAdendas > 0) return 'adendado';
  return almacenado;
}
