// OPT-05 (T23) — Validador por campo, cantidad, dispensación y PDF.
// AC-OPT-05-1, AC-OPT-05-2, AC-OPT-05-6. Datos sintéticos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { desplazarDias } from '../../dominio/fechas';
import { textoVisiblePdf } from '../../dominio/firma';
import {
  CAMPOS_ART17,
  cantidadCoincide,
  cantidadEnLetras,
  esDispensable,
  estadoVisiblePrescripcion,
  fechaDeFirma,
  formatearNumeroPrescripcion,
  lineasPrescripcion,
  puedeFirmarPrescripcion,
  validarFirmaPrescripcion,
  type CampoArt17,
  type PrescripcionFirmaEntrada,
  type PrescripcionNormalizada,
} from '../../dominio/prescripcion';
import { renderizarPdfPrescripcion } from '../../lib/firma/pdf';

const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HOY = fechaDeFirma(AHORA);

function completa(parcial: Partial<PrescripcionFirmaEntrada> = {}): PrescripcionFirmaEntrada {
  const base: PrescripcionFirmaEntrada = {
    prestador_nombre: 'Optica Sintetica T23',
    direccion: 'Calle 23',
    telefono: '3000000023',
    correo: 'sede.t23@example.invalid',
    lugar: 'Bogota',
    fecha: HOY,
    paciente_nombre: 'Ana Sintetica',
    paciente_documento: '900123023',
    numero_hc: '23',
    tipo_usuario: 'particular',
    dispositivo: 'lentes oftalmicos sinteticos',
    agudeza_visual: '20/20',
    forma_uso: 'No aplica',
    distancia_pupilar: '62',
    filtro: 'No aplica',
    duracion_tratamiento: 'No aplica',
    cantidad_num: 2,
    cantidad_letras: 'dos',
    indicaciones: 'Uso sintetico',
    vigencia_hasta: '2027-04-01',
    nombre_prescriptor: 'Optometra Sintetico T23',
    registro_profesional: 'RP-SINTETICO-23',
    firma: true,
    tipo: 'lentes_oftalmicos',
  };
  return { ...base, ...parcial };
}

function campoVacio(campo: CampoArt17): PrescripcionFirmaEntrada {
  if (campo === 'cantidad_num') return completa({ cantidad_num: null });
  if (campo === 'firma') return completa({ firma: false });
  return completa({ [campo]: '' });
}

describe('AC-OPT-05-1: cada campo del art. 17', () => {
  it('falla nombrando el campo que falta', () => {
    expect(CAMPOS_ART17.length).toBeGreaterThanOrEqual(15);
    for (const campo of CAMPOS_ART17) {
      const resultado = validarFirmaPrescripcion(campoVacio(campo), AHORA);
      expect(resultado.ok, campo).toBe(false);
      if (resultado.ok) continue;
      expect(resultado.problemas.some((item) => item.campo === campo && item.mensaje.includes(campo)), campo).toBe(true);
    }
  });

  it('TODO(Q-18): la vigencia vacía no se rellena', () => {
    const resultado = validarFirmaPrescripcion(completa({ vigencia_hasta: '' }), AHORA);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.problemas.some((item) => item.campo === 'vigencia_hasta')).toBe(true);
      expect(JSON.stringify(resultado.problemas)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    }
  });
});

describe('AC-OPT-05-2: cantidad en números y en letras', () => {
  it('acepta el par que coincide y rechaza el que no', () => {
    const bien = validarFirmaPrescripcion(completa(), AHORA);
    expect(bien.ok).toBe(true);
    if (bien.ok) {
      expect(bien.datos.cantidad_num).toBe(2);
      expect(bien.datos.cantidad_letras).toBe('dos');
    }
    const mal = validarFirmaPrescripcion(completa({ cantidad_letras: 'tres' }), AHORA);
    expect(mal.ok).toBe(false);
    if (!mal.ok) expect(mal.problemas.some((item) => item.campo === 'cantidad_letras')).toBe(true);
  });
});

describe('AC-OPT-05-3 y AC-OPT-05-6: estado visible y dispensación', () => {
  it('la corrección se ve como sustituida y la vencida no es dispensable', () => {
    expect(
      estadoVisiblePrescripcion({
        estadoAlmacenado: 'firmada',
        sustituida: true,
        vigenciaHasta: '2027-04-01',
        hoyBogota: HOY,
      }),
    ).toBe('sustituida');
    const vencida = esDispensable({
      estadoAlmacenado: 'firmada',
      sustituida: false,
      numeroHc: '23',
      vigenciaHasta: '2020-01-01',
      hoyBogota: HOY,
      registroProfesional: 'RP-SINTETICO-23',
      registroVigenteHasta: '2099-12-31',
      ahora: AHORA,
    });
    expect(vencida).toEqual({ dispensable: false, motivo: 'vencida' });
    const vigente = esDispensable({
      estadoAlmacenado: 'firmada',
      sustituida: false,
      numeroHc: '23',
      vigenciaHasta: '2027-04-01',
      hoyBogota: HOY,
      registroProfesional: 'RP-SINTETICO-23',
      registroVigenteHasta: '2099-12-31',
      ahora: AHORA,
    });
    expect(vigente.dispensable).toBe(true);
  });
});

describe('roles de firma ya existentes', () => {
  it('firma optometra y oftalmologo; el asesor no', () => {
    expect(puedeFirmarPrescripcion('optometra')).toBe(true);
    expect(puedeFirmarPrescripcion('oftalmologo')).toBe(true);
    expect(puedeFirmarPrescripcion('asesor')).toBe(false);
    expect(puedeFirmarPrescripcion('auxiliar_clinico')).toBe(false);
  });
});

describe('P: cantidad, vigencia y dispensación', () => {
  function lcg(semilla: number) {
    let estado = semilla >>> 0;
    return () => {
      estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
      return estado;
    };
  }

  it('la cantidad en letras coincide consigo y no con otro entero', () => {
    const aleatorio = lcg(23);
    for (let caso = 0; caso < 80; caso += 1) {
      const n = (aleatorio() % 5000) + 1;
      expect(cantidadCoincide(n, cantidadEnLetras(n)), String(n)).toBe(true);
      const otra = n === 5000 ? 1 : n + 1;
      expect(cantidadCoincide(n, cantidadEnLetras(otra))).toBe(false);
    }
    expect(cantidadEnLetras(1000)).toBe('mil');
    expect(cantidadEnLetras(2001)).toBe('dos mil uno');
    expect(formatearNumeroPrescripcion(2026, 1)).toBe('RX-2026-000001');
  });

  it('sin vigencia escrita no hay fecha inventada y una fecha anterior no se dispensa', () => {
    const aleatorio = lcg(18);
    for (let caso = 0; caso < 40; caso += 1) {
      const resultado = validarFirmaPrescripcion(completa({ vigencia_hasta: caso % 2 === 0 ? '' : '   ' }), AHORA);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.problemas.map((item) => item.campo)).toContain('vigencia_hasta');
      const dias = (aleatorio() % 400) + 1;
      const pasada = desplazarDias(HOY, -dias);
      expect(
        esDispensable({
          estadoAlmacenado: 'firmada',
          sustituida: false,
          numeroHc: '23',
          vigenciaHasta: pasada,
          hoyBogota: HOY,
          registroProfesional: 'RP-1',
          registroVigenteHasta: '2099-12-31',
          ahora: AHORA,
        }).motivo,
      ).toBe('vencida');
    }
  });
});

describe('PDF de la prescripción', () => {
  it('incluye número de HC, vigencia, cantidad y registro', async () => {
    const validacion = validarFirmaPrescripcion(completa(), AHORA);
    expect(validacion.ok).toBe(true);
    if (!validacion.ok) return;
    const datos: PrescripcionNormalizada & { numero: string } = { ...validacion.datos, numero: 'RX-2026-000001' };
    const pdf = await renderizarPdfPrescripcion({
      lineas: lineasPrescripcion(datos),
      nombreProfesional: datos.nombre_prescriptor,
      registroProfesional: datos.registro_profesional,
      lineaProfesional: 'Firmado electronicamente',
    });
    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain('Numero HC: 23');
    expect(texto).toContain('Vigencia: 2027-04-01');
    expect(texto).toContain('Cantidad: 2 (dos)');
    expect(texto).toContain('Registro profesional: RP-SINTETICO-23');
    expect(texto).toContain('BORRADOR');
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('migración', () => {
  it('pide RLS y no pone vigencia por defecto', () => {
    const sql = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/0022_opt05_prescripciones.sql'),
      'utf8',
    );
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
    expect(sql).toContain("aplicar_marco_inmutabilidad('public.prescripciones'::regclass)");
    expect(sql).not.toMatch(/vigencia_hasta\s+date\s+default/i);
    expect(sql).toContain('TODO(Q-18)');
  });
});
