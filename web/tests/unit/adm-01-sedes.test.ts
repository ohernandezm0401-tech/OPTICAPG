// ADM-01 (T16) — Fechas de certificado, completitud y módulos (U).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { TIPOS_SEDE } from '../../db/esquema/nucleo';
import {
  armarVistaSede,
  completitudDeSede,
  evaluarTopeDirector,
  evaluarVencimiento,
  faltantesDeSede,
  fechaDentroDe,
  modulosDeSede,
  ofrecePosPublico,
  TIPOS_ESTABLECIMIENTO,
  TOPE_ESTABLECIMIENTOS_DIRECTOR,
} from '../../dominio/sedes';

const AHORA = new Date('2026-06-15T15:00:00.000Z');
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('AC-ADM-01-2: alertas con reloj simulado', () => {
  it('un certificado que vence en 29 días genera la alerta de 30', () => {
    const vence = fechaDentroDe(AHORA, 29);
    const alerta = evaluarVencimiento(vence, AHORA);
    expect(alerta.dias).toBe(29);
    expect(alerta.estado).toBe('por_vencer');
    expect(alerta.umbral).toBe(30);
    expect(alerta.roja).toBe(false);
    expect(alerta.bloqueaAtencionClinica).toBe(false);
  });

  it('un certificado vencido genera alerta roja y no bloquea la atención', () => {
    const vence = fechaDentroDe(AHORA, -1);
    const alerta = evaluarVencimiento(vence, AHORA);
    expect(alerta.estado).toBe('vencido');
    expect(alerta.roja).toBe(true);
    expect(alerta.umbral).toBeNull();
    expect(alerta.bloqueaAtencionClinica).toBe(false);
  });

  it('los umbrales de 90 y 60 días usan el día civil de Bogotá', () => {
    expect(evaluarVencimiento(fechaDentroDe(AHORA, 90), AHORA).umbral).toBe(90);
    expect(evaluarVencimiento(fechaDentroDe(AHORA, 61), AHORA).umbral).toBe(90);
    expect(evaluarVencimiento(fechaDentroDe(AHORA, 60), AHORA).umbral).toBe(60);
    expect(evaluarVencimiento(fechaDentroDe(AHORA, 31), AHORA).umbral).toBe(60);
    expect(evaluarVencimiento(fechaDentroDe(AHORA, 91), AHORA).estado).toBe('vigente');
  });
});

describe('AC-ADM-01-1: sede incompleta', () => {
  it('marca incompleta y lista el certificado de dispensación y el director', () => {
    const perfil = { tipo_establecimiento: 'optica_sin_consultorio' as const };
    expect(completitudDeSede(perfil)).toBe('incompleta');
    const faltantes = faltantesDeSede(perfil);
    expect(faltantes).toContain('certificado de dispensación');
    expect(faltantes).toContain('director científico');
    expect(faltantes).toContain('responsable de tecnovigilancia');
  });
});

describe('AC-ADM-01-3: tope del director científico', () => {
  it('el cuarto establecimiento bloquea y el tercero no', () => {
    expect(TOPE_ESTABLECIMIENTOS_DIRECTOR).toBe(3);
    expect(evaluarTopeDirector(2).bloquea).toBe(false);
    expect(evaluarTopeDirector(3).bloquea).toBe(true);
    expect(evaluarTopeDirector(3).mensaje).toContain('administrador');
  });
});

describe('AC-ADM-01-4: módulos por tipo', () => {
  it('el laboratorio oftálmico no ofrece POS al público', () => {
    expect(ofrecePosPublico('laboratorio_oftalmico')).toBe(false);
    const modulos = modulosDeSede('laboratorio_oftalmico', null);
    expect(modulos.habilitados).not.toContain('pos_publico');
    expect(modulos.bloqueados).toContain('pos_publico');
    const vista = armarVistaSede(
      {
        id: 'b1111111-1111-4111-8111-111111111111',
        nombre: 'Lab sintético',
        ciudad: 'Bogotá',
        direccion: null,
        tipo_establecimiento: 'laboratorio_oftalmico',
        reps_codigo: null,
        director_cientifico_id: null,
        responsable_tecnovigilancia_id: null,
        certificado: null,
      },
      AHORA,
    );
    expect(vista.ofrece_pos_publico).toBe(false);
    expect(vista.bloquea_atencion_clinica).toBe(false);
  });

  it('el enum de la sede es el de la spec, no un valor laboratorio suelto', () => {
    expect([...TIPOS_ESTABLECIMIENTO]).toEqual([...TIPOS_SEDE]);
    expect(TIPOS_ESTABLECIMIENTO).not.toContain('laboratorio');
  });
});

describe('RLS de certificados_sede', () => {
  it('la migración habilita y fuerza RLS y crea la política', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0015_adm01_sedes.sql'), 'utf8');
    expect(sql).toContain('ALTER TABLE certificados_sede ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE certificados_sede FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY certificados_sede_consulta_app');
    expect(sql).not.toContain('BYPASSRLS');
  });
});
