#!/usr/bin/env node
// SEG-12 (T11) — Falla (salida 1) si un archivo versionado parece contener
// un secreto. No usa dependencias npm. Omite `web/.agents/` (skills de
// terceros) y los lockfiles. No lee `.env.local`: `git ls-files` solo ve
// lo que está en el repositorio.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buscarSecretosEnRepo } from '../lib/cifrado/patrones-secretos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hallazgos = buscarSecretosEnRepo(RAIZ);

if (hallazgos.length === 0) {
  console.log('secretos:buscar: ningún patrón de secreto en los archivos versionados.');
  process.exit(0);
}

console.error(`secretos:buscar: ${hallazgos.length} hallazgo(s).`);
for (const hallazgo of hallazgos) {
  console.error(`${hallazgo.ruta}:${hallazgo.linea} [${hallazgo.id}]`);
}
process.exit(1);
