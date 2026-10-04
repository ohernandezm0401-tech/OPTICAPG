// OPT-01 / OPT-24 (T19) — Atención contra PostgreSQL real.
// AC-OPT-01-2, 4, 5, 6 y 7; AC-OPT-24-1 y 2. Solo datos sintéticos.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  abrirAtencion,
  actualizarAtencion,
  crearAtencion,
  ErrorAtencion,
  firmarAtencion,
  type ContextoAtencion,
} from '../../db/atenciones';
import { guardarPerfilProfesional } from '../../db/firma';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { NAV_CONFIG } from '../../lib/navigation';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HASH = 'ab'.repeat(32);

const TENANT = 'a1900000-0000-4000-8000-000000000019';
const OTRO = 'a1900000-0000-4000-8000-000000000099';
const SEDE = 'a1900000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a1900000-0000-4000-8000-0000000000b1';
const OPTO = 'a1900000-0000-4000-8000-0000000000c1';
const AUX = 'a1900000-0000-4000-8000-0000000000c2';
const ADMIN = 'a1900000-0000-4000-8000-0000000000c3';
const ASESOR = 'a1900000-0000-4000-8000-0000000000c4';
const OPTO_OTRO = 'a1900000-0000-4000-8000-0000000000c5';
const SESION = 'a1900000-0000-4000-8000-0000000000d1';
const ADULTO = 'a1900000-0000-4000-8000-0000000000e1';
const MENOR = 'a1900000-0000-4000-8000-0000000000e2';
const MENOR_CON_REP = 'a1900000-0000-4000-8000-0000000000e3';
const REP = 'a1900000-0000-4000-8000-0000000000f1';
const TEXTO = 'a1900000-0000-4000-8000-0000000000f2';

const EXAMEN = {
  esfera_od: -1.25,
  cilindro_od: -0.5,
  eje_od: 180,
  adicion_od: 1.75,
  agudeza_od: 1,
  dip: 62,
};

function ctx(rol: string, usuario: string, sede = SEDE, tenant = TENANT): ContextoAtencion {
  return {
    tenant_id: tenant,
    usuario_id: usuario,
    sede_id: sede,
    sedes: [sede],
    rol,
    sesion_id: usuario === OPTO ? SESION : null,
    tarjeta_profesional_vigente: rol === 'optometra' || rol === 'admin' || rol === 'auxiliar_clinico' || rol === 'asesor',
  };
}

function entrada(pacienteId: string, codigo = 'H52.1') {
  return {
    paciente_id: pacienteId,
    tipo: 'primera_vez' as const,
    motivo: 'Control sintético sin datos reales',
    examen: EXAMEN,
    diagnostico: { codigo_cie10: codigo },
    plan: { conducta: 'Control en doce meses' },
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T19', '900.000.119-1', 'activo'),
        ($2, 'Óptica Sintética T19 B', '900.000.119-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T19', 'Bogotá'),
        ($2, $4, 'Sede T19 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $6, 'opto.t19@example.invalid', 'activo'),
        ($2, $6, 'aux.t19@example.invalid', 'activo'),
        ($3, $6, 'admin.t19@example.invalid', 'activo'),
        ($4, $6, 'asesor.t19@example.invalid', 'activo'),
        ($5, $7, 'opto.t19b@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, AUX, ADMIN, ASESOR, OPTO_OTRO, TENANT, OTRO],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.19')
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
       ) values
        ($1, $4, 1901, 'CC', 'sobre-sintetico-a', $5, 'Ana', 'Sintética', '1990-04-04',
         'F', 'No aplica', 'No aplica', 'Calle 1', '3000000001', 'No aplica', 'No aplica', 'No aplica', 'particular', $6),
        ($2, $4, 1902, 'RC', 'sobre-sintetico-b', $7, 'Nino', 'Sintético', '2016-01-15',
         'M', 'No aplica', 'No aplica', 'Calle 2', '3000000002', 'No aplica', 'No aplica', 'No aplica', 'particular', $6),
        ($3, $4, 1903, 'TI', 'sobre-sintetico-c', $8, 'Lucia', 'Sintética', '2015-06-01',
         'F', 'No aplica', 'No aplica', 'Calle 3', '3000000003', 'No aplica', 'No aplica', 'No aplica', 'particular', $6)
       on conflict (id) do nothing`,
      [ADULTO, MENOR, MENOR_CON_REP, TENANT, HASH, SEDE, 'cd'.repeat(32), 'ef'.repeat(32)],
    );
    await cliente.query(
      `insert into representantes (id, tenant_id, nombre, tipo_doc, num_doc, num_doc_hash)
       values ($1, $2, 'Representante Sintético', 'CC', 'sobre-sintetico-r', $3)
       on conflict (id) do nothing`,
      [REP, TENANT, '12'.repeat(32)],
    );
    await cliente.query(
      `insert into pacientes_representantes (
         tenant_id, paciente_id, representante_id, parentesco, contacto, vigente
       )
       select $1, $2, $3, 'madre', '3000000099', true
        where not exists (
          select 1 from pacientes_representantes where paciente_id = $2 and vigente = true
        )`,
      [TENANT, MENOR_CON_REP, REP],
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
       select $1, paciente_id, $2, 'tratamiento_clinico', true, 'otorgada', 'presencial', '{}'::jsonb,
              'BORRADOR – requiere revisión jurídica', $3, $4
         from (values ($5::uuid), ($6::uuid), ($7::uuid)) as pacientes(paciente_id)
        where not exists (
          select 1 from autorizaciones a
           where a.paciente_id = pacientes.paciente_id and a.finalidad = 'tratamiento_clinico'
        )`,
      [TENANT, TEXTO, HASH, AHORA.toISOString(), ADULTO, MENOR, MENOR_CON_REP],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function sqlApp(sql: string, params: unknown[] = []): Promise<string> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [OPTO]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.rol', 'optometra', true)`);
    await cliente.query('SET LOCAL ROLE optisaas_app');
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

function archivosApp(directorio: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(directorio)) {
    if (nombre === 'node_modules' || nombre === '.next') continue;
    const ruta = path.join(directorio, nombre);
    const estado = statSync(ruta);
    if (estado.isDirectory()) salida.push(...archivosApp(ruta));
    else if (/\.(ts|tsx|js|mjs)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

describe('atención optométrica en PostgreSQL', () => {
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
        nombreCompleto: 'Optómetra Sintético T19',
        registroProfesional: 'RP-SINTETICO-19',
        vigenteHasta: '2026-12-31',
      },
      AHORA,
    );
  }, 30000);

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-OPT-24-1 y AC-OPT-24-2: modalidad presencial y sin teleconsulta', async () => {
    const columna = await obtenerPool().query<{ column_default: string }>(
      `select column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'atenciones' and column_name = 'modalidad'`,
    );
    expect(columna.rows[0]?.column_default ?? '').toContain('presencial');

    const creada = await crearAtencion(ctx('optometra', OPTO), entrada(ADULTO));
    expect(creada.modalidad).toBe('presencial');
    await expect(crearAtencion(ctx('optometra', OPTO), { ...entrada(ADULTO), modalidad: 'telemedicina' })).rejects.toMatchObject({
      status: 400,
    });

    const menu = Object.values(NAV_CONFIG)
      .flat()
      .map((item) => `${item.label} ${item.href}`)
      .join('\n');
    expect(menu.toLowerCase()).not.toContain('teleconsulta');
    const menciones = archivosApp(path.join(WEB, 'app')).filter((archivo) =>
      /teleconsulta/i.test(readFileSync(archivo, 'utf8')),
    );
    expect(menciones).toEqual([]);
  });

  it('AC-OPT-01-4 y AC-OPT-01-7: CIE-10 del catálogo y menor sin representante', async () => {
    await expect(crearAtencion(ctx('optometra', OPTO), entrada(ADULTO, 'miopía'))).rejects.toMatchObject({ status: 400 });
    await expect(crearAtencion(ctx('optometra', OPTO), entrada(ADULTO, 'ZZ9.8'))).rejects.toMatchObject({ status: 422 });
    await expect(crearAtencion(ctx('optometra', OPTO), entrada(MENOR))).rejects.toBeInstanceOf(ErrorAtencion);
    await expect(crearAtencion(ctx('optometra', OPTO), entrada(MENOR))).rejects.toThrow(/menor/);
    const conRepresentante = await crearAtencion(ctx('optometra', OPTO), entrada(MENOR_CON_REP));
    expect(conRepresentante.diagnostico?.codigo_cie10).toBe('H52.1');
    expect(conRepresentante.diagnostico?.descripcion).toMatch(/SINTETICO/);
    expect(conRepresentante.estado).toBe('borrador');
  });

  it('AC-OPT-01-5 y AC-OPT-01-6: asesor y admin reciben 403 y la apertura queda en la bitácora', async () => {
    const creada = await crearAtencion(ctx('optometra', OPTO), entrada(ADULTO));
    await expect(abrirAtencion(ctx('asesor', ASESOR), creada.id)).rejects.toMatchObject({ status: 403 });
    await expect(abrirAtencion(ctx('admin', ADMIN), creada.id)).rejects.toMatchObject({ status: 403 });
    await expect(abrirAtencion(ctx('optometra', OPTO_OTRO, SEDE_OTRA, OTRO), creada.id)).rejects.toMatchObject({
      status: 404,
    });

    const antes = await obtenerPool().query<{ total: string }>(
      `select count(*)::text as total from auditoria where recurso = 'R3' and recurso_id = $1 and accion = 'lectura'`,
      [creada.id],
    );
    await abrirAtencion(ctx('optometra', OPTO), creada.id);
    await abrirAtencion(ctx('optometra', OPTO), creada.id);
    const despues = await obtenerPool().query<{ total: string }>(
      `select count(*)::text as total from auditoria where recurso = 'R3' and recurso_id = $1 and accion = 'lectura'`,
      [creada.id],
    );
    expect(Number(despues.rows[0]?.total) - Number(antes.rows[0]?.total)).toBe(2);

    const borrador = await crearAtencion(ctx('auxiliar_clinico', AUX), entrada(ADULTO));
    expect(borrador.estado).toBe('borrador');
    await expect(firmarAtencion(ctx('auxiliar_clinico', AUX), borrador.id, AHORA)).rejects.toMatchObject({ status: 403 });
  });

  it('AC-OPT-01-2: tras firmar fallan la API y el SQL de la aplicación', async () => {
    const creada = await crearAtencion(ctx('optometra', OPTO), entrada(ADULTO));
    const crudo = await obtenerPool().query<{ contenido: string; descripcion: string }>(
      `select a.contenido, d.descripcion
         from atenciones a
         join diagnosticos d on d.atencion_id = a.id
        where a.id = $1`,
      [creada.id],
    );
    expect(crudo.rows[0]?.contenido.startsWith('opt1:')).toBe(true);
    expect(crudo.rows[0]?.descripcion.startsWith('opt1:')).toBe(true);
    expect(crudo.rows[0]?.contenido).not.toContain('Control sintético');
    expect(creada.motivo).toContain('Control sintético');
    expect(creada.diagnostico?.descripcion).toMatch(/SINTETICO/);
    const firmada = await firmarAtencion(ctx('optometra', OPTO), creada.id, AHORA);
    expect(firmada.estado).toBe('firmado');
    expect(firmada.folio).toBeGreaterThan(0);
    expect(firmada.firmado_en).toBeTruthy();
    expect(firmada.hora_bogota).toBeTruthy();
    expect(firmada.sello).toMatch(/RP-SINTETICO-19/);
    expect(firmada.sello).toMatch(/Firmado electrónicamente/);

    await expect(
      actualizarAtencion(ctx('optometra', OPTO), creada.id, { motivo: 'Cambio posterior a la firma' }),
    ).rejects.toMatchObject({ status: 409 });

    const update = await sqlApp(`update atenciones set contenido = 'alterado' where id = $1`, [creada.id]);
    const borrar = await sqlApp(`delete from examenes_optometricos where atencion_id = $1`, [creada.id]);
    const diagnostico = await sqlApp(`update diagnosticos set codigo_cie10 = 'ZZ9.9' where atencion_id = $1`, [creada.id]);
    expect(update).toMatch(/inmutable/);
    expect(borrar).toMatch(/inmutable|permission denied/i);
    expect(diagnostico).toMatch(/inmutable/);

    const rls = await obtenerPool().query<{ tabla: string; forzado: boolean }>(
      `select c.relname as tabla, c.relforcerowsecurity as forzado
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('atenciones', 'examenes_optometricos', 'diagnosticos', 'planes_manejo')`,
    );
    expect(rls.rows).toHaveLength(4);
    expect(rls.rows.every((fila) => fila.forzado)).toBe(true);
  });
});
