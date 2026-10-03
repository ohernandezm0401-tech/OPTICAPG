// ASE-01 (T13) — Hash HMAC del documento para búsqueda exacta y duplicados.
// La clave sale de la KEK (T11); no se guarda en el repositorio.
import { createHmac } from 'node:crypto';

export function hashDocumento(tipo: string, numero: string, clave: Buffer): string {
  const material = `${tipo.trim().toUpperCase()}|${numero.trim()}`;
  return createHmac('sha256', clave).update(material, 'utf8').digest('hex');
}
