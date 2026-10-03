// SEG-01 (T07) — Puerto de autenticación. Auth.js v5 lo implementa hoy
// (`authjs.ts`); Better Auth (MIT) podría reemplazarlo sin tocar a los
// llamadores (ADR-05, anotado en docs/DECISIONES.md). MFA/TOTP es T08.

export const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas. Intente nuevamente.';

export interface SesionEmitida {
  id: string;
  usuarioId: string;
  tenantId: string;
  sedeId: string;
  rol: string;
  sedes: string[];
  correo: string;
  expiraEn: string;
}

export interface ResultadoInicioSesion {
  ok: boolean;
  mensaje: string;
  /**
   * Uso interno del adaptador: solo es true cuando no hay cuenta en la base,
   * para poder caer a las cuentas locales de `desarrollo`. No forma parte de
   * la respuesta HTTP (ver `cuerpoHttpInicio`).
   */
  continuarConCuentasLocales?: boolean;
  sesion?: SesionEmitida;
}

export interface EntradaInicioSesion {
  correo: string;
  contrasena: string;
  direccionIp?: string | null;
  agente?: string | null;
  ahora?: Date;
}

export interface EntradaContrasena {
  usuarioId: string;
  tenantId: string;
  contrasena: string;
  ahora?: Date;
}

export type ResultadoContrasena = { ok: true } | { ok: false; mensaje: string };

export interface AuthPort {
  iniciarSesion(entrada: EntradaInicioSesion): Promise<ResultadoInicioSesion>;
  sesionVigente(sesionId: string, ahora?: Date): Promise<boolean>;
  revocarSesion(sesionId: string, ahora?: Date): Promise<boolean>;
  revocarTodas(usuarioId: string, ahora?: Date): Promise<number>;
  rotarSesion(
    sesionId: string,
    meta?: { direccionIp?: string | null; agente?: string | null },
    ahora?: Date,
  ): Promise<string | null>;
  establecerContrasena(entrada: EntradaContrasena): Promise<ResultadoContrasena>;
}

/** Lo único que ve el cliente cuando el inicio falla o triunfa. */
export function cuerpoHttpInicio(resultado: ResultadoInicioSesion): { error: string } | { ok: true } {
  if (!resultado.ok) return { error: resultado.mensaje };
  return { ok: true };
}

export function respuestaPublica(resultado: ResultadoInicioSesion): { ok: boolean; mensaje: string } {
  return { ok: resultado.ok, mensaje: resultado.mensaje };
}
