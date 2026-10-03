// SEG-01 (T07) — Hash Argon2id con `@node-rs/argon2` (MIT).
// Parámetros de memoria/tiempo/paralelismo: recomendación OWASP para
// Argon2id (m=19 MiB, t=2, p=1). No son cifras legales ni tarifas.
import { hash, verify, type Options } from '@node-rs/argon2';

// `Algorithm` es un const enum y `isolatedModules` no deja leerlo.
// 2 = Argon2id (valor del enum en `@node-rs/argon2`).
const ARGON2ID = 2 as Options['algorithm'];

export const PARAMETROS_ARGON2: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashearContrasena(plana: string): Promise<string> {
  return hash(plana, PARAMETROS_ARGON2);
}

export async function verificarContrasena(hashGuardado: string, plana: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, plana);
  } catch {
    return false;
  }
}
