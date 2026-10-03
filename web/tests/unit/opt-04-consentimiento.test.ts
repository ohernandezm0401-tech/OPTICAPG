// OPT-04 (T22) — Puerta de procedimiento, versión y anexo (U).
// TODO(Q-17): la negativa clínica bloquea el procedimiento, no la atención.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  MODULOS_PENDIENTES_DE_CONSENTIMIENTO,
  PROCEDIMIENTO_ADAPTACION_LC,
  ROTULO_CONSENTIMIENTO,
  anexoConsentimientoCompleto,
  plantillaBorrador,
  planVersionPlantilla,
  puedeIniciarProcedimiento,
  resolverFirmante,
  textoIncluyeRotuloConsentimiento,
  versionConservada,
} from '../../dominio/consentimiento-clinico';

const V1 = { version: 1, hash: 'a'.repeat(64) };
const FIRMADO = { otorgado: true, version: 1, hash: V1.hash, revocado: false };

describe('AC-OPT-04-1: no inicia la adaptación sin el consentimiento vigente', () => {
  it('U: sin firma, con negativa, revocatoria o versión vieja la puerta queda cerrada', () => {
    expect(
      puedeIniciarProcedimiento({
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        plantillaVigente: V1,
        consentimiento: null,
      }),
    ).toEqual({ permitida: false, motivo: 'sin_consentimiento' });
    expect(
      puedeIniciarProcedimiento({
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        plantillaVigente: V1,
        consentimiento: { ...FIRMADO, otorgado: false },
      }).motivo,
    ).toBe('negado');
    expect(
      puedeIniciarProcedimiento({
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        plantillaVigente: V1,
        consentimiento: { ...FIRMADO, revocado: true },
      }).motivo,
    ).toBe('revocado');
    expect(
      puedeIniciarProcedimiento({
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        plantillaVigente: { version: 2, hash: 'b'.repeat(64) },
        consentimiento: FIRMADO,
      }).motivo,
    ).toBe('version_no_vigente');
    expect(
      puedeIniciarProcedimiento({
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        plantillaVigente: V1,
        consentimiento: FIRMADO,
      }),
    ).toEqual({ permitida: true, motivo: 'firmado_vigente' });
    expect(
      puedeIniciarProcedimiento({
        procedimiento: 'control_visual',
        plantillaVigente: null,
        consentimiento: null,
      }).motivo,
    ).toBe('no_exige');
  });

  it('U: la persona menor firma por el representante', () => {
    expect(resolverFirmante(true, false)).toEqual({ error: 'menor_sin_representante' });
    expect(resolverFirmante(true, true)).toEqual({ firmante: 'representante' });
    expect(resolverFirmante(false, false)).toEqual({ firmante: 'paciente' });
  });
});

describe('AC-OPT-04-2: la versión anterior se conserva', () => {
  it('U: cambiar el texto pide otra versión y no reescribe la guardada', () => {
    const anterior = { version: 1, contenido: plantillaBorrador('adaptacion_lc') };
    const plan = planVersionPlantilla(anterior, `${anterior.contenido}\nCambio del responsable.`);
    expect(plan).toEqual({ accion: 'nueva', version: 2 });
    expect(versionConservada({ version: anterior.version, hash: V1.hash })).toEqual({
      version: 1,
      hash: V1.hash,
    });
    expect(planVersionPlantilla(anterior, anterior.contenido).accion).toBe('igual');
  });
});

describe('AC-OPT-04-3: el anexo exige hash, firma y atención', () => {
  it('U: el hash del PDF debe coincidir con el del documento', () => {
    expect(
      anexoConsentimientoCompleto({
        atencionId: 'atencion',
        firmaId: 'firma',
        hashAnexo: 'c'.repeat(64),
        hashDocumento: 'c'.repeat(64),
      }),
    ).toBe(true);
    expect(
      anexoConsentimientoCompleto({
        atencionId: 'atencion',
        firmaId: null,
        hashAnexo: 'c'.repeat(64),
        hashDocumento: 'c'.repeat(64),
      }),
    ).toBe(false);
  });
});

describe('borrador y módulos que todavía no existen', () => {
  it('U: el texto es borrador y nombra OPT-07, OPT-18 y OPT-21', () => {
    const texto = plantillaBorrador('adaptacion_lc');
    expect(textoIncluyeRotuloConsentimiento(texto)).toBe(true);
    expect(texto).toContain(ROTULO_CONSENTIMIENTO);
    expect(texto).toContain('TODO(Q-17)');
    expect(texto).not.toMatch(/\b\d+\s*UVT\b/);
    expect(MODULOS_PENDIENTES_DE_CONSENTIMIENTO).toEqual(['OPT-07', 'OPT-18', 'OPT-21']);
  });

  it('U: la migración nace con RLS ENABLE y FORCE', () => {
    const sql = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/0021_opt04_consentimientos.sql'),
      'utf8',
    );
    for (const tabla of ['plantillas_consentimiento', 'consentimientos', 'consentimientos_revocatorias']) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`POLICY`);
    }
    expect(sql).toContain("aplicar_marco_inmutabilidad('public.consentimientos'::regclass)");
    expect(sql).not.toMatch(/BYPASSRLS/i);
  });
});
