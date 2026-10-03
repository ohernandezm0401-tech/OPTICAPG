// SEG-09 (T27) — Triggers y bloqueo contra PostgreSQL real.
// AC-SEG-09-1 (I), AC-SEG-09-3 (I). Solo datos sintéticos.
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { ContextoAtencion } from '../../db/atenciones';
import { radicarSolicitud } from '../../db/habeas-data';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { sembrarParametrosIniciales } from '../../db/parametros';
import {
  ErrorRetencion,
  consultarEstadoRetencion,
  intentarEliminarHistoriaClinica,
  listarPoliticaRetencion,
  marcarRetencion,
} from '../../db/retencion';
import { TABLAS_CLINICAS_SIN_BORRADO, sumarMeses } from '../../dominio/retencion';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const HASH_A = '27'.repeat(32);
const HASH_B = '28'.repeat(32);
const HOY = '2026-10-03';
const AHORA = new Date('2026-10-03T15:00:00.000Z');

const TENANT = 'a2700000-0000-4000-8000-000000000027';
const SEDE = 'a2700000-0000-4000-8000-0000000000a1';
const ADMIN = 'a2700000-0000-4000-8000-0000000000c1';
const DENTRO = 'a2700000-0000-4000-8000-0000000000e1';
const VENCIDO = 'a2700000-0000-4000-8000-0000000000e2';

function ctx(): ContextoAtencion {
  return {
    tenant_id: TENANT,
    usuario_id: ADMIN,
    sede_id: SEDE,
    sedes: [SEDE],
    rol: 'admin',
    sesion_id: null,
    tarjeta_profesional_vigente: false,
    ip: '192.0.2.27',
    agente: 'vitest',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado)
       values ($1, 'Óptica Sintética T27', '900.000.127-1', 'activo')
       on conflict (id) do nothing`,
      [TENANT],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad)
       values ($1, $2, 'Sede T27', 'Bogotá')
       on conflict (id) do nothing`,
      [SEDE, TENANT],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado)
       values ($1, $2, 'admin.t27@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ADMIN, TENANT],
    );
    const dentro = sumarMeses(HOY, -(14 * 12 + 11));
    await cliente.query(
      `insert into pacientes (
         id, tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id, fecha_ultima_atencion
       ) values
         ($1, $2, 2701, 'CC', 'sobre-sintetico-t27-a', $3, 'Ana', 'Sintética', '1980-01-01',
          'F', 'No aplica', 'No aplica', 'Calle 27', '3000000027', 'No aplica', 'No aplica', 'No aplica',
          'particular', $4, $5),
         ($6, $2, 2702, 'CC', 'sobre-sintetico-t27-b', $7, 'Luis', 'Sintético', '1981-01-01',
          'M', 'No aplica', 'No aplica', 'Calle 28', '3000000028', 'No aplica', 'No aplica', 'No aplica',
          'particular', $4, '2000-06-01')
       on conflict (id) do nothing`,
      [DENTRO, TENANT, HASH_A, SEDE, dentro, VENCIDO, HASH_B],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function falla(rol: string | null, sql: string, params: unknown[] = []): Promise<string> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ADMIN]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.rol', 'admin', true)`);
    if (rol) await cliente.query(`SET LOCAL ROLE ${rol}`);
    await cliente.query(sql, params);
    await cliente.query('COMMIT');
    return '';
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error de la sentencia.
    }
    return error instanceof Error ? error.message : String(error);
  } finally {
    cliente.release();
  }
}

describe('retención clínica en PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await sembrarParametrosIniciales(TENANT);
  }, 30000);

  afterAll(async () => {
    await cerrarPool();
  });

  it('las tablas nuevas tienen RLS forzado y política', async () => {
    for (const tabla of ['politica_retencion', 'marcas_retencion']) {
      const fila = await obtenerPool().query<{ rls: boolean; forzado: boolean; politicas: number }>(
        `select c.relrowsecurity as rls, c.relforcerowsecurity as forzado,
                (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
           from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = $1`,
        [tabla],
      );
      expect(fila.rows[0]).toMatchObject({ rls: true, forzado: true });
      expect(fila.rows[0]?.politicas).toBeGreaterThan(0);
    }
  });

  it('el rol de la app no puede borrar ni truncar las tablas clínicas', async () => {
    for (const tabla of TABLAS_CLINICAS_SIN_BORRADO) {
      const privilegio = await obtenerPool().query<{ borrar: boolean; truncar: boolean }>(
        `select has_table_privilege('optisaas_app', $1, 'DELETE') as borrar,
                has_table_privilege('optisaas_app', $1, 'TRUNCATE') as truncar`,
        [`public.${tabla}`],
      );
      expect(privilegio.rows[0], tabla).toMatchObject({ borrar: false, truncar: false });
      const disparadores = await obtenerPool().query<{ tgname: string }>(
        `select t.tgname
           from pg_trigger t
           join pg_class c on c.oid = t.tgrelid
           join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = $1 and not t.tgisinternal`,
        [tabla],
      );
      const nombres = disparadores.rows.map((fila) => fila.tgname);
      expect(nombres, tabla).toContain('inmutabilidad_fila');
      expect(nombres, tabla).toContain('inmutabilidad_truncate');
      expect(await falla('optisaas_app', `delete from ${tabla} where false`)).toMatch(/permission denied/i);
      expect(await falla('optisaas_app', `truncate ${tabla}`)).toMatch(/permission denied/i);
    }
  });

  it('el trigger de T12 impide el DELETE aunque el rol de administración lo intente', async () => {
    const antes = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from pacientes where id = $1`,
      [DENTRO],
    );
    expect(await falla(null, `delete from pacientes where id = $1`, [DENTRO])).toMatch(/DELETE prohibido/);
    expect(await falla(null, 'truncate adendas')).toMatch(/TRUNCATE prohibido/);
    const despues = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from pacientes where id = $1`,
      [DENTRO],
    );
    expect(despues.rows[0]?.total).toBe(antes.rows[0]?.total);
  });

  it('AC-SEG-09-1: a los 14 años y 11 meses eliminar la HC falla y queda en la bitácora', async () => {
    await expect(intentarEliminarHistoriaClinica(ctx(), DENTRO, AHORA)).rejects.toBeInstanceOf(ErrorRetencion);
    await expect(intentarEliminarHistoriaClinica(ctx(), DENTRO, AHORA)).rejects.toThrow(
      /retención sigue vigente \(estado archivo_central\)/,
    );
    const auditoria = await obtenerPool().query<{ accion: string; resultado: string; request_id: string }>(
      `select accion, resultado, request_id
         from auditoria
        where tenant_id = $1 and recurso = 'historia_clinica' and recurso_id = $2
        order by id desc
        limit 1`,
      [TENANT, DENTRO],
    );
    expect(auditoria.rows[0]).toMatchObject({
      accion: 'retencion',
      resultado: 'error',
      request_id: 'archivo_central',
    });
    const sigue = await obtenerPool().query(`select 1 from pacientes where id = $1`, [DENTRO]);
    expect(sigue.rowCount).toBe(1);
  });

  it('AC-SEG-09-3: la marca duplicada impide la elegibilidad al pasar los 15 años', async () => {
    const hoy = '2015-06-02';
    const paciente = randomUUID();
    await obtenerPool().query(
      `insert into pacientes (
         id, tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id, fecha_ultima_atencion
       ) values (
         $1, $2, $5, 'CC', 'sobre-sintetico-t27-c', $3, 'Mara', 'Sintética', '1982-01-01',
         'F', 'No aplica', 'No aplica', 'Calle 29', '3000000029', 'No aplica', 'No aplica', 'No aplica',
         'particular', $4, '2000-06-01'
       )`,
      [paciente, TENANT, randomBytes(32).toString('hex'), SEDE, 4000 + Math.floor(Math.random() * 1_000_000)],
    );
    const antes = await consultarEstadoRetencion(ctx(), paciente, hoy);
    expect(antes.elegible).toBe(true);
    expect(antes.estado).toBe('disposicion_final_pendiente');
    expect(antes.purga_permitida).toBe(false);
    await expect(intentarEliminarHistoriaClinica(ctx(), paciente, new Date('2015-06-02T15:00:00.000Z'))).rejects.toThrow(
      /purga no está implementada/,
    );
    await marcarRetencion(ctx(), paciente, 'duplicada', 'Marca sintetica de prueba');
    const despues = await consultarEstadoRetencion(ctx(), paciente, hoy);
    expect(despues.elegible).toBe(false);
    expect(despues.estado).toBe('archivo_central');
  });

  it('AC-SEG-09-4: la política guardada separa plazos verificados y provisionales', async () => {
    const politica = await listarPoliticaRetencion(ctx());
    const verificados = politica.filas.filter((fila) => fila.verificado);
    const provisionales = politica.filas.filter((fila) => !fila.verificado);
    expect(verificados.length).toBeGreaterThan(0);
    expect(provisionales.map((fila) => fila.tipo_documento).sort()).toEqual(['factura_electronica', 'log_auditoria']);
    expect(verificados.every((fila) => fila.texto.includes('✅ verificado'))).toBe(true);
    expect(provisionales.every((fila) => fila.texto.includes('⚠️ provisional') && fila.texto.includes('TODO(Q-07)'))).toBe(
      true,
    );
    expect(provisionales.every((fila) => fila.anios == null)).toBe(true);
    expect(politica.declaracion_contratante).toMatch(/contrata profesionales/);
    expect(politica.nota_purga).toMatch(/no está implementada/);
    expect(politica.filas.every((fila) => fila.verificado || fila.base_normativa.includes('TODO(Q-07)'))).toBe(true);
  });

  it('la supresión de T26 cita el estado de retención del paciente', async () => {
    const bloqueada = await radicarSolicitud(
      ctx(),
      {
        tipo: 'supresion',
        ambito: 'clinico',
        canal: 'escrito',
        descripcion: 'Peticion sintetica de supresion con retencion',
        paciente_id: DENTRO,
      },
      AHORA,
    );
    expect(bloqueada.bloqueo_supresion).toBe(true);
    expect(bloqueada.respuesta).toContain('archivo_central');
    expect(bloqueada.respuesta).not.toMatch(/\d+\s+años/);
  });
});
