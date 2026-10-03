// OPT-10 (T18) — Catálogos locales, búsqueda y glosario (U).
// AC-OPT-10-1, AC-OPT-10-2 y AC-OPT-10-3. El CSV es sintético.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buscarEnCatalogo,
  ErrorCatalogo,
  parsearCsvCatalogo,
  revisarAbreviaturas,
} from '../../dominio/catalogos.mjs';
import {
  auditarRepositorioCatalogos,
  auditarRutasCatalogo,
  RUTA_CSV_SINTETICO,
} from '../../dominio/catalogos-licencia.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CSV = path.join(RAIZ, ...RUTA_CSV_SINTETICO.split('/'));
const DESCRIPCION_H521 = 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10';

describe('AC-OPT-10-1: buscar H52.1 en el CSV sintético', () => {
  it('devuelve el código y la descripción cargada', () => {
    const filas = parsearCsvCatalogo(readFileSync(CSV, 'utf8'));
    expect(filas).toHaveLength(10);
    const hallados = buscarEnCatalogo(filas, 'H52.1', 'cie10');
    expect(hallados[0]).toMatchObject({
      tipo: 'cie10',
      codigo: 'H52.1',
      descripcion: DESCRIPCION_H521,
    });
  });

  it('rechaza un CSV con encabezado distinto', () => {
    expect(() => parsearCsvCatalogo('codigo,descripcion\nH52.1,algo')).toThrow(ErrorCatalogo);
  });
});

describe('AC-OPT-10-2: el repositorio no redistribuye catálogos oficiales', () => {
  it('la lista de archivos solo admite el CSV sintético', () => {
    expect(auditarRutasCatalogo([RUTA_CSV_SINTETICO, 'docs/DATOS.md'])).toEqual([]);
    expect(auditarRutasCatalogo(['datos/CIE10_oficial.csv'])).toEqual(['datos/CIE10_oficial.csv']);
    expect(auditarRutasCatalogo(['web/datos/catalogos/cups-oficial.xlsx'])).toEqual([
      'web/datos/catalogos/cups-oficial.xlsx',
    ]);
  });

  it('el árbol real pasa la comprobación de CI', () => {
    expect(auditarRepositorioCatalogos(RAIZ)).toEqual([]);
  });
});

describe('AC-OPT-10-3: abreviatura fuera de glosario', () => {
  it('advierte sin bloquear y conserva el texto', () => {
    const texto = 'AV 20/20 en OD. XYZ sin definir.';
    const revision = revisarAbreviaturas(texto, [
      { abreviatura: 'AV' },
      { abreviatura: 'OD' },
    ]);
    expect(revision.bloquea).toBe(false);
    expect(revision.texto).toBe(texto);
    expect(revision.advertencias.map((item) => item.abreviatura)).toEqual(['XYZ']);
    expect(revision.advertencias[0]?.mensaje).toContain('no está en el glosario');
  });
});
