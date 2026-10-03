#!/usr/bin/env node
// SEG-12 (T11) — Búsqueda de secretos en el repositorio.
// Equivalente propio de un escáner de secretos: solo expresiones regulares,
// sin dependencias ni herramientas con licencia no permitida.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OMITIR_DIRECTORIOS = new Set(['node_modules', '.git', '.next', 'coverage', 'dist', 'out']);

export const PATRONES = [
  { id: 'pem', re: /-----BEGIN (?:RSA |OPENSSH |EC |PGP )?PRIVATE KEY-----/ },
  { id: 'aws', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'github', re: /ghp_[A-Za-z0-9]{20,}/ },
  { id: 'stripe-vivo', re: /sk_live_[A-Za-z0-9]{16,}/ },
  { id: 'slack', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  {
    id: 'url-con-clave',
    re: /[a-z][a-z0-9+.-]*:\/\/[^:\s'"]+:[^@\s'"]{8,}@(?!localhost\b|127\.0\.0\.1\b)/i,
  },
];

export function buscarEnTexto(texto) {
  const hallazgos = [];
  for (const patron of PATRONES) {
    patron.re.lastIndex = 0;
    if (patron.re.test(texto)) hallazgos.push(patron.id);
  }
  return hallazgos;
}

function archivoBinario(buffer) {
  const tope = Math.min(buffer.length, 1024);
  for (let i = 0; i < tope; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export function buscarEnDirectorio(raiz) {
  const hallazgos = [];
  const pila = [raiz];
  while (pila.length > 0) {
    const actual = pila.pop();
    for (const nombre of readdirSync(actual)) {
      if (OMITIR_DIRECTORIOS.has(nombre)) continue;
      const ruta = path.join(actual, nombre);
      const estado = statSync(ruta);
      if (estado.isDirectory()) {
        pila.push(ruta);
        continue;
      }
      if (!estado.isFile() || estado.size > 2_000_000) continue;
      const buffer = readFileSync(ruta);
      if (archivoBinario(buffer)) continue;
      const ids = buscarEnTexto(buffer.toString('utf8'));
      if (ids.length > 0) hallazgos.push({ ruta: path.relative(raiz, ruta), ids });
    }
  }
  return hallazgos;
}

function esPrincipal() {
  const invocado = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return invocado === fileURLToPath(import.meta.url);
}

if (esPrincipal()) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const hallazgos = buscarEnDirectorio(raiz);
  if (hallazgos.length > 0) {
    console.error(`secretos: ${hallazgos.length} archivo(s) con patrones de secreto`);
    for (const hallazgo of hallazgos) {
      console.error(`ERROR: ${hallazgo.ruta} (${hallazgo.ids.join(', ')})`);
    }
    process.exit(1);
  }
  console.log('secretos:buscar OK.');
}
