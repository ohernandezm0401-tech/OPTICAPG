// ADM-01 (T16) — Sedes, certificado y tope del director contra PostgreSQL real.
// AC-ADM-01-1, 01-2, 01-3 y 01-4 (I, R). Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { ErrorSede, guardarSede, listarSedesHabilitacion, type ContextoSede } from '../../db/sedes-habilitacion';
import { fechaDentroDe } from '../../dominio/sedes';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-06-15T15:00:00.000Z');

const TENANT = 'e1611111-1111-4111-8111-111111111111';
const OTRO = 'e1622222-2222-4222-8222-222222222222';
const ANCLA = 'e1633333-3333-4333-8333-333333333333';
const ANCLA_B = 'e1644444-4444-4444-8444-444444444444';
const ADMIN = 'e1655555-5555-4555-8555-555555555555';
const ASESOR = 'e1666666-6666-4666-8666-666666666666';
const AUDITOR = 'e1677777-7777-4777-8777-777777777777';
const DIRECTOR = 'e1688888-8888-4888-8888-888888888888';
const DIRECTOR_TOPE = 'e16a1111-1111-4111-8111-111111111111';
const TECNO = 'e1699999-9999-4999-8999-999999999999';

function ctx(parcial: Partial<ContextoSede> & Pick<ContextoSede, 'rol' | 'usuario_id'>): ContextoSede {
  return {
    tenant_id: TENANT,
    sede_id: ANCLA,
    sedes: [ANCLA],
    ...parcial,
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T16', '900.000.116-1', 'activo'),
        ($2, 'Óptica Sintética T16 B', '900.000.116-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Ancla T16', 'Bogotá'),
        ($2, $4, 'Ancla T16 B', 'Medellín')
       on conflict (id) do nothing`,
      [ANCLA, ANCLA_B, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $5, 'admin.t16@example.invalid', 'activo'),
        ($2, $5, 'asesor.t16@example.invalid', 'activo'),
        ($3, $5, 'auditor.t16@example.invalid', 'activo'),
        ($4, $5, 'director.t16@example.invalid', 'activo'),
        ($6, $5, 'director.tope.t16@example.invalid', 'activo'),
        ($7, $5, 'tecno.t16@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ADMIN, ASESOR, AUDITOR, DIRECTOR, TENANT, DIRECTOR_TOPE, TECNO],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

describe('sedes ADM-01 en PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-ADM-01-1: óptica sin consultorio sin certificado ni director queda incompleta', async () => {
    const sede = await guardarSede(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      {
        nombre: 'Sede incompleta sintética',
        ciudad: 'Bogotá',
        tipo_establecimiento: 'optica_sin_consultorio',
      },
      AHORA,
    );
    expect(sede.completitud).toBe('incompleta');
    expect(sede.faltantes).toEqual(
      expect.arrayContaining(['certificado de dispensación', 'director científico', 'responsable de tecnovigilancia']),
    );
    expect(sede.tipo_establecimiento).toBe('optica_sin_consultorio');
  });

  it('AC-ADM-01-2: 29 días avisa a 30 y vencido es alerta roja sin bloquear', async () => {
    const base = {
      nombre: 'Sede certificado sintético',
      ciudad: 'Bogotá',
      tipo_establecimiento: 'optica_sin_consultorio' as const,
      director_cientifico_id: DIRECTOR,
      responsable_tecnovigilancia_id: TECNO,
      certificado_numero: 'DISP-SINT-29',
    };
    const porVencer = await guardarSede(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      { ...base, nombre: 'Sede por vencer sintética', certificado_vence: fechaDentroDe(AHORA, 29) },
      AHORA,
    );
    expect(porVencer.alerta?.umbral).toBe(30);
    expect(porVencer.alerta?.estado).toBe('por_vencer');
    expect(porVencer.completitud).toBe('completa');

    const vencida = await guardarSede(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      { ...base, nombre: 'Sede vencida sintética', certificado_numero: 'DISP-SINT-VEN', certificado_vence: fechaDentroDe(AHORA, -1) },
      AHORA,
    );
    expect(vencida.alerta?.roja).toBe(true);
    expect(vencida.alerta?.estado).toBe('vencido');
    expect(vencida.bloquea_atencion_clinica).toBe(false);

    const fila = await obtenerPool().query<{ certificado_numero: string; vence: string }>(
      `select certificado_numero, to_char(certificado_vence, 'YYYY-MM-DD') as vence from sedes where id = $1`,
      [vencida.id],
    );
    expect(fila.rows[0]?.certificado_numero).toBe('DISP-SINT-VEN');
    expect(fila.rows[0]?.vence).toBe(fechaDentroDe(AHORA, -1));
  });

  it('AC-ADM-01-3: el cuarto establecimiento bloquea y el override de admin queda auditado', async () => {
    const admin = ctx({ rol: 'admin', usuario_id: ADMIN });
    for (let i = 1; i <= 3; i += 1) {
      await guardarSede(
        admin,
        {
          nombre: `Establecimiento director ${i}`,
          ciudad: 'Bogotá',
          tipo_establecimiento: 'optica_con_consultorio',
          director_cientifico_id: DIRECTOR_TOPE,
          reps_codigo: `REPS-SINT-${i}`,
          responsable_tecnovigilancia_id: TECNO,
        },
        AHORA,
      );
    }
    await expect(
      guardarSede(
        admin,
        {
          nombre: 'Establecimiento director 4',
          ciudad: 'Bogotá',
          tipo_establecimiento: 'optica_con_consultorio',
          director_cientifico_id: DIRECTOR_TOPE,
          reps_codigo: 'REPS-SINT-4',
          responsable_tecnovigilancia_id: TECNO,
        },
        AHORA,
      ),
    ).rejects.toMatchObject({ codigo: 'director_limite' });

    await expect(
      guardarSede(
        ctx({ rol: 'asesor', usuario_id: ASESOR }),
        {
          nombre: 'Establecimiento director 4 asesor',
          ciudad: 'Bogotá',
          tipo_establecimiento: 'optica_con_consultorio',
          director_cientifico_id: DIRECTOR_TOPE,
          override_director: true,
        },
        AHORA,
      ),
    ).rejects.toMatchObject({ codigo: 'permiso' });

    const creada = await guardarSede(
      admin,
      {
        nombre: 'Establecimiento director 4',
        ciudad: 'Bogotá',
        tipo_establecimiento: 'optica_con_consultorio',
        director_cientifico_id: DIRECTOR_TOPE,
        reps_codigo: 'REPS-SINT-4',
        responsable_tecnovigilancia_id: TECNO,
        override_director: true,
      },
      AHORA,
    );
    const auditoria = await obtenerPool().query<{ accion: string; rol: string }>(
      `select accion, rol from auditoria
        where tenant_id = $1 and recurso = 'R18' and recurso_id = $2 and accion = 'configuracion'`,
      [TENANT, creada.id],
    );
    expect(auditoria.rows).toEqual([expect.objectContaining({ accion: 'configuracion', rol: 'admin' })]);
  });

  it('AC-ADM-01-4: laboratorio oftálmico no ofrece POS', async () => {
    const sede = await guardarSede(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      { nombre: 'Laboratorio sintético', ciudad: 'Cali', tipo_establecimiento: 'laboratorio_oftalmico' },
      AHORA,
    );
    expect(sede.ofrece_pos_publico).toBe(false);
    expect(sede.modulos_habilitados).not.toContain('pos_publico');
    expect(sede.modulos_bloqueados).toContain('pos_publico');
    expect(sede.faltantes).toContain('certificado de producción');
  });

  it('R: otro tenant y otra sede no leen ni escriben; el asesor no crea', async () => {
    const propia = await guardarSede(
      ctx({ rol: 'admin', usuario_id: ADMIN }),
      { nombre: 'Sede visible T16', ciudad: 'Bogotá', tipo_establecimiento: 'taller_optico' },
      AHORA,
    );
    const ajenas = await listarSedesHabilitacion(
      ctx({ rol: 'admin', usuario_id: ADMIN, tenant_id: OTRO, sede_id: ANCLA_B, sedes: [ANCLA_B] }),
      AHORA,
    );
    expect(ajenas.map((sede) => sede.id)).not.toContain(propia.id);

    await expect(
      guardarSede(
        ctx({ rol: 'admin', usuario_id: ADMIN, sedes: [ANCLA], sede_id: ANCLA }),
        {
          id: ANCLA_B,
          nombre: 'Intento cruzado',
          ciudad: 'Medellín',
          tipo_establecimiento: 'optica_sin_consultorio',
        },
        AHORA,
      ),
    ).rejects.toBeInstanceOf(ErrorSede);

    await expect(
      guardarSede(
        ctx({ rol: 'asesor', usuario_id: ASESOR }),
        { nombre: 'Sede del asesor', ciudad: 'Bogotá', tipo_establecimiento: 'optica_sin_consultorio' },
        AHORA,
      ),
    ).rejects.toMatchObject({ codigo: 'permiso' });

    const lecturas = await listarSedesHabilitacion(ctx({ rol: 'auditor', usuario_id: AUDITOR }), AHORA);
    expect(lecturas.map((sede) => sede.id)).toContain(ANCLA);

    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
      await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ADMIN]);
      await cliente.query(`select set_config('app.sede_id', $1, true)`, [ANCLA]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [ANCLA]);
      await cliente.query(`select set_config('app.rol', 'admin', true)`);
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const certificados = await cliente.query(`select id from certificados_sede where sede_id = $1`, [ANCLA_B]);
      const sedesB = await cliente.query(`select id from sedes where id = $1`, [ANCLA_B]);
      expect(certificados.rows).toEqual([]);
      expect(sedesB.rows).toEqual([]);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }

    const estado = await obtenerPool().query<{ rls: boolean; forzado: boolean }>(
      `select c.relrowsecurity as rls, c.relforcerowsecurity as forzado
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'certificados_sede'`,
    );
    expect(estado.rows[0]).toEqual({ rls: true, forzado: true });
  });
});
