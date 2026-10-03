// SEG-11 (T29) — Incidentes contra PostgreSQL real.
// AC-SEG-11-1 y AC-SEG-11-2. I. Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearIncidente, marcarTenantsAfectados, type ContextoIncidente } from '../../db/incidentes';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { sumarDiasHabiles } from '../../dominio/calendario-habil';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');

const PLATAFORMA = 'a2900000-0000-4000-8000-000000000001';
const OPTICA = 'a2900000-0000-4000-8000-000000000002';
const AJENA = 'a2900000-0000-4000-8000-000000000003';
const SEDE = 'a2900000-0000-4000-8000-0000000000a1';
const SEDE_AJENA = 'a2900000-0000-4000-8000-0000000000a2';
const OPERADOR = 'a2900000-0000-4000-8000-0000000000b1';
const ADMIN = 'a2900000-0000-4000-8000-0000000000b2';
const ADMIN_AJENO = 'a2900000-0000-4000-8000-0000000000b3';

const ctx: ContextoIncidente = {
  tenant_id: PLATAFORMA,
  usuario_id: OPERADOR,
  rol: 'owner_plataforma',
  ip: '192.0.2.29',
  agente: 'vitest',
};

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Plataforma Sintética T29', '900.000.291-1', 'activo'),
        ($2, 'Óptica Sintética T29', '900.000.291-2', 'activo'),
        ($3, 'Óptica Ajena T29', '900.000.291-3', 'activo')
       on conflict (id) do nothing`,
      [PLATAFORMA, OPTICA, AJENA],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T29', 'Bogotá'),
        ($2, $4, 'Sede T29 ajena', 'Cali')
       on conflict (id) do nothing`,
      [SEDE, SEDE_AJENA, OPTICA, AJENA],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, 'operador.t29@example.invalid', 'activo'),
        ($2, $5, 'admin.t29@example.invalid', 'activo'),
        ($3, $6, 'admin.ajeno.t29@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPERADOR, ADMIN, ADMIN_AJENO, PLATAFORMA, OPTICA, AJENA],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values
        ($1, $2, $3, 'admin'),
        ($4, $5, $6, 'admin')
       on conflict do nothing`,
      [OPTICA, ADMIN, SEDE, AJENA, ADMIN_AJENO, SEDE_AJENA],
    );
    await cliente.query(
      `insert into operadores_plataforma (usuario_id, rol) values ($1, 'owner_plataforma')
       on conflict (usuario_id) do nothing`,
      [OPERADOR],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

describe('SEG-11 contra PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-SEG-11-1 y AC-SEG-11-2: plazo, alertas, aviso al admin y bitácora', async () => {
    const creado = await crearIncidente(ctx, {
      detectado_en: new Date('2026-10-02T15:00:00.000Z'),
      descripcion: 'credenciales de acceso de la plataforma',
      alcance: 'una optica de prueba',
      datos_afectados: 'metadatos de cuenta',
      severidad: 'operativa',
      festivos: ['2026-10-12'],
    });
    expect(creado.plazo_sic).toBe(sumarDiasHabiles('2026-10-02', 15, new Set(['2026-10-12'])));
    expect(creado.alertas.map((alerta) => alerta.codigo).sort()).toEqual(['T-0', 'T-2', 'T-5']);
    expect(creado.festivos_cargados).toBe(true);

    const aviso = await marcarTenantsAfectados(ctx, creado.id, [OPTICA]);
    expect(aviso.notificados).toEqual([OPTICA]);
    const otra = await marcarTenantsAfectados(ctx, creado.id, [OPTICA]);
    expect(otra.notificados).toEqual([]);

    const cliente = await obtenerPool().connect();
    try {
      const notas = await cliente.query(
        `select usuario_id from notificaciones_internas where incidente_id = $1 and tenant_id = $2`,
        [creado.id, OPTICA],
      );
      expect(notas.rows).toHaveLength(1);
      expect(notas.rows[0].usuario_id).toBe(ADMIN);

      const bitacora = await cliente.query(
        `select accion, resultado, recurso from auditoria
          where tenant_id = $1 and recurso = 'incidente' and recurso_id = $2`,
        [OPTICA, creado.id],
      );
      expect(bitacora.rows).toEqual([{ accion: 'crear', resultado: 'ok', recurso: 'incidente' }]);

      await cliente.query('BEGIN');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [AJENA]);
      await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ADMIN_AJENO]);
      await cliente.query(`select set_config('app.rol', 'admin', true)`);
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const ajenas = await cliente.query(`select id from incidentes_tenants`);
      expect(ajenas.rows).toHaveLength(0);
      await expect(cliente.query(`select id from incidentes`)).rejects.toThrow(/permission denied|permiso denegado/i);
      await cliente.query('ROLLBACK');

      const roles = await cliente.query(
        `select rolname, rolbypassrls from pg_roles where rolname in ('optisaas_app', 'optisaas_incidente')`,
      );
      for (const rol of roles.rows) expect(rol.rolbypassrls).toBe(false);
    } finally {
      cliente.release();
    }
  });
});
