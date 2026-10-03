// PLT-11 (T06) — Integración contra PostgreSQL real (I). Sin mocks de BD.
// Festivos y puntos básicos de este archivo son datos de prueba, no un
// calendario oficial ni una tarifa legal.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PoolClient } from 'pg';

import { crearTenant, cerrarPool } from '../../db/nucleo';
import { obtenerDb, obtenerPool } from '../../db/index';
import {
  actualizarParametro,
  cambiarTarifaImpuesto,
  cargarFestivosDesdeCsv,
  cerrarLineaConImpuesto,
  crearTarifaImpuesto,
  listarBitacoraParametros,
  listarFestivos,
  listarParametrosVigentes,
  obtenerInstantaneaLinea,
  programarMensajeComercial,
  sembrarParametrosIniciales,
  sumarDiasHabiles,
} from '../../db/parametros';
import { ROTULO_PROVISIONAL, ROTULO_RETENCION_HISTORIAS } from '../../dominio/parametros-iniciales';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

const nitUnico = () => `901.${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 10)}`;

const CSV_PRUEBA = [
  'anio,fecha,nombre,fuente',
  '2026,2026-10-05,Festivo sintético de prueba,CSV de prueba — no es calendario oficial',
  '2026,2026-10-12,Segundo festivo sintético,CSV de prueba — no es calendario oficial',
].join('\n');

async function comoApp<T>(tenantId: string | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('SET ROLE optisaas_app');
    await cliente.query('BEGIN');
    try {
      if (tenantId) {
        await cliente.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
      }
      const resultado = await fn(cliente);
      await cliente.query('ROLLBACK');
      return resultado;
    } catch (error) {
      try {
        await cliente.query('ROLLBACK');
      } catch {
        // Se informa el error original.
      }
      throw error;
    }
  } finally {
    try {
      await cliente.query('RESET ROLE');
    } catch {
      // La conexión se libera igual.
    }
    cliente.release();
  }
}

describe('PLT-11 en PostgreSQL real', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error(
        'Falta DATABASE_URL_TEST. Local: `docker compose -f ../docker-compose.test.yml up -d` y ' +
          'exporta DATABASE_URL_TEST (ver web/.env.example). En CI la define el servicio postgres.',
      );
    }
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('siembra retención verificada, plazos provisionales sin cantidad y bitácora', async () => {
    const tenant = await crearTenant({ razon_social: 'Óptica Parámetros Sintética S.A.S.', nit: nitUnico() });
    const vigentes = await sembrarParametrosIniciales(tenant.id);
    expect(vigentes).toHaveLength(6);

    const retencion = vigentes.find((fila) => fila.clave === 'retencion_historias_anios');
    expect(retencion?.valor).toBe(15);
    expect(retencion?.rotulo).toBe(ROTULO_RETENCION_HISTORIAS);

    for (const clave of ['plazo_conservacion_logs', 'plazo_conservacion_facturas', 'plazo_aviso_incidente']) {
      const plazo = vigentes.find((fila) => fila.clave === clave);
      expect(plazo?.valor).toBeNull();
      expect(plazo?.rotulo).toBe(ROTULO_PROVISIONAL);
    }

    const otraVez = await sembrarParametrosIniciales(tenant.id);
    expect(otraVez).toHaveLength(6);

    const actualizado = await actualizarParametro({
      tenant_id: tenant.id,
      clave: 'plazo_conservacion_facturas',
      valor: 5,
    });
    expect(actualizado?.valor).toBe(5);
    expect(actualizado?.rotulo).toBe(ROTULO_PROVISIONAL);

    const abiertos = await listarParametrosVigentes(tenant.id);
    expect(abiertos.filter((fila) => fila.clave === 'plazo_conservacion_facturas')).toHaveLength(1);
    const bitacora = await listarBitacoraParametros(tenant.id);
    expect(bitacora.some((fila) => fila.clave === 'plazo_conservacion_facturas' && fila.valor_nuevo === 5)).toBe(
      true,
    );
  });

  it('AC-PLT-11-2: carga CSV y rechaza domingo o festivo al programar', async () => {
    const tenant = await crearTenant({ razon_social: 'Óptica Calendario Sintética S.A.S.', nit: nitUnico() });
    const cargados = await cargarFestivosDesdeCsv(tenant.id, CSV_PRUEBA);
    expect(cargados.map((fila) => fila.fecha).sort()).toEqual(['2026-10-05', '2026-10-12']);

    expect(await sumarDiasHabiles('2026-10-02', 1, tenant.id)).toBe('2026-10-06');
    expect(await programarMensajeComercial('2026-10-04', tenant.id)).toEqual({
      aceptada: false,
      motivo: 'domingo',
    });
    expect(await programarMensajeComercial('2026-10-12', tenant.id)).toEqual({
      aceptada: false,
      motivo: 'festivo',
    });
    expect(await programarMensajeComercial('2026-10-06', tenant.id)).toEqual({ aceptada: true });

    await cargarFestivosDesdeCsv(tenant.id, 'anio,fecha,nombre,fuente\n');
    expect(await listarFestivos(tenant.id)).toHaveLength(2);
  });

  it('AC-PLT-11-1: cambiar la tarifa no altera el snapshot de la línea cerrada', async () => {
    const tenant = await crearTenant({ razon_social: 'Óptica Tarifas Sintética S.A.S.', nit: nitUnico() });
    const tarifa = await crearTarifaImpuesto({
      tenant_id: tenant.id,
      nombre: 'categoría sintética',
      porcentaje_bp: 1900,
      excluido: false,
      exento: false,
    });
    expect(tarifa?.porcentaje_bp).toBe(1900);

    const linea = await cerrarLineaConImpuesto(tenant.id, tarifa!.id);
    await cambiarTarifaImpuesto({
      tenant_id: tenant.id,
      tarifa_id: tarifa!.id,
      nombre: 'categoría sintética',
      porcentaje_bp: 500,
      excluido: false,
      exento: false,
    });

    const cerrada = await obtenerInstantaneaLinea(tenant.id, linea!.id);
    expect(cerrada?.impuesto_snapshot.porcentaje_bp).toBe(1900);
    expect(cerrada?.impuesto_snapshot.tarifa_impuesto_id).toBe(tarifa!.id);

    await expect(
      obtenerPool().query(
        `update instantaneas_impuesto_linea
            set impuesto_snapshot = '{"porcentaje_bp": 500}'::jsonb
          where id = $1`,
        [linea!.id],
      ),
    ).rejects.toThrow(/instantánea de impuesto/);
  });

  it('RLS: el rol de aplicación no ve festivos de otro tenant', async () => {
    const tenantA = await crearTenant({ razon_social: 'Óptica Festivos A S.A.S.', nit: nitUnico() });
    const tenantB = await crearTenant({ razon_social: 'Óptica Festivos B S.A.S.', nit: nitUnico() });
    await cargarFestivosDesdeCsv(tenantB.id, CSV_PRUEBA);

    const sinContexto = await comoApp(null, async (c) => {
      const resultado = await c.query('select id from festivos');
      return resultado.rows.length;
    });
    expect(sinContexto).toBe(0);

    const vistos = await comoApp(tenantA.id, async (c) => {
      const resultado = await c.query('select fecha from festivos');
      return resultado.rows;
    });
    expect(vistos).toEqual([]);

    const propios = await comoApp(tenantB.id, async (c) => {
      const resultado = await c.query('select fecha from festivos order by fecha');
      return resultado.rows.map((fila) => {
        const fecha = fila.fecha as Date | string;
        return fecha instanceof Date ? fecha.toISOString().slice(0, 10) : String(fecha).slice(0, 10);
      });
    });
    expect(propios).toEqual(['2026-10-05', '2026-10-12']);
  });
});
