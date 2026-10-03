// PLT-09 — Pruebas del canal de calidad (T01, AC-PLT-09-3).
// Verifica que todo PR ejecute lint + typecheck + pruebas + build (+ licencias)
// mediante el flujo de CI versionado, sin depender de que la CI haya corrido.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_TESTS = path.dirname(fileURLToPath(import.meta.url));
const DIR_APP = path.resolve(DIR_TESTS, '..');
const DIR_REPO = path.resolve(DIR_APP, '..');
const RUTA_WORKFLOW = path.join(DIR_REPO, '.github', 'workflows', 'ci.yml');

function leerTexto(ruta) {
  return readFileSync(ruta, 'utf8');
}

describe('AC-PLT-09-3: todo PR ejecuta lint + typecheck + pruebas + build', () => {
  it('package.json expone los scripts del canal de calidad', () => {
    const manifiesto = JSON.parse(leerTexto(path.join(DIR_APP, 'package.json')));
    for (const script of ['lint', 'typecheck', 'test', 'build', 'licenses:check']) {
      assert.ok(manifiesto.scripts?.[script], `falta el script npm "${script}"`);
    }
  });

  it('existe el flujo .github/workflows/ci.yml', () => {
    assert.ok(existsSync(RUTA_WORKFLOW), 'falta .github/workflows/ci.yml (lo amplía T02)');
  });

  it('el flujo ejecuta lint, typecheck, pruebas, licencias y build', () => {
    const flujo = leerTexto(RUTA_WORKFLOW);
    for (const paso of ['lint', 'typecheck', 'licenses:check', 'build']) {
      assert.ok(flujo.includes(paso), `el flujo no menciona "${paso}"`);
    }
    assert.ok(/npm test|run: test/.test(flujo), 'el flujo no ejecuta las pruebas');
  });

  it('el flujo se dispara en pull_request', () => {
    assert.ok(leerTexto(RUTA_WORKFLOW).includes('pull_request'), 'el flujo debe correr en cada PR');
  });

  it('el flujo instala sin postinstall de terceros (--ignore-scripts)', () => {
    assert.ok(
      leerTexto(RUTA_WORKFLOW).includes('--ignore-scripts'),
      'la CI debe instalar con --ignore-scripts (regla de T01)',
    );
  });
});

describe('Node 22 fijado (T01, ADR-09 de la spec)', () => {
  it('.nvmrc de la app y del repo fijan Node 22', () => {
    for (const ruta of [path.join(DIR_APP, '.nvmrc'), path.join(DIR_REPO, '.nvmrc')]) {
      assert.ok(existsSync(ruta), `falta ${ruta}`);
      assert.match(leerTexto(ruta).trim(), /^22(\.|$)/, `${ruta} debe fijar Node 22`);
    }
  });

  it('engines exige node >=22.12 y el runtime actual lo cumple', () => {
    const manifiesto = JSON.parse(leerTexto(path.join(DIR_APP, 'package.json')));
    assert.ok(manifiesto.engines?.node, 'falta engines.node en package.json');
    const [mayor, menor] = process.version.replace(/^v/, '').split('.').map(Number);
    assert.ok(mayor > 22 || (mayor === 22 && menor >= 12), `runtime ${process.version} no cumple engines`);
  });
});
