// OPT-06 (T25) — Copia de la HC contra PostgreSQL real.
// AC-OPT-06-1, AC-OPT-06-2 y AC-OPT-06-3. I. Solo datos sintéticos.
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearAdendaAtencion } from '../../db/adendas-atencion';
import { crearAtencion, firmarAtencion, type ContextoAtencion } from '../../db/atenciones';
import { ErrorEntrega, entregarCopiaHc, solicitarCopiaHc } from '../../db/entregas-hc';
import { guardarPerfilProfesional } from '../../db/firma';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { hashDocumento } from '../../dominio/documento-hash';
import { hashSha256, textoVisiblePdf } from '../../dominio/firma';
import { claveMaestraActiva, leerRegistroKek } from '../../lib/cifrado/kek.mjs';
import type { CorreoPort } from '../../lib/correo/puerto';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HASH = '25'.repeat(32);
const DOCUMENTO = '900125025';
const MOTIVOS = ['Control sintetico uno', 'Control sintetico dos', 'Control sintetico tres'] as const;
const MOTIVO_ADENDA = 'Correccion sintetica de la esfera';

const TENANT = randomUUID();
const OTRO = randomUUID();
const SEDE = randomUUID();
const SEDE_OTRA = randomUUID();
const OPTO = randomUUID();
const ADMIN = randomUUID();
const ASESOR = randomUUID();
const SESION = randomUUID();
const ADULTO = randomUUID();
const TEXTO = randomUUID();

const enviados: { destinatario: string; codigo: string; referencia: string }[] = [];
const correo: CorreoPort = {
  async enviarInvitacion() {
    throw new Error('esta prueba no invita usuarios');
  },
  async enviarCodigoUnSoloUso(mensaje) {
    enviados.push(mensaje);
  },
};

function ctx(rol: string, usuario = OPTO): ContextoAtencion {
  return {
    tenant_id: TENANT,
    usuario_id: usuario,
    sede_id: SEDE,
    sedes: [SEDE],
    rol,
    sesion_id: SESION,
    tarjeta_profesional_vigente: rol === 'optometra',
    ip: '192.0.2.25',
    agente: 'vitest',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  const nitA = `900125${TENANT.replace(/-/g, '').slice(0, 10)}`;
  const nitB = `900126${OTRO.replace(/-/g, '').slice(0, 10)}`;
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T25', $2, 'activo'),
        ($3, 'Óptica Sintética T25 B', $4, 'activo')`,
      [TENANT, nitA, OTRO, nitB],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T25', 'Bogotá'),
        ($2, $4, 'Sede T25 B', 'Medellín')`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, $5, 'activo'),
        ($2, $4, $6, 'activo'),
        ($3, $4, $7, 'activo')`,
      [OPTO, ADMIN, ASESOR, TENANT, `opto.${OPTO}@example.invalid`, `admin.${ADMIN}@example.invalid`, `asesor.${ASESOR}@example.invalid`],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.25')`,
      [SESION, TENANT, OPTO, '2026-10-03T18:00:00.000Z', AHORA.toISOString()],
    );
    await cliente.query(
      `insert into catalogo_cie10 (codigo, descripcion, version, vigente_desde)
       values ('H52.1', 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10', 'sintetica-prueba-2026', '2026-01-01')
       on conflict (codigo, version) do nothing`,
    );
    const hashDoc = hashDocumento('CC', DOCUMENTO, claveMaestraActiva(leerRegistroKek()));
    await cliente.query(
      `insert into pacientes (
         id, tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, email, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, $2, 2501, 'CC', $3, $4, 'Ana', 'Sintética', '1990-04-04',
         'F', 'No aplica', 'No aplica', 'Calle 25', '3000000025', 'paciente.t25@example.invalid',
         'No aplica', 'No aplica', 'No aplica', 'particular', $5
       )`,
      [ADULTO, TENANT, 'sobre-sintetico-t25', hashDoc, SEDE],
    );
    await cliente.query(
      `insert into textos_legales (
         id, tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde
       ) values (
         $1, $2, 'autorizacion_tratamiento', 'tratamiento_clinico', 'Tratamiento', false, 1,
         'BORRADOR – requiere revisión jurídica', $3, $4
       )`,
      [TEXTO, TENANT, HASH, AHORA.toISOString()],
    );
    await cliente.query(
      `insert into autorizaciones (
         tenant_id, paciente_id, texto_id, finalidad, otorgada, estado, medio, evidencia,
         contenido_exacto, hash_texto, registrada_en
       ) values (
         $1, $2, $3, 'tratamiento_clinico', true, 'otorgada', 'presencial', '{}'::jsonb,
         'BORRADOR – requiere revisión jurídica', $4, $5
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

async function sqlApp(tenant: string, sql: string, params: unknown[] = []) {
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
    return { error: '', filas: resultado.rowCount ?? 0, rows: resultado.rows as Record<string, unknown>[] };
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error de la sentencia.
    }
    return { error: error instanceof Error ? error.message : String(error), filas: 0, rows: [] };
  } finally {
    cliente.release();
  }
}

async function historiaConTresAtenciones() {
  const ids: string[] = [];
  for (const motivo of MOTIVOS) {
    const creada = await crearAtencion(ctx('optometra'), {
      paciente_id: ADULTO,
      tipo: 'control',
      motivo,
      examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
      diagnostico: { codigo_cie10: 'H52.1' },
      plan: { conducta: 'Control en doce meses' },
    });
    const firmada = await firmarAtencion(ctx('optometra'), creada.id, AHORA);
    ids.push(firmada.id);
  }
  await crearAdendaAtencion(
    ctx('optometra'),
    ids[1] ?? '',
    { campo_ref: 'esfera_od', nuevo_valor: '-2.00', motivo: MOTIVO_ADENDA },
    AHORA,
  );
  return ids;
}

describe('entrega de la historia clínica en PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
    await guardarPerfilProfesional(
      { tenant_id: TENANT, usuario_id: ADMIN, sede_id: SEDE, sedes: [SEDE], rol: 'admin', sesion_id: null },
      {
        usuarioId: OPTO,
        nombreCompleto: 'Optómetra Sintético T25',
        registroProfesional: 'RP-SINTETICO-25',
        vigenteHasta: '2099-12-31',
      },
      AHORA,
    );
    await historiaConTresAtenciones();
  }, 60000);

  afterAll(async () => {
    await cerrarPool();
  });

  it('AC-OPT-06-1 y AC-OPT-06-2: la copia trae 3 atenciones y 1 adenda, registra el hash y audita', async () => {
    const catalogo = await obtenerPool().query<{ relname: string; rls: boolean; forzado: boolean; politicas: number }>(
      `select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forzado,
              (select count(*)::int from pg_policy p where p.polrelid = c.oid) as politicas
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in ('entregas_hc', 'codigos_entrega_hc')
        order by c.relname`,
    );
    expect(catalogo.rows).toEqual([
      { relname: 'codigos_entrega_hc', rls: true, forzado: true, politicas: 1 },
      { relname: 'entregas_hc', rls: true, forzado: true, politicas: 1 },
    ]);

    const solicitud = await solicitarCopiaHc(
      ctx('optometra'),
      { paciente_id: ADULTO, solicitante: 'titular', documento: DOCUMENTO },
      AHORA,
      correo,
    );
    expect(solicitud.costo_cop).toBe(0);
    expect(solicitud.estado).toBe('solicitada');
    expect(enviados.at(-1)?.destinatario).toBe('paciente.t25@example.invalid');
    expect(solicitud.codigo_desarrollo).toBe(enviados.at(-1)?.codigo);

    const entrega = await entregarCopiaHc(
      ctx('optometra'),
      solicitud.id,
      { codigo: solicitud.codigo_desarrollo ?? '' },
      AHORA,
    );
    expect(entrega.estado).toBe('entregada');
    expect(entrega.costo_cop).toBe(0);
    expect(entrega.hash_pdf).toMatch(/^[a-f0-9]{64}$/);
    const pdf = Buffer.from(entrega.pdf_base64, 'base64');
    expect(hashSha256(pdf)).toBe(entrega.hash_pdf);

    const texto = textoVisiblePdf(pdf);
    const uno = texto.indexOf(MOTIVOS[0]);
    const dos = texto.indexOf(MOTIVOS[1]);
    const tres = texto.indexOf(MOTIVOS[2]);
    const nota = texto.indexOf('Adenda #1');
    expect(uno).toBeGreaterThan(-1);
    expect(uno).toBeLessThan(dos);
    expect(dos).toBeLessThan(nota);
    expect(nota).toBeLessThan(tres);
    expect(texto).toContain(MOTIVO_ADENDA);
    expect(texto).toContain('RP-SINTETICO-25');
    expect(texto).toContain('Costo 0 COP');
    expect((texto.match(/Sello:/g) ?? []).length).toBeGreaterThanOrEqual(3);
    const folios = [...texto.matchAll(/Folio: (\d+)/g)].map((coincidencia) => Number(coincidencia[1]));
    expect(folios).toEqual([...folios].sort((a, b) => a - b));
    expect(folios).toHaveLength(3);

    const fila = await obtenerPool().query<{
      hash_pdf: string;
      costo_cop: number;
      estado: string;
      entregada_por: string;
      archivo_id: string;
      expira_en: Date | null;
    }>(
      `select hash_pdf, costo_cop, estado, entregada_por::text, archivo_id::text, expira_en
         from entregas_hc where id = $1`,
      [solicitud.id],
    );
    expect(fila.rows[0]?.hash_pdf).toBe(entrega.hash_pdf);
    expect(fila.rows[0]?.costo_cop).toBe(0);
    expect(fila.rows[0]?.estado).toBe('entregada');
    expect(fila.rows[0]?.entregada_por).toBe(OPTO);
    expect(fila.rows[0]?.archivo_id).toBe(entrega.archivo_id);
    expect(fila.rows[0]?.expira_en).toBeNull();

    const auditoria = await obtenerPool().query<{ accion: string; resultado: string }>(
      `select accion, resultado from auditoria
        where tenant_id = $1 and recurso = 'entrega_hc' and recurso_id = $2
        order by id`,
      [TENANT, solicitud.id],
    );
    expect(auditoria.rows).toEqual(
      expect.arrayContaining([
        { accion: 'solicitar', resultado: 'ok' },
        { accion: 'exportar', resultado: 'ok' },
      ]),
    );

    const cambio = await sqlApp(TENANT, `update entregas_hc set hash_pdf = repeat('ab', 32) where id = $1`, [solicitud.id]);
    expect(cambio.error).toMatch(/inmutable/i);
    const borrado = await sqlApp(TENANT, `delete from entregas_hc where id = $1`, [solicitud.id]);
    expect(borrado.error).toMatch(/permiso|permission|no se borra/i);
    const ajena = await sqlApp(OTRO, `select id from entregas_hc where id = $1`, [solicitud.id]);
    expect(ajena.filas).toBe(0);
    const propia = await sqlApp(TENANT, `select id from entregas_hc where id = $1`, [solicitud.id]);
    expect(propia.filas).toBe(1);
  }, 60000);

  it('AC-OPT-06-3: no entrega a un tercero ni a quien no tiene permiso', async () => {
    const antes = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from entregas_hc where paciente_id = $1`,
      [ADULTO],
    );
    await expect(
      solicitarCopiaHc(ctx('optometra'), { paciente_id: ADULTO, solicitante: 'tercero', documento: DOCUMENTO }, AHORA, correo),
    ).rejects.toBeInstanceOf(ErrorEntrega);
    await expect(
      solicitarCopiaHc(ctx('optometra'), { paciente_id: ADULTO, solicitante: 'tercero', documento: DOCUMENTO }, AHORA, correo),
    ).rejects.toMatchObject({ status: 403, message: expect.stringMatching(/terceros/) });
    await expect(
      solicitarCopiaHc(
        ctx('optometra'),
        { paciente_id: ADULTO, solicitante: 'representante', documento: DOCUMENTO, representante_id: randomUUID() },
        AHORA,
        correo,
      ),
    ).rejects.toMatchObject({ status: 403 });
    const despues = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from entregas_hc where paciente_id = $1`,
      [ADULTO],
    );
    expect(despues.rows[0]?.total).toBe(antes.rows[0]?.total);
    const denegadas = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from auditoria
        where tenant_id = $1 and recurso = 'entrega_hc' and accion = 'solicitar' and resultado = 'denegado'`,
      [TENANT],
    );
    expect(denegadas.rows[0]?.total ?? 0).toBeGreaterThanOrEqual(2);

    await expect(
      solicitarCopiaHc(ctx('asesor', ASESOR), { paciente_id: ADULTO, solicitante: 'titular', documento: DOCUMENTO }, AHORA, correo),
    ).rejects.toMatchObject({ status: 403 });

    const cobro = await sqlApp(
      TENANT,
      `insert into entregas_hc (tenant_id, sede_id, paciente_id, solicitante, medio, costo_cop)
       values ($1, $2, $3, 'titular', 'electronico', 1)`,
      [TENANT, SEDE, ADULTO],
    );
    expect(cobro.error).toMatch(/check|entregas_hc_gratuita|costo/i);
  });
});
