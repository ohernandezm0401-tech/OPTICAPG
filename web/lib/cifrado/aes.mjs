// SEG-12 (T11) — AES-256-GCM con `node:crypto` (biblioteca estándar de Node.js;
// no es un paquete npm). IV único por mensaje y etiqueta de autenticación.
// El sobre no incluye la clave. Un byte alterado o una clave distinta falla.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const PREFIJO_TEXTO = 'opt1:';
const MAGIC = Buffer.from('OPT1');
const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const CABECERA = MAGIC.length + 1 + 4 + IV_BYTES + TAG_BYTES;

export class ErrorCifrado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorCifrado';
  }
}

function exigirClave(clave) {
  if (!Buffer.isBuffer(clave) || clave.length !== 32) {
    throw new ErrorCifrado('la clave debe ser de 32 bytes');
  }
}

/**
 * @param {Buffer} clave 32 bytes (DEK o KEK)
 * @param {Buffer} plano
 * @param {number} versionEntera versión de la DEK que cifra el plano (0..2^32-1)
 * @param {Buffer} datosAsociados no se cifran; entran en la etiqueta GCM
 * @returns {Buffer}
 */
export function cifrarBytes(clave, plano, versionEntera, datosAsociados) {
  exigirClave(clave);
  if (!Buffer.isBuffer(plano)) throw new ErrorCifrado('el plano debe ser bytes');
  if (!Number.isInteger(versionEntera) || versionEntera < 0 || versionEntera > 0xffffffff) {
    throw new ErrorCifrado('la versión de clave no es válida');
  }
  const iv = randomBytes(IV_BYTES);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  if (datosAsociados?.length) cifrador.setAAD(datosAsociados);
  const datos = Buffer.concat([cifrador.update(plano), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  const version = Buffer.alloc(4);
  version.writeUInt32BE(versionEntera);
  return Buffer.concat([MAGIC, Buffer.from([VERSION]), version, iv, etiqueta, datos]);
}

/**
 * @param {Buffer} clave
 * @param {Buffer} sobre
 * @param {Buffer} datosAsociados
 * @returns {{ plano: Buffer, version: number }}
 */
export function descifrarBytes(clave, sobre, datosAsociados) {
  exigirClave(clave);
  if (!Buffer.isBuffer(sobre) || sobre.length < CABECERA || !sobre.subarray(0, 4).equals(MAGIC)) {
    throw new ErrorCifrado('el sobre no es válido');
  }
  if (sobre[4] !== VERSION) throw new ErrorCifrado('la versión del sobre no es compatible');
  const version = sobre.readUInt32BE(5);
  const iv = sobre.subarray(9, 9 + IV_BYTES);
  const etiqueta = sobre.subarray(21, 21 + TAG_BYTES);
  const datos = sobre.subarray(CABECERA);
  try {
    const descifrador = createDecipheriv('aes-256-gcm', clave, iv);
    if (datosAsociados?.length) descifrador.setAAD(datosAsociados);
    descifrador.setAuthTag(etiqueta);
    const plano = Buffer.concat([descifrador.update(datos), descifrador.final()]);
    return { plano, version };
  } catch {
    throw new ErrorCifrado('el sobre fue alterado o la clave no corresponde');
  }
}

/** @param {Buffer} sobre */
export function aTexto(sobre) {
  return PREFIJO_TEXTO + sobre.toString('base64url');
}

/** @param {string} texto */
export function esSobreTexto(texto) {
  return typeof texto === 'string' && texto.startsWith(PREFIJO_TEXTO);
}

/** @param {string} texto */
export function desdeTexto(texto) {
  if (!esSobreTexto(texto)) throw new ErrorCifrado('el sobre no es válido');
  return Buffer.from(texto.slice(PREFIJO_TEXTO.length), 'base64url');
}

/** @param {string} texto */
export function versionDelSobreTexto(texto) {
  const sobre = desdeTexto(texto);
  if (sobre.length < CABECERA || !sobre.subarray(0, 4).equals(MAGIC)) {
    throw new ErrorCifrado('el sobre no es válido');
  }
  return sobre.readUInt32BE(5);
}
