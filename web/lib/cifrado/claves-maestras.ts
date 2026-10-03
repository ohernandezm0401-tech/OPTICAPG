// SEG-12 (T11) — Clave maestra (KEK) por entorno, fuera del repositorio.
// Se lee de `APP_MASTER_KEY` (base64 de 32 bytes) o de `APP_MASTER_KEY_FILE`.
// Durante una rotación, `APP_MASTER_KEYS` conserva las versiones anteriores
// (`1:<base64>,2:<base64>`) y `APP_MASTER_KEY_VERSION` indica la activa.
import { readFileSync } from 'node:fs';

import { BYTES_CLAVE, ErrorCifrado } from './aes';

export type ConjuntoClavesMaestras = {
  activa: number;
  claves: ReadonlyMap<number, Buffer>;
};

const BASE64_32 = /^[A-Za-z0-9+/]{43}=$/;

export function decodificarClaveMaestra(valor: string): Buffer {
  const limpio = valor.trim();
  if (!BASE64_32.test(limpio)) {
    throw new ErrorCifrado('La clave maestra debe ser 32 bytes en base64, sin el valor en el repositorio.');
  }
  const clave = Buffer.from(limpio, 'base64');
  if (clave.length !== BYTES_CLAVE) {
    throw new ErrorCifrado('La clave maestra debe ser 32 bytes en base64, sin el valor en el repositorio.');
  }
  return clave;
}

export function conjuntoDesdePares(activa: number, pares: Array<[number, Buffer]>): ConjuntoClavesMaestras {
  const claves = new Map<number, Buffer>();
  for (const [version, clave] of pares) {
    if (!Number.isInteger(version) || version < 1) {
      throw new ErrorCifrado('La versión de la clave maestra no es válida.');
    }
    if (clave.length !== BYTES_CLAVE) {
      throw new ErrorCifrado('La clave maestra debe ser 32 bytes en base64, sin el valor en el repositorio.');
    }
    claves.set(version, clave);
  }
  if (!claves.has(activa)) {
    throw new ErrorCifrado('La versión activa de la clave maestra no está definida.');
  }
  return { activa, claves };
}

type Variables = Record<string, string | undefined>;

function parsearLista(lista: string): Array<[number, string]> {
  const pares: Array<[number, string]> = [];
  for (const trozo of lista.split(',')) {
    const texto = trozo.trim();
    if (!texto) continue;
    const separador = texto.indexOf(':');
    if (separador < 1) {
      throw new ErrorCifrado('APP_MASTER_KEYS debe tener el formato version:base64 separado por comas.');
    }
    const version = Number(texto.slice(0, separador));
    if (!Number.isInteger(version) || version < 1) {
      throw new ErrorCifrado('APP_MASTER_KEYS tiene una versión inválida.');
    }
    pares.push([version, texto.slice(separador + 1)]);
  }
  return pares;
}

function parsearArchivo(contenido: string): { activa: number | null; pares: Array<[number, string]> } {
  let activa: number | null = null;
  const pares: Array<[number, string]> = [];
  for (const lineaCruda of contenido.split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith('#')) continue;
    if (linea.startsWith('activa ')) {
      const version = Number(linea.slice('activa '.length).trim());
      if (!Number.isInteger(version) || version < 1) {
        throw new ErrorCifrado('El archivo de la clave maestra tiene una versión activa inválida.');
      }
      activa = version;
      continue;
    }
    const espacio = linea.indexOf(' ');
    if (espacio < 1) {
      pares.push([1, linea]);
      continue;
    }
    const version = Number(linea.slice(0, espacio));
    if (!Number.isInteger(version) || version < 1) {
      throw new ErrorCifrado('El archivo de la clave maestra tiene una versión inválida.');
    }
    pares.push([version, linea.slice(espacio + 1).trim()]);
  }
  return { activa, pares };
}

export function leerClavesMaestras(
  variables: Variables,
  leerArchivo: (ruta: string) => string = (ruta) => readFileSync(ruta, 'utf8'),
): ConjuntoClavesMaestras {
  const archivo = variables.APP_MASTER_KEY_FILE?.trim();
  const suelta = variables.APP_MASTER_KEY?.trim();
  const lista = variables.APP_MASTER_KEYS?.trim();
  const versionDeclarada = variables.APP_MASTER_KEY_VERSION?.trim();

  const textos = new Map<number, string>();
  let activa: number | null = null;

  if (archivo) {
    let contenido: string;
    try {
      contenido = leerArchivo(archivo);
    } catch {
      throw new ErrorCifrado('No se pudo leer APP_MASTER_KEY_FILE. La clave maestra queda fuera del repositorio.');
    }
    const parseado = parsearArchivo(contenido);
    activa = parseado.activa;
    for (const [version, valor] of parseado.pares) textos.set(version, valor);
  }

  if (lista) {
    for (const [version, valor] of parsearLista(lista)) textos.set(version, valor);
  }

  if (suelta) {
    const version = versionDeclarada ? Number(versionDeclarada) : 1;
    if (!Number.isInteger(version) || version < 1) {
      throw new ErrorCifrado('APP_MASTER_KEY_VERSION no es válida.');
    }
    textos.set(version, suelta);
    activa = version;
  } else if (versionDeclarada) {
    const version = Number(versionDeclarada);
    if (!Number.isInteger(version) || version < 1) {
      throw new ErrorCifrado('APP_MASTER_KEY_VERSION no es válida.');
    }
    activa = version;
  }

  if (textos.size === 0) {
    throw new ErrorCifrado(
      'Falta la clave maestra. Defina APP_MASTER_KEY o APP_MASTER_KEY_FILE fuera del repositorio.',
    );
  }

  if (activa == null) {
    activa = Math.max(...textos.keys());
  }

  const pares: Array<[number, Buffer]> = [];
  for (const [version, valor] of textos) pares.push([version, decodificarClaveMaestra(valor)]);
  return conjuntoDesdePares(activa, pares);
}
