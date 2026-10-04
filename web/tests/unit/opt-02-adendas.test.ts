// OPT-02 (T21) — Propiedades de la adenda y PDF reutilizable de la HC.
// AC-OPT-02-1, AC-OPT-02-2 y AC-OPT-02-3. La copia al paciente (OPT-06, T25)
// debe llamar `renderizarPdfHistoriaClinica`; aquí se prueba esa función.
import { describe, expect, it } from 'vitest';

import {
  armarDocumentoHistoriaClinica,
  prepararAdenda,
  proyectarHistorial,
  referenciaExamen,
  seccionesCopiaHistoria,
  type AdendaPlano,
  type CampoRefraccionAdenda,
} from '../../dominio/adenda-atencion';
import { textoVisiblePdf } from '../../dominio/firma';
import { LIMITES_CAPTURA_PROPUESTOS } from '../../dominio/valores-opticos';
import { renderizarPdfHistoriaClinica } from '../../lib/historia/pdf-hc';

const PROFESIONAL = 'a2100000-0000-4000-8000-0000000000c1';
const OTRO = 'a2100000-0000-4000-8000-0000000000c2';
const LIMITES = LIMITES_CAPTURA_PROPUESTOS;

function lcg(semilla: number) {
  let estado = semilla >>> 0;
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado;
  };
}

function esferaAleatoria(aleatorio: () => number): string {
  const pasos = aleatorio() % 241;
  return String(-30 + pasos * 0.25);
}

function motivoAleatorio(aleatorio: () => number): string {
  const base = ['correccion de captura', 'nota de control sintetico', 'ajuste de transcripcion'];
  return `${base[aleatorio() % base.length]} ${aleatorio() % 1000}`;
}

describe('P: la adenda no altera la refracción original', () => {
  it('cualquier corrección conserva el original y exige motivo, autor, hora y porqué', () => {
    const aleatorio = lcg(20261003);
    for (let caso = 0; caso < 40; caso += 1) {
      const originalValor = esferaAleatoria(aleatorio);
      const nuevo = esferaAleatoria(aleatorio);
      const motivo = motivoAleatorio(aleatorio);
      const original = { esfera_od: originalValor };
      const congelado = { ...original };
      const preparada = prepararAdenda({
        campo: 'esfera_od',
        nuevoValorTexto: nuevo,
        motivo,
        autorId: PROFESIONAL,
        profesionalAtencionId: PROFESIONAL,
        limites: LIMITES,
      });
      expect(preparada.ok, motivo).toBe(true);
      if (!preparada.ok) continue;
      const adenda: AdendaPlano = {
        id: `adenda-${caso}`,
        numero: 1,
        campo_ref: 'esfera_od',
        valor_anterior_ref: referenciaExamen('esfera_od'),
        nuevo_valor: preparada.nuevo_valor,
        motivo: preparada.motivo,
        autor_id: PROFESIONAL,
        autor: 'Optómetra sintético',
        hora_bogota: '03/10/2026, 10:00:00',
        tipo_nota: preparada.tipo_nota,
      };
      const historia = proyectarHistorial({
        autorOriginal: 'Optómetra sintético',
        horaOriginalBogota: '03/10/2026, 09:00:00',
        originalRefraccion: original,
        adendas: [adenda],
      });
      expect(original).toEqual(congelado);
      expect(historia.original_refraccion.esfera_od).toBe(originalValor);
      expect(historia.marcas.esfera_od).toBe('corregido por adenda #1');
      const nota = historia.linea.find((linea) => linea.tipo === 'adenda');
      expect(nota?.autor).toBe('Optómetra sintético');
      expect(nota?.hora_bogota).toBe('03/10/2026, 10:00:00');
      expect(nota?.motivo).toBe(motivo);
      expect(nota?.nuevo_valor).toBe(preparada.nuevo_valor);
      expect(nota?.valor_anterior).toBe(originalValor);
      const documento = armarDocumentoHistoriaClinica({
        folio: 1,
        hora_bogota: '03/10/2026, 09:00:00',
        sello: null,
        secciones: [{ titulo: 'Refracción original', texto: `Esfera ojo derecho: ${originalValor}` }],
        adendas: historia.linea,
      });
      expect(documento.lineas.join('\n')).toContain(motivo);
      expect(documento.lineas.join('\n')).toContain(originalValor);
      expect(documento.aviso).toBe('BORRADOR – requiere revisión jurídica');
    }
  });

  it('sin motivo no hay adenda, y la nota de otro profesional no marca el original', () => {
    const aleatorio = lcg(21);
    for (let caso = 0; caso < 20; caso += 1) {
      const vacio = prepararAdenda({
        campo: 'esfera_od',
        nuevoValorTexto: esferaAleatoria(aleatorio),
        motivo: caso % 2 === 0 ? '' : '   ',
        autorId: PROFESIONAL,
        profesionalAtencionId: PROFESIONAL,
        limites: LIMITES,
      });
      expect(vacio.ok).toBe(false);

      const fuera = prepararAdenda({
        campo: 'eje_od',
        nuevoValorTexto: '200',
        motivo: 'eje imposible',
        autorId: PROFESIONAL,
        profesionalAtencionId: PROFESIONAL,
        limites: LIMITES,
      });
      expect(fuera.ok).toBe(false);

      const complementaria = prepararAdenda({
        campo: 'cilindro_od' satisfies CampoRefraccionAdenda,
        nuevoValorTexto: '-0.5',
        motivo: motivoAleatorio(aleatorio),
        autorId: OTRO,
        profesionalAtencionId: PROFESIONAL,
        limites: LIMITES,
      });
      expect(complementaria.ok && complementaria.tipo_nota).toBe('complementaria');
      if (!complementaria.ok) continue;
      const original = { cilindro_od: '-0.25' };
      const historia = proyectarHistorial({
        autorOriginal: 'Optómetra sintético',
        horaOriginalBogota: '03/10/2026, 09:00:00',
        originalRefraccion: original,
        adendas: [
          {
            id: `comp-${caso}`,
            numero: 1,
            campo_ref: 'cilindro_od',
            valor_anterior_ref: referenciaExamen('cilindro_od'),
            nuevo_valor: complementaria.nuevo_valor,
            motivo: complementaria.motivo,
            autor_id: OTRO,
            autor: 'Otro profesional sintético',
            hora_bogota: '03/10/2026, 11:00:00',
            tipo_nota: 'complementaria',
          },
        ],
      });
      expect(historia.original_refraccion.cilindro_od).toBe('-0.25');
      expect(historia.marcas.cilindro_od).toBeUndefined();
      expect(historia.linea[1]?.tipo_nota).toBe('complementaria');
      expect(historia.linea[1]?.marca).toBeNull();
    }
  });
});

describe('AC-OPT-02-3: la copia incluye la historia completa', () => {
  it('antecedentes, salud ocular, prescripción y consentimiento salen en el documento', async () => {
    const secciones = seccionesCopiaHistoria({
      motivo: 'Control sintetico',
      antecedentes: 'Antecedente sintetico de glaucoma',
      saludOcular: 'Segmento anterior sin hallazgo sintetico',
      refraccion: 'Esfera ojo derecho: -1.25',
      diagnostico: 'H52.1 Miopia sintetica',
      plan: 'Control en doce meses',
      prescripcion: 'RX-2026-000001 · lentes oftalmicos · montura sintetica',
      consentimiento: 'otorgado, otorgado',
    });
    const titulos = secciones.map((seccion) => seccion.titulo);
    expect(titulos).toEqual([
      'Motivo de consulta',
      'Antecedentes',
      'Salud ocular',
      'Refracción original',
      'Diagnóstico',
      'Plan',
      'Prescripción',
      'Consentimiento',
    ]);
    const documento = armarDocumentoHistoriaClinica({
      folio: 4,
      hora_bogota: '03/10/2026, 09:00:00',
      sello: null,
      secciones,
      adendas: [],
    });
    const unido = documento.lineas.join('\n');
    expect(unido).toContain('Antecedentes: Antecedente sintetico de glaucoma');
    expect(unido).toContain('Salud ocular: Segmento anterior sin hallazgo sintetico');
    expect(unido).toContain('Prescripción: RX-2026-000001 · lentes oftalmicos · montura sintetica');
    expect(unido).toContain('Consentimiento: otorgado, otorgado');
    const pdf = await renderizarPdfHistoriaClinica({
      folio: 4,
      hora_bogota: '03/10/2026, 09:00:00',
      sello: null,
      secciones,
      adendas: [],
    });
    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain('Antecedentes');
    expect(texto).toContain('Salud ocular');
    expect(texto).toContain('Prescripción');
    expect(texto).toContain('Consentimiento');
    expect(texto).toContain('Antecedente sintetico de glaucoma');
  });
});

describe('AC-OPT-02-3: el PDF reutilizable incluye la adenda', () => {
  it('el texto del PDF contiene el original, el valor nuevo y el motivo', async () => {
    const historia = proyectarHistorial({
      autorOriginal: 'Optómetra sintético',
      horaOriginalBogota: '03/10/2026, 09:00:00',
      originalRefraccion: { esfera_od: '-1.25' },
      adendas: [
        {
          id: 'pdf-1',
          numero: 1,
          campo_ref: 'esfera_od',
          valor_anterior_ref: referenciaExamen('esfera_od'),
          nuevo_valor: '-2',
          motivo: 'Correccion sintetica de la esfera',
          autor_id: PROFESIONAL,
          autor: 'Optómetra sintético',
          hora_bogota: '03/10/2026, 10:15:00',
          tipo_nota: 'correccion',
        },
      ],
    });
    const pdf = await renderizarPdfHistoriaClinica({
      folio: 4,
      hora_bogota: '03/10/2026, 09:00:00',
      sello: 'Sello sintetico',
      secciones: [{ titulo: 'Refracción original', texto: 'Esfera ojo derecho: -1.25' }],
      adendas: historia.linea,
    });
    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain('Correccion sintetica de la esfera');
    expect(texto).toContain('-1.25');
    expect(texto).toContain('-2');
    expect(texto).toContain('Optómetra sintético');
    expect(texto).toContain('BORRADOR');
  });
});
