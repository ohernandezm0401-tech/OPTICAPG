// SEG-01 (T07) — Implementación de `AuthPort` sobre Auth.js v5
// (`next-auth@5.0.0-beta.31`, ISC, todavía en beta). La cookie y el JWT
// corto (≤ 15 min) los emite Auth.js; las reglas de contraseña, bloqueo y
// sesión revocable viven en `servicio.ts`. Better Auth (MIT) no se instala:
// quedaría como otra clase de este puerto (ver docs/DECISIONES.md).
// MFA/TOTP es la tarea T08.

import type { AuthPort } from './puerto';
import {
  establecerContrasena,
  iniciarSesion,
  revocarSesion,
  revocarTodas,
  rotarSesion,
  sesionVigente,
} from './servicio';

export class AuthJsV5 implements AuthPort {
  iniciarSesion: AuthPort['iniciarSesion'] = (entrada) => iniciarSesion(entrada);
  sesionVigente: AuthPort['sesionVigente'] = (sesionId, ahora) => sesionVigente(sesionId, ahora);
  revocarSesion: AuthPort['revocarSesion'] = (sesionId, ahora) => revocarSesion(sesionId, ahora);
  revocarTodas: AuthPort['revocarTodas'] = (usuarioId, ahora) => revocarTodas(usuarioId, ahora);
  rotarSesion: AuthPort['rotarSesion'] = (sesionId, meta, ahora) => rotarSesion(sesionId, meta, ahora);
  establecerContrasena: AuthPort['establecerContrasena'] = (entrada) => establecerContrasena(entrada);
}

let puerto: AuthPort | null = null;

export function obtenerAuthPort(): AuthPort {
  if (!puerto) puerto = new AuthJsV5();
  return puerto;
}
