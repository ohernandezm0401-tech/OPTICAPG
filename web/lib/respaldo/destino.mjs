// PLT-07 (T28) — Destino del respaldo cifrado.
// Disco local es el adaptador por defecto. El almacenamiento compatible con
// S3 es solo un puerto: no hay SDK ni servicio de pago.
import { chmodSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

const NOMBRE_SEGURO = /^[a-zA-Z0-9._-]+$/;

/**
 * @param {string} directorio
 */
export function destinoDisco(directorio) {
  const base = path.resolve(directorio);
  mkdirSync(base, { recursive: true, mode: 0o700 });
  chmodSync(base, 0o700);
  return {
    tipo: 'disco',
    /**
     * @param {string} nombre
     * @param {Buffer} contenido
     */
    async guardar(nombre, contenido) {
      if (!NOMBRE_SEGURO.test(nombre)) throw new Error('nombre de respaldo no válido');
      const ubicacion = path.join(base, nombre);
      const fd = openSync(ubicacion, 'w', 0o600);
      try {
        writeSync(fd, contenido);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      chmodSync(ubicacion, 0o600);
      return { ubicacion };
    },
    /**
     * @param {string} ubicacion
     */
    async leer(ubicacion) {
      const resuelto = path.resolve(ubicacion);
      if (resuelto !== base && !resuelto.startsWith(base + path.sep)) {
        throw new Error('la ubicación no está en el destino');
      }
      return readFileSync(resuelto);
    },
  };
}

/**
 * Puerto para un adaptador compatible con S3 inyectado por infraestructura.
 * Sin `putObject` y `getObject` el destino rechaza la operación.
 * @param {{ putObject?: (nombre: string, contenido: Buffer) => Promise<string>, getObject?: (ubicacion: string) => Promise<Buffer> } | null | undefined} adaptador
 */
export function destinoCompatibleS3(adaptador) {
  return {
    tipo: 'compatible-s3',
    /**
     * @param {string} nombre
     * @param {Buffer} contenido
     */
    async guardar(nombre, contenido) {
      if (!adaptador?.putObject || !adaptador?.getObject) {
        throw new Error(
          'destino compatible S3: falta el adaptador. Es un puerto, sin SDK ni servicio de pago.',
        );
      }
      if (!NOMBRE_SEGURO.test(nombre)) throw new Error('nombre de respaldo no válido');
      const ubicacion = await adaptador.putObject(nombre, contenido);
      if (typeof ubicacion !== 'string' || !ubicacion) throw new Error('el adaptador no devolvió la ubicación');
      return { ubicacion };
    },
    /**
     * @param {string} ubicacion
     */
    async leer(ubicacion) {
      if (!adaptador?.getObject) {
        throw new Error(
          'destino compatible S3: falta el adaptador. Es un puerto, sin SDK ni servicio de pago.',
        );
      }
      const datos = await adaptador.getObject(ubicacion);
      if (!Buffer.isBuffer(datos)) throw new Error('el adaptador no devolvió bytes');
      return datos;
    },
  };
}

/**
 * @param {Record<string, string | undefined>} [variables]
 * @param {{ putObject?: (nombre: string, contenido: Buffer) => Promise<string>, getObject?: (ubicacion: string) => Promise<Buffer> } | null} [adaptadorS3]
 */
export function destinoDesdeEntorno(variables = process.env, adaptadorS3 = null) {
  const tipo = (variables.BACKUP_DESTINO || 'disco').trim() || 'disco';
  if (tipo === 'disco') {
    const directorio = variables.BACKUP_DIR?.trim() || path.join(tmpdir(), 'optisaas-respaldos');
    return destinoDisco(directorio);
  }
  if (tipo === 'compatible-s3' || tipo === 's3') {
    return destinoCompatibleS3(adaptadorS3);
  }
  throw new Error('BACKUP_DESTINO no es válido: use disco o compatible-s3');
}
