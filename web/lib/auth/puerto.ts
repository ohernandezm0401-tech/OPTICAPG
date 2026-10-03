// SEG-01 — Puerto de autenticación. Auth.js v5 lo implementa hoy
// (`authjs.ts`); Better Auth (MIT) podría reemplazarlo sin tocar a los
// llamadores (ADR-05). El segundo factor (T08) también entra por aquí.

export const MENSAJE_CREDENCIALES_INVALIDAS = 'Credenciales inválidas. Intente nuevamente.';
export const MENSAJE_MFA_INVALIDO = 'No se pudo verificar el segundo factor. Intente nuevamente.';

export type PendienteMfa = 'enrolar' | 'verificar';

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
  pendiente?: PendienteMfa;
  ticket?: string;
  /** El usuario ya tiene una passkey. No revela otros datos de la cuenta. */
  passkey?: boolean;
  /** Un solo uso, para que el navegador recoja la sesión ya abierta. */
  pase?: string;
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

export type AltaTotp =
  | { ok: true; secreto: string; uri: string; svg: string; codigos: string[] }
  | { ok: false; mensaje: string };

export type OpcionesPasskey =
  | { ok: true; opciones: Record<string, unknown> }
  | { ok: false; mensaje: string };

export interface ContextoPasskey {
  rpID: string;
  origin: string;
}

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
  prepararEnrolamientoTotp(ticket: string, ahora?: Date): Promise<AltaTotp>;
  confirmarSegundoFactor(entrada: {
    ticket: string;
    codigo: string;
    ahora?: Date;
  }): Promise<ResultadoInicioSesion>;
  canjearPase(pase: string, ahora?: Date): Promise<SesionEmitida | null>;
  exigirMfaParaFirmarAtencion(sesionId: string, ahora?: Date): Promise<
    { ok: true } | { ok: false; requiereReautenticacion: true }
  >;
  reautenticarMfa(entrada: { sesionId: string; codigo: string; ahora?: Date }): Promise<ResultadoContrasena>;
  darDeBajaTotp(entrada: { sesionId: string; codigo: string; ahora?: Date }): Promise<ResultadoContrasena>;
  opcionesRegistroPasskey(entrada: {
    ticket?: string;
    sesionId?: string;
    contexto: ContextoPasskey;
    ahora?: Date;
  }): Promise<OpcionesPasskey>;
  confirmarRegistroPasskey(entrada: {
    ticket?: string;
    sesionId?: string;
    respuesta: unknown;
    contexto: ContextoPasskey;
    ahora?: Date;
  }): Promise<ResultadoInicioSesion | ResultadoContrasena>;
  opcionesAutenticacionPasskey(entrada: {
    ticket: string;
    contexto: ContextoPasskey;
    ahora?: Date;
  }): Promise<OpcionesPasskey>;
  confirmarAutenticacionPasskey(entrada: {
    ticket: string;
    respuesta: unknown;
    contexto: ContextoPasskey;
    ahora?: Date;
  }): Promise<ResultadoInicioSesion>;
}

/** Lo único que ve el cliente cuando el inicio falla o triunfa. */
export function cuerpoHttpInicio(resultado: ResultadoInicioSesion): { error: string } | { ok: true } {
  if (!resultado.ok) return { error: resultado.mensaje || MENSAJE_CREDENCIALES_INVALIDAS };
  return { ok: true };
}

export function respuestaPublica(resultado: ResultadoInicioSesion): { ok: boolean; mensaje: string } {
  return { ok: resultado.ok, mensaje: resultado.mensaje };
}
