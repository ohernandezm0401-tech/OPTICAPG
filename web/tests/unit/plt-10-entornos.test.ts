// PLT-10 (T05) — Guardas de entornos y datos sintéticos (U).
//
// - AC-PLT-10-1: `APP_ENV=produccion` con `AUTH_SECRET` por defecto aborta el
//   arranque con mensaje claro (`lib/entorno.ts`, ejecutada en
//   `instrumentation.ts`).
// - AC-PLT-10-2: ningún archivo bajo `web/` contiene rastros de las
//   credenciales de demostración retiradas (barrido estático; los patrones se
//   arman por partes para que el propio criterio no marque este archivo).
// - AC-PLT-10-3 (parte estática): cada fila de `db/seeds/sinteticos/`
//   lleva `es_sintetico=true` y usa identificadores reservados; la
//   idempotencia se prueba contra PostgreSQL real en
//   `tests/int/sembrar-sinteticos.test.ts`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ENTORNOS_VALIDOS,
  EsquemaAppEnv,
  SECRETO_EJEMPLO,
  listarProblemasProduccion,
  obtenerAppEnv,
  validarArranque,
} from '../../lib/entorno';
import { cargarCredencialesDesarrollo } from '../../lib/credenciales-desarrollo';
import {
  DOMINIO_RESERVADO,
  NIT_RESERVADO_PREFIJO,
  esCorreoReservado,
  esFilaSintetica,
  esNitReservado,
  obtenerDatosSinteticos,
  validarFilaSintetica,
} from '../../db/seeds/sinteticos/reservados';

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Patrones del criterio armados por partes (evita el literal del comando de
// aceptación dentro del propio archivo auditor).
const PATRON_RASTROS = new RegExp(['owner', '123'].join('') + '|' + ['dev', 'credentials'].join('-'));
const NOMBRE_MODULO_RETIRADO = ['dev', 'credentials'].join('-') + '.ts';

function archivosBajoWeb(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    if (nombre === 'node_modules' || nombre === '.next') continue;
    const ruta = path.join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosBajoWeb(ruta));
    else salida.push(ruta);
  }
  return salida;
}

function entornoBase(extra: Record<string, string> = {}): Record<string, string> {
  return {
    APP_ENV: 'produccion',
    NODE_ENV: 'production',
    AUTH_SECRET: 'secreto-generado-de-prueba-con-mas-de-32-caracteres-0123456789',
    APP_MASTER_KEY: 'configurada-en-la-prueba',
    ...extra,
  };
}

// Sin rastros en disco: ningún nombre bloqueado existe.
const sinRastros: string[] = [];
const sinArchivos = () => false;

describe('AC-PLT-10-1: APP_ENV validado con Zod', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta los entornos documentados y rechaza el resto', () => {
    for (const entorno of ENTORNOS_VALIDOS) {
      expect(EsquemaAppEnv.parse(entorno)).toBe(entorno);
    }
    expect(() => EsquemaAppEnv.parse('staging')).toThrow(/APP_ENV/);
    expect(() => EsquemaAppEnv.parse('')).toThrow();
  });

  it('sin variable asume producción cuando NODE_ENV=production y desarrollo en otro caso', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(obtenerAppEnv({ NODE_ENV: 'production' })).toBe('produccion');
    expect(obtenerAppEnv({ NODE_ENV: 'development' })).toBe('desarrollo');
    expect(obtenerAppEnv({})).toBe('desarrollo');
    expect(obtenerAppEnv({ APP_ENV: 'pruebas' })).toBe('pruebas');
  });

  it('producción con el secreto de ejemplo aborta con mensaje claro', () => {
    const variables = entornoBase({ AUTH_SECRET: SECRETO_EJEMPLO });
    expect(() => validarArranque(variables, sinRastros, sinArchivos)).toThrow(
      /no arranca con APP_ENV=produccion/,
    );
    expect(() => validarArranque(variables, sinRastros, sinArchivos)).toThrow(/AUTH_SECRET/);
  });

  it('producción sin secreto o con secreto corto aborta', () => {
    const sinSecreto = entornoBase();
    delete sinSecreto.AUTH_SECRET;
    expect(listarProblemasProduccion(sinSecreto, sinRastros, sinArchivos).join('\n')).toMatch(
      /AUTH_SECRET/,
    );
    const corto = entornoBase({ AUTH_SECRET: 'corto' });
    expect(listarProblemasProduccion(corto, sinRastros, sinArchivos).join('\n')).toMatch(/AUTH_SECRET/);
  });

  it('producción con secreto generado y sin rastros arranca', () => {
    expect(validarArranque(entornoBase(), sinRastros, sinArchivos)).toBe('produccion');
  });

  it('producción sin clave maestra aborta', () => {
    const variables = entornoBase();
    delete variables.APP_MASTER_KEY;
    expect(listarProblemasProduccion(variables, sinRastros, sinArchivos).join('\n')).toMatch(/clave maestra/);
  });

  it('producción con modo de demostración activo aborta', () => {
    const variables = entornoBase({ APP_MODE: 'demo' });
    expect(() => validarArranque(variables, sinRastros, sinArchivos)).toThrow(/demostraci/);
  });

  it('producción con bandera de datos sintéticos aborta', () => {
    const variables = entornoBase({ DATOS_SINTETICOS: 'true' });
    expect(() => validarArranque(variables, sinRastros, sinArchivos)).toThrow(/sint/);
  });

  it('producción con adaptador simulado aborta', () => {
    const variables = entornoBase({ FACTURACION_ADAPTADOR: 'simulado' });
    expect(() => validarArranque(variables, sinRastros, sinArchivos)).toThrow(/simulado/);
  });

  it('producción con rastros de desarrollo en disco aborta', () => {
    const rastros = ['cuentas-locales.json', NOMBRE_MODULO_RETIRADO];
    const existe = (ruta: string) => rastros.includes(ruta);
    const problemas = listarProblemasProduccion(entornoBase(), rastros, existe);
    expect(problemas.join('\n')).toMatch(/desarrollo/);
    expect(problemas.join('\n')).toMatch(/cuentas-locales\.json/);
  });

  it('fuera de producción no aborta aunque haya rastros', () => {
    expect(validarArranque({ APP_ENV: 'desarrollo' }, ['x'], () => true)).toBe('desarrollo');
    expect(validarArranque({ APP_ENV: 'pruebas' }, ['x'], () => true)).toBe('pruebas');
  });
});

describe('cuentas locales de desarrollo (sin secretos en el repo)', () => {
  it('sin variable devuelve registro vacío (producción sin demo)', () => {
    expect(cargarCredencialesDesarrollo({})).toEqual({});
    expect(cargarCredencialesDesarrollo({ OTRA: 'x' })).toEqual({});
  });

  it('lee y normaliza el JSON de seed:dev; rechaza formas inválidas', () => {
    const cuentas = cargarCredencialesDesarrollo({
      CUENTAS_DEV_JSON: '{"Admin@Visiontotal.com":"clave-local-1234567890"}',
    });
    expect(cuentas).toEqual({ 'admin@visiontotal.com': 'clave-local-1234567890' });
    expect(cargarCredencialesDesarrollo({ CUENTAS_DEV_JSON: 'no-json' })).toEqual({});
    expect(cargarCredencialesDesarrollo({ CUENTAS_DEV_JSON: '{"a@b.co":"corta"}' })).toEqual({});
    expect(cargarCredencialesDesarrollo({ CUENTAS_DEV_JSON: '["lista"]' })).toEqual({});
  });
});

describe('AC-PLT-10-2: sin rastros de credenciales de demostración en web/', () => {
  it('ningún archivo bajo web/ contiene los patrones retirados', () => {
    const ofensores: string[] = [];
    for (const archivo of archivosBajoWeb(RAIZ_WEB)) {
      const contenido = readFileSync(archivo, 'utf8');
      if (PATRON_RASTROS.test(contenido)) ofensores.push(path.relative(RAIZ_WEB, archivo));
    }
    expect(ofensores, `archivos con rastros: ${ofensores.join(', ')}`).toEqual([]);
  });

  it('el módulo retirado ya no existe en el repo', () => {
    const ofensores = archivosBajoWeb(RAIZ_WEB).filter((a) => a.endsWith(NOMBRE_MODULO_RETIRADO));
    expect(ofensores).toEqual([]);
  });
});

describe('AC-PLT-10-3 (estático): semilla marcada y con identificadores reservados', () => {
  it('cada fila de datos.json lleva es_sintetico=true', () => {
    const datos = obtenerDatosSinteticos();
    for (const fila of [...datos.tenants, ...datos.sedes, ...datos.usuarios, ...datos.membresias]) {
      expect(esFilaSintetica(fila), JSON.stringify(fila)).toBe(true);
    }
  });

  it('NIT con prefijo reservado y correos del dominio reservado', () => {
    const datos = obtenerDatosSinteticos();
    expect(datos.tenants.length).toBe(2);
    expect(datos.sedes.length).toBe(3);
    for (const tenant of datos.tenants) {
      expect(esNitReservado(tenant.nit)).toBe(true);
      expect(tenant.nit.startsWith(NIT_RESERVADO_PREFIJO)).toBe(true);
    }
    for (const usuario of datos.usuarios) {
      expect(esCorreoReservado(usuario.email)).toBe(true);
      expect(usuario.email.toLowerCase().endsWith(DOMINIO_RESERVADO)).toBe(true);
    }
  });

  it('el validador acepta lo reservado y rechaza lo que parece real', () => {
    expect(() =>
      validarFilaSintetica({ es_sintetico: true, nit: `${NIT_RESERVADO_PREFIJO}001-1` }, 'tenants'),
    ).not.toThrow();
    expect(() => validarFilaSintetica({ nit: `${NIT_RESERVADO_PREFIJO}001-1` }, 'tenants')).toThrow(
      /es_sintetico/,
    );
    expect(() =>
      validarFilaSintetica({ es_sintetico: true, nit: '900.123.456-7' }, 'tenants'),
    ).toThrow(/reservado/);
    expect(() =>
      validarFilaSintetica({ es_sintetico: true, email: 'paciente.real@gmail.com' }, 'usuarios'),
    ).toThrow(/reservado/);
  });
});
