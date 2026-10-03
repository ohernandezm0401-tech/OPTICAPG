// SEG-01 (T07) — Umbrales de la spec (regla 4 de SEG-01), no cifras inventadas.
// Cinco intentos fallidos bloquean la cuenta. El primer bloqueo dura 15 min;
// cada bloqueo siguiente duplica esa base (bloqueo progresivo).

export const INTENTOS_PARA_BLOQUEO = 5;
export const MINUTOS_BLOQUEO_BASE = 15;
// Tope técnico para no producir fechas absurdas. No es un plazo legal.
const MINUTOS_BLOQUEO_MAXIMO = 24 * 60;

export function minutosDeBloqueo(nivel: number): number {
  const paso = Math.max(1, Math.floor(nivel));
  const minutos = MINUTOS_BLOQUEO_BASE * 2 ** (paso - 1);
  return Math.min(minutos, MINUTOS_BLOQUEO_MAXIMO);
}

// Roles clínicos de la spec: inactividad máxima por defecto 15 min.
export const ROLES_CLINICOS = ['optometra', 'oftalmologo', 'auxiliar_clinico'] as const;
export const MINUTOS_INACTIVIDAD_CLINICA = 15;
export const MINUTOS_JWT = 15;

// Sin parámetro de tenant, el tope de 15 min de la spec acota la inactividad
// (JWT ≤ 15 min y roles clínicos). Si el tenant guardó
// `sesion_inactividad_minutos`, se usa: en roles clínicos no puede superar
// 15 min. TODO: no hay Q-nn con otro máximo para roles no clínicos.
export function minutosInactividad(roles: readonly string[], parametro: number | null): number {
  const clinico = roles.some((rol) => (ROLES_CLINICOS as readonly string[]).includes(rol));
  if (parametro == null || !Number.isFinite(parametro) || parametro <= 0) {
    return MINUTOS_INACTIVIDAD_CLINICA;
  }
  const minutos = Math.floor(parametro);
  if (clinico) return Math.min(minutos, MINUTOS_INACTIVIDAD_CLINICA);
  return Math.min(minutos, MINUTOS_BLOQUEO_MAXIMO);
}

// Límite por IP: la spec pide limitación de tasa pero no fija la cifra.
// Sin `AUTH_LIMITE_INTENTOS_IP` no se aplica (sin valor por defecto).
export function leerLimiteIntentosIp(variables: Record<string, string | undefined> = process.env): number | null {
  const crudo = variables.AUTH_LIMITE_INTENTOS_IP?.trim();
  if (!crudo) return null;
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor <= 0) return null;
  return valor;
}
