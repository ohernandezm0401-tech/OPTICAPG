// OPT-06 (T25) — Regla de terceros, copia gratuita y PDF cronológico.
// AC-OPT-06-1 y AC-OPT-06-3. Datos sintéticos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { LineaHistorial } from '../../dominio/adenda-atencion';
import {
  COSTO_COPIA_HC_COP,
  MENSAJE_TERCERO,
  claseSolicitante,
  codigoParaRespuesta,
  entregaATerceroPermitida,
  ordenCronologico,
  plazoEnlaceHoras,
} from '../../dominio/entrega-hc';
import { textoVisiblePdf } from '../../dominio/firma';
import { renderizarPdfHistoriaClinica } from '../../lib/historia/pdf-hc';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function adenda(): LineaHistorial {
  return {
    orden: 1,
    tipo: 'adenda',
    numero: 1,
    tipo_nota: 'correccion',
    campo_ref: 'esfera_od',
    campo_etiqueta: 'Esfera ojo derecho',
    valor_anterior: '-1.25',
    nuevo_valor: '-2',
    motivo: 'Correccion sintetica de la esfera',
    autor: 'Optómetra sintético',
    hora_bogota: '03/10/2026, 10:15:00',
    marca: 'corregido por adenda #1',
  };
}

describe('AC-OPT-06-3: terceros bloqueados hasta SEG-14', () => {
  it('la regla niega la entrega y no hay plazo inventado', () => {
    expect(entregaATerceroPermitida()).toBe(false);
    expect(claseSolicitante('tercero')).toBe('tercero');
    expect(claseSolicitante('juzgado')).toBe('tercero');
    expect(claseSolicitante('titular')).toBe('titular');
    expect(claseSolicitante('representante')).toBe('representante');
    expect(MENSAJE_TERCERO).toMatch(/SEG-14/);
    expect(COSTO_COPIA_HC_COP).toBe(0);
    expect(plazoEnlaceHoras(null)).toBeNull();
    expect(plazoEnlaceHoras(0)).toBeNull();
    expect(plazoEnlaceHoras('')).toBeNull();
    expect(plazoEnlaceHoras(24)).toBe(24);
    expect(codigoParaRespuesta('produccion', '123456')).toBeNull();
    expect(codigoParaRespuesta('desarrollo', '123456')).toBe('123456');
  });

  it('la migración nace con RLS ENABLE+FORCE, política y costo cero', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0024_opt06_entregas_hc.sql'), 'utf8');
    for (const tabla of ['entregas_hc', 'codigos_entrega_hc']) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`CREATE POLICY ${tabla}_tenant_app`);
    }
    expect(sql).toContain('costo_cop = 0');
    expect(sql).toContain('REVOKE DELETE');
  });
});

describe('AC-OPT-06-1: la copia lista atenciones y adenda en orden con sellos', () => {
  it('tres entradas quedan en el PDF en el orden recibido', async () => {
    const ordenadas = ordenCronologico([
      { id: 'c', folio: 3, firmado_en: '2026-10-03T15:00:00.000Z' },
      { id: 'a', folio: 1, firmado_en: '2026-10-01T15:00:00.000Z' },
      { id: 'b', folio: 2, firmado_en: '2026-10-02T15:00:00.000Z' },
    ]);
    expect(ordenadas.map((fila) => fila.folio)).toEqual([1, 2, 3]);
    const pdf = await renderizarPdfHistoriaClinica([
      {
        folio: 1,
        hora_bogota: '01/10/2026, 10:00:00',
        sello: 'Sello sintetico uno',
        secciones: [{ titulo: 'Motivo de consulta', texto: 'Control sintetico uno' }],
        adendas: [],
      },
      {
        folio: 2,
        hora_bogota: '02/10/2026, 10:00:00',
        sello: 'Sello sintetico dos',
        secciones: [{ titulo: 'Motivo de consulta', texto: 'Control sintetico dos' }],
        adendas: [adenda()],
      },
      {
        folio: 3,
        hora_bogota: '03/10/2026, 10:00:00',
        sello: 'Sello sintetico tres',
        secciones: [{ titulo: 'Motivo de consulta', texto: 'Control sintetico tres' }],
        adendas: [],
      },
    ]);
    const texto = textoVisiblePdf(pdf);
    const uno = texto.indexOf('Control sintetico uno');
    const dos = texto.indexOf('Control sintetico dos');
    const tres = texto.indexOf('Control sintetico tres');
    const nota = texto.indexOf('Adenda #1');
    expect(uno).toBeGreaterThan(-1);
    expect(uno).toBeLessThan(dos);
    expect(dos).toBeLessThan(nota);
    expect(nota).toBeLessThan(tres);
    expect(texto).toContain('Sello sintetico uno');
    expect(texto).toContain('Sello sintetico dos');
    expect(texto).toContain('Sello sintetico tres');
    expect(texto).toContain('Correccion sintetica de la esfera');
    expect(texto).toContain('BORRADOR');
    const folios = [...texto.matchAll(/Folio: (\d+)/g)].map((coincidencia) => Number(coincidencia[1]));
    expect(folios).toEqual([1, 2, 3]);
  });
});
