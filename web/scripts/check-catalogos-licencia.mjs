#!/usr/bin/env node
// OPT-10 (T18) — AC-OPT-10-2. Falla si el repo trae un archivo de CIE-10 o
// CUPS distinto del CSV sintético de prueba.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditarRepositorioCatalogos } from '../dominio/catalogos-licencia.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fallos = auditarRepositorioCatalogos(raiz);
if (fallos.length > 0) {
  for (const fallo of fallos) console.error(`ERROR: ${fallo}`);
  console.error('catalogos:check FALLÓ: hay archivos de catálogo con licencia no verificada.');
  process.exit(1);
}
console.log(`catalogos:check OK. Excepción explícita: web/datos/catalogos/sintetico-prueba.csv`);
