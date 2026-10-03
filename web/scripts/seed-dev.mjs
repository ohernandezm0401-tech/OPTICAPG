#!/usr/bin/env node
// PLT-10 (T05) — `npm run seed:dev`: genera cuentas locales de desarrollo.
//
// Crea `.credenciales-desarrollo.local.json` (no versionado, ver
// `.gitignore`) con contraseñas aleatorias para las cuentas sintéticas del
// modo de demostración. Las contraseñas solo existen en esta máquina: nunca
// se escriben en el repo. Se niega a correr con `APP_ENV=produccion`.
// Uso: `npm run seed:dev` y luego ingrese con el correo y la contraseña
// mostrada (solo terminal local).
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO =
  process.env.CREDENCIALES_DESARROLLO_RUTA ?? path.join(DIR_APP, '.credenciales-desarrollo.local.json');

const CUENTAS_SINTETICAS = [
  'owner@optisaas.co',
  'admin@visiontotal.com',
  'carlos@visiontotal.com',
  'dra.vega@visiontotal.com',
  'admin@opticentro.com',
];

function abortar(mensaje) {
  console.error(`seed:dev abortado: ${mensaje}`);
  process.exit(1);
}

if ((process.env.APP_ENV ?? '').trim() === 'produccion') {
  abortar('no corre con APP_ENV=produccion (ver docs/ENTORNOS.md).');
}

if (existsSync(DESTINO) && !process.argv.includes('--forzar')) {
  abortar(
    `ya existe ${path.basename(DESTINO)} en esta máquina. ` +
      'Bórrelo o repita con --forzar para generar contraseñas nuevas.',
  );
}

const cuentas = {};
for (const correo of CUENTAS_SINTETICAS) {
  cuentas[correo] = randomBytes(18).toString('base64url');
}

writeFileSync(DESTINO, `${JSON.stringify(cuentas, null, 2)}\n`, { mode: 0o600 });
try {
  chmodSync(DESTINO, 0o600);
} catch {
  // En sistemas sin chmod (Windows), el .gitignore ya evita versionarlo.
}

// La app lee las cuentas desde `CUENTAS_DEV_JSON` (apto para el runtime Edge
// del middleware, que no accede a disco): se deja en `.env.local`
// (no versionado; se crea si no existe).
const RUTA_ENV_LOCAL = path.join(DIR_APP, '.env.local');
const LINEA_CUENTAS = `CUENTAS_DEV_JSON='${JSON.stringify(cuentas)}'`;
try {
  let contenido = existsSync(RUTA_ENV_LOCAL) ? readFileSync(RUTA_ENV_LOCAL, 'utf8') : '';
  if (/^CUENTAS_DEV_JSON=/m.test(contenido)) {
    contenido = contenido.replace(/^CUENTAS_DEV_JSON=.*$/m, () => LINEA_CUENTAS);
  } else {
    if (contenido && !contenido.endsWith('\n')) contenido += '\n';
    contenido += `${LINEA_CUENTAS}\n`;
  }
  writeFileSync(RUTA_ENV_LOCAL, contenido, { mode: 0o600 });
} catch (error) {
  abortar(`no se pudo actualizar .env.local: ${error instanceof Error ? error.message : String(error)}.`);
}

console.log(`seed:dev OK: cuentas locales en ${path.basename(DESTINO)} (no versionado).`);
console.log('Correos y contraseñas de esta máquina (no las comparta ni las suba al repo):');
for (const [correo, clave] of Object.entries(cuentas)) {
  console.log(` - ${correo} / ${clave}`);
}
console.log('El inicio de sesión de demostración además exige APP_MODE=demo (ver .env.example).');
