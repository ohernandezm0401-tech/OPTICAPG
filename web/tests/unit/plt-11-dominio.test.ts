// PLT-11 (T06) — Pruebas unitarias (U) del calendario hábil, el CSV de
// festivos, el snapshot de impuesto y la ausencia de tarifas quemadas.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { esDiaHabil, sumarDiasHabiles } from '../../dominio/calendario-habil';
import { parsearCsvFestivos } from '../../dominio/festivos-csv';
import { capturarInstantaneaImpuesto, impuestoLineaCerradaCop } from '../../dominio/impuestos';
import { programarMensajeComercial } from '../../dominio/mensajes-comerciales';
import {
  ROTULO_PROVISIONAL,
  ROTULO_RETENCION_HISTORIAS,
  parametrosIniciales,
} from '../../dominio/parametros-iniciales';

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TOKEN_TASA = ['IVA', '_RATE'].join('');
const TOKEN_DECIMAL = ['0', '.19'].join('');

function archivosFuente(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    if (entrada === 'node_modules' || entrada === '.next' || entrada === 'tests') continue;
    const absoluto = path.join(directorio, entrada);
    const estado = statSync(absoluto);
    if (estado.isDirectory()) {
      encontrados.push(...archivosFuente(absoluto));
      continue;
    }
    if (/\.(ts|tsx|js|mjs|sql)$/.test(entrada)) encontrados.push(absoluto);
  }
  return encontrados;
}

describe('AC-PLT-11-2: el programador rechaza domingo y festivo', () => {
  it('rechaza un domingo y acepta un sábado', () => {
    const domingo = programarMensajeComercial('2026-10-04', new Set());
    expect(domingo).toEqual({ aceptada: false, motivo: 'domingo' });

    const sabado = programarMensajeComercial('2026-10-03', new Set());
    expect(sabado).toEqual({ aceptada: true });
  });

  it('rechaza un festivo cargado que no es domingo', () => {
    const festivos = new Set(['2026-10-07']);
    expect(programarMensajeComercial('2026-10-07', festivos)).toEqual({
      aceptada: false,
      motivo: 'festivo',
    });
    expect(programarMensajeComercial('2026-10-06', festivos)).toEqual({ aceptada: true });
  });

  it('un domingo que además está en la tabla se informa como domingo', () => {
    const decision = programarMensajeComercial('2026-10-04', new Set(['2026-10-04']));
    expect(decision).toEqual({ aceptada: false, motivo: 'domingo' });
  });
});

describe('sumarDiasHabiles omite sábado, domingo y festivos del conjunto', () => {
  it('el viernes 2 de octubre de 2026 más un día hábil cae el lunes 5', () => {
    expect(sumarDiasHabiles('2026-10-02', 1, new Set())).toBe('2026-10-05');
  });

  it('si el lunes está cargado como festivo, el día hábil siguiente es el martes', () => {
    expect(sumarDiasHabiles('2026-10-02', 1, new Set(['2026-10-05']))).toBe('2026-10-06');
  });

  it('quince días hábiles no caen en fin de semana ni en el festivo de prueba', () => {
    const festivos = new Set(['2026-10-12']);
    const resultado = sumarDiasHabiles('2026-10-02', 15, festivos);
    expect(esDiaHabil(resultado, festivos)).toBe(true);
    expect(resultado).toBe('2026-10-26');
  });

  it('n = 0 devuelve la misma fecha y n negativo falla', () => {
    expect(sumarDiasHabiles('2026-10-02', 0, new Set())).toBe('2026-10-02');
    expect(() => sumarDiasHabiles('2026-10-02', -1, new Set())).toThrow(/entero/);
  });
});

describe('CSV de festivos (Q-32): solo filas que aporta el humano', () => {
  it('un CSV con solo encabezado no inventa festivos', () => {
    expect(parsearCsvFestivos('anio,fecha,nombre,fuente\n')).toEqual([]);
  });

  it('exige fuente y rechaza un año que no coincide con la fecha', () => {
    expect(() =>
      parsearCsvFestivos('anio,fecha,nombre,fuente\n2026,2026-10-12,Festivo de prueba,\n'),
    ).toThrow(/fuente/);
    expect(() =>
      parsearCsvFestivos('anio,fecha,nombre,fuente\n2025,2026-10-12,Festivo de prueba,CSV de prueba\n'),
    ).toThrow(/no coincide/);
  });

  it('conserva nombre y fuente tal como vienen, sin filas extra', () => {
    const filas = parsearCsvFestivos(
      'anio,fecha,nombre,fuente\n2026,2026-10-12,"Festivo, de prueba",CSV humano de la óptica\n',
    );
    expect(filas).toEqual([
      {
        anio: 2026,
        fecha: '2026-10-12',
        nombre: 'Festivo, de prueba',
        fuente: 'CSV humano de la óptica',
      },
    ]);
  });
});

describe('AC-PLT-11-1: el snapshot de la línea no sigue a la tarifa', () => {
  const tarifa = {
    id: '11111111-1111-4111-8111-111111111111',
    nombre: 'categoría de prueba',
    porcentaje_bp: 1900,
    excluido: false,
    exento: false,
    vigente_desde: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('copiar la tarifa congela los puntos básicos de esa línea', () => {
    const instantanea = capturarInstantaneaImpuesto(tarifa);
    const tarifaNueva = { ...tarifa, porcentaje_bp: 500, id: '22222222-2222-4222-8222-222222222222' };
    const impuestoCerrado = impuestoLineaCerradaCop(100000, instantanea);
    expect(impuestoCerrado).toBe(19000);
    expect(impuestoLineaCerradaCop(100000, capturarInstantaneaImpuesto(tarifaNueva))).toBe(5000);
    expect(instantanea.porcentaje_bp).toBe(1900);
  });

  it('excluido o exento no suma impuesto, sin tasa implícita', () => {
    const exenta = capturarInstantaneaImpuesto({ ...tarifa, exento: true, porcentaje_bp: 1900 });
    expect(impuestoLineaCerradaCop(80000, exenta)).toBe(0);
  });
});

describe('parámetros iniciales editables', () => {
  it('retención 15 años rotulada y plazos provisionales sin cantidad', () => {
    const iniciales = parametrosIniciales();
    const retencion = iniciales.find((fila) => fila.clave === 'retencion_historias_anios');
    expect(retencion).toMatchObject({ valor: 15, rotulo: ROTULO_RETENCION_HISTORIAS });
    for (const clave of ['plazo_conservacion_logs', 'plazo_conservacion_facturas', 'plazo_aviso_incidente'] as const) {
      expect(iniciales.find((fila) => fila.clave === clave)).toMatchObject({
        valor: null,
        rotulo: ROTULO_PROVISIONAL,
      });
    }
    expect(iniciales.find((fila) => fila.clave === 'zona_horaria')?.valor).toBe('America/Bogota');
    expect(iniciales.find((fila) => fila.clave === 'moneda')?.valor).toBe('COP');
  });
});

describe('AC-PLT-11-3: sin tasa ni identificador de IVA en el código de la app', () => {
  it('no queda el decimal ni el identificador de tasa en fuentes de web/', () => {
    const hallazgos: string[] = [];
    for (const archivo of archivosFuente(RAIZ_WEB)) {
      const contenido = readFileSync(archivo, 'utf8');
      if (contenido.includes(TOKEN_TASA) || contenido.includes(TOKEN_DECIMAL)) {
        hallazgos.push(path.relative(RAIZ_WEB, archivo));
      }
    }
    expect(hallazgos).toEqual([]);
  });

  it('la migración de tarifas no pone porcentaje por defecto ni inserta festivos', () => {
    const sql = readFileSync(path.join(RAIZ_WEB, 'db/migrations/0002_plt11_parametros.sql'), 'utf8');
    expect(sql).toContain('"porcentaje_bp" integer NOT NULL');
    expect(sql).not.toMatch(/porcentaje_bp" integer DEFAULT/i);
    expect(sql.toLowerCase()).not.toContain('insert into');

    const plantilla = readFileSync(path.join(RAIZ_WEB, 'db/festivos/plantilla.csv'), 'utf8').trim();
    expect(plantilla).toBe('anio,fecha,nombre,fuente');
  });

  it('las tablas nuevas declaran RLS ENABLE y FORCE', () => {
    const sql = readFileSync(path.join(RAIZ_WEB, 'db/migrations/0003_rls_parametros.sql'), 'utf8');
    for (const tabla of [
      'parametros_tenant',
      'festivos',
      'tarifas_impuesto',
      'instantaneas_impuesto_linea',
      'bitacora_parametros',
    ]) {
      expect(sql).toContain(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);
    }
    expect(sql).not.toMatch(/BYPASSRLS/i);
  });

  it('el dominio no trae nombres de festivos oficiales', () => {
    const dominio = archivosFuente(path.join(RAIZ_WEB, 'dominio'))
      .map((archivo) => readFileSync(archivo, 'utf8'))
      .join('\n');
    expect(dominio).not.toMatch(/Año Nuevo|Viernes Santo|Navidad/);
  });
});
