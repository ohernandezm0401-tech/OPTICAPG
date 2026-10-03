// OPT-10 (T18) — AC-OPT-10-2. El repositorio no redistribuye CIE-10 ni CUPS
// mientras la licencia esté pendiente (TODO(Q-23)). La única excepción es el
// CSV sintético de prueba, marcado como tal.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const RUTA_CSV_SINTETICO = 'web/datos/catalogos/sintetico-prueba.csv';

const EXTENSIONES = new Set(['.csv', '.txt', '.tsv', '.xlsx', '.xls', '.json', '.sql']);
const PATRON_NOMBRE = /(?:cie[-_]?10|cups|catalogo[-_](?:cie|cups))/i;
const OMITIR_DIRECTORIOS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  '.turbo',
]);

/**
 * @param {string} rutaRelativa
 */
export function esArchivoCatalogoNoVerificado(rutaRelativa) {
  const normal = rutaRelativa.split(path.sep).join('/');
  if (normal === RUTA_CSV_SINTETICO) return false;
  const base = path.posix.basename(normal);
  const extension = path.posix.extname(base).toLowerCase();
  if (!EXTENSIONES.has(extension)) return false;
  if (normal.startsWith('web/datos/catalogos/')) return true;
  return PATRON_NOMBRE.test(base);
}

/**
 * @param {string[]} rutas
 * @returns {string[]}
 */
export function auditarRutasCatalogo(rutas) {
  return rutas.filter((ruta) => esArchivoCatalogoNoVerificado(ruta));
}

/**
 * @param {string} raiz
 * @param {string} [directorio]
 * @param {string[]} [acumulado]
 */
export function listarRutasRelativas(raiz, directorio = raiz, acumulado = []) {
  for (const entrada of readdirSync(directorio)) {
    if (OMITIR_DIRECTORIOS.has(entrada)) continue;
    const absoluto = path.join(directorio, entrada);
    const relativo = path.relative(raiz, absoluto);
    const info = statSync(absoluto);
    if (info.isDirectory()) {
      listarRutasRelativas(raiz, absoluto, acumulado);
    } else if (info.isFile()) {
      acumulado.push(relativo.split(path.sep).join('/'));
    }
  }
  return acumulado;
}

/**
 * El CSV de prueba debe decir que es sintético y no copiar descripciones
 * oficiales conocidas del bloque H52.
 * @param {string} texto
 */
export function validarMarcaSintetica(texto) {
  const fallos = [];
  if (!texto.includes('SINTETICO')) {
    fallos.push('el CSV de prueba no está marcado como SINTETICO');
  }
  if (!/no es el cat[aá]logo oficial/i.test(texto)) {
    fallos.push('el CSV de prueba no declara que no es el catálogo oficial');
  }
  for (const prohibida of ['Miopía', 'Hipermetropía', 'Astigmatismo']) {
    if (texto.includes(prohibida)) {
      fallos.push(`el CSV de prueba incluye una descripción oficial («${prohibida}»)`);
    }
  }
  return fallos;
}

/**
 * @param {string} raiz
 */
export function auditarRepositorioCatalogos(raiz) {
  const rutas = listarRutasRelativas(raiz);
  const fallos = auditarRutasCatalogo(rutas).map(
    (ruta) => `archivo de catálogo con licencia no verificada: ${ruta}`,
  );
  const sintetico = path.join(raiz, ...RUTA_CSV_SINTETICO.split('/'));
  if (!rutas.includes(RUTA_CSV_SINTETICO)) {
    fallos.push(`falta la excepción explícita ${RUTA_CSV_SINTETICO}`);
    return fallos;
  }
  const texto = readFileSync(sintetico, 'utf8');
  fallos.push(...validarMarcaSintetica(texto));
  return fallos;
}
