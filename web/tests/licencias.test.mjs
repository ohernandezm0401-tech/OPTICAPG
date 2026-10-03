// PLT-09 — Pruebas del canal de licencias (T01, AC-PLT-09-1 y AC-PLT-09-2).
// Se ejecutan con `npm test` (`node --test tests/`), sin dependencias nuevas.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluarLicencias, verificarSincroniaCandado } from '../scripts/check-licenses.mjs';

const DIR_TESTS = path.dirname(fileURLToPath(import.meta.url));
const DIR_APP = path.resolve(DIR_TESTS, '..');
const RUTA_SCRIPT = path.join(DIR_APP, 'scripts', 'check-licenses.mjs');

function leerJson(ruta) {
  return JSON.parse(readFileSync(ruta, 'utf8'));
}

describe('AC-PLT-09-1: una dependencia GPL/LGPL/AGPL/BSL/SSPL hace fallar licenses:check', () => {
  const prohibidas = ['GPL-3.0-only', 'GPL-2.0-only', 'AGPL-3.0-only', 'LGPL-3.0-or-later', 'SSPL-1.0', 'BUSL-1.1'];

  for (const licencia of prohibidas) {
    it(`falla ante ${licencia} (no listada como excepción)`, () => {
      const { errores } = evaluarLicencias(
        { 'node_modules/paquete-prohibido': { version: '1.0.0', license: licencia } },
        { pendiente_q09: [], datos_cc_by_4_0: [] },
      );
      assert.equal(errores.length, 1, `esperaba 1 error para ${licencia}`);
    });
  }

  it('falla de extremo a extremo: package.json + candado sintéticos con GPL', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 't01-lic-'));
    mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
    copyFileSync(RUTA_SCRIPT, path.join(tmp, 'scripts', 'check-licenses.mjs'));
    writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ dependencies: { 'paquete-prohibido': '^1.0.0' }, devDependencies: {} }),
    );
    writeFileSync(
      path.join(tmp, 'package-lock.json'),
      JSON.stringify({
        packages: { '': {}, 'node_modules/paquete-prohibido': { version: '1.0.0', license: 'GPL-3.0-only' } },
      }),
    );
    writeFileSync(path.join(tmp, 'licenses.exceptions.json'), JSON.stringify({ pendiente_q09: [] }));

    const proc = spawnSync(process.execPath, [path.join(tmp, 'scripts', 'check-licenses.mjs')], { encoding: 'utf8' });
    assert.notEqual(proc.status, 0, `el script debió fallar; salida: ${proc.stdout}${proc.stderr}`);
    assert.match(`${proc.stdout}${proc.stderr}`, /GPL-3\.0-only/);
  });

  it('falla si el candado no incluye una dependencia directa (candado desactualizado)', () => {
    const errores = verificarSincroniaCandado(
      { dependencies: { 'paquete-fantasma': '^1.0.0' }, devDependencies: {} },
      { '': {}, 'node_modules/otro': { version: '1.0.0', license: 'MIT' } },
    );
    assert.equal(errores.length, 1);
  });
});

describe('AC-PLT-09-2: licenses:check pasa con las excepciones listadas', () => {
  it('el candado real pasa con licenses.exceptions.json (solo avisos PENDIENTE Q-09)', () => {
    const candado = leerJson(path.join(DIR_APP, 'package-lock.json'));
    const excepciones = leerJson(path.join(DIR_APP, 'licenses.exceptions.json'));
    const { errores, avisos } = evaluarLicencias(candado.packages, excepciones);
    assert.deepEqual(errores, [], `errores inesperados: ${errores.join('; ')}`);
    assert.ok(avisos.length > 0, 'se esperaban avisos PENDIENTE Q-09');
    assert.ok(
      avisos.every((a) => a.includes('PENDIENTE Q-09')),
      'todo aviso debe estar marcado PENDIENTE Q-09',
    );
  });

  it('toda entrada PENDIENTE Q-09 existe en el candado (sin excepciones huérfanas)', () => {
    const candado = leerJson(path.join(DIR_APP, 'package-lock.json'));
    const excepciones = leerJson(path.join(DIR_APP, 'licenses.exceptions.json'));
    const nombres = new Set(
      Object.keys(candado.packages ?? {}).map((k) => k.split('node_modules/').pop()),
    );
    for (const e of excepciones.pendiente_q09 ?? []) {
      assert.ok(nombres.has(e.paquete), `excepción huérfana: ${e.paquete}`);
    }
  });

  it('las dependencias directas están sincronizadas con el candado', () => {
    const candado = leerJson(path.join(DIR_APP, 'package-lock.json'));
    const manifiesto = leerJson(path.join(DIR_APP, 'package.json'));
    assert.deepEqual(verificarSincroniaCandado(manifiesto, candado.packages), []);
  });
});
