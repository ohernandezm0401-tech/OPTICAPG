// SEG-07 (T26) — Habeas data contra PostgreSQL real.
// AC-SEG-07-1 a AC-SEG-07-4. I. Solo datos sintéticos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearAtencion, firmarAtencion, type ContextoAtencion } from '../../db/atenciones';
import { guardarPerfilProfesional } from '../../db/firma';
import {
  ErrorHabeas,
  listarHabeas,
  marcarReclamo,
  radicarSolicitud,
  responderSolicitud,
} from '../../db/habeas-data';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { sembrarParametrosIniciales } from '../../db/parametros';
import { AVISO_SIN_FESTIVOS, LEYENDA_RECLAMO_EN_TRAMITE } from '../../dominio/habeas-data';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-02T20:00:00.000Z');
const LIMITE_48H = new Date('2026-10-06T20:00:00.000Z');
const HASH = '26'.repeat(32);

const TENANT = 'a2600000-0000-4000-8000-000000000026';
const OTRO = 'a2600000-0000-4000-8000-000000000099';
const SEDE = 'a2600000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a2600000-0000-4000-8000-0000000000b1';
const OPTO = 'a2600000-0000-4000-8000-0000000000c1';
const ADMIN = 'a2600000-0000-4000-8000-0000000000c4';
const SESION = 'a2600000-0000-4000-8000-0000000000d1';
const ADULTO = 'a2600000-0000-4000-8000-0000000000e1';
const TEXTO = 'a2600000-0000-4000-8000-0000000000f1';

function ctx(rol: string, usuario = OPTO): ContextoAtencion {
  return {
    tenant_id: TENANT,
    usuario_id: usuario,
    sede_id: SEDE,
    sedes: [SEDE],
    rol,
    sesion_id: usuario === OPTO ? SESION : null,
    tarjeta_profesional_vigente: rol === 'optometra',
    ip: '192.0.2.26',
    agente: 'vitest',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T26', '900.000.126-1', 'activo'),
        ($2, 'Óptica Sintética T26 B', '900.000.126-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T26', 'Bogotá'),
        ($2, $4, 'Sede T26 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $3, 'opto.t26@example.invalid', 'activo'),
        ($2, $3, 'admin.t26@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, ADMIN, TENANT],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.26')
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en`,
      [SESION, TENANT, OPTO, '2026-10-02T20:10:00.000Z', AHORA.toISOString()],
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
         $1, $2, 2601, 'CC', 'sobre-sintetico-t26', $3, 'Ana', 'Sintética', '1990-04-04',
         'F', 'No aplica', 'No aplica', 'Calle 26', '3000000026', 'No aplica', 'No aplica', 'No aplica',
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

describe('habeas data en PostgreSQL', () => {
  beforeAll(async () => {
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
    await sembrarParametrosIniciales(TENANT);
    await obtenerPool().query(
      `insert into festivos (tenant_id, anio, fecha, nombre, fuente)
       values ($1, 2026, '2026-10-12', 'Festivo sintético de prueba', 'csv-humano-prueba')
       on conflict (tenant_id, fecha) do nothing`,
      [TENANT],
    );
    await guardarPerfilProfesional(
      { tenant_id: TENANT, usuario_id: ADMIN, sede_id: SEDE, sedes: [SEDE], rol: 'admin', sesion_id: null },
      {
        usuarioId: OPTO,
        nombreCompleto: 'Optómetra Sintético T26',
        registroProfesional: 'RP-SINTETICO-26',
        vigenteHasta: '2027-12-31',
      },
      AHORA,
    );
  }, 30000);

  afterAll(async () => {
    await cerrarPool();
  });

  it('las tablas nuevas tienen RLS forzado y política', async () => {
    for (const tabla of [
      'solicitudes_titular',
      'bitacora_respuestas_titular',
      'banderas_dato',
      'historial_datos_demograficos',
      'secuencias_radicado_hd',
    ]) {
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

  it('AC-SEG-07-1: el reclamo vence a 15 días hábiles con el festivo cargado', async () => {
    const creada = await radicarSolicitud(
      ctx('admin', ADMIN),
      {
        tipo: 'reclamo',
        canal: 'escrito',
        descripcion: 'Reclamo sintetico de prueba',
        paciente_id: ADULTO,
      },
      AHORA,
    );
    expect(creada.vence_en).toBe('2026-10-26');
    expect(creada.plazo_dias_habiles).toBe(15);
    expect(creada.festivos_cargados).toBe(true);
    expect(creada.aviso_festivos).toBeNull();
    expect(creada.semaforo).toBe('verde');
    expect(creada.etiqueta_semaforo).toBe('En plazo');
    expect(creada.radicado).toMatch(/^HD-2026-\d{6}$/);
  });

  it('sin festivos el aviso queda en la solicitud y el plazo solo omite el fin de semana', async () => {
    await obtenerPool().query(`delete from festivos where tenant_id = $1`, [TENANT]);
    try {
      const creada = await radicarSolicitud(
        ctx('admin', ADMIN),
        { tipo: 'consulta', canal: 'presencial', descripcion: 'Consulta sintetica sin festivos', paciente_id: ADULTO },
        AHORA,
      );
      expect(creada.vence_en).toBe('2026-10-16');
      expect(creada.aviso_festivos).toBe(AVISO_SIN_FESTIVOS);
      expect(creada.festivos_cargados).toBe(false);
    } finally {
      await obtenerPool().query(
        `insert into festivos (tenant_id, anio, fecha, nombre, fuente)
         values ($1, 2026, '2026-10-12', 'Festivo sintético de prueba', 'csv-humano-prueba')
         on conflict (tenant_id, fecha) do nothing`,
        [TENANT],
      );
    }
  });

  it('AC-SEG-07-2: a las 48 h hábiles hay alerta y al marcar se ve la leyenda', async () => {
    const creada = await radicarSolicitud(
      ctx('admin', ADMIN),
      { tipo: 'reclamo', canal: 'presencial', descripcion: 'Reclamo para la marca de tramite', paciente_id: ADULTO },
      AHORA,
    );
    const antes = await listarHabeas(ctx('admin', ADMIN), new Date(LIMITE_48H.getTime() - 1));
    const previa = antes.solicitudes.find((fila) => fila.id === creada.id);
    expect(previa?.alerta_marca).toBe(false);

    const justo = await listarHabeas(ctx('admin', ADMIN), LIMITE_48H);
    const alerta = justo.solicitudes.find((fila) => fila.id === creada.id);
    expect(alerta?.alerta_marca).toBe(true);
    expect(alerta?.semaforo).toBe('amarillo');

    const marcada = await marcarReclamo(ctx('admin', ADMIN), creada.id, LIMITE_48H);
    expect(marcada.leyenda).toBe(LEYENDA_RECLAMO_EN_TRAMITE);
    expect(marcada.estado).toBe('en_tramite');
    expect(marcada.alerta_marca).toBe(false);
    const bandera = await obtenerPool().query<{ leyenda: string }>(
      `select leyenda from banderas_dato where solicitud_id = $1`,
      [creada.id],
    );
    expect(bandera.rows[0]?.leyenda).toBe('reclamo en trámite');
  });

  it('AC-SEG-07-4: la respuesta queda archivada con fecha y quién respondió', async () => {
    const creada = await radicarSolicitud(
      ctx('admin', ADMIN),
      { tipo: 'consulta', canal: 'electronico', descripcion: 'Consulta para archivar respuesta', paciente_id: ADULTO },
      AHORA,
    );
    const respondida = await responderSolicitud(
      ctx('admin', ADMIN),
      creada.id,
      'Respuesta sintetica archivada para el titular',
      AHORA,
    );
    expect(respondida.estado).toBe('respondida');
    expect(respondida.quien_respondio).toBe('admin.t26@example.invalid');
    expect(respondida.respondida_en).toBe(AHORA.toISOString());
    expect(respondida.hora_respuesta_bogota).toContain('2026');
    const bitacora = respondida.bitacora.find((fila) => fila.tipo === 'respuesta');
    expect(bitacora?.quien).toBe('admin.t26@example.invalid');
    expect(bitacora?.texto).toContain('Respuesta sintetica');
    const bloqueo = await obtenerPool().connect();
    try {
      await bloqueo.query('BEGIN');
      await bloqueo.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
      await bloqueo.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
      await bloqueo.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
      await bloqueo.query('SET LOCAL ROLE optisaas_app');
      await expect(
        bloqueo.query(`update bitacora_respuestas_titular set texto = 'cambio' where solicitud_id = $1`, [creada.id]),
      ).rejects.toThrow(/permission denied/i);
      await bloqueo.query('ROLLBACK');
    } finally {
      try {
        await bloqueo.query('ROLLBACK');
      } catch {
        // La transacción ya estaba cerrada.
      }
      bloqueo.release();
    }
    await expect(
      obtenerPool().query(`update bitacora_respuestas_titular set texto = 'cambio' where solicitud_id = $1`, [creada.id]),
    ).rejects.toThrow(/no se modifica/i);
  });

  it('AC-SEG-07-3: la rectificación clínica genera adenda y deja el original', async () => {
    const atencion = await crearAtencion(ctx('optometra'), {
      paciente_id: ADULTO,
      tipo: 'primera_vez',
      motivo: 'Control sintetico sin datos reales',
      examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
      diagnostico: { codigo_cie10: 'H52.1' },
      plan: { conducta: 'Control en doce meses' },
    });
    await firmarAtencion(ctx('optometra'), atencion.id, AHORA);
    const antes = await obtenerPool().query<{ esfera: string }>(
      `select esfera_od::text as esfera from examenes_optometricos where atencion_id = $1`,
      [atencion.id],
    );
    const rectificada = await radicarSolicitud(
      ctx('optometra'),
      {
        tipo: 'rectificacion',
        ambito: 'clinico',
        canal: 'presencial',
        descripcion: 'Rectificacion sintetica de refraccion',
        paciente_id: ADULTO,
        atencion_id: atencion.id,
        campo_ref: 'esfera_od',
        nuevo_valor: '-2.00',
        motivo: 'Correccion sintetica pedida por el titular',
      },
      AHORA,
    );
    expect(rectificada.adenda_id).toBeTruthy();
    expect(rectificada.valor_original).toContain('-1.25');
    const despues = await obtenerPool().query<{ esfera: string; adendas: number }>(
      `select e.esfera_od::text as esfera,
              (select count(*)::int from atencion_adendas a where a.atencion_id = e.atencion_id) as adendas
         from examenes_optometricos e where e.atencion_id = $1`,
      [atencion.id],
    );
    expect(despues.rows[0]?.esfera).toBe(antes.rows[0]?.esfera);
    expect(despues.rows[0]?.adendas).toBe(1);
  });

  it('la rectificación demográfica conserva el valor anterior', async () => {
    await obtenerPool().query(`update pacientes set direccion = 'Calle 26' where id = $1`, [ADULTO]);
    const rectificada = await radicarSolicitud(
      ctx('admin', ADMIN),
      {
        tipo: 'rectificacion',
        ambito: 'demografico',
        canal: 'presencial',
        descripcion: 'Cambio sintetico de direccion',
        paciente_id: ADULTO,
        campo_demografico: 'direccion',
        valor_demografico: 'Carrera 26 sintetica',
      },
      AHORA,
    );
    expect(rectificada.historial_demografico[0]).toMatchObject({
      campo: 'direccion',
      valor_anterior: 'Calle 26',
      valor_nuevo: 'Carrera 26 sintetica',
    });
    const paciente = await obtenerPool().query<{ direccion: string }>(
      `select direccion from pacientes where id = $1`,
      [ADULTO],
    );
    expect(paciente.rows[0]?.direccion).toBe('Carrera 26 sintetica');
  });

  it('la supresión clínica queda bloqueada y no borra la atención', async () => {
    const conteo = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from atenciones where paciente_id = $1`,
      [ADULTO],
    );
    const bloqueada = await radicarSolicitud(
      ctx('admin', ADMIN),
      {
        tipo: 'supresion',
        ambito: 'clinico',
        canal: 'escrito',
        descripcion: 'Peticion sintetica de supresion clinica',
        paciente_id: ADULTO,
      },
      AHORA,
    );
    expect(bloqueada.bloqueo_supresion).toBe(true);
    expect(bloqueada.estado).toBe('respondida');
    expect(bloqueada.respuesta).toContain('BORRADOR – requiere revisión jurídica');
    expect(bloqueada.respuesta).not.toMatch(/\d+\s+años/);
    expect(bloqueada.bitacora.some((fila) => fila.tipo === 'bloqueo_supresion')).toBe(true);
    const despues = await obtenerPool().query<{ total: number }>(
      `select count(*)::int as total from atenciones where paciente_id = $1`,
      [ADULTO],
    );
    expect(despues.rows[0]?.total).toBe(conteo.rows[0]?.total);
  });

  it('otro tenant no ve las solicitudes', async () => {
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE_OTRA]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE_OTRA]);
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const filas = await cliente.query(`select id from solicitudes_titular`);
      expect(filas.rowCount).toBe(0);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });

  it('quien no puede actualizar no marca el reclamo', async () => {
    const creada = await radicarSolicitud(
      ctx('asesor', ADMIN),
      { tipo: 'reclamo', canal: 'presencial', descripcion: 'Reclamo que el asesor no marca', paciente_id: ADULTO },
      AHORA,
    );
    await expect(marcarReclamo(ctx('asesor', ADMIN), creada.id, AHORA)).rejects.toBeInstanceOf(ErrorHabeas);
  });
});
