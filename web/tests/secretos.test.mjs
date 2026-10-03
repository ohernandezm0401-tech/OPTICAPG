// SEG-12 (T11) — El buscador de secretos marca patrones sintéticos armados
// en memoria y el repositorio actual no dispara ninguno.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buscarEnDirectorio, buscarEnTexto } from '../scripts/buscar-secretos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('SEG-12 buscador de secretos (S)', () => {
  it('detecta patrones armados en memoria y no el texto partido', () => {
    const aws = 'AK' + 'IA' + 'IOSFODNN7EXAMPLE';
    const github = 'gh' + 'p_' + 'a'.repeat(20);
    const vivo = 'sk_' + 'live_' + 'b'.repeat(16);
    expectMarca(buscarEnTexto(`clave ${aws}`), 'aws');
    expectMarca(buscarEnTexto(github), 'github');
    expectMarca(buscarEnTexto(vivo), 'stripe-vivo');
    expectMarca(buscarEnTexto('-----BEGIN ' + 'RSA PRIVATE KEY-----'), 'pem');
    assert.deepEqual(buscarEnTexto('AK' + 'IA ejemplo'), []);
    assert.deepEqual(
      buscarEnTexto('postgresql://postgres:postgres@localhost:5433/optisaas_pruebas'),
      [],
    );
  });

  it('el repositorio no contiene esos patrones', () => {
    const hallazgos = buscarEnDirectorio(RAIZ);
    assert.deepEqual(
      hallazgos,
      [],
      hallazgos.map((fila) => `${fila.ruta} (${fila.ids.join(', ')})`).join('\n'),
    );
  });

  it('un archivo temporal con URL y clave ajena al localhost sí falla', () => {
    const directorio = mkdtempSync(path.join(tmpdir(), 'secretos-'));
    const usuario = 'svc';
    const clave = 'c'.repeat(12);
    const esquema = 'postgres' + '://';
    const host = ['db', 'example'].join('.');
    writeFileSync(path.join(directorio, 'nota.txt'), `${esquema}${usuario}:${clave}@${host}/app\n`);
    const hallazgos = buscarEnDirectorio(directorio);
    assert.equal(hallazgos.length, 1);
    assert.ok(hallazgos[0].ids.includes('url-con-clave'));
  });
});

function expectMarca(ids, esperado) {
  assert.ok(ids.includes(esperado), `se esperaba ${esperado} en ${ids.join(',')}`);
}
