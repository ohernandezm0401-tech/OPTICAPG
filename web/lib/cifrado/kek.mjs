// SEG-12 (T11) — Clave maestra (KEK) fuera del repositorio.
// Se lee de `APP_MASTER_KEY` (base64 de 32 bytes) o de `APP_MASTER_KEY_FILE`
// (ruta a un archivo que no se versiona). `APP_MASTER_KEYS_ANTERIORES` aporta
// claves ya rotadas (`id:base64,id:base64`) mientras se reenvuelven las DEK.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { ErrorCifrado } from './aes.mjs';

/** @type {{ activaId: string, claves: Map<string, Buffer> } | null} */
let registroFijado = null;

/** KEK efímera de Vitest. No se usa fuera de la prueba ni se escribe a disco. */
let claveVitest = null;

function registroVitest() {
  if (process.env.VITEST !== 'true' || process.env.APP_ENV === 'produccion') return null;
  if (!claveVitest) claveVitest = randomBytes(32);
  return { activaId: 'vitest', claves: new Map([['vitest', claveVitest]]) };
}

/**
 * Solo pruebas. `null` vuelve a leer el entorno.
 * @param {{ activaId: string, claves: Map<string, Buffer> } | null} registro
 */
export function fijarRegistroKekParaPruebas(registro) {
  registroFijado = registro;
}

/** @param {string} codificado */
export function decodificarClaveMaestra(codificado) {
  const limpio = codificado.trim().replace(/\s+/g, '');
  const clave = Buffer.from(limpio, 'base64');
  if (clave.length !== 32) {
    throw new ErrorCifrado('la clave maestra debe ser de 32 bytes en base64');
  }
  return clave;
}

/**
 * @param {string} texto formato `id:base64,id:base64`
 * @param {Map<string, Buffer>} claves
 */
function mezclarAnteriores(texto, claves) {
  if (!texto?.trim()) return;
  for (const parte of texto.split(',')) {
    const trozo = parte.trim();
    if (!trozo) continue;
    const corte = trozo.indexOf(':');
    if (corte <= 0) throw new ErrorCifrado('APP_MASTER_KEYS_ANTERIORES no es válido');
    const id = trozo.slice(0, corte).trim();
    claves.set(id, decodificarClaveMaestra(trozo.slice(corte + 1)));
  }
}

/**
 * Archivo JSON `{ "activa": "1", "claves": { "1": "<base64>" } }`
 * o una sola clave en base64 (el id sale de `APP_MASTER_KEY_ID`).
 * @param {string} ruta
 * @param {string} idPorDefecto
 */
function leerArchivo(ruta, idPorDefecto) {
  let texto;
  try {
    texto = readFileSync(ruta, 'utf8');
  } catch {
    throw new ErrorCifrado('no se pudo leer APP_MASTER_KEY_FILE');
  }
  const limpio = texto.trim();
  if (limpio.startsWith('{')) {
    let json;
    try {
      json = JSON.parse(limpio);
    } catch {
      throw new ErrorCifrado('APP_MASTER_KEY_FILE no es JSON válido');
    }
    const claves = new Map();
    const mapa = json.claves ?? {};
    for (const [id, valor] of Object.entries(mapa)) {
      claves.set(id, decodificarClaveMaestra(String(valor)));
    }
    const activaId = String(json.activa ?? idPorDefecto);
    if (!claves.has(activaId)) throw new ErrorCifrado('la clave maestra activa no está en el archivo');
    return { activaId, claves };
  }
  return {
    activaId: idPorDefecto,
    claves: new Map([[idPorDefecto, decodificarClaveMaestra(limpio)]]),
  };
}

/**
 * @param {Record<string, string | undefined>} [variables]
 * @returns {{ activaId: string, claves: Map<string, Buffer> }}
 */
export function leerRegistroKek(variables = process.env) {
  if (registroFijado) return registroFijado;
  if (!variables.APP_MASTER_KEY?.trim() && !variables.APP_MASTER_KEY_FILE?.trim()) {
    const dePrueba = registroVitest();
    if (dePrueba) return dePrueba;
  }
  const idPorDefecto = variables.APP_MASTER_KEY_ID?.trim() || '1';
  /** @type {{ activaId: string, claves: Map<string, Buffer> }} */
  let registro;
  if (variables.APP_MASTER_KEY_FILE?.trim()) {
    registro = leerArchivo(variables.APP_MASTER_KEY_FILE.trim(), idPorDefecto);
  } else if (variables.APP_MASTER_KEY?.trim()) {
    registro = {
      activaId: idPorDefecto,
      claves: new Map([[idPorDefecto, decodificarClaveMaestra(variables.APP_MASTER_KEY)]]),
    };
  } else {
    throw new ErrorCifrado(
      'falta la clave maestra (APP_MASTER_KEY o APP_MASTER_KEY_FILE); no se guarda en el repositorio',
    );
  }
  mezclarAnteriores(variables.APP_MASTER_KEYS_ANTERIORES ?? '', registro.claves);
  if (!registro.claves.has(registro.activaId)) {
    throw new ErrorCifrado('la clave maestra activa no está disponible');
  }
  return registro;
}

/** @param {{ claves: Map<string, Buffer>, activaId: string }} registro */
export function claveMaestraActiva(registro) {
  const clave = registro.claves.get(registro.activaId);
  if (!clave) throw new ErrorCifrado('la clave maestra activa no está disponible');
  return clave;
}

/**
 * @param {{ claves: Map<string, Buffer> }} registro
 * @param {string} kekId
 */
export function claveMaestraPorId(registro, kekId) {
  const clave = registro.claves.get(kekId);
  if (!clave) throw new ErrorCifrado('la clave maestra no está disponible');
  return clave;
}
