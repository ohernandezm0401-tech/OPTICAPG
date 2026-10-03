// SEG-11 (T29) — Plazos, alertas y runbook. U. Sin datos de pacientes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { sumarDiasHabiles } from '../../dominio/calendario-habil';
import {
  AVISO_SIN_FESTIVOS,
  calcularPlazoIncidente,
  ErrorDatoIncidente,
  NOTA_Q07_AVISO_OPTICA,
  PLAZO_SIC_DIAS_HABILES,
  plantillaAvisoOptica,
  plantillaReporteSic,
  rechazarDatoPersonal,
  restarDiasHabiles,
  ROTULO_BORRADOR,
} from '../../dominio/incidentes';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DETECTADO = new Date('2026-10-02T15:00:00.000Z');

describe('AC-SEG-11-1: 15 días hábiles y alertas T-5, T-2 y T-0', () => {
  it('sin festivos el límite es el día 15 hábil y las alertas caen antes', () => {
    const plazo = calcularPlazoIncidente({
      detectado_en: DETECTADO,
      plazo_dias: PLAZO_SIC_DIAS_HABILES,
      festivos: [],
    });
    expect(plazo.dia_deteccion).toBe('2026-10-02');
    expect(plazo.plazo_sic).toBe(sumarDiasHabiles('2026-10-02', 15, new Set()));
    expect(plazo.plazo_sic).toBe('2026-10-23');
    expect(plazo.aviso_festivos).toBe(AVISO_SIN_FESTIVOS);
    expect(plazo.alertas.map((alerta) => alerta.codigo)).toEqual(['T-5', 'T-2', 'T-0']);
    expect(plazo.alertas.find((alerta) => alerta.codigo === 'T-0')?.fecha).toBe(plazo.plazo_sic);
    expect(plazo.alertas.find((alerta) => alerta.codigo === 'T-5')?.fecha).toBe(
      restarDiasHabiles(plazo.plazo_sic, 5, new Set()),
    );
    expect(plazo.alertas.find((alerta) => alerta.codigo === 'T-2')?.fecha).toBe('2026-10-21');
  });

  it('un festivo cargado corre el límite y las tres alertas', () => {
    const festivos = ['2026-10-12'];
    const plazo = calcularPlazoIncidente({
      detectado_en: DETECTADO,
      plazo_dias: 15,
      festivos,
    });
    const conjunto = new Set(festivos);
    expect(plazo.festivos_cargados).toBe(true);
    expect(plazo.aviso_festivos).toBeNull();
    expect(plazo.plazo_sic).toBe(sumarDiasHabiles('2026-10-02', 15, conjunto));
    expect(plazo.plazo_sic).toBe('2026-10-26');
    for (const alerta of plazo.alertas) {
      expect(alerta.fecha).toBe(restarDiasHabiles(plazo.plazo_sic, alerta.dias_habiles_antes, conjunto));
    }
  });
});

describe('textos sin datos de pacientes y borradores', () => {
  it('rechaza correo, documento y la palabra paciente', () => {
    expect(() => rechazarDatoPersonal('descripcion', 'aviso a paciente Juan')).toThrow(ErrorDatoIncidente);
    expect(() => rechazarDatoPersonal('alcance', 'correo alguien@example.invalid')).toThrow(ErrorDatoIncidente);
    expect(() => rechazarDatoPersonal('datos_afectados', 'documento 1234567890')).toThrow(ErrorDatoIncidente);
    expect(rechazarDatoPersonal('descripcion', 'credenciales de acceso de la plataforma')).toBe(
      'credenciales de acceso de la plataforma',
    );
  });

  it('las plantillas son borrador y dicen que el sistema no envía', () => {
    const texto = plantillaReporteSic({
      incidente_id: '11111111-1111-4111-8111-111111111111',
      dia_deteccion: '2026-10-02',
      plazo_sic: '2026-10-23',
      plazo_sic_dias: 15,
      fuente_plazo: 'Circular Única SIC Título V 2.1.f(ii)',
      alcance: 'una optica',
      datos_afectados: 'credenciales',
      severidad: 'operativa',
    });
    expect(texto.startsWith(ROTULO_BORRADOR)).toBe(true);
    expect(texto).toContain('no envía este texto');
    expect(plantillaAvisoOptica({
      incidente_id: '11111111-1111-4111-8111-111111111111',
      dia_deteccion: '2026-10-02',
      plazo_sic: '2026-10-23',
      plazo_sic_dias: 15,
      fuente_plazo: 'Circular Única SIC Título V 2.1.f(ii)',
      alcance: 'una optica',
      datos_afectados: 'credenciales',
      severidad: 'operativa',
      razon_social: 'Óptica Sintética',
    })).toContain(ROTULO_BORRADOR);
  });

  it('TODO(Q-07): el aviso a la óptica no trae un número de horas', () => {
    expect(NOTA_Q07_AVISO_OPTICA).toContain('TODO(Q-07)');
    expect(NOTA_Q07_AVISO_OPTICA).not.toMatch(/\b(24|48|72)\b/);
  });
});

describe('AC-SEG-11-3: el runbook existe, con roles y pasos', () => {
  it('docs/seguridad/RUNBOOK_INCIDENTES.md nombra roles y el enlace de docs/INCIDENTES.md', () => {
    const runbook = readFileSync(path.join(RAIZ, 'docs/seguridad/RUNBOOK_INCIDENTES.md'), 'utf8');
    expect(runbook).toContain('owner_plataforma');
    expect(runbook).toContain('soporte_plataforma');
    expect(runbook).toContain('Admin de la óptica');
    expect(runbook).toContain('## Pasos');
    expect(runbook).toContain('BORRADOR – requiere revisión jurídica');
    expect(runbook).toContain('no envía');
    const resumen = readFileSync(path.join(RAIZ, 'docs/INCIDENTES.md'), 'utf8');
    expect(resumen).toContain('docs/seguridad/RUNBOOK_INCIDENTES.md');
  });

  it('la migración nace con RLS ENABLE y FORCE y no otorga BYPASSRLS', () => {
    const sql = readFileSync(path.join(RAIZ, 'web/db/migrations/0028_seg11_incidentes.sql'), 'utf8');
    for (const tabla of [
      'parametros_incidente',
      'operadores_plataforma',
      'incidentes',
      'alertas_incidente',
      'incidentes_tenants',
      'notificaciones_internas',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('GRANT optisaas_incidente TO optisaas_app WITH INHERIT FALSE');
    expect(sql).not.toMatch(/BYPASSRLS/i);
    expect(sql).toContain("'15'");
    expect(sql).toContain('plazo_aviso_incidente');
  });
});
