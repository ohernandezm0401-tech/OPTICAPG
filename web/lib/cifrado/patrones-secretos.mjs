// SEG-12 (T11) — Búsqueda de secretos en el árbol versionado.
// Equivale al papel de un detector de fugas, sin dependencia npm: los
// patrones se arman por partes para que este archivo no se marque a sí mismo.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const EXTENSIONES = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.sql',
  '.md',
  '.yml',
  '.yaml',
  '.json',
  '.sh',
  '.txt',
  '.example',
  '.env',
]);

const OMITIR_PREFIJOS = ['web/.agents/'];
const OMITIR_NOMBRES = new Set(['package-lock.json', 'skills-lock.json']);

function patron(partes, banderas = '') {
  return new RegExp(partes.join(''), banderas);
}

// Cada entrada es un hallazgo de secreto. El texto se parte para no
// coincidir con este mismo archivo al escanearlo.
const PATRONES = [
  {
    id: 'supabase-url',
    re: patron(['https?:\\/\\/', '[a-z0-9-]+', '\\.', 'supabase', '\\.', 'co'], 'i'),
  },
  {
    id: 'service-role-asignada',
    re: patron(['SUPABASE_', 'SERVICE', '_', 'ROLE', '_', 'KEY', '\\s*=\\s*', '["\']?', '\\S{8,}']),
  },
  {
    id: 'jwt',
    re: patron(['ey', 'J', '[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}']),
  },
  {
    id: 'pem',
    re: patron(['-----BEGIN ', '[A-Z ]*', 'PRIVATE KEY-----']),
  },
  {
    id: 'aws-access-key',
    re: patron(['AKIA', '[0-9A-Z]{16}']),
  },
  {
    id: 'stripe-live',
    re: patron(['sk', '_', 'live', '_[0-9a-zA-Z]{8,}']),
  },
  {
    id: 'github-pat',
    re: patron(['ghp', '_[A-Za-z0-9]{20,}']),
  },
  {
    id: 'slack',
    re: patron(['xox', '[baprs]', '-[A-Za-z0-9-]{10,}']),
  },
  {
    id: 'master-key-asignada',
    re: patron(['APP_MASTER_KEY', '\\s*=\\s*', '["\']?', '[A-Za-z0-9+/=]{16,}']),
  },
];

/**
 * @param {string} texto
 * @param {string} ruta
 * @returns {{ ruta: string, id: string, linea: number }[]}
 */
export function hallazgosEnTexto(texto, ruta) {
  const hallazgos = [];
  const lineas = texto.split(/\r?\n/);
  for (let indice = 0; indice < lineas.length; indice += 1) {
    const linea = lineas[indice];
    for (const patronLinea of PATRONES) {
      if (patronLinea.re.test(linea)) {
        hallazgos.push({ ruta, id: patronLinea.id, linea: indice + 1 });
      }
    }
  }
  return hallazgos;
}

/** @param {string} raiz */
export function archivosVersionados(raiz) {
  const crudo = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'buffer' });
  return crudo
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((relativa) => {
      if (OMITIR_NOMBRES.has(path.basename(relativa))) return false;
      if (OMITIR_PREFIJOS.some((prefijo) => relativa.startsWith(prefijo))) return false;
      const extension = path.extname(relativa);
      if (relativa.endsWith('.env.example')) return true;
      return EXTENSIONES.has(extension);
    });
}

/**
 * @param {string} raiz
 * @returns {{ ruta: string, id: string, linea: number }[]}
 */
export function buscarSecretosEnRepo(raiz) {
  const hallazgos = [];
  for (const relativa of archivosVersionados(raiz)) {
    let texto;
    try {
      texto = readFileSync(path.join(raiz, relativa), 'utf8');
    } catch {
      continue;
    }
    if (texto.includes('\0')) continue;
    hallazgos.push(...hallazgosEnTexto(texto, relativa));
  }
  return hallazgos;
}
