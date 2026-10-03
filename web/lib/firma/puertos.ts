// SEG-08 (T14) — Puertos de almacenamiento y sello de tiempo.
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { hashSha256 } from '../../dominio/firma';
// TODO(Q-22): el adaptador `nulo` no llama a una TSA. `servidor` es el
// sellado propio (hora del servidor + hash). `tsa_externa` es el contrato
// de una TSA de pago, no obligatoria y sin cliente implementado.
// BORRADOR – requiere revisión jurídica.

export interface GuardadoAlmacen {
  id: string;
  hash: string;
}

export interface LecturaAlmacen {
  nombre: string;
  mime: string | null;
  hash: string;
  contenido: Buffer;
}

export interface AlmacenamientoPort {
  readonly nombre: 'memoria' | 'bd_cifrada' | 'disco_cifrado';
  guardar(entrada: {
    tenantId: string;
    nombre: string;
    mime: string;
    contenido: Buffer;
  }): Promise<GuardadoAlmacen>;
  leer(tenantId: string, id: string): Promise<LecturaAlmacen | null>;
}

export interface SelloTiempo {
  proveedor: 'nulo' | 'servidor' | 'tsa_externa';
  /** Token de la TSA. Nulo en el sello propio y en la implementación nula. */
  token: string | null;
  sellado_en: string | null;
  hash: string;
}

export interface SelloTiempoPort {
  readonly nombre: 'nulo' | 'servidor' | 'tsa_externa';
  sellar(hash: string, ahora: Date): Promise<SelloTiempo>;
}

export class ErrorSelloTiempo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorSelloTiempo';
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}

/** Implementación nula: no hay token ni hora de una TSA. */
export function crearSelloNulo(): SelloTiempoPort {
  return {
    nombre: 'nulo',
    async sellar(hash) {
      return { proveedor: 'nulo', token: null, sellado_en: null, hash };
    },
  };
}

/** Sellado propio: hora del servidor y el hash. No es una TSA. */
export function crearSelloServidor(): SelloTiempoPort {
  return {
    nombre: 'servidor',
    async sellar(hash, ahora) {
      return {
        proveedor: 'servidor',
        token: null,
        sellado_en: ahora.toISOString(),
        hash,
      };
    },
  };
}

/**
 * Contrato de la TSA opcional. No abre red ni exige un servicio de pago.
 * TODO(Q-22): sin endpoint, licencia ni jurisdicción evaluados.
 */
export function crearSelloTsaExterna(): SelloTiempoPort {
  return {
    nombre: 'tsa_externa',
    async sellar() {
      throw new ErrorSelloTiempo(
        'La TSA externa no está configurada. Es opcional, de pago y no obligatoria. TODO(Q-22).',
      );
    },
  };
}

/** Resuelve un archivo dentro del directorio del tenant. Rechaza salidas del árbol. */
export function rutaArchivoDisco(raiz: string, tenantId: string, id: string, extension: 'bin' | 'json'): string {
  if (!esUuid(tenantId) || !esUuid(id)) {
    throw new Error('el identificador del almacén no es válido');
  }
  const base = path.resolve(raiz, tenantId);
  const archivo = path.resolve(base, `${id}.${extension}`);
  if (archivo !== base && !archivo.startsWith(base + path.sep)) {
    throw new Error('la ruta sale del almacén');
  }
  return archivo;
}

export function crearAlmacenMemoria(): AlmacenamientoPort {
  const objetos = new Map<string, { nombre: string; mime: string; hash: string; contenido: Buffer }>();
  return {
    nombre: 'memoria',
    async guardar(entrada) {
      const id = randomUUID();
      const hash = hashSha256(entrada.contenido);
      objetos.set(`${entrada.tenantId}:${id}`, {
        nombre: entrada.nombre,
        mime: entrada.mime,
        hash,
        contenido: Buffer.from(entrada.contenido),
      });
      return { id, hash };
    },
    async leer(tenantId, id) {
      const fila = objetos.get(`${tenantId}:${id}`);
      if (!fila) return null;
      return {
        nombre: fila.nombre,
        mime: fila.mime,
        hash: fila.hash,
        contenido: Buffer.from(fila.contenido),
      };
    },
  };
}
