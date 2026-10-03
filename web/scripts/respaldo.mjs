#!/usr/bin/env node
// PLT-07 (T28) — `npm run backup:run` y `npm run backup:restore-test`.
// No imprime la clave, la URL ni el contenido del volcado.
import { chmodSync, closeSync, fsyncSync, openSync, readFileSync, writeSync } from 'node:fs';
import path from 'node:path';

import { entornoPermitePruebaRestauracion } from '../lib/respaldo/continuidad.mjs';
import { abrirRespaldo, leerClaveRespaldo } from '../lib/respaldo/formato.mjs';
import { crearArchivoProtegido, ejecutarPruebaRestauracion, ejecutarRespaldo } from '../lib/respaldo/servicio.mjs';

function linea(clave, valor) {
  const texto = valor == null ? '' : String(valor);
  if (/[\r\n]/.test(texto)) throw new Error('la salida del respaldo no admite varias líneas');
  process.stdout.write(`${clave}=${texto}\n`);
}

async function comandoRun() {
  const hecho = await ejecutarRespaldo();
  linea('resultado', 'OK');
  linea('id', hecho.id);
  linea('archivo', hecho.archivo);
  linea('hash_sha256', hecho.hash_sha256);
  linea('tamano', hecho.tamano);
  linea('cifrado', hecho.cifrado);
  linea('estado', hecho.estado);
  linea('rpo', hecho.continuidad.rpo);
  linea('rto', hecho.continuidad.rto);
  linea('rotulo', hecho.continuidad.rotulo);
  linea('nota', hecho.continuidad.nota);
}

async function comandoRestaurar() {
  if (!entornoPermitePruebaRestauracion(process.env)) {
    throw new Error(
      'backup:restore-test solo corre con APP_ENV=desarrollo, pruebas o demo. No usa datos de producción.',
    );
  }
  const resultado = await ejecutarPruebaRestauracion(process.env);
  if (!resultado.prueba.coinciden || !resultado.base_temporal_eliminada) {
    linea('resultado', 'FALLO');
    linea('coinciden', resultado.prueba.coinciden);
    linea('base_temporal_eliminada', resultado.base_temporal_eliminada);
    process.exitCode = 1;
    return;
  }
  linea('resultado', 'OK');
  linea('coinciden', true);
  linea('id', resultado.respaldo.id);
  linea('archivo', resultado.respaldo.archivo);
  linea('base_temporal', resultado.prueba.base_temporal);
  linea('base_temporal_eliminada', true);
  linea('rpo', resultado.prueba.rpo);
  linea('rto', resultado.prueba.rto);
  linea('rotulo', resultado.prueba.rotulo);
  linea('nota', resultado.prueba.nota);
  linea('conteos', JSON.stringify(resultado.prueba.conteos_restaurados));
}

async function comandoDescifrar() {
  const origen = process.argv[3];
  const salida = process.argv[4];
  if (!origen || !salida) throw new Error('uso: descifrar <archivo.enc> <salida.sql>');
  const clave = leerClaveRespaldo(process.env);
  const plano = abrirRespaldo(clave, readFileSync(origen));
  const absoluto = path.resolve(salida);
  crearArchivoProtegido(absoluto);
  const fd = openSync(absoluto, 'r+', 0o600);
  try {
    writeSync(fd, plano);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
    plano.fill(0);
  }
  chmodSync(absoluto, 0o600);
  linea('resultado', 'OK');
  linea('archivo', absoluto);
}

const comando = process.argv[2];
try {
  if (comando === 'run') await comandoRun();
  else if (comando === 'restore-test') await comandoRestaurar();
  else if (comando === 'descifrar') await comandoDescifrar();
  else {
    process.stderr.write('uso: respaldo.mjs run | restore-test | descifrar <enc> <sql>\n');
    process.exitCode = 1;
  }
} catch (error) {
  const mensaje = error instanceof Error ? error.message : 'el respaldo falló';
  process.stderr.write(`resultado=FALLO\n${mensaje}\n`);
  process.exitCode = 1;
}
