// OPT-05 (T23) — Prescripción contra PostgreSQL real.
// AC-OPT-05-1 a 05-3, 05-5 y 05-6. I y R. Solo datos sintéticos.
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { crearAtencion, firmarAtencion, type ContextoAtencion } from '../../db/atenciones';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { guardarPaciente, type ContextoPaciente } from '../../db/pacientes';
import {
  actualizarBorrador,
  corregirPrescripcion,
  crearPrescripcion,
  leerPdfPrescripcion,
  leerPrescripcion,
  type ContextoPrescripcion,
} from '../../db/prescripciones';
import { guardarPerfilProfesional } from '../../db/firma';
import { sembrarParametrosIniciales } from '../../db/parametros';
import { cantidadEnLetras, textosElementosArt17 } from '../../dominio/prescripcion';
import { fechaDeFirma } from '../../dominio/prescripcion';
import { hashSha256, textoVisiblePdf } from '../../dominio/firma';
import { verificarPrescripcionPublica } from '../../db/verificacion-prescripcion';
import { MARCA_NO_APLICA, type PacienteEntrada } from '../../dominio/pacientes';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const HOY = fechaDeFirma(AHORA);
const HASH = '23'.repeat(32);

const TENANT = randomUUID();
const OTRO = randomUUID();
const SEDE = randomUUID();
const SEDE_OTRA = randomUUID();
const OPTO = randomUUID();
const ADMIN = randomUUID();
const ASESOR = randomUUID();
const SESION = randomUUID();
const NIT = `900${randomBytes(4).toString('hex').slice(0, 6)}-1`;
const NIT_OTRO = `901${randomBytes(4).toString('hex').slice(0, 6)}-2`;
const DOCUMENTO = '900123023';

function ctx(rol = 'optometra', usuario = OPTO, tenant = TENANT, sede = SEDE): ContextoPrescripcion {
  return {
    tenant_id: tenant,
    usuario_id: usuario,
    sede_id: sede,
    sedes: [sede],
    rol,
    sesion_id: usuario === OPTO ? SESION : null,
    tarjeta_profesional_vigente: rol === 'optometra' || rol === 'oftalmologo',
    ip: '192.0.2.23',
    agente: 'vitest',
  };
}

function paciente(): PacienteEntrada {
  return {
    nombres: 'Ana',
    apellidos: 'Sintetica',
    tipo_doc: 'CC',
    num_doc: DOCUMENTO,
    fecha_nacimiento: '1990-05-05',
    sexo: MARCA_NO_APLICA,
    estado_civil: MARCA_NO_APLICA,
    ocupacion: MARCA_NO_APLICA,
    direccion: MARCA_NO_APLICA,
    telefono: MARCA_NO_APLICA,
    acompanante: MARCA_NO_APLICA,
    responsable: MARCA_NO_APLICA,
    aseguradora: MARCA_NO_APLICA,
    tipo_vinculacion: 'particular',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T23', $3, 'activo'),
        ($2, 'Óptica Sintética T23 B', $4, 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO, NIT, NIT_OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad, direccion) values
        ($1, $3, 'Sede T23', 'Bogotá', 'Calle 23'),
        ($2, $4, 'Sede T23 B', 'Medellín', 'Calle 24')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, 'opto.t23@example.invalid', 'activo'),
        ($2, $4, 'admin.t23@example.invalid', 'activo'),
        ($3, $4, 'asesor.t23@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, ADMIN, ASESOR, TENANT],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.23')
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en`,
      [SESION, TENANT, OPTO, '2026-10-03T18:00:00.000Z', AHORA.toISOString()],
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

function cuerpo(numHc: string, vigencia: string) {
  return {
    atencion_id: '',
    prestador_nombre: 'Optica Sintetica T23',
    direccion: 'Calle 23',
    telefono: '3000000023',
    correo: 'sede.t23@example.invalid',
    lugar: 'Bogota',
    fecha: HOY,
    paciente_nombre: 'Ana Sintetica',
    paciente_documento: DOCUMENTO,
    numero_hc: numHc,
    tipo_usuario: 'particular',
    dispositivo: 'lentes oftalmicos sinteticos',
    agudeza_visual: '20/20',
    forma_uso: 'No aplica',
    distancia_pupilar: '62',
    filtro: 'No aplica',
    duracion_tratamiento: 'No aplica',
    cantidad_num: 2,
    cantidad_letras: 'dos',
    indicaciones: 'Uso sintetico',
    vigencia_hasta: vigencia,
    nombre_prescriptor: 'Optometra Sintetico T23',
    registro_profesional: 'RP-SINTETICO-23',
    tipo: 'lentes_oftalmicos',
  };
}

describe('prescripciones en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't23',
      claves: new Map([['t23', randomBytes(32)]]),
    });
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
    await sembrarParametrosIniciales(TENANT);
    await guardarPerfilProfesional(
      { tenant_id: TENANT, usuario_id: ADMIN, sede_id: SEDE, sedes: [SEDE], rol: 'admin', sesion_id: null },
      {
        usuarioId: OPTO,
        nombreCompleto: 'Optometra Sintetico T23',
        registroProfesional: 'RP-SINTETICO-23',
        vigenteHasta: '2099-12-31',
      },
      AHORA,
    );
  }, 30000);

  afterAll(async () => {
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-OPT-05-1, AC-OPT-05-2, AC-OPT-05-3, AC-OPT-05-4, AC-OPT-05-5 y AC-OPT-05-6: firma, PDF, inmutabilidad, asesor, vigencia y RLS', async () => {
    const catalogo = await obtenerPool().query<{ tabla: string; rls: boolean; forzado: boolean; politicas: string }>(
      `select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as forzado,
              (select count(*) from pg_policy p where p.polrelid = c.oid)::text as politicas
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in ('prescripciones', 'secuencias_prescripcion')
        order by c.relname`,
    );
    expect(catalogo.rows).toHaveLength(2);
    for (const fila of catalogo.rows) {
      expect(fila.rls, fila.tabla).toBe(true);
      expect(fila.forzado, fila.tabla).toBe(true);
      expect(Number(fila.politicas), fila.tabla).toBeGreaterThan(0);
    }
    const defecto = await obtenerPool().query<{ column_default: string | null }>(
      `select column_default from information_schema.columns
        where table_name = 'prescripciones' and column_name = 'vigencia_hasta'`,
    );
    expect(defecto.rows[0]?.column_default).toBeNull();

    const guardado = await guardarPaciente(ctx() as ContextoPaciente, paciente(), { ahora: AHORA });
    await autorizar(guardado.id);
    const atencion = await crearAtencion(ctx() as ContextoAtencion, {
      paciente_id: guardado.id,
      tipo: 'primera_vez',
      motivo: 'Control sintetico de prescripcion',
      examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
      diagnostico: { codigo_cie10: 'H52.1' },
      plan: { conducta: 'Borrador sintetico' },
    });
    await firmarAtencion(ctx() as ContextoAtencion, atencion.id, AHORA);

    const base = cuerpo(String(guardado.num_hc), '2020-01-01');
    base.atencion_id = atencion.id;
    await expect(crearPrescripcion(ctx(), { ...base, vigencia_hasta: '' }, AHORA)).rejects.toMatchObject({
      status: 422,
    });
    await expect(crearPrescripcion(ctx(), { ...base, vigencia_hasta: '' }, AHORA)).rejects.toThrow(/vigencia_hasta/);
    await expect(crearPrescripcion(ctx('asesor', ASESOR), base, AHORA)).rejects.toMatchObject({ status: 403 });

    const firmada = await crearPrescripcion(ctx(), base, AHORA);
    const indicaciones = await obtenerPool().query<{ indicaciones: string }>(
      `select indicaciones from prescripciones where id = $1`,
      [firmada.id],
    );
    expect(indicaciones.rows[0]?.indicaciones.startsWith('opt1:')).toBe(true);
    expect(indicaciones.rows[0]?.indicaciones).not.toContain('Uso sintetico');
    expect(firmada.campos.indicaciones).toBe('Uso sintetico');
    expect(firmada.numero).toMatch(/^RX-2026-\d{6}$/);
    expect(firmada.estado).toBe('firmada');
    expect(firmada.numero_hc).toBe(String(guardado.num_hc));
    expect(firmada.vigencia_hasta).toBe('2020-01-01');
    expect(firmada.cantidad_num).toBe(2);
    expect(firmada.cantidad_letras).toBe('dos');
    expect(firmada.dispensacion).toEqual({ dispensable: false, motivo: 'vencida' });
    expect(firmada.hash_pdf).toMatch(/^[a-f0-9]{64}$/);

    await expect(actualizarBorrador(ctx('asesor', ASESOR), firmada.id, { indicaciones: 'cambio' })).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      obtenerPool().query(`update prescripciones set indicaciones = 'cambio' where id = $1`, [firmada.id]),
    ).rejects.toThrow(/inmutable|UPDATE prohibido/);

    const corregida = await corregirPrescripcion(
      ctx(),
      firmada.id,
      { ...base, vigencia_hasta: '2027-04-01', cantidad_num: 3, cantidad_letras: 'tres' },
      AHORA,
    );
    expect(corregida.sustituye_a).toBe(firmada.id);
    expect(corregida.numero).not.toBe(firmada.numero);
    expect(corregida.dispensacion.dispensable).toBe(true);
    const anterior = await leerPrescripcion(ctx(), firmada.id, AHORA);
    expect(anterior.reducido).toBe(false);
    if (!anterior.reducido) expect(anterior.prescripcion.estado_visible).toBe('sustituida');
    const almacenado = await obtenerPool().query<{ estado: string }>(
      `select estado from prescripciones where id = $1`,
      [firmada.id],
    );
    expect(almacenado.rows[0]?.estado).toBe('firmada');

    const ajena = await obtenerPool().connect();
    try {
      await ajena.query('BEGIN');
      await ajena.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await ajena.query(`select set_config('app.rol', 'optometra', true)`);
      await ajena.query('SET LOCAL ROLE optisaas_app');
      const ocultas = await ajena.query(`select id from prescripciones where id = $1`, [firmada.id]);
      expect(ocultas.rowCount).toBe(0);
      await ajena.query('ROLLBACK');
    } finally {
      ajena.release();
    }

    const asesorSql = await obtenerPool().connect();
    try {
      await asesorSql.query('BEGIN');
      await asesorSql.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
      await asesorSql.query(`select set_config('app.rol', 'asesor', true)`);
      await asesorSql.query('SET LOCAL ROLE optisaas_app');
      await expect(
        asesorSql.query(
          `insert into prescripciones (tenant_id, sede_id, atencion_id, paciente_id, profesional_id, tipo, contenido)
           values ($1, $2, $3, $4, $5, 'lentes_oftalmicos', 'borrador')`,
          [TENANT, SEDE, atencion.id, guardado.id, ASESOR],
        ),
      ).rejects.toThrow(/row-level security|permiso/);
      await asesorSql.query('ROLLBACK');
    } finally {
      asesorSql.release();
    }

    const letras = await obtenerPool().query<{ n: number; letras: string }>(
      `select n, prescripcion_cantidad_en_letras(n) as letras
         from generate_series(1, 80) as n
        union all
        select n, prescripcion_cantidad_en_letras(n)
          from (values (100), (101), (1000), (1100), (2001)) as extra(n)`,
    );
    for (const fila of letras.rows) {
      expect(fila.letras, String(fila.n)).toBe(cantidadEnLetras(Number(fila.n)));
    }

    await expect(leerPdfPrescripcion(ctx('asesor', ASESOR), corregida.id)).rejects.toMatchObject({ status: 403 });
    const pdf = await leerPdfPrescripcion(ctx(), corregida.id);
    const binario = Buffer.from(pdf.pdf_base64, 'base64');
    expect(binario.subarray(0, 4).toString()).toBe('%PDF');
    expect(hashSha256(binario)).toBe(pdf.hash_documento);
    expect(pdf.hash_documento).toBe(corregida.hash_pdf);
    const texto = textoVisiblePdf(binario);
    const elementos = textosElementosArt17({
      ...cuerpo(String(guardado.num_hc), '2027-04-01'),
      cantidad_num: 3,
      cantidad_letras: 'tres',
      numero: corregida.numero ?? '',
      tipo: 'lentes_oftalmicos',
    });
    expect(elementos).toHaveLength(15);
    for (const elemento of elementos) expect(texto, elemento).toContain(elemento);
    expect(texto).toContain('Nombre completo del prescriptor: Optometra Sintetico T23');
    expect(texto).toContain('Registro profesional: RP-SINTETICO-23');
    const guardadoHash = await obtenerPool().query<{
      hash_verificacion: string;
      paciente_nombre: string;
      paciente_documento: string;
    }>(
      `select hash_verificacion, paciente_nombre, paciente_documento from prescripciones where id = $1`,
      [corregida.id],
    );
    expect(texto).toContain(guardadoHash.rows[0]?.hash_verificacion ?? '');
    const publica = await verificarPrescripcionPublica(guardadoHash.rows[0]?.hash_verificacion ?? '');
    expect(publica.coincide).toBe(true);
    expect(publica.numero).toBe(corregida.numero);
    expect(publica.fecha_emision).toBe('03/10/2026');
    expect(publica.nombre_prescriptor).toBe('Optometra Sintetico T23');
    expect(publica.registro_profesional).toBe('RP-SINTETICO-23');
    expect(JSON.stringify(publica)).not.toContain(guardadoHash.rows[0]?.paciente_nombre ?? 'Ana');
    expect(JSON.stringify(publica)).not.toContain(DOCUMENTO);
    expect(await verificarPrescripcionPublica('ab'.repeat(32))).toEqual({ coincide: false });
    const columnas = await obtenerPool().query<{ nombres: string[]; definicion: string }>(
      `select p.proargnames as nombres, pg_get_functiondef(p.oid) as definicion
         from pg_proc p
        where p.proname = 'verificar_prescripcion_por_hash'`,
    );
    expect(columnas.rows[0]?.nombres).toEqual([
      'p_hash',
      'numero',
      'fecha_emision',
      'nombre_prescriptor',
      'registro_profesional',
    ]);
    expect(columnas.rows[0]?.definicion ?? '').not.toContain('paciente_nombre');
    expect(columnas.rows[0]?.definicion ?? '').not.toContain('paciente_documento');
    await leerPdfPrescripcion(ctx(), corregida.id, 'impresion');
    const auditoria = await obtenerPool().query<{ accion: string }>(
      `select accion from auditoria where recurso = 'prescripcion' and recurso_id = $1 order by id`,
      [corregida.id],
    );
    expect(auditoria.rows.map((fila) => fila.accion)).toEqual(expect.arrayContaining(['firmar', 'descarga', 'impresion']));

    const reducido = await leerPrescripcion(ctx('asesor', ASESOR), corregida.id, AHORA);
    expect(reducido.reducido).toBe(true);
    if (reducido.reducido) {
      expect(reducido.tieneDiagnostico).toBe(false);
      expect(reducido.dto).not.toHaveProperty('atencion_id');
    }
  });
});
