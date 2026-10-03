// SEG-05 (T15) — Reglas puras de autorización y política.
// AC-SEG-05-1 a AC-SEG-05-5. Solo decisiones de dominio; sin base de datos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  CODIGO_CONTACTO,
  CODIGO_TRATAMIENTO,
  PLANTILLA_CONTACTO_COMERCIAL,
  PLANTILLA_TRATAMIENTO_CLINICO,
  ROTULO_BORRADOR,
  armarEvidencia,
  contactoBloqueaRegistro,
  contactoComercialPorDefecto,
  generarAvisoPrivacidad,
  hashTextoLegal,
  puedeAbrirAtencion,
  puedeContactarComercialmente,
  politicaVacia,
  siguienteVersionTexto,
  textoIncluyeRotuloBorrador,
} from '../../dominio/autorizacion-datos';

const AHORA = new Date('2026-10-03T15:04:00.000Z');

describe('AC-SEG-05-1: apertura de atención', () => {
  it('exige captura otorgada o negada, salvo urgencia marcada', () => {
    expect(puedeAbrirAtencion({ urgencia: false, estadoTratamiento: null }).permitida).toBe(false);
    expect(puedeAbrirAtencion({ urgencia: false, estadoTratamiento: 'pendiente' }).motivo).toBe('sin_captura');
    expect(puedeAbrirAtencion({ urgencia: true, estadoTratamiento: null })).toEqual({
      permitida: true,
      motivo: 'urgencia',
    });
    expect(puedeAbrirAtencion({ urgencia: false, estadoTratamiento: 'otorgada' }).permitida).toBe(true);
    // TODO(Q-17): la negativa registrada permite continuar.
    expect(puedeAbrirAtencion({ urgencia: false, estadoTratamiento: 'negada' })).toEqual({
      permitida: true,
      motivo: 'negada_registrada',
    });
    expect(puedeAbrirAtencion({ urgencia: false, estadoTratamiento: 'revocada' }).permitida).toBe(false);
  });
});

describe('AC-SEG-05-2: contacto comercial', () => {
  it('viene desmarcado y no bloquea el registro', () => {
    expect(contactoComercialPorDefecto()).toBe(false);
    expect(contactoBloqueaRegistro()).toBe(false);
    expect(PLANTILLA_CONTACTO_COMERCIAL).toContain('no viene marcada');
    expect(puedeContactarComercialmente({ estadoContacto: null }).motivo).toBe('sin_autorizacion');
  });
});

describe('AC-SEG-05-3: evidencia exportable', () => {
  it('incluye el texto exacto, el hash, la hora y el medio', () => {
    const texto = PLANTILLA_TRATAMIENTO_CLINICO;
    const evidencia = armarEvidencia({
      autorizacion_id: 'aut-1',
      finalidad: CODIGO_TRATAMIENTO,
      texto_exacto: texto,
      hash: hashTextoLegal(texto),
      instante: AHORA,
      medio: 'presencial',
      estado: 'otorgada',
      otorgada: true,
      firma_id: null,
    });
    expect(evidencia.texto_exacto).toBe(texto);
    expect(evidencia.hash).toBe(hashTextoLegal(texto));
    expect(evidencia.hora_utc).toBe('2026-10-03T15:04:00.000Z');
    expect(evidencia.hora_bogota).toContain('2026');
    expect(evidencia.medio).toBe('presencial');
    expect(evidencia.rotulo).toContain('Borrador sujeto a revisión jurídica');
  });
});

describe('AC-SEG-05-4: versiones', () => {
  it('un texto nuevo no reescribe la versión anterior', () => {
    const actual = {
      version: 1,
      contenido: PLANTILLA_TRATAMIENTO_CLINICO,
      hash: hashTextoLegal(PLANTILLA_TRATAMIENTO_CLINICO),
    };
    const nuevo = `${actual.contenido}\nLínea añadida por el responsable.`;
    const siguiente = siguienteVersionTexto(actual, nuevo);
    expect(siguiente.cambia).toBe(true);
    if (!siguiente.cambia) return;
    expect(siguiente.version).toBe(2);
    expect(siguiente.anterior.contenido).toBe(actual.contenido);
    expect(siguiente.anterior.hash).toBe(actual.hash);
    expect(siguiente.hash).not.toBe(actual.hash);
  });
});

describe('AC-SEG-05-5: revocatoria de contacto', () => {
  it('detiene el envío comercial', () => {
    expect(puedeContactarComercialmente({ estadoContacto: 'otorgada' }).permitida).toBe(true);
    expect(puedeContactarComercialmente({ estadoContacto: 'revocada' })).toEqual({
      permitida: false,
      motivo: 'revocada',
    });
    expect(
      puedeContactarComercialmente({
        estadoContacto: 'otorgada',
        fechaNacimiento: '2016-01-01',
        hoy: '2026-10-03',
        destinatario: 'paciente',
      }).motivo,
    ).toBe('menor_de_edad');
  });
});

describe('borrador jurídico y política sin datos inventados', () => {
  it('las plantillas llevan el rótulo y el aviso no rellena campos vacíos', () => {
    expect(textoIncluyeRotuloBorrador(ROTULO_BORRADOR)).toBe(true);
    expect(PLANTILLA_TRATAMIENTO_CLINICO).toContain('no está obligado');
    expect(PLANTILLA_TRATAMIENTO_CLINICO).not.toBe(PLANTILLA_CONTACTO_COMERCIAL);
    const aviso = generarAvisoPrivacidad(politicaVacia());
    expect(aviso.texto).toContain('sin dato configurado');
    expect(aviso.texto).toContain('BORRADOR – requiere revisión jurídica');
    expect(aviso.campos_sin_dato).toContain('vigencia');
    expect(aviso.texto).not.toMatch(/\b3\d{9}\b/);
  });

  it('la migración nace con RLS ENABLE y FORCE', () => {
    const sql = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/migrations/0014_seg05_autorizacion.sql'),
      'utf8',
    );
    for (const tabla of ['textos_legales', 'politicas_tratamiento', 'autorizaciones']) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`POLICY`);
    }
    expect(sql).not.toMatch(/BYPASSRLS/i);
  });
});
