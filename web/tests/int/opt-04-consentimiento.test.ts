// OPT-04 (T22) — Consentimiento contra PostgreSQL real.
// AC-OPT-04-1, AC-OPT-04-2 y AC-OPT-04-3. Solo datos sintéticos.
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearAtencion, type ContextoAtencion } from '../../db/atenciones';
import {
  evaluarInicioProcedimiento,
  publicarPlantillaConsentimiento,
  registrarConsentimiento,
  revocarConsentimiento,
} from '../../db/consentimientos';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { guardarPaciente, type ContextoPaciente } from '../../db/pacientes';
import { PROCEDIMIENTO_ADAPTACION_LC, plantillaBorrador } from '../../dominio/consentimiento-clinico';
import { hashSha256 } from '../../dominio/firma';
import { MARCA_NO_APLICA, type PacienteEntrada } from '../../dominio/pacientes';
import { crearAlmacenBdCifrada } from '../../lib/firma/almacen';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HASH = '22'.repeat(32);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const TENANT = randomUUID();
const OTRO = randomUUID();
const SEDE = randomUUID();
const SEDE_OTRA = randomUUID();
const OPTO = randomUUID();
const OTRO_USUARIO = randomUUID();
const NIT = `900${randomBytes(4).toString('hex').slice(0, 6)}-1`;
const NIT_OTRO = `901${randomBytes(4).toString('hex').slice(0, 6)}-2`;

function ctx(rol = 'optometra', usuario = OPTO, tenant = TENANT, sede = SEDE): ContextoAtencion {
  return {
    tenant_id: tenant,
    usuario_id: usuario,
    sede_id: sede,
    sedes: [sede],
    rol,
    sesion_id: null,
    tarjeta_profesional_vigente: true,
    ip: '192.0.2.22',
    agente: 'vitest',
  };
}

function paciente(num: string): PacienteEntrada {
  return {
    nombres: 'Ana',
    apellidos: 'Sintetica',
    tipo_doc: 'CC',
    num_doc: num,
    fecha_nacimiento: '1990-05-05',
    sexo: MARCA_NO_APLICA,
    estado_civil: MARCA_NO_APLICA,
    ocupacion: MARCA_NO_APLICA,
    direccion: MARCA_NO_APLICA,
    telefono: MARCA_NO_APLICA,
    acompanante: MARCA_NO_APLICA,
    responsable: MARCA_NO_APLICA,
    aseguradora: MARCA_NO_APLICA,
    tipo_vinculacion: 'no_aplica',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T22', $3, 'activo'),
        ($2, 'Óptica Sintética T22 B', $4, 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO, NIT, NIT_OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T22', 'Bogotá'),
        ($2, $4, 'Sede T22 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $3, 'opto.t22@example.invalid', 'activo'),
        ($2, $4, 'opto.t22b@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, OTRO_USUARIO, TENANT, OTRO],
    );
    await cliente.query(
      `insert into catalogo_cie10 (codigo, descripcion, version, vigente_desde)
       values ('H52.1', 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10', 'sintetica-prueba-2026', '2026-01-01')
       on conflict (codigo, version) do nothing`,
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function autorizar(pacienteId: string) {
  const ya = await obtenerPool().query(
    `select 1 from autorizaciones where paciente_id = $1 and finalidad = 'tratamiento_clinico' and estado = 'otorgada'`,
    [pacienteId],
  );
  if ((ya.rowCount ?? 0) > 0) return;
  const texto = await obtenerPool().query<{ id: string }>(
    `insert into textos_legales (
       tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde
     ) values ($1, 'autorizacion_tratamiento', 'tratamiento_clinico', 'Tratamiento', false, 1, $2, $3, $4)
     on conflict (tenant_id, codigo, version) do update set etiqueta = textos_legales.etiqueta
     returning id`,
    [TENANT, 'BORRADOR – requiere revisión jurídica', HASH, AHORA.toISOString()],
  );
  await obtenerPool().query(
    `insert into autorizaciones (
       tenant_id, paciente_id, texto_id, finalidad, otorgada, estado, medio, evidencia,
       contenido_exacto, hash_texto, registrada_en
     ) values ($1,$2,$3,'tratamiento_clinico',true,'otorgada','presencial','{}'::jsonb,$4,$5,$6)`,
    [TENANT, pacienteId, texto.rows[0]?.id, 'BORRADOR – requiere revisión jurídica', HASH, AHORA.toISOString()],
  );
}

describe('consentimientos clínicos en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't22',
      claves: new Map([['t22', randomBytes(32)]]),
    });
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
  }, 30000);

  afterAll(async () => {
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-OPT-04-1, AC-OPT-04-2 y AC-OPT-04-3: puerta, versión conservada, PDF y revocatoria', async () => {
    const catalogo = await obtenerPool().query<{ tabla: string; rls: boolean; forzado: boolean; politicas: string }>(
      `select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as forzado,
              (select count(*) from pg_policy p where p.polrelid = c.oid) as politicas
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname in ('plantillas_consentimiento', 'consentimientos', 'consentimientos_revocatorias')
        order by c.relname`,
    );
    expect(catalogo.rows).toHaveLength(3);
    for (const fila of catalogo.rows) {
      expect(fila.rls, fila.tabla).toBe(true);
      expect(fila.forzado, fila.tabla).toBe(true);
      expect(Number(fila.politicas), fila.tabla).toBeGreaterThan(0);
    }

    const guardado = await guardarPaciente(ctx() as ContextoPaciente, paciente('900122001'), { ahora: AHORA });
    await autorizar(guardado.id);
    const atencion = await crearAtencion(ctx(), {
      paciente_id: guardado.id,
      tipo: 'primera_vez',
      motivo: 'Control sintetico de consentimiento',
      examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
      diagnostico: { codigo_cie10: 'H52.1' },
      plan: { conducta: 'Borrador sintetico' },
    });

    expect(await evaluarInicioProcedimiento(ctx(), atencion.id, 'control_visual')).toEqual({
      permitida: true,
      motivo: 'no_exige',
    });
    expect(await evaluarInicioProcedimiento(ctx(), atencion.id, PROCEDIMIENTO_ADAPTACION_LC)).toEqual({
      permitida: false,
      motivo: 'sin_consentimiento',
    });

    const negado = await registrarConsentimiento(
      ctx(),
      { atencionId: atencion.id, procedimiento: PROCEDIMIENTO_ADAPTACION_LC, decision: 'negado' },
      AHORA,
    );
    expect(negado.puertas.adaptacion_lc).toEqual({ permitida: false, motivo: 'negado' });

    const firmado = await registrarConsentimiento(
      ctx(),
      {
        atencionId: atencion.id,
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        decision: 'otorgado',
        trazoPng: PNG,
        trazoPuntos: [{ points: [{ x: 4, y: 8, time: 12 }] }],
        acuerdo: true,
      },
      AHORA,
    );
    expect(firmado.puertas.adaptacion_lc).toEqual({ permitida: true, motivo: 'firmado_vigente' });
    const primero = firmado.consentimientos.find((fila) => fila.otorgado && !fila.revocado);
    expect(primero?.version).toBe(1);
    expect(primero?.firma_id).toBeTruthy();
    expect(primero?.hash_anexo).toMatch(/^[a-f0-9]{64}$/);
    expect(primero?.texto).toBe(plantillaBorrador('adaptacion_lc'));

    const anexo = await obtenerPool().query<{
      hash_anexo: string;
      hash_documento: string;
      hash_sha256: string;
      estado: string;
      atencion_id: string;
      firma_id: string;
      anexo_id: string;
    }>(
      `select c.hash_anexo, c.atencion_id, c.firma_id, c.anexo_id::text as anexo_id,
              d.hash_documento, d.estado, a.hash_sha256
         from consentimientos c
         join documentos_firma d on d.id = c.documento_firma_id
         join anexos a on a.id = c.anexo_id
        where c.id = $1`,
      [primero?.id],
    );
    const filaAnexo = anexo.rows[0];
    expect(filaAnexo?.estado).toBe('sellado');
    expect(filaAnexo?.atencion_id).toBe(atencion.id);
    expect(filaAnexo?.firma_id).toBeTruthy();
    expect(filaAnexo?.hash_anexo).toBe(filaAnexo?.hash_documento);
    expect(filaAnexo?.hash_anexo).toBe(filaAnexo?.hash_sha256);
    const lectura = await crearAlmacenBdCifrada().leer(TENANT, filaAnexo?.anexo_id ?? '');
    expect(lectura).toBeTruthy();
    expect(hashSha256(lectura!.contenido)).toBe(filaAnexo?.hash_anexo);

    const textoV1 = primero?.texto ?? '';
    const publicada = await publicarPlantillaConsentimiento(ctx(), {
      procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
      contenido: `${textoV1}\nCambio sintetico de la plantilla.`,
    });
    expect(publicada.version).toBe(2);
    expect(publicada.cambio).toBe(true);
    const previa = await obtenerPool().query<{ version: number; texto: string; vigente: boolean }>(
      `select version, texto, vigente from plantillas_consentimiento
        where tenant_id = $1 and procedimiento = 'adaptacion_lc' and version = 1`,
      [TENANT],
    );
    expect(previa.rows[0]?.texto).toBe(textoV1);
    expect(previa.rows[0]?.vigente).toBe(false);
    const conservado = await obtenerPool().query<{ version_plantilla: number; contenido: string }>(
      `select version_plantilla, contenido from consentimientos where id = $1`,
      [primero?.id],
    );
    expect(conservado.rows[0]).toEqual({ version_plantilla: 1, contenido: textoV1 });
    expect((await evaluarInicioProcedimiento(ctx(), atencion.id, PROCEDIMIENTO_ADAPTACION_LC)).motivo).toBe(
      'version_no_vigente',
    );

    const renovado = await registrarConsentimiento(
      ctx(),
      {
        atencionId: atencion.id,
        procedimiento: PROCEDIMIENTO_ADAPTACION_LC,
        decision: 'otorgado',
        trazoPng: PNG,
        trazoPuntos: [{ points: [{ x: 6, y: 9, time: 14 }] }],
        acuerdo: true,
      },
      AHORA,
    );
    expect(renovado.puertas.adaptacion_lc.motivo).toBe('firmado_vigente');
    expect(renovado.consentimientos[0]?.version).toBe(2);

    const revocado = await revocarConsentimiento(ctx(), atencion.id, PROCEDIMIENTO_ADAPTACION_LC);
    expect(revocado.puertas.adaptacion_lc).toEqual({ permitida: false, motivo: 'revocado' });
    const original = await obtenerPool().query<{ otorgado: boolean; total: string; revocatorias: string }>(
      `select c.otorgado,
              (select count(*) from consentimientos where id = c.id) as total,
              (select count(*) from consentimientos_revocatorias r where r.consentimiento_id = c.id) as revocatorias
         from consentimientos c
        where c.id = $1`,
      [renovado.consentimientos[0]?.id],
    );
    expect(original.rows[0]?.otorgado).toBe(true);
    expect(original.rows[0]?.total).toBe('1');
    expect(original.rows[0]?.revocatorias).toBe('1');

    await expect(
      obtenerPool().query(`delete from consentimientos where id = $1`, [primero?.id]),
    ).rejects.toMatchObject({ code: '55000' });
    await expect(
      obtenerPool().query(`update consentimientos set contenido = 'alterado' where id = $1`, [primero?.id]),
    ).rejects.toMatchObject({ code: '55000' });

    const ajeno = await obtenerPool().connect();
    try {
      await ajeno.query('BEGIN');
      await ajeno.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await ajeno.query(`select set_config('app.usuario_id', $1, true)`, [OTRO_USUARIO]);
      await ajeno.query(`select set_config('app.rol', 'optometra', true)`);
      await ajeno.query('SET LOCAL ROLE optisaas_app');
      const oculto = await ajeno.query(`select id from consentimientos`);
      expect(oculto.rowCount).toBe(0);
      await ajeno.query('COMMIT');
    } finally {
      ajeno.release();
    }
  });
});
