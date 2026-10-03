// SEG-12 (T11) — AES-256-GCM con `node:crypto`.
// IV de 12 bytes único por mensaje y tag de autenticación de 16 bytes.
// La clave maestra no vive aquí: quien cifra pasa la clave ya cargada.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const BYTES_CLAVE = 32;
export const BYTES_IV = 12;
export const BYTES_TAG = 16;
export const PREFIJO_SOBRE = 'optisaas1';
export const PREFIJO_DEK = 'dek1';

export class ErrorCifrado extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorCifrado';
  }
}

export function sha256Hex(datos: Buffer): string {
  return createHash('sha256').update(datos).digest('hex');
}

function exigirClave(clave: Buffer): void {
  if (clave.length !== BYTES_CLAVE) {
    throw new ErrorCifrado('La clave debe tener 32 bytes (AES-256).');
  }
}

export function cifrarAesGcm(
  clave: Buffer,
  claro: Buffer,
  aad: Buffer,
): { iv: Buffer; tag: Buffer; cifrado: Buffer } {
  exigirClave(clave);
  const iv = randomBytes(BYTES_IV);
  const cifrador = createCipheriv('aes-256-gcm', clave, iv);
  cifrador.setAAD(aad);
  const cifrado = Buffer.concat([cifrador.update(claro), cifrador.final()]);
  return { iv, tag: cifrador.getAuthTag(), cifrado };
}

export function descifrarAesGcm(
  clave: Buffer,
  iv: Buffer,
  tag: Buffer,
  cifrado: Buffer,
  aad: Buffer,
): Buffer {
  exigirClave(clave);
  if (iv.length !== BYTES_IV || tag.length !== BYTES_TAG) {
    throw new ErrorCifrado('El contenido fue alterado o la clave no corresponde.');
  }
  try {
    const descifrador = createDecipheriv('aes-256-gcm', clave, iv);
    descifrador.setAAD(aad);
    descifrador.setAuthTag(tag);
    return Buffer.concat([descifrador.update(cifrado), descifrador.final()]);
  } catch {
    throw new ErrorCifrado('El contenido fue alterado o la clave no corresponde.');
  }
}

export type SobreAbierto = {
  versionDek: number;
  iv: Buffer;
  tag: Buffer;
  cifrado: Buffer;
};

export function empaquetarSobre(versionDek: number, partes: { iv: Buffer; tag: Buffer; cifrado: Buffer }): string {
  if (!Number.isInteger(versionDek) || versionDek < 1) {
    throw new ErrorCifrado('La versión de la clave de datos no es válida.');
  }
  return [
    PREFIJO_SOBRE,
    String(versionDek),
    partes.iv.toString('base64url'),
    partes.tag.toString('base64url'),
    partes.cifrado.toString('base64url'),
  ].join('.');
}

export function desempaquetarSobre(sobre: string): SobreAbierto {
  const partes = sobre.split('.');
  if (partes.length !== 5 || partes[0] !== PREFIJO_SOBRE) {
    throw new ErrorCifrado('El sobre no tiene el formato esperado.');
  }
  const versionDek = Number(partes[1]);
  if (!Number.isInteger(versionDek) || versionDek < 1 || String(versionDek) !== partes[1]) {
    throw new ErrorCifrado('El sobre no tiene el formato esperado.');
  }
  return {
    versionDek,
    iv: Buffer.from(partes[2], 'base64url'),
    tag: Buffer.from(partes[3], 'base64url'),
    cifrado: Buffer.from(partes[4], 'base64url'),
  };
}

export function aadDato(tenantId: string, proposito: string, versionDek: number): Buffer {
  return Buffer.from(`${tenantId}|${proposito}|${versionDek}`, 'utf8');
}

export function aadDek(tenantId: string, versionDek: number, versionKek: number): Buffer {
  return Buffer.from(`${tenantId}|dek|${versionDek}|${versionKek}`, 'utf8');
}

export function envolverDek(dek: Buffer, kek: Buffer, versionKek: number, tenantId: string, versionDek: number): string {
  const partes = cifrarAesGcm(kek, dek, aadDek(tenantId, versionDek, versionKek));
  return [
    PREFIJO_DEK,
    String(versionKek),
    partes.iv.toString('base64url'),
    partes.tag.toString('base64url'),
    partes.cifrado.toString('base64url'),
  ].join('.');
}

export function desenvolverDek(dekCifrada: string, kek: Buffer, tenantId: string, versionDek: number): Buffer {
  const partes = dekCifrada.split('.');
  if (partes.length !== 5 || partes[0] !== PREFIJO_DEK) {
    throw new ErrorCifrado('La clave de datos no tiene el formato esperado.');
  }
  const versionKek = Number(partes[1]);
  if (!Number.isInteger(versionKek) || versionKek < 1) {
    throw new ErrorCifrado('La clave de datos no tiene el formato esperado.');
  }
  const claro = descifrarAesGcm(
    kek,
    Buffer.from(partes[2], 'base64url'),
    Buffer.from(partes[3], 'base64url'),
    Buffer.from(partes[4], 'base64url'),
    aadDek(tenantId, versionDek, versionKek),
  );
  if (claro.length !== BYTES_CLAVE) {
    throw new ErrorCifrado('La clave de datos no tiene el formato esperado.');
  }
  return claro;
}

export function cifrarConDek(dek: Buffer, versionDek: number, aad: Buffer, claro: Buffer): string {
  return empaquetarSobre(versionDek, cifrarAesGcm(dek, claro, aad));
}

export function descifrarConDek(dek: Buffer, aad: Buffer, sobre: string): Buffer {
  const abierto = desempaquetarSobre(sobre);
  return descifrarAesGcm(dek, abierto.iv, abierto.tag, abierto.cifrado, aad);
}
