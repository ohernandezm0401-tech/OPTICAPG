// SEG-08 (T14) — Adaptadores de AlmacenamientoPort.
// `bd_cifrada` guarda el PDF en `anexos` con el sobre de T11.
// `disco_cifrado` escribe el mismo sobre en un directorio del servidor.
// La ruta no es pública. MinIO queda fuera (AGPL).
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { obtenerPool } from '../../db/index';
import { hashSha256 } from '../../dominio/firma';
import { cifrarParaTenant, descifrarParaTenant, guardarAnexo, leerAnexo } from '../cifrado/almacen.mjs';
import { leerRegistroKek } from '../cifrado/kek.mjs';
import { esUuid, rutaArchivoDisco, type AlmacenamientoPort } from './puertos';

function registro() {
  return leerRegistroKek();
}

export function crearAlmacenBdCifrada(): AlmacenamientoPort {
  return {
    nombre: 'bd_cifrada',
    async guardar(entrada) {
      const guardado = await guardarAnexo(obtenerPool(), registro(), {
        tenantId: entrada.tenantId,
        nombre: entrada.nombre,
        mime: entrada.mime,
        contenido: entrada.contenido,
      });
      return { id: guardado.id as string, hash: guardado.hash as string };
    },
    async leer(tenantId, id) {
      const fila = await leerAnexo(obtenerPool(), registro(), tenantId, id);
      if (!fila) return null;
      return {
        nombre: fila.nombre as string,
        mime: (fila.mime as string | null) ?? null,
        hash: fila.hash as string,
        contenido: Buffer.from(fila.contenido as Buffer),
      };
    },
  };
}

export function directorioAlmacenDisco(): string {
  return process.env.ALMACEN_DISCO_DIR?.trim() || path.join(process.cwd(), '.almacen-firma');
}

export function crearAlmacenDiscoCifrado(raiz = directorioAlmacenDisco()): AlmacenamientoPort {
  return {
    nombre: 'disco_cifrado',
    async guardar(entrada) {
      const cifrado = await cifrarParaTenant(obtenerPool(), registro(), entrada.tenantId, entrada.contenido);
      const id = randomUUID();
      const binario = rutaArchivoDisco(raiz, entrada.tenantId, id, 'bin');
      const meta = rutaArchivoDisco(raiz, entrada.tenantId, id, 'json');
      await mkdir(path.dirname(binario), { recursive: true });
      await writeFile(binario, Buffer.from(cifrado.bytes as Buffer));
      await writeFile(
        meta,
        JSON.stringify({
          nombre: entrada.nombre,
          mime: entrada.mime,
          hash: cifrado.hash,
          version: cifrado.version,
        }),
      );
      return { id, hash: cifrado.hash as string };
    },
    async leer(tenantId, id) {
      if (!esUuid(tenantId) || !esUuid(id)) return null;
      let metaRuta: string;
      let binario: string;
      try {
        metaRuta = rutaArchivoDisco(raiz, tenantId, id, 'json');
        binario = rutaArchivoDisco(raiz, tenantId, id, 'bin');
      } catch {
        return null;
      }
      let meta: { nombre: string; mime: string | null; hash: string };
      let sobre: Buffer;
      try {
        meta = JSON.parse(await readFile(metaRuta, 'utf8')) as { nombre: string; mime: string | null; hash: string };
        sobre = await readFile(binario);
      } catch {
        return null;
      }
      const plano = await descifrarParaTenant(obtenerPool(), registro(), tenantId, sobre);
      const contenido = Buffer.from(plano as Buffer);
      const hash = hashSha256(contenido);
      if (hash !== meta.hash) return null;
      return { nombre: meta.nombre, mime: meta.mime, hash, contenido };
    },
  };
}
