#!/usr/bin/env node
// PLT-09 — Auditoría de licencias del árbol de dependencias (T01).
// Lee `package-lock.json` y falla (salida 1) ante cualquier licencia fuera de
// la lista permitida. Las licencias MPL-2.0/LGPL listadas nominalmente en
// `licenses.exceptions.json` como PENDIENTE Q-09 solo generan un aviso.
// También falla si `package.json` declara dependencias directas ausentes del
// lock (candado desactualizado).
// Uso: `npm run licenses:check` (desde `web/`).
// TODO(Q-09): las entradas PENDIENTE Q-09 requieren decisión de Orlando; este
// script seguirá avisando (sin fallar) solo por las listadas nominalmente.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUTA_LOCK = path.join(DIR_APP, 'package-lock.json');
const RUTA_EXCEPCIONES = path.join(DIR_APP, 'licenses.exceptions.json');
const RUTA_PACKAGE_JSON = path.join(DIR_APP, 'package.json');

// Licencias permitidas sin excepción (regla 2 + PLT-09 para datos/herramientas).
export const LICENCIAS_PERMITIDAS = new Set([
  'MIT',
  'APACHE-2.0',
  'ISC',
  'BSD-2-CLAUSE',
  'BSD-3-CLAUSE',
  'BSD-2',
  'BSD-3',
  '0BSD',
  'MIT-0',
  'BLUEOAK-1.0.0',
  'CC0-1.0',
  'UNLICENSED',
  'PYTHON-2.0',
  'BSL-1.0',
]);

const FAMILIAS_PROHIBIDAS = ['GPL', 'AGPL', 'LGPL', 'MPL', 'SSPL', 'BUSL', 'RSAL', 'OSL', 'CDDL', 'EPL', 'EUPL'];

export function normalizarLicencia(token) {
  return String(token).trim().toUpperCase().replace(/[\s_]+/g, '-');
}

// Divide expresiones SPDX («A AND B», «A OR B», «A/B», «A WITH excepción»).
export function dividirLicencias(campo) {
  return String(campo ?? '')
    .replace(/[()]/g, ' ')
    .split(/\s+(?:AND|OR|WITH)\s+|\s*\/\s*/i)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function familia(tokenNormalizado) {
  if (tokenNormalizado === 'APACHE-2.0') return 'APACHE';
  if (tokenNormalizado === 'BLUEOAK-1.0.0') return 'BLUEOAK';
  if (tokenNormalizado === 'PYTHON-2.0') return 'PYTHON';
  if (tokenNormalizado === '0BSD') return '0BSD';
  if (tokenNormalizado === 'MIT-0') return 'MIT';
  if (tokenNormalizado.startsWith('CC-BY-4.0')) return 'CC-BY-4.0';
  if (tokenNormalizado.startsWith('CC-')) return 'CC-OTRA';
  return tokenNormalizado.split('-')[0];
}

export function nombrePaquete(claveLock) {
  return String(claveLock).split('node_modules/').pop().replace(/\/$/, '');
}

// Núcleo puro: recibe el mapa `packages` del lock + excepciones y devuelve el
// veredicto sin tocar el sistema de archivos (probado en `tests/`).
export function evaluarLicencias(paquetes, excepciones = {}) {
  const pendientes = new Map((excepciones.pendiente_q09 ?? []).map((e) => [e.paquete, e]));
  const datosCcBy = new Set((excepciones.datos_cc_by_4_0 ?? []).map((e) => e.paquete));
  const errores = [];
  const avisos = [];
  const vistasPendientes = new Set();

  for (const [clave, info] of Object.entries(paquetes ?? {})) {
    if (clave === '') continue;
    const nombre = nombrePaquete(clave);
    const campo = info?.license;
    if (!campo) {
      errores.push(`${nombre}: sin campo "license" en el candado (se exige licencia declarada)`);
      continue;
    }
    for (const token of dividirLicencias(campo)) {
      const normalizada = normalizarLicencia(token);
      if (LICENCIAS_PERMITIDAS.has(normalizada)) continue;
      const fam = familia(normalizada);
      if (fam === 'CC-BY-4.0') {
        if (datosCcBy.has(nombre)) continue;
        errores.push(
          `${nombre}: CC-BY-4.0 solo se admite para datos listados en licenses.exceptions.json (datos_cc_by_4_0)`,
        );
        continue;
      }
      const excepcion = pendientes.get(nombre);
      if ((fam === 'MPL' || fam === 'LGPL') && excepcion) {
        vistasPendientes.add(nombre);
        avisos.push(`${nombre}@${info?.version ?? '?'} [${campo}]: PENDIENTE Q-09 (${excepcion.alcance ?? 'sin alcance'})`);
        continue;
      }
      if (FAMILIAS_PROHIBIDAS.includes(fam) || normalizada.includes('COMMONS-CLAUSE')) {
        errores.push(`${nombre}@${info?.version ?? '?'}: licencia prohibida [${campo}]`);
        continue;
      }
      errores.push(`${nombre}@${info?.version ?? '?'}: licencia no permitida [${campo}]`);
    }
  }

  for (const nombre of pendientes.keys()) {
    if (!vistasPendientes.has(nombre)) {
      avisos.push(`${nombre}: figura como PENDIENTE Q-09 pero no aparece en package-lock.json (excepción sin uso)`);
    }
  }

  return { errores, avisos };
}

// Verifica que toda dependencia directa de `package.json` exista en el candado.
export function verificarSincroniaCandado(manifiesto, paquetes) {
  const errores = [];
  const directas = { ...(manifiesto?.dependencies ?? {}), ...(manifiesto?.devDependencies ?? {}) };
  for (const nombre of Object.keys(directas)) {
    const presente = Object.keys(paquetes ?? {}).some((clave) => clave !== '' && nombrePaquete(clave) === nombre);
    if (!presente) {
      errores.push(`${nombre}: dependencia directa sin entrada en package-lock.json (candado desactualizado)`);
    }
  }
  return errores;
}

function leerJson(ruta) {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

const esCli = process.argv[1] != null && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (esCli) {
  const candado = leerJson(RUTA_LOCK);
  const excepciones = leerJson(RUTA_EXCEPCIONES);
  const manifiesto = leerJson(RUTA_PACKAGE_JSON);
  const { errores, avisos } = evaluarLicencias(candado.packages, excepciones);
  const erroresSincronia = verificarSincroniaCandado(manifiesto, candado.packages);
  const todosErrores = [...errores, ...erroresSincronia];

  for (const aviso of avisos) console.warn(`AVISO (PENDIENTE Q-09): ${aviso}`);
  for (const error of todosErrores) console.error(`ERROR: ${error}`);

  const total = Object.keys(candado.packages ?? {}).filter((k) => k !== '').length;
  console.log(`licencias: ${total} paquetes auditados, ${todosErrores.length} errores, ${avisos.length} avisos`);

  if (todosErrores.length > 0) {
    console.error('licenses:check FALLÓ: hay licencias prohibidas o candado desactualizado.');
    process.exit(1);
  }
  console.log('licenses:check OK.');
}
