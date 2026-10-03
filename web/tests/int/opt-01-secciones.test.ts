// OPT-01 (T20) — Límites configurables, autoguardado, firma y RLS.
// Solo datos sintéticos. PostgreSQL real.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  actualizarAtencion,
  crearAtencion,
  firmarAtencion,
  type ContextoAtencion,
} from '../../db/atenciones';
import { guardarPerfilProfesional } from '../../db/firma';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { guardarLimitesCaptura, leerLimitesCaptura } from '../../db/limites-captura';
import { LIMITES_CAPTURA_PROPUESTOS } from '../../dominio/valores-opticos';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HASH = 'ab'.repeat(32);

const TENANT = 'a2000000-0000-4000-8000-000000000020';
const OTRO = 'a2000000-0000-4000-8000-000000000099';
const SEDE = 'a2000000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a2000000-0000-4000-8000-0000000000b1';
const OPTO = 'a2000000-0000-4000-8000-0000000000c1';
const ADMIN = 'a2000000-0000-4000-8000-0000000000c2';
const OPTO_OTRO = 'a2000000-0000-4000-8000-0000000000c3';
const SESION = 'a2000000-0000-4000-8000-0000000000d1';
const ADULTO = 'a2000000-0000-4000-8000-0000000000e1';
const TEXTO = 'a2000000-0000-4000-8000-0000000000f1';

function ctx(rol: string, usuario: string, sede = SEDE, tenant = TENANT): ContextoAtencion {
  return {
    tenant_id: tenant,
    usuario_id: usuario,
    sede_id: sede,
    sedes: [sede],
    rol,
    sesion_id: usuario === OPTO ? SESION : null,
    tarjeta_profesional_vigente: true,
  };
}

function entrada(eje = 180) {
  return {
    paciente_id: ADULTO,
    tipo: 'primera_vez' as const,
    motivo: 'Control sintético sin datos reales',
    antecedentes: { texto: 'Sin antecedentes sintéticos' },
    queratometria: { texto: 'K sintético' },
    salud_ocular: { texto: 'Sin hallazgo sintético' },
    examen: { eje_od: eje, dip: 62 },
    diagnostico: { codigo_cie10: 'H52.1' },
    plan: { conducta: 'Control en doce meses' },
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T20', '900.000.120-1', 'activo'),
        ($2, 'Óptica Sintética T20 B', '900.000.120-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T20', 'Bogotá'),
        ($2, $4, 'Sede T20 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, 'opto.t20@example.invalid', 'activo'),
        ($2, $4, 'admin.t20@example.invalid', 'activo'),
        ($3, $5, 'opto.t20b@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, ADMIN, OPTO_OTRO, TENANT, OTRO],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.20')
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en`,
      [SESION, TENANT, OPTO, '2026-10-03T18:00:00.000Z', AHORA.toISOString()],
    );
    await cliente.query(
      `insert into catalogo_cie10 (codigo, descripcion, version, vigente_desde)
       values ('H52.1', 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10', 'sintetica-prueba-2026', '2026-01-01')
       on conflict (codigo, version) do nothing`,
    );
    await cliente.query(
      `insert into pacientes (
         id, tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, $2, 2001, 'CC', 'sobre-sintetico-t20', $3, 'Ana', 'Sintética', '1990-04-04',
         'F', 'No aplica', 'No aplica', 'Calle 1', '3000000020', 'No aplica', 'No aplica', 'No aplica',
         'particular', $4
       ) on conflict (id) do nothing`,
      [ADULTO, TENANT, HASH, SEDE],
    );
    await cliente.query(
      `insert into textos_legales (
         id, tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde
       ) values (
         $1, $2, 'autorizacion_tratamiento', 'tratamiento_clinico', 'Tratamiento', false, 1,
         'BORRADOR – requiere revisión jurídica', $3, $4
       ) on conflict (id) do nothing`,
      [TEXTO, TENANT, HASH, AHORA.toISOString()],
    );
    await cliente.query(
      `insert into autorizaciones (
         tenant_id, paciente_id, texto_id, finalidad, otorgada, estado, medio, evidencia,
         contenido_exacto, hash_texto, registrada_en
       )
       select $1, $2, $3, 'tratamiento_clinico', true, 'otorgada', 'presencial', '{}'::jsonb,
              'BORRADOR – requiere revisión jurídica', $4, $5
        where not exists (
          select 1 from autorizaciones where paciente_id = $2 and finalidad = 'tratamiento_clinico'
        )`,
      [TENANT, ADULTO, TEXTO, HASH, AHORA.toISOString()],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function sqlApp(tenant: string, usuario: string, sede: string, sql: string, params: unknown[] = []) {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [tenant]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [usuario]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [sede]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [sede]);
    await cliente.query(`select set_config('app.rol', 'optometra', true)`);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const filas = await cliente.query(sql, params);
    await cliente.query('COMMIT');
    return filas.rows;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error de la sentencia.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

describe('secciones e historia OPT-01', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await guardarPerfilProfesional(
      {
        tenant_id: TENANT,
        usuario_id: ADMIN,
        sede_id: SEDE,
        sedes: [SEDE],
        rol: 'admin',
        sesion_id: null,
      },
      {
        usuarioId: OPTO,
        nombreCompleto: 'Optómetra Sintético T20',
        registroProfesional: 'RP-SINTETICO-20',
        vigenteHasta: '2026-12-31',
      },
      AHORA,
    );
  }, 30000);

  beforeEach(async () => {
    await obtenerPool().query(`delete from limites_captura where tenant_id = any($1::uuid[])`, [[TENANT, OTRO]]);
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-OPT-01-3: el eje 200 se rechaza hasta que la configuración lo permite', async () => {
    const propuesto = await leerLimitesCaptura(ctx('optometra', OPTO));
    expect(propuesto.origen).toBe('propuesto');
    expect(propuesto.limites.eje).toEqual(LIMITES_CAPTURA_PROPUESTOS.eje);
    await expect(crearAtencion(ctx('optometra', OPTO), entrada(200))).rejects.toMatchObject({
      status: 400,
    });
    await expect(guardarLimitesCaptura(ctx('optometra', OPTO), {
      ...LIMITES_CAPTURA_PROPUESTOS,
      eje: { min: 0, max: 200 },
    })).rejects.toMatchObject({ status: 403 });

    await guardarLimitesCaptura(ctx('admin', ADMIN), {
      ...LIMITES_CAPTURA_PROPUESTOS,
      eje: { min: 0, max: 200 },
    });
    const configurado = await leerLimitesCaptura(ctx('optometra', OPTO));
    expect(configurado.origen).toBe('configurado');
    expect(configurado.limites.eje.max).toBe(200);
    const creada = await crearAtencion(ctx('optometra', OPTO), entrada(200));
    expect(creada.examen.eje_od).toBe(200);

    await guardarLimitesCaptura(ctx('admin', ADMIN), LIMITES_CAPTURA_PROPUESTOS);
    await expect(
      actualizarAtencion(ctx('optometra', OPTO), creada.id, { examen: { eje_od: 200 } }),
    ).rejects.toThrow(/límite de captura/);
  });

  it('AC-OPT-01-1 e inmutabilidad: autoguarda, firma y queda de solo lectura', async () => {
    const creada = await crearAtencion(ctx('optometra', OPTO), entrada(90));
    expect(creada.estado).toBe('borrador');
    expect(creada.folio).toBeNull();
    expect(creada.antecedentes).toMatch(/Sin antecedentes/);
    const guardada = await actualizarAtencion(ctx('optometra', OPTO), creada.id, {
      motivo: 'Control sintético autoguardado',
      antecedentes: { texto: 'Antecedente autoguardado' },
      examen: { eje_od: 180, dip: 62 },
    });
    expect(guardada.motivo).toMatch(/autoguardado/);
    expect(guardada.antecedentes).toMatch(/autoguardado/);
    expect(guardada.version_borrador).toBeGreaterThan(creada.version_borrador);
    expect(guardada.examen.eje_od).toBe(180);

    const firmada = await firmarAtencion(ctx('optometra', OPTO), creada.id, AHORA);
    expect(firmada.estado).toBe('firmado');
    expect(firmada.folio).toBeGreaterThan(0);
    expect(firmada.firmado_en).toBeTruthy();
    expect(firmada.hora_bogota).toBeTruthy();
    expect(firmada.sello).toMatch(/Optómetra Sintético T20/);
    expect(firmada.sello).toMatch(/RP-SINTETICO-20/);
    await expect(
      actualizarAtencion(ctx('optometra', OPTO), creada.id, { motivo: 'Después de firmar' }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      sqlApp(TENANT, OPTO, SEDE, `update atenciones set contenido = 'alterado' where id = $1`, [creada.id]),
    ).rejects.toThrow(/inmutable/);
  });

  it('R: otro tenant no ve los límites configurados', async () => {
    await guardarLimitesCaptura(ctx('admin', ADMIN), {
      ...LIMITES_CAPTURA_PROPUESTOS,
      eje: { min: 0, max: 90 },
    });
    const ajenas = await sqlApp(
      OTRO,
      OPTO_OTRO,
      SEDE_OTRA,
      `select tenant_id from limites_captura`,
    );
    expect(ajenas).toEqual([]);
    const propias = await sqlApp(TENANT, OPTO, SEDE, `select eje_max from limites_captura`);
    expect(propias).toEqual([expect.objectContaining({ eje_max: 90 })]);
    const rls = await obtenerPool().query<{ forzado: boolean; politicas: string }>(
      `select c.relforcerowsecurity as forzado, count(p.polname)::text as politicas
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         left join pg_policy p on p.polrelid = c.oid
        where n.nspname = 'public' and c.relname = 'limites_captura'
        group by c.relforcerowsecurity`,
    );
    expect(rls.rows[0]?.forzado).toBe(true);
    expect(Number(rls.rows[0]?.politicas)).toBeGreaterThan(0);
  });
});
