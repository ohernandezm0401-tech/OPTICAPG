// SEG-07 (T26) — Días y horas hábiles de habeas data. Casos límite. U.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { sumarDiasHabiles } from '../../dominio/calendario-habil';
import {
  AVISO_SIN_FESTIVOS,
  CAUSA_BLOQUEO_SUPRESION_CLINICA,
  PLAZO_CONSULTA_DIAS_HABILES,
  PLAZO_MARCA_RECLAMO_HORAS_HABILES,
  PLAZO_RECLAMO_DIAS_HABILES,
  alertaMarcaSinTramite,
  avisoFestivos,
  calcularVenceEn,
  causaSupresionVisible,
  diasHabilesRestantes,
  horasHabilesCumplidas,
  instanteTrasHorasHabiles,
  plazoDiasDeTipo,
  semaforoDe,
  supresionClinicaBloqueada,
  type RelojSolicitud,
} from '../../dominio/habeas-data';
import { parametrosIniciales } from '../../dominio/parametros-iniciales';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FESTIVO = new Set(['2026-10-12']);
const VIERNES_15_BOGOTA = new Date('2026-10-02T20:00:00.000Z');

function reloj(parcial: Partial<RelojSolicitud> & Pick<RelojSolicitud, 'ahora' | 'festivos'>): RelojSolicitud {
  return {
    tipo: 'reclamo',
    estado: 'radicada',
    radicadaEn: VIERNES_15_BOGOTA,
    venceEn: '2026-10-26',
    prorrogaHasta: null,
    marcada: false,
    respondidaEn: null,
    horasMarca: PLAZO_MARCA_RECLAMO_HORAS_HABILES,
    ...parcial,
  };
}

describe('AC-SEG-07-1: vence_en a 15 días hábiles', () => {
  it('excluye sábado, domingo y el festivo cargado', () => {
    const vence = calcularVenceEn(VIERNES_15_BOGOTA, PLAZO_RECLAMO_DIAS_HABILES, FESTIVO);
    expect(vence).toBe('2026-10-26');
    expect(vence).toBe(sumarDiasHabiles('2026-10-02', 15, FESTIVO));
    expect(avisoFestivos(true)).toBeNull();
  });

  it('sin festivos cargados excluye solo sábado y domingo y deja el aviso (Q-32)', () => {
    const vence = calcularVenceEn(VIERNES_15_BOGOTA, PLAZO_RECLAMO_DIAS_HABILES, new Set());
    expect(vence).toBe('2026-10-23');
    expect(avisoFestivos(false)).toBe(AVISO_SIN_FESTIVOS);
  });

  it('la consulta usa 10 días hábiles y el reclamo 15', () => {
    expect(plazoDiasDeTipo('consulta', 10, 15)).toBe(PLAZO_CONSULTA_DIAS_HABILES);
    expect(calcularVenceEn(VIERNES_15_BOGOTA, 10, new Set())).toBe('2026-10-16');
    expect(plazoDiasDeTipo('rectificacion', 10, 15)).toBe(15);
    expect(plazoDiasDeTipo('supresion', 10, 15)).toBe(15);
    expect(plazoDiasDeTipo('revocatoria', 10, 15)).toBe(15);
  });

  it('radicar en sábado no cuenta el fin de semana', () => {
    expect(calcularVenceEn(new Date('2026-10-03T15:00:00.000Z'), 1, new Set())).toBe('2026-10-05');
  });

  it('cruza el año y omite el festivo del 1 de enero', () => {
    const inicio = new Date('2026-12-30T15:00:00.000Z');
    expect(calcularVenceEn(inicio, 2, new Set())).toBe('2027-01-01');
    expect(calcularVenceEn(inicio, 2, new Set(['2027-01-01']))).toBe('2027-01-04');
  });

  it('el semáforo está en plazo al radicar, en alerta si no se marca y vencido al día siguiente', () => {
    const alRadicar = semaforoDe(reloj({ ahora: VIERNES_15_BOGOTA, festivos: FESTIVO }));
    const diaLimite = semaforoDe(reloj({ ahora: new Date('2026-10-26T15:00:00.000Z'), festivos: FESTIVO }));
    const marcado = semaforoDe(
      reloj({ ahora: new Date('2026-10-26T15:00:00.000Z'), festivos: FESTIVO, marcada: true, estado: 'en_tramite' }),
    );
    const vencido = semaforoDe(reloj({ ahora: new Date('2026-10-27T15:00:00.000Z'), festivos: FESTIVO }));
    expect(alRadicar).toBe('verde');
    expect(diaLimite).toBe('amarillo');
    expect(marcado).toBe('verde');
    expect(vencido).toBe('rojo');
  });
});

describe('AC-SEG-07-2: 48 horas hábiles para marcar', () => {
  const limite = instanteTrasHorasHabiles(VIERNES_15_BOGOTA, 48, FESTIVO);

  it('el viernes a las 15:00 el límite cae el martes a las 15:00 y el festivo no entra', () => {
    expect(limite.toISOString()).toBe('2026-10-06T20:00:00.000Z');
    expect(horasHabilesCumplidas(VIERNES_15_BOGOTA, limite, 48, FESTIVO)).toBe(true);
    expect(horasHabilesCumplidas(VIERNES_15_BOGOTA, new Date(limite.getTime() - 1), 48, FESTIVO)).toBe(false);
  });

  it('un milisegundo antes no hay alerta; en el límite sí, y marcar la apaga', () => {
    const antes = reloj({ ahora: new Date(limite.getTime() - 1), festivos: FESTIVO });
    const justo = reloj({ ahora: limite, festivos: FESTIVO });
    expect(alertaMarcaSinTramite(antes)).toBe(false);
    expect(semaforoDe(antes)).toBe('verde');
    expect(alertaMarcaSinTramite(justo)).toBe(true);
    expect(semaforoDe(justo)).toBe('amarillo');
    expect(alertaMarcaSinTramite({ ...justo, marcada: true, estado: 'en_tramite' })).toBe(false);
    expect(semaforoDe({ ...justo, marcada: true, estado: 'en_tramite' })).toBe('verde');
  });

  it('un festivo en medio corre el límite de 48 h', () => {
    const viernes = new Date('2026-10-09T20:00:00.000Z');
    const conFestivo = instanteTrasHorasHabiles(viernes, 48, new Set(['2026-10-12']));
    const sinFestivo = instanteTrasHorasHabiles(viernes, 48, new Set());
    expect(conFestivo.toISOString()).toBe('2026-10-14T20:00:00.000Z');
    expect(sinFestivo.toISOString()).toBe('2026-10-13T20:00:00.000Z');
  });

  it('el contador de días hábiles no cuenta el día de hoy y es negativo si venció', () => {
    expect(diasHabilesRestantes('2026-10-02', '2026-10-26', FESTIVO)).toBe(15);
    expect(diasHabilesRestantes('2026-10-26', '2026-10-26', FESTIVO)).toBe(0);
    expect(diasHabilesRestantes('2026-10-27', '2026-10-26', FESTIVO)).toBe(-1);
  });
});

describe('supresión clínica bloqueada y parámetros documentados', () => {
  it('sin ámbito se bloquea; lo demográfico no', () => {
    expect(supresionClinicaBloqueada(null)).toBe(true);
    expect(supresionClinicaBloqueada('clinico')).toBe(true);
    expect(supresionClinicaBloqueada('demografico')).toBe(false);
  });

  it('la causa es borrador y no inventa un plazo en años (Q-07)', () => {
    expect(CAUSA_BLOQUEO_SUPRESION_CLINICA).toContain('BORRADOR – requiere revisión jurídica');
    expect(CAUSA_BLOQUEO_SUPRESION_CLINICA).not.toMatch(/\d+\s+años/);
    expect(causaSupresionVisible('texto configurable de causa legal suficiente')).toContain(
      'BORRADOR – requiere revisión jurídica',
    );
  });

  it('los plazos iniciales citan la fuente de la spec', () => {
    const iniciales = parametrosIniciales();
    expect(iniciales.find((fila) => fila.clave === 'plazo_consulta_habeas_dias')).toMatchObject({ valor: 10 });
    expect(iniciales.find((fila) => fila.clave === 'plazo_reclamo_habeas_dias')).toMatchObject({ valor: 15 });
    expect(iniciales.find((fila) => fila.clave === 'plazo_marca_reclamo_horas_habiles')).toMatchObject({ valor: 48 });
    expect(iniciales.find((fila) => fila.clave === 'plazo_prorroga_reclamo_habeas_dias')?.rotulo).toMatch(/Ley 1581/);
    const causa = iniciales.find((fila) => fila.clave === 'causa_bloqueo_supresion_clinica');
    expect(String(causa?.valor)).not.toMatch(/\d+\s+años/);
  });

  it('la migración nace con RLS ENABLE+FORCE y política', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0025_seg07_habeas_data.sql'), 'utf8');
    for (const tabla of [
      'solicitudes_titular',
      'bitacora_respuestas_titular',
      'banderas_dato',
      'historial_datos_demograficos',
      'secuencias_radicado_hd',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`CREATE POLICY ${tabla}_tenant_app`);
    }
  });
});
