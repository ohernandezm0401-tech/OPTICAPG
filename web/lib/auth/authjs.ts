// SEG-01 (T07) — Implementación de `AuthPort` sobre Auth.js v5
// (`next-auth@5.0.0-beta.31`, ISC, todavía en beta). La cookie y el JWT
// corto (≤ 15 min) los emite Auth.js; las reglas de contraseña, bloqueo y
// sesión revocable viven en `servicio.ts`. Better Auth (MIT) no se instala:
// quedaría como otra clase de este puerto (ver docs/DECISIONES.md).
// El segundo factor (T08) también entra por esta clase.

import type { AuthPort } from './puerto';
import {
  canjearPase,
  confirmarAutenticacionPasskey,
  confirmarRegistroPasskey,
  confirmarSegundoFactor,
  darDeBajaTotp,
  exigirMfaParaFirmarAtencion,
  opcionesAutenticacionPasskey,
  opcionesRegistroPasskey,
  prepararEnrolamientoTotp,
  reautenticarMfa,
} from './mfa/flujo';
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
  prepararEnrolamientoTotp: AuthPort['prepararEnrolamientoTotp'] = (ticket, ahora) =>
    prepararEnrolamientoTotp(ticket, ahora);
  confirmarSegundoFactor: AuthPort['confirmarSegundoFactor'] = (entrada) => confirmarSegundoFactor(entrada);
  canjearPase: AuthPort['canjearPase'] = (pase, ahora) => canjearPase(pase, ahora);
  exigirMfaParaFirmarAtencion: AuthPort['exigirMfaParaFirmarAtencion'] = (sesionId, ahora) =>
    exigirMfaParaFirmarAtencion(sesionId, ahora);
  reautenticarMfa: AuthPort['reautenticarMfa'] = (entrada) => reautenticarMfa(entrada);
  darDeBajaTotp: AuthPort['darDeBajaTotp'] = (entrada) => darDeBajaTotp(entrada);
  opcionesRegistroPasskey: AuthPort['opcionesRegistroPasskey'] = (entrada) => opcionesRegistroPasskey(entrada);
  confirmarRegistroPasskey: AuthPort['confirmarRegistroPasskey'] = (entrada) => confirmarRegistroPasskey(entrada);
  opcionesAutenticacionPasskey: AuthPort['opcionesAutenticacionPasskey'] = (entrada) =>
    opcionesAutenticacionPasskey(entrada);
  confirmarAutenticacionPasskey: AuthPort['confirmarAutenticacionPasskey'] = (entrada) =>
    confirmarAutenticacionPasskey(entrada);
}

let puerto: AuthPort | null = null;

export function obtenerAuthPort(): AuthPort {
  if (!puerto) puerto = new AuthJsV5();
  return puerto;
}
