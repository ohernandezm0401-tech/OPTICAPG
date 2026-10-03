// SEG-01 (T08) — TOTP (RFC 6238, 6 dígitos, periodo 30 s, SHA-1) con otplib
// (MIT) y 10 códigos de recuperación de un solo uso. El periodo y los
// dígitos son los de las aplicaciones de autenticación, no una cifra legal.
// El hash de recuperación es SHA-256 de un código de 80 bits: no es reversible
// y no usa Argon2 (reservado a contraseñas).
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { generateSecret, generateSync, generateURI, verifySync } from 'otplib';

export const PERIODO_TOTP_SEGUNDOS = 30;
export const DIGITOS_TOTP = 6;
export const TOLERANCIA_TOTP_SEGUNDOS = 30;
export const CANTIDAD_CODIGOS_RECUPERACION = 10;
export const EMISOR_TOTP = 'OptiSaaS';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function nuevoSecretoTotp(): string {
  return generateSecret();
}

export function uriTotp(secreto: string, correo: string): string {
  return generateURI({
    issuer: EMISOR_TOTP,
    label: correo,
    secret: secreto,
    algorithm: 'sha1',
    digits: DIGITOS_TOTP,
    period: PERIODO_TOTP_SEGUNDOS,
  });
}

export function codigoTotp(secreto: string, ahora: Date): string {
  return generateSync({
    secret: secreto,
    epoch: Math.floor(ahora.getTime() / 1000),
    algorithm: 'sha1',
    digits: DIGITOS_TOTP,
    period: PERIODO_TOTP_SEGUNDOS,
  });
}

export type VerificacionTotp = { valido: false } | { valido: true; paso: number };

export function verificarTotp(
  secreto: string,
  codigo: string,
  ahora: Date,
  ultimoPaso: number | null,
): VerificacionTotp {
  const token = codigo.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return { valido: false };
  try {
    const resultado = verifySync({
      secret: secreto,
      token,
      epoch: Math.floor(ahora.getTime() / 1000),
      algorithm: 'sha1',
      digits: DIGITOS_TOTP,
      period: PERIODO_TOTP_SEGUNDOS,
      epochTolerance: TOLERANCIA_TOTP_SEGUNDOS,
      afterTimeStep: ultimoPaso ?? undefined,
    });
    if (!resultado.valid || !('timeStep' in resultado)) return { valido: false };
    return { valido: true, paso: resultado.timeStep };
  } catch {
    return { valido: false };
  }
}

export function generarCodigosRecuperacion(cantidad = CANTIDAD_CODIGOS_RECUPERACION): string[] {
  return Array.from({ length: cantidad }, () => {
    const bytes = randomBytes(16);
    let texto = '';
    for (let i = 0; i < 16; i += 1) texto += ALFABETO[bytes[i] % ALFABETO.length];
    return texto.replace(/(.{4})(?=.)/g, '$1-');
  });
}

export function normalizarCodigoRecuperacion(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

export function hashearCodigoRecuperacion(codigo: string): string {
  return createHash('sha256').update(normalizarCodigoRecuperacion(codigo), 'utf8').digest('hex');
}

export function hashesCoinciden(hashGuardado: string, codigo: string): boolean {
  const calculado = hashearCodigoRecuperacion(codigo);
  const a = Buffer.from(hashGuardado, 'utf8');
  const b = Buffer.from(calculado, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
