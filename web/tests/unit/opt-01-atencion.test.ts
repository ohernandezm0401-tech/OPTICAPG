// OPT-01 (T19) — Esquemas Zod y puertas de la atención. Sin base de datos.
import { describe, expect, it } from 'vitest';

import { puedeFirmarAtencion, puedeIniciarAtencionClinica } from '../../dominio/atencion-optica';
import {
  esquemaCrearAtencion,
  esquemaExamenOptometrico,
  modalidadGuardada,
} from '../../dominio/valores-opticos';

const EXAMEN_VALIDO = {
  esfera_od: -1.25,
  cilindro_od: -0.5,
  eje_od: 180,
  adicion_od: 1.75,
  agudeza_od: 1,
  esfera_oi: 0,
  cilindro_oi: 0,
  eje_oi: 0,
  adicion_oi: 2,
  agudeza_oi: 0.8,
  dip: 62,
};

function mensaje(resultado: { success: boolean; error?: { issues: { message: string }[] } }): string {
  return resultado.success ? '' : (resultado.error?.issues[0]?.message ?? '');
}

describe('valores ópticos OPT-01', () => {
  it('acepta esfera, cilindro, eje, adición, agudeza y DIP dentro del rango', () => {
    expect(esquemaExamenOptometrico.safeParse(EXAMEN_VALIDO).success).toBe(true);
    expect(modalidadGuardada()).toBe('presencial');
  });

  it('rechaza eje 200, pasos que no son de 0,25 y texto libre como diagnóstico', () => {
    expect(mensaje(esquemaExamenOptometrico.safeParse({ ...EXAMEN_VALIDO, eje_od: 200 }))).toMatch(/límite de captura/);
    expect(mensaje(esquemaExamenOptometrico.safeParse({ ...EXAMEN_VALIDO, esfera_od: -1.1 }))).toMatch(/0,25/);
    expect(mensaje(esquemaExamenOptometrico.safeParse({ ...EXAMEN_VALIDO, adicion_od: 4.25 }))).toMatch(/límite de captura/);
    expect(mensaje(esquemaExamenOptometrico.safeParse({ ...EXAMEN_VALIDO, dip: 39 }))).toMatch(/límite de captura/);
    expect(mensaje(esquemaExamenOptometrico.safeParse({ ...EXAMEN_VALIDO, agudeza_od: 2.5 }))).toMatch(/límite de captura/);

    const libre = esquemaCrearAtencion.safeParse({
      paciente_id: 'a1900000-0000-4000-8000-000000000001',
      tipo: 'control',
      motivo: 'Control sintético',
      examen: EXAMEN_VALIDO,
      diagnostico: { codigo_cie10: 'miopía' },
      plan: { conducta: 'Control' },
    });
    expect(mensaje(libre)).toMatch(/CIE-10/);
  });

  it('AC-OPT-24-1: rechaza telemedicina y deja presencial por defecto', () => {
    const resultado = esquemaCrearAtencion.safeParse({
      paciente_id: 'a1900000-0000-4000-8000-000000000001',
      tipo: 'primera_vez',
      modalidad: 'telemedicina',
      motivo: 'Control sintético',
      examen: EXAMEN_VALIDO,
      diagnostico: { codigo_cie10: 'H52.1' },
      plan: { conducta: 'Control' },
    });
    expect(mensaje(resultado)).toMatch(/telemedicina no está habilitada/);
  });
});

describe('puertas OPT-01', () => {
  it('AC-OPT-01-7: un menor sin representante no inicia la atención', () => {
    expect(
      puedeIniciarAtencionClinica({
        urgencia: false,
        estadoTratamiento: 'otorgada',
        fechaNacimiento: '2016-01-15',
        hoy: '2026-10-03',
        tieneRepresentanteVigente: false,
      }),
    ).toEqual({ permitida: false, motivo: 'menor_sin_representante' });
    expect(
      puedeIniciarAtencionClinica({
        urgencia: false,
        estadoTratamiento: 'otorgada',
        fechaNacimiento: '2016-01-15',
        hoy: '2026-10-03',
        tieneRepresentanteVigente: true,
      }).permitida,
    ).toBe(true);
  });

  it('TODO(Q-26): solo el optómetra firma; el auxiliar no', () => {
    expect(puedeFirmarAtencion('optometra')).toBe(true);
    expect(puedeFirmarAtencion('auxiliar_clinico')).toBe(false);
    expect(puedeFirmarAtencion('admin')).toBe(false);
    expect(puedeFirmarAtencion('asesor')).toBe(false);
  });
});
