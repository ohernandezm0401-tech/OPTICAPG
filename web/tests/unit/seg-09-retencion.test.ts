// SEG-09 (T27) — Cálculo de archivo (U), propiedades (P) y pantalla (AC-SEG-09-4).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VistaPoliticaRetencion } from '../../components/retencion/vista-politica';
import { causaSupresionConEstado } from '../../dominio/habeas-data';
import { desplazarDias } from '../../dominio/fechas';
import { parametrosIniciales } from '../../dominio/parametros-iniciales';
import {
  ANIOS_CONSERVACION_VERIFICADOS,
  ANIOS_GESTION_VERIFICADOS,
  POLITICA_RETENCION_INICIAL,
  TABLAS_CLINICAS_SIN_BORRADO,
  calcularEstadoArchivo,
  marcaVerificacionPantalla,
  mensajeBloqueoEliminacion,
  puedePurgarHistoria,
  sumarAnios,
  sumarMeses,
  textoPlazoPantalla,
  type TipoMarcaRetencion,
} from '../../dominio/retencion';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function lcg(semilla: number) {
  let estado = semilla >>> 0;
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado;
  };
}

const PLAZOS = { gestion: ANIOS_GESTION_VERIFICADOS, conservacion: ANIOS_CONSERVACION_VERIFICADOS };

describe('AC-SEG-09-2: límites de 5 y 15 años con fechas fijas', () => {
  it('el aniversario de 5 años sigue en archivo de gestión y el día siguiente pasa a central', () => {
    const ultima = '2010-03-15';
    expect(sumarAnios(ultima, 5)).toBe('2015-03-15');
    expect(
      calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy: '2015-03-15', ...PLAZOS }).estado,
    ).toBe('archivo_gestion');
    expect(
      calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy: '2015-03-16', ...PLAZOS }).estado,
    ).toBe('archivo_central');
  });

  it('el aniversario de 15 años sigue en archivo central y el día siguiente queda pendiente de disposición', () => {
    const ultima = '2000-03-15';
    expect(sumarAnios(ultima, 15)).toBe('2015-03-15');
    const enElLimite = calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy: '2015-03-15', ...PLAZOS });
    expect(enElLimite.estado).toBe('archivo_central');
    expect(enElLimite.elegible).toBe(false);
    const despues = calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy: '2015-03-16', ...PLAZOS });
    expect(despues.estado).toBe('disposicion_final_pendiente');
    expect(despues.elegible).toBe(true);
    expect(despues.purga_permitida).toBe(false);
  });

  it('un 29 de febrero no inventa un día y el que no tiene folio sigue activo', () => {
    expect(sumarAnios('2020-02-29', 5)).toBe('2025-02-28');
    expect(
      calcularEstadoArchivo({ fechaUltimaAtencion: '2020-02-29', hoy: '2025-02-28', ...PLAZOS }).estado,
    ).toBe('archivo_gestion');
    expect(
      calcularEstadoArchivo({ fechaUltimaAtencion: '2020-02-29', hoy: '2025-03-01', ...PLAZOS }).estado,
    ).toBe('archivo_central');
    expect(calcularEstadoArchivo({ fechaUltimaAtencion: null, hoy: '2026-10-03', ...PLAZOS }).estado).toBe('activo');
  });

  it('14 años y 11 meses siguen dentro de la retención', () => {
    const hoy = '2026-10-03';
    const ultima = sumarMeses(hoy, -(14 * 12 + 11));
    expect(ultima).toBe('2011-11-03');
    const resultado = calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy, ...PLAZOS });
    expect(resultado.estado).toBe('archivo_central');
    expect(resultado.elegible).toBe(false);
    expect(mensajeBloqueoEliminacion(resultado.estado)).toMatch(/DELETE prohibido/);
    expect(puedePurgarHistoria()).toBe(false);
  });
});

describe('AC-SEG-09-3: la marca duplicada impide la elegibilidad a los 15 años', () => {
  it('al día siguiente de los 15 años, sin marca es elegible y con duplicada no', () => {
    const ultima = '2000-06-01';
    const hoy = desplazarDias(sumarAnios(ultima, 15), 1);
    const libre = calcularEstadoArchivo({ fechaUltimaAtencion: ultima, hoy, ...PLAZOS });
    const duplicada = calcularEstadoArchivo({
      fechaUltimaAtencion: ultima,
      hoy,
      ...PLAZOS,
      marcas: ['duplicada'],
    });
    expect(libre.elegible).toBe(true);
    expect(duplicada.elegible).toBe(false);
    expect(duplicada.estado).toBe('archivo_central');
    expect(duplicada.anios_efectivos).toBe(30);
  });

  it('la marca permanente no llega a disposición final', () => {
    const resultado = calcularEstadoArchivo({
      fechaUltimaAtencion: '1990-01-01',
      hoy: '2026-01-02',
      ...PLAZOS,
      marcas: ['permanente'],
    });
    expect(resultado.elegible).toBe(false);
    expect(resultado.estado).toBe('archivo_central');
    expect(resultado.anios_efectivos).toBeNull();
  });
});

describe('AC-SEG-09-4: la pantalla distingue plazos verificados y provisionales', () => {
  it('muestra ✅ en los verificados y ⚠️ con TODO(Q-07) en los provisionales', () => {
    const filas = POLITICA_RETENCION_INICIAL.map((fila) => ({ ...fila, texto: textoPlazoPantalla(fila) }));
    const html = renderToStaticMarkup(createElement(VistaPoliticaRetencion, { filas }));
    expect(html).toContain('Política de retención');
    expect(html).toContain('✅ verificado');
    expect(html).toContain('⚠️ provisional');
    expect(html).toContain('TODO(Q-07)');
    expect(html).toContain('sin plazo por defecto');
    expect(html).toContain('Res. 839/2017 art. 3');
    expect(html).toContain('contrata profesionales');
    expect(html).toContain('no está implementada');
    for (const fila of POLITICA_RETENCION_INICIAL) {
      expect(html).toContain(marcaVerificacionPantalla(fila.verificado));
      if (!fila.verificado) expect(fila.base_normativa).toContain('TODO(Q-07)');
      if (fila.verificado) expect(fila.anios).not.toBeNull();
    }
    expect(POLITICA_RETENCION_INICIAL.find((fila) => fila.tipo_documento === 'factura_electronica')?.anios).toBeNull();
    expect(POLITICA_RETENCION_INICIAL.find((fila) => fila.tipo_documento === 'log_auditoria')?.anios).toBeNull();
  });

  it('los parámetros iniciales citan la fuente de la spec y no inventan logs ni facturas', () => {
    const iniciales = parametrosIniciales();
    expect(iniciales.find((fila) => fila.clave === 'retencion_historias_anios')).toMatchObject({ valor: 15 });
    expect(iniciales.find((fila) => fila.clave === 'plazo_archivo_gestion_anios')).toMatchObject({ valor: 5 });
    expect(String(iniciales.find((fila) => fila.clave === 'plazo_archivo_gestion_anios')?.rotulo)).toMatch(/839\/2017/);
    expect(iniciales.find((fila) => fila.clave === 'plazo_conservacion_facturas')?.valor).toBeNull();
    expect(iniciales.find((fila) => fila.clave === 'plazo_conservacion_logs')?.valor).toBeNull();
  });
});

describe('la causa de supresión cita el estado de retención', () => {
  it('sustituye el hueco y no escribe un número de años', () => {
    const causa = causaSupresionConEstado(null, 'archivo_central');
    expect(causa).toContain('archivo_central');
    expect(causa).toContain('BORRADOR – requiere revisión jurídica');
    expect(causa).not.toMatch(/\d+\s+años/);
    expect(causaSupresionConEstado('texto configurable de causa legal suficiente', 'activo')).toContain(
      'Estado de retención: activo.',
    );
  });
});

describe('la migración extiende T12 y no duplica el marco', () => {
  it('cuelga el bloqueo en cada tabla clínica y crea la política con RLS', () => {
    const sql = readFileSync(path.join(RAIZ, 'db/migrations/0026_seg09_retencion.sql'), 'utf8');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION inmutabilidad_antes_fila()');
    expect(sql).toContain('aplicar_bloqueo_eliminacion_clinica');
    expect(sql).not.toContain('CREATE OR REPLACE FUNCTION inmutabilidad_rechazar_truncate()');
    for (const tabla of TABLAS_CLINICAS_SIN_BORRADO) {
      expect(sql).toContain(`aplicar_bloqueo_eliminacion_clinica('public.${tabla}'::regclass)`);
    }
    expect(sql).toContain('ALTER TABLE politica_retencion ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE politica_retencion FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE marcas_retencion ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE marcas_retencion FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY politica_retencion_tenant_app');
    expect(sql).toContain('CREATE POLICY marcas_retencion_tenant_app');
    for (const fila of POLITICA_RETENCION_INICIAL) {
      expect(sql).toContain(fila.base_normativa);
    }
  });
});

describe('P: el estado no adelanta la disposición y la purga sigue cerrada', () => {
  it('fechas y marcas aleatorias respetan los límites inclusivos', () => {
    const aleatorio = lcg(20261003);
    for (let caso = 0; caso < 80; caso += 1) {
      const ultima = desplazarDias('1995-01-01', aleatorio() % 8000);
      const hoy = desplazarDias(ultima, aleatorio() % 12000);
      const marcas: TipoMarcaRetencion[] =
        aleatorio() % 5 === 0 ? ['duplicada'] : aleatorio() % 7 === 0 ? ['permanente'] : [];
      const resultado = calcularEstadoArchivo({
        fechaUltimaAtencion: ultima,
        hoy,
        ...PLAZOS,
        marcas,
      });
      expect(resultado.purga_permitida).toBe(false);
      expect(resultado.elegible).toBe(resultado.estado === 'disposicion_final_pendiente');
      const finGestion = sumarAnios(ultima, ANIOS_GESTION_VERIFICADOS);
      if (hoy <= finGestion) expect(resultado.estado).toBe('archivo_gestion');
      if (marcas.includes('permanente')) expect(resultado.estado).not.toBe('disposicion_final_pendiente');
      if (marcas.includes('duplicada') && hoy <= sumarAnios(ultima, ANIOS_CONSERVACION_VERIFICADOS * 2)) {
        expect(resultado.elegible).toBe(false);
      }
      if (marcas.length === 0 && hoy <= sumarAnios(ultima, ANIOS_CONSERVACION_VERIFICADOS)) {
        expect(resultado.elegible).toBe(false);
      }
      expect(calcularEstadoArchivo({ fechaUltimaAtencion: null, hoy, ...PLAZOS, marcas }).estado).toBe('activo');
    }
  });
});
