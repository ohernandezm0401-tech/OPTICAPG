// SEG-01 (T07) — Política de contraseñas (pura, sin Argon2).
// Mínimo 12 caracteres y denegación local (spec). La no reutilización de las
// últimas 5 se comprueba contra hashes en `establecerContrasena`.

import { contrasenaProhibida } from './contrasenas-prohibidas';

export const LONGITUD_MINIMA_CONTRASENA = 12;
const LONGITUD_MAXIMA_CONTRASENA = 128;

export type PoliticaContrasena = { ok: true } | { ok: false; mensaje: string };

export function evaluarPoliticaContrasena(contrasena: string): PoliticaContrasena {
  const valor = contrasena ?? '';
  if (valor.length < LONGITUD_MINIMA_CONTRASENA) {
    return { ok: false, mensaje: 'La contraseña debe tener al menos 12 caracteres.' };
  }
  if (valor.length > LONGITUD_MAXIMA_CONTRASENA) {
    return { ok: false, mensaje: 'La contraseña es demasiado larga.' };
  }
  if (contrasenaProhibida(valor)) {
    return { ok: false, mensaje: 'Esa contraseña no está permitida. Elige otra.' };
  }
  return { ok: true };
}
