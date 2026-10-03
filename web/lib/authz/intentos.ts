// SEG-02 (T09) — Registro de denegaciones con límite de ruido operativo.
// No es un plazo legal: descarta el mismo intento (actor, recurso, acción, id)
// a partir del sexto dentro de 60 minutos. Esta memoria no es la bitácora:
// la cadena se escribe al persistir el intento (T10).
// Fechas en UTC.

export interface IntentoDenegado {
  usuario_id: string;
  rol: string;
  tenant_id: string;
  sede_id: string | null;
  recurso: string;
  recurso_id: string | null;
  accion: string;
  resultado: 'denegado';
  creado_en: string;
}

/** Tope operativo de repeticiones idénticas por ventana. No es una cifra legal. */
export const MAX_INTENTOS_IGUALES = 5;
export const VENTANA_RUIDO_MS = 60 * 60 * 1000;

const intentos: IntentoDenegado[] = [];

function clave(intento: Pick<IntentoDenegado, 'usuario_id' | 'recurso' | 'recurso_id' | 'accion'>): string {
  return [intento.usuario_id, intento.recurso, intento.recurso_id ?? '', intento.accion].join('|');
}

export function registrarIntentoDenegado(
  entrada: Omit<IntentoDenegado, 'resultado' | 'creado_en'>,
  opciones?: { ahora?: Date },
): { registrado: boolean; intento?: IntentoDenegado } {
  const ahora = opciones?.ahora ?? new Date();
  const marca = ahora.getTime();
  const mismo = clave(entrada);
  const recientes = intentos.filter(
    (item) => clave(item) === mismo && marca - Date.parse(item.creado_en) < VENTANA_RUIDO_MS,
  );
  if (recientes.length >= MAX_INTENTOS_IGUALES) return { registrado: false };
  const intento: IntentoDenegado = {
    ...entrada,
    resultado: 'denegado',
    creado_en: ahora.toISOString(),
  };
  intentos.push(intento);
  return { registrado: true, intento };
}

export function registrarDenegacionDeActor(
  actor: { id: string; rol: string; tenantId: string; sedeActiva: string },
  recurso: string,
  accion: string,
  recursoId?: string | null,
): { registrado: boolean } {
  return registrarIntentoDenegado({
    usuario_id: actor.id,
    rol: actor.rol,
    tenant_id: actor.tenantId,
    sede_id: actor.sedeActiva || null,
    recurso,
    recurso_id: recursoId ?? null,
    accion,
  });
}

export function listarIntentosDenegados(): IntentoDenegado[] {
  return intentos.map((item) => ({ ...item }));
}

export function reiniciarIntentosDenegados(): void {
  intentos.length = 0;
}
