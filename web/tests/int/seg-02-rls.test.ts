// SEG-02 (T09) — R en PostgreSQL real para el recurso que ya tiene tabla (R18).
// Los recursos clínicos aún no tienen tabla: esos casos quedan en la capa de
// aplicación (`tests/unit/seg-02-matriz.test.ts`). Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PoolClient } from 'pg';

import { obtenerDb, obtenerPool, cerrarPool } from '../../db/index';
import { casosGenerados, type Accion, type CasoMatriz } from '../../lib/authz/matrix';
import { IDS_FIXTURE } from '../../lib/authz/sujetos';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

const VERBO: Partial<Record<Accion, 'select' | 'insert' | 'update' | 'delete'>> = {
  leer: 'select',
  crear: 'insert',
  actualizar: 'update',
  anular: 'delete',
};

const SEDE: Record<CasoMatriz['escenario'], string> = {
  propia: IDS_FIXTURE.sedeActiva,
  otra_autorizada: IDS_FIXTURE.sedeAutorizada,
  ajena: IDS_FIXTURE.sedeAjena,
  otro_tenant: IDS_FIXTURE.sedeActiva,
};

const FILA: Record<CasoMatriz['escenario'], string> = {
  propia: 'a1818181-8181-4181-8181-818181818181',
  otra_autorizada: 'a2828282-8282-4282-8282-828282828282',
  ajena: 'a3838383-8383-4383-8383-838383838383',
  otro_tenant: 'a4848484-8484-4484-8484-848484848484',
};

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T09', '900.000.109-1', 'activo'),
        ($2, 'Óptica Sintética T09 B', '900.000.109-2', 'activo')
       on conflict (id) do nothing`,
      [IDS_FIXTURE.tenant, IDS_FIXTURE.otroTenant],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $4, 'Sede activa sintética', 'Bogotá'),
        ($2, $4, 'Sede autorizada sintética', 'Bogotá'),
        ($3, $4, 'Sede ajena sintética', 'Medellín')
       on conflict (id) do nothing`,
      [IDS_FIXTURE.sedeActiva, IDS_FIXTURE.sedeAutorizada, IDS_FIXTURE.sedeAjena, IDS_FIXTURE.tenant],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $3, 't09.actor@example.invalid', 'activo'),
        ($2, $4, 't09.otro@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [IDS_FIXTURE.actor, IDS_FIXTURE.otroAutor, IDS_FIXTURE.tenant, IDS_FIXTURE.otroTenant],
    );
    const filas = [
      [FILA.propia, IDS_FIXTURE.tenant, IDS_FIXTURE.actor, IDS_FIXTURE.sedeActiva],
      [FILA.otra_autorizada, IDS_FIXTURE.tenant, IDS_FIXTURE.actor, IDS_FIXTURE.sedeAutorizada],
      [FILA.ajena, IDS_FIXTURE.tenant, IDS_FIXTURE.actor, IDS_FIXTURE.sedeAjena],
      [FILA.otro_tenant, IDS_FIXTURE.otroTenant, IDS_FIXTURE.otroAutor, IDS_FIXTURE.sedeActiva],
    ];
    for (const [id, tenant, usuario, sede] of filas) {
      await cliente.query(
        `insert into permisos_extra (id, tenant_id, usuario_id, sede_id, recurso, accion)
         values ($1, $2, $3, $4, 'R18', 'leer')
         on conflict (id) do nothing`,
        [id, tenant, usuario, sede],
      );
    }
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function comoApp(rol: string, fn: (cliente: PoolClient) => Promise<boolean>): Promise<boolean> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('SET LOCAL ROLE optisaas_app');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [IDS_FIXTURE.tenant]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [IDS_FIXTURE.actor]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [IDS_FIXTURE.sedeActiva]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [
      `${IDS_FIXTURE.sedeActiva},${IDS_FIXTURE.sedeAutorizada}`,
    ]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [rol]);
    await cliente.query(`select set_config('app.role', $1, true)`, [rol]);
    const resultado = await fn(cliente);
    await cliente.query('ROLLBACK');
    return resultado;
  } catch {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se informa el fallo de la política como denegación.
    }
    return false;
  } finally {
    cliente.release();
  }
}

async function efecto(caso: CasoMatriz): Promise<boolean> {
  const verbo = VERBO[caso.accion];
  if (!verbo) return false;
  const sede = SEDE[caso.escenario];
  const tenantFila = caso.escenario === 'otro_tenant' ? IDS_FIXTURE.otroTenant : IDS_FIXTURE.tenant;
  return comoApp(caso.rol, async (cliente) => {
    if (verbo === 'select') {
      const consulta = await cliente.query(`select id from permisos_extra where id = $1`, [FILA[caso.escenario]]);
      return consulta.rows.length === 1;
    }
    if (verbo === 'insert') {
      const alta = await cliente.query(
        `insert into permisos_extra (tenant_id, usuario_id, sede_id, recurso, accion)
         values ($1, $2, $3, 'R2', 'solicitar')`,
        [tenantFila, IDS_FIXTURE.actor, sede],
      );
      return (alta.rowCount ?? 0) === 1;
    }
    if (verbo === 'update') {
      const cambio = await cliente.query(`update permisos_extra set actualizado_en = now() where id = $1`, [
        FILA[caso.escenario],
      ]);
      return (cambio.rowCount ?? 0) === 1;
    }
    const borrado = await cliente.query(`delete from permisos_extra where id = $1`, [FILA[caso.escenario]]);
    return (borrado.rowCount ?? 0) === 1;
  });
}

describe('R: matriz × permisos_extra (RLS)', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
  }, 30000);

  afterAll(async () => {
    await cerrarPool();
  });

  const casos = casosGenerados().filter((caso) => caso.tabla === 'permisos_extra');

  it('hay un caso de BD por cada acción y escenario de R18', () => {
    expect(casos.length).toBeGreaterThan(0);
    const celdas = new Set(casos.map((caso) => `${caso.rol}|${caso.recurso}`));
    expect(celdas.size).toBe(9);
  });

  it('cada caso de R18 coincide con la política RLS', async () => {
    const fallos: string[] = [];
    for (const caso of casos) {
      const obtuvo = await efecto(caso);
      if (obtuvo !== caso.esperado) fallos.push(`${caso.id} bd ${obtuvo} esperado ${caso.esperado}`);
    }
    expect(fallos).toEqual([]);
  }, 120000);
});
