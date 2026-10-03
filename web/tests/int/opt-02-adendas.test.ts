// OPT-02 (T21) — Adenda contra PostgreSQL real.
// AC-OPT-02-1, AC-OPT-02-2 y AC-OPT-02-3. Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearAdendaAtencion, generarPdfHistoriaClinica, listarHistorialAtencion } from '../../db/adendas-atencion';
import { crearAtencion, ErrorAtencion, firmarAtencion, type ContextoAtencion } from '../../db/atenciones';
import { guardarPerfilProfesional } from '../../db/firma';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { textoVisiblePdf } from '../../dominio/firma';
import { verificarHashContenido } from '../../lib/inmutabilidad/servicio';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HASH = '21'.repeat(32);

const TENANT = 'a2100000-0000-4000-8000-000000000021';
const OTRO = 'a2100000-0000-4000-8000-000000000099';
const SEDE = 'a2100000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a2100000-0000-4000-8000-0000000000b1';
const OPTO = 'a2100000-0000-4000-8000-0000000000c1';
const OPTO2 = 'a2100000-0000-4000-8000-0000000000c2';
const AUX = 'a2100000-0000-4000-8000-0000000000c3';
const ADMIN = 'a2100000-0000-4000-8000-0000000000c4';
const SESION = 'a2100000-0000-4000-8000-0000000000d1';
const SESION2 = 'a2100000-0000-4000-8000-0000000000d2';
const ADULTO = 'a2100000-0000-4000-8000-0000000000e1';
const TEXTO = 'a2100000-0000-4000-8000-0000000000f1';

const MOTIVO = 'Correccion sintetica de la esfera';

function ctx(rol: string, usuario: string, sesion: string | null = null): ContextoAtencion {
  return {
    tenant_id: TENANT,
    usuario_id: usuario,
    sede_id: SEDE,
    sedes: [SEDE],
    rol,
    sesion_id: sesion,
    tarjeta_profesional_vigente: rol === 'optometra' || rol === 'auxiliar_clinico',
  };
}

function entrada() {
  return {
    paciente_id: ADULTO,
    tipo: 'primera_vez' as const,
    motivo: 'Control sintetico sin datos reales',
    examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
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
        ($1, 'Óptica Sintética T21', '900.000.121-1', 'activo'),
        ($2, 'Óptica Sintética T21 B', '900.000.121-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T21', 'Bogotá'),
        ($2, $4, 'Sede T21 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $5, 'opto.t21@example.invalid', 'activo'),
        ($2, $5, 'opto2.t21@example.invalid', 'activo'),
        ($3, $5, 'aux.t21@example.invalid', 'activo'),
        ($4, $5, 'admin.t21@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, OPTO2, AUX, ADMIN, TENANT],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values
        ($1, $3, $4, $6, $7, '192.0.2.21'),
        ($2, $3, $5, $6, $7, '192.0.2.22')
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en`,
      [SESION, SESION2, TENANT, OPTO, OPTO2, '2026-10-03T18:00:00.000Z', AHORA.toISOString()],
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
         $1, $2, 2101, 'CC', 'sobre-sintetico-t21', $3, 'Ana', 'Sintética', '1990-04-04',
         'F', 'No aplica', 'No aplica', 'Calle 21', '3000000021', 'No aplica', 'No aplica', 'No aplica',
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

async function sqlApp(tenant: string, sql: string, params: unknown[] = []): Promise<{ error: string; filas: number }> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [tenant]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [OPTO]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
    await cliente.query(`select set_config('app.rol', 'optometra', true)`);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await cliente.query(sql, params);
    await cliente.query('COMMIT');
    return { error: '', filas: resultado.rowCount ?? 0 };
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error de la sentencia.
    }
    return { error: error instanceof Error ? error.message : String(error), filas: 0 };
  } finally {
    cliente.release();
  }
}

async function atencionFirmada() {
  const creada = await crearAtencion(ctx('optometra', OPTO, SESION), entrada());
  const firmada = await firmarAtencion(ctx('optometra', OPTO, SESION), creada.id, AHORA);
  const previa = await obtenerPool().query<{ hash_contenido: string; esfera: string }>(
    `select a.hash_contenido, e.esfera_od::text as esfera
       from atenciones a
       join examenes_optometricos e on e.atencion_id = a.id
      where a.id = $1`,
    [firmada.id],
  );
  return { id: firmada.id, hash: previa.rows[0]?.hash_contenido ?? '', esfera: previa.rows[0]?.esfera ?? '' };
}

describe('adendas de la historia clínica en PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    // La DEK efímera de Vitest cambia de proceso. Una fila vieja no se puede
    // desenvolver y haría fallar el cifrado de la adenda.
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
    const admin = {
      tenant_id: TENANT,
      usuario_id: ADMIN,
      sede_id: SEDE,
      sedes: [SEDE],
      rol: 'admin',
      sesion_id: null,
    };
    await guardarPerfilProfesional(
      admin,
      {
        usuarioId: OPTO,
        nombreCompleto: 'Optómetra Sintético T21',
        registroProfesional: 'RP-SINTETICO-21',
        vigenteHasta: '2026-12-31',
      },
      AHORA,
    );
    await guardarPerfilProfesional(
      admin,
      {
        usuarioId: OPTO2,
        nombreCompleto: 'Otro Optómetra Sintético T21',
        registroProfesional: 'RP-SINTETICO-21B',
        vigenteHasta: '2026-12-31',
      },
      AHORA,
    );
  }, 30000);

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-OPT-02-1: corregir la esfera crea adenda firmada y deja el original visible', async () => {
    const catalogo = await obtenerPool().query<{ rls: boolean; forzado: boolean; politicas: number }>(
      `select c.relrowsecurity as rls, c.relforcerowsecurity as forzado,
              (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'atencion_adendas'`,
    );
    expect(catalogo.rows[0]).toMatchObject({ rls: true, forzado: true, politicas: 1 });

    const base = await atencionFirmada();
    const historial = await crearAdendaAtencion(
      ctx('optometra', OPTO, SESION),
      base.id,
      { campo_ref: 'esfera_od', nuevo_valor: '-2.00', motivo: MOTIVO },
      AHORA,
    );
    const despues = await obtenerPool().query<{
      hash_contenido: string;
      estado: string;
      esfera: string;
      motivo: string;
      nuevo_valor: string;
      estado_adenda: string;
    }>(
      `select a.hash_contenido, a.estado, e.esfera_od::text as esfera,
              d.motivo, d.nuevo_valor, d.estado as estado_adenda
         from atenciones a
         join examenes_optometricos e on e.atencion_id = a.id
         join atencion_adendas d on d.atencion_id = a.id
        where a.id = $1`,
      [base.id],
    );
    const fila = despues.rows[0];
    expect(Number(fila?.esfera)).toBe(Number(base.esfera));
    expect(Number(fila?.esfera)).toBe(-1.25);
    expect(fila?.estado).toBe('firmado');
    expect(fila?.hash_contenido).toBe(base.hash);
    expect(fila?.estado_adenda).toBe('firmada');
    expect(fila?.motivo ?? '').not.toContain('Correccion');
    expect(fila?.nuevo_valor ?? '').not.toContain('-2');
    expect(fila?.motivo ?? '').toContain('opt1:');
    expect(historial.original_refraccion.esfera_od).toBe('-1.25');
    expect(historial.marcas.esfera_od).toBe('corregido por adenda #1');
    const nota = historial.linea.find((linea) => linea.tipo === 'adenda');
    expect(nota?.nuevo_valor).toBe('-2');
    expect(nota?.valor_anterior).toBe('-1.25');

    const adenda = await obtenerPool().query<{ id: string }>(
      `select id from atencion_adendas where atencion_id = $1`,
      [base.id],
    );
    const hashAdenda = await verificarHashContenido('atencion_adendas', adenda.rows[0]?.id ?? '');
    expect(hashAdenda.motivo).toBe('ok');
    const hashOriginal = await verificarHashContenido('atenciones', base.id);
    expect(hashOriginal.motivo).toBe('ok');

    const cambio = await sqlApp(TENANT, `update atencion_adendas set motivo = 'otro' where atencion_id = $1`, [base.id]);
    expect(cambio.error).toMatch(/inmutable/i);
    const borrado = await sqlApp(TENANT, `delete from atencion_adendas where atencion_id = $1`, [base.id]);
    expect(borrado.error).toMatch(/inmutable/i);
    const examen = await sqlApp(TENANT, `update examenes_optometricos set esfera_od = -3 where atencion_id = $1`, [
      base.id,
    ]);
    expect(examen.error).toMatch(/inmutable/i);

    const ajena = await sqlApp(OTRO, `select id from atencion_adendas where atencion_id = $1`, [base.id]);
    expect(ajena.error).toBe('');
    expect(ajena.filas).toBe(0);
    const propia = await sqlApp(TENANT, `select id from atencion_adendas where atencion_id = $1`, [base.id]);
    expect(propia.filas).toBe(1);
  }, 30000);

  it('AC-OPT-02-2: el historial muestra quién, cuándo y por qué, y audita la firma', async () => {
    const base = await atencionFirmada();
    await crearAdendaAtencion(
      ctx('optometra', OPTO, SESION),
      base.id,
      { campo_ref: 'esfera_od', nuevo_valor: '-1.75', motivo: MOTIVO },
      AHORA,
    );
    const historial = await listarHistorialAtencion(ctx('optometra', OPTO, SESION), base.id);
    const nota = historial.linea.find((linea) => linea.tipo === 'adenda');
    expect(nota?.autor).toBe('Optómetra Sintético T21');
    expect(nota?.hora_bogota).toMatch(/2026/);
    expect(nota?.hora_bogota).not.toMatch(/Z$/);
    expect(nota?.motivo).toBe(MOTIVO);
    const original = historial.linea.find((linea) => linea.tipo === 'original');
    expect(original?.autor).toBe('Optómetra Sintético T21');
    expect(original?.hora_bogota).toBeTruthy();

    const auditoria = await obtenerPool().query<{ accion: string; resultado: string }>(
      `select accion, resultado from auditoria
        where tenant_id = $1 and recurso = 'atencion_adenda' and accion = 'adenda'
        order by id desc limit 1`,
      [TENANT],
    );
    expect(auditoria.rows[0]).toMatchObject({ accion: 'adenda', resultado: 'ok' });
    const firma = await obtenerPool().query<{ estado: string; firmas: number }>(
      `select d.estado, count(f.id)::int as firmas
         from atencion_adendas a
         join documentos_firma d on d.id = a.firma_documento_id
         join firmas f on f.documento_id = d.id and f.tipo_firmante = 'profesional'
        where a.atencion_id = $1
        group by d.estado`,
      [base.id],
    );
    expect(firma.rows[0]).toMatchObject({ estado: 'firmado', firmas: 1 });

    await expect(
      crearAdendaAtencion(ctx('auxiliar_clinico', AUX), base.id, {
        campo_ref: 'esfera_od',
        nuevo_valor: '-1.5',
        motivo: MOTIVO,
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      crearAdendaAtencion(ctx('optometra', OPTO, SESION), base.id, {
        campo_ref: 'esfera_od',
        nuevo_valor: '-1.5',
        motivo: '   ',
      }),
    ).rejects.toMatchObject({ status: 400 });
    const borrador = await crearAtencion(ctx('optometra', OPTO, SESION), entrada());
    await expect(
      crearAdendaAtencion(ctx('optometra', OPTO, SESION), borrador.id, {
        campo_ref: 'esfera_od',
        nuevo_valor: '-1.5',
        motivo: MOTIVO,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      crearAdendaAtencion(ctx('optometra', OPTO, SESION), base.id, {
        campo_ref: 'eje_od',
        nuevo_valor: '200',
        motivo: MOTIVO,
      }),
    ).rejects.toMatchObject({ status: 400 });
  }, 30000);

  it('AC-OPT-02-3: el PDF de la HC incluye la adenda y conserva el valor original', async () => {
    const base = await atencionFirmada();
    await crearAdendaAtencion(
      ctx('optometra', OPTO, SESION),
      base.id,
      { campo_ref: 'esfera_od', nuevo_valor: '-2.25', motivo: MOTIVO },
      AHORA,
    );
    const pdf = await generarPdfHistoriaClinica(ctx('optometra', OPTO, SESION), base.id);
    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain(MOTIVO);
    expect(texto).toContain('-1.25');
    expect(texto).toContain('-2.25');
    expect(texto).toContain('Optómetra Sintético T21');
    expect(texto).toContain('BORRADOR');
  }, 30000);

  it('una adenda de otro profesional es nota complementaria y no cambia el original', async () => {
    const base = await atencionFirmada();
    const historial = await crearAdendaAtencion(
      ctx('optometra', OPTO2, SESION2),
      base.id,
      { campo_ref: 'esfera_od', nuevo_valor: '-3.00', motivo: 'Nota complementaria sintetica' },
      AHORA,
    );
    expect(historial.marcas.esfera_od).toBeUndefined();
    expect(historial.original_refraccion.esfera_od).toBe('-1.25');
    const nota = historial.linea.find((linea) => linea.tipo === 'adenda');
    expect(nota?.tipo_nota).toBe('complementaria');
    expect(nota?.autor).toBe('Otro Optómetra Sintético T21');
    expect(nota?.motivo).toBe('Nota complementaria sintetica');
    const esfera = await obtenerPool().query<{ esfera: string }>(
      `select esfera_od::text as esfera from examenes_optometricos where atencion_id = $1`,
      [base.id],
    );
    expect(Number(esfera.rows[0]?.esfera)).toBe(-1.25);
  }, 30000);
});
