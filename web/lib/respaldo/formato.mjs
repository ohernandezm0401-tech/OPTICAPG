// PLT-07 (T28) — Sobre del respaldo. Reutiliza AES-256-GCM de T11
// (`lib/cifrado/aes.mjs`, `node:crypto`). La clave no viaja en el archivo.
import { createHash } from 'node:crypto';

import { cifrarBytes, descifrarBytes, ErrorCifrado } from '../cifrado/aes.mjs';
import { decodificarClaveMaestra } from '../cifrado/kek.mjs';

export { ErrorCifrado };

/** Datos asociados al GCM: no se cifran y atan el sobre a este formato. */
export const AAD_RESPALDO = Buffer.from('optisaas-plt07-respaldo-v1', 'utf8');

const VERSION_SOBRE = 1;

/** @param {Buffer} datos */
export function sha256Hex(datos) {
  return createHash('sha256').update(datos).digest('hex');
}

/**
 * Clave de respaldo: 32 bytes en base64, solo desde el entorno.
 * No se escribe en el repositorio ni se incluye en el mensaje de error.
 * @param {Record<string, string | undefined>} [variables]
 * @returns {Buffer}
 */
export function leerClaveRespaldo(variables = process.env) {
  const cruda = variables.BACKUP_KEY;
  if (!cruda?.trim()) {
    throw new ErrorCifrado(
      'falta BACKUP_KEY (32 bytes en base64). No está en el repositorio; el runbook explica la custodia.',
    );
  }
  return decodificarClaveMaestra(cruda);
}

/**
 * @param {Buffer} clave
 * @param {Buffer} plano
 * @returns {Buffer}
 */
export function cifrarRespaldo(clave, plano) {
  return cifrarBytes(clave, plano, VERSION_SOBRE, AAD_RESPALDO);
}

/**
 * @param {Buffer} clave
 * @param {Buffer} sobre
 * @returns {Buffer}
 */
export function abrirRespaldo(clave, sobre) {
  return descifrarBytes(clave, sobre, AAD_RESPALDO).plano;
}

/**
 * La autenticidad es la etiqueta GCM de T11. Un byte alterado o una clave
 * distinta no devuelve el plano.
 * @param {Buffer} clave
 * @param {Buffer} sobre
 * @returns {{ autentico: true } | { autentico: false, motivo: string }}
 */
export function verificarAutenticidad(clave, sobre) {
  try {
    const plano = abrirRespaldo(clave, sobre);
    plano.fill(0);
    return { autentico: true };
  } catch (error) {
    if (error instanceof ErrorCifrado) {
      return { autentico: false, motivo: error.message };
    }
    throw error;
  }
}
