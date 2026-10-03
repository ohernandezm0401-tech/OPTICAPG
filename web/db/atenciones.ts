// OPT-01 / OPT-24 (T19) — API de la atención. Autorización con CASL (T09),
// lectura en la bitácora (T10), inmutabilidad al firmar (T12) y firma
// electrónica con el servicio de T14. La puerta de datos es `puedeAbrirAtencion` (T15).
// TODO(Q-25): no se guarda modalidad distinta de presencial.
// TODO(Q-26): solo el rol optometra firma.
import 'server-only';

import type { PoolClient } from 'pg';

import { ErrorFirma, crearDocumentoAtencion, firmarProfesional, type ContextoFirma } from './firma';
import { obtenerPool } from './index';
import { puedeFirmarAtencion, puedeIniciarAtencionClinica } from '../dominio/atencion-optica';
import { CODIGO_TRATAMIENTO, type EstadoAutorizacion } from '../dominio/autorizacion-datos';
import { fechaCivilEnZona } from '../dominio/fechas';
import { fechaUltimaTrasFolio } from '../dominio/retencion';
import { ZONA_BOGOTA } from '../dominio/pacientes';
import { codigoHttpFirma, lineaSelloProfesional, presentarBogota } from '../dominio/firma';
import {
  SCHEMA_VERSION_ATENCION,
  crearEsquemasAtencion,
  modalidadGuardada,
  type ActualizarAtencionEntrada,
  type CrearAtencionEntrada,
  type ExamenOptometrico,
  type TextoSeccion,
} from '../dominio/valores-opticos';
import { ErrorLimites, leerLimitesCaptura } from './limites-captura';
import { abrirHistoriaClinica } from '../lib/auditoria/lecturas';
import type { ActorAuthz, SujetoRecurso } from '../lib/authz/ability';
import { ErrorAutorizacion, exigirPuede } from '../lib/authz/exigir';
import { z } from 'zod';

export class ErrorAtencion extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAtencion';
    this.status = status;
  }
}

export interface ContextoAtencion {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
  sesion_id: string | null;
  tarjeta_profesional_vigente: boolean;
  ip?: string | null;
  agente?: string | null;
  request_id?: string | null;
}

export interface AtencionVista {
  id: string;
  estado: string;
  modalidad: string;
  tipo: string;
  folio: number | null;
  fecha_atencion: string;
  firmado_en: string | null;
  hora_bogota: string | null;
  motivo: string;
  antecedentes: string;
  queratometria: string;
  salud_ocular: string;
  sello: string | null;
  version_borrador: number;
  schema_version: number;
  examen: Record<string, number | null>;
  diagnostico: { codigo_cie10: string; descripcion: string; principal: boolean } | null;
  plan: {
    conducta: string;
    recomendaciones: string | null;
    remision: string | null;
    proximo_control: string | null;
  } | null;
}

const CAMPOS_EXAMEN = [
  'esfera_od',
  'cilindro_od',
  'eje_od',
  'adicion_od',
  'agudeza_od',
  'esfera_oi',
  'cilindro_oi',
  'eje_oi',
  'adicion_oi',
  'agudeza_oi',
  'dip',
  'dip_monocular_od',
  'dip_monocular_oi',
] as const;

function actorDe(ctx: ContextoAtencion): ActorAuthz {
  return {
    id: ctx.usuario_id,
    rol: ctx.rol,
    tenantId: ctx.tenant_id,
    sedeActiva: ctx.sede_id,
    sedesAutorizadas: ctx.sedes,
    tarjetaProfesionalVigente: ctx.tarjeta_profesional_vigente,
  };
}

function sujeto(ctx: ContextoAtencion, extra: Partial<SujetoRecurso>): SujetoRecurso {
  return {
    tipo: 'R3',
    tenantId: ctx.tenant_id,
    sedeId: ctx.sede_id,
    autorId: extra.autorId ?? ctx.usuario_id,
    pacientesEnSede: ctx.sedes.includes(ctx.sede_id),
    borrador: extra.borrador ?? true,
    ...extra,
  };
}

function exigir(ctx: ContextoAtencion, accion: 'crear' | 'leer' | 'actualizar' | 'firmar', extra: Partial<SujetoRecurso> = {}) {
  try {
    exigirPuede(actorDe(ctx), accion, sujeto(ctx, extra));
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      throw new ErrorAtencion(403, error.message);
    }
    throw error;
  }
}

function exigirUuid(ctx: ContextoAtencion) {
  const valido = z.object({
    tenant_id: z.uuid(),
    usuario_id: z.uuid(),
    sede_id: z.uuid(),
  }).safeParse(ctx);
  if (!valido.success) {
    throw new ErrorAtencion(400, 'La sesión de demostración no puede abrir la atención.');
  }
}

async function conApp<T>(ctx: ContextoAtencion, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [ctx.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ctx.usuario_id]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [ctx.sede_id]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [ctx.sedes.join(',')]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [ctx.rol]);
    await cliente.query(`select set_config('app.role', $1, true)`, [ctx.rol]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error original.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

function traducir(error: unknown): never {
  if (error instanceof ErrorLimites) throw new ErrorAtencion(error.status, error.message);
  if (error instanceof ErrorAtencion || error instanceof ErrorAutorizacion) throw error;
  if (error instanceof ErrorFirma) {
    throw new ErrorAtencion(codigoHttpFirma(error.codigo, error.message), error.message);
  }
  const mensaje = error instanceof Error ? error.message : '';
  if (/inmutable|prohibido|transicion de estado/i.test(mensaje)) {
    throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
  }
  if (error instanceof Error) throw error;
  throw new ErrorAtencion(400, 'No se pudo guardar la atención.');
}

function parsear<T>(resultado: { success: true; data: T } | { success: false; error: z.ZodError }): T {
  if (!resultado.success) {
    throw new ErrorAtencion(400, resultado.error.issues[0]?.message ?? 'La atención no es válida.');
  }
  return resultado.data;
}

function nulo(valor: number | null | undefined): number | null {
  return valor == null ? null : valor;
}

function texto(valor: string | null | undefined): string | null {
  const limpio = valor?.trim() ?? '';
  return limpio.length > 0 ? limpio : null;
}

function contenidoExamen(examen: ExamenOptometrico): string {
  return JSON.stringify({ schema_version: SCHEMA_VERSION_ATENCION, ...examen });
}

interface ContenidoAtencion {
  motivo: string;
  antecedentes: TextoSeccion;
  queratometria: TextoSeccion;
  salud_ocular: TextoSeccion;
}

function seccion(valor: TextoSeccion | undefined): TextoSeccion {
  return { texto: valor?.texto?.trim() ?? '' };
}

function parsearContenido(texto: string): ContenidoAtencion {
  try {
    const parsed = JSON.parse(texto) as Partial<ContenidoAtencion>;
    return {
      motivo: typeof parsed.motivo === 'string' ? parsed.motivo : '',
      antecedentes: seccion(parsed.antecedentes),
      queratometria: seccion(parsed.queratometria),
      salud_ocular: seccion(parsed.salud_ocular),
    };
  } catch {
    return { motivo: '', antecedentes: { texto: '' }, queratometria: { texto: '' }, salud_ocular: { texto: '' } };
  }
}

function serializarContenido(dato: ContenidoAtencion): string {
  return JSON.stringify({ schema_version: SCHEMA_VERSION_ATENCION, ...dato });
}

async function describirCie10(cliente: PoolClient, codigo: string): Promise<string> {
  const filas = await cliente.query<{ descripcion: string }>(
    `select descripcion from catalogo_cie10
      where codigo = $1
        and (vigente_hasta is null or vigente_hasta >= current_date)
      order by vigente_desde desc
      limit 1`,
    [codigo],
  );
  const descripcion = filas.rows[0]?.descripcion;
  if (!descripcion) {
    throw new ErrorAtencion(
      422,
      'El diagnóstico principal exige un código CIE-10 del catálogo cargado. No se acepta texto libre.',
    );
  }
  return descripcion;
}

async function puertaPaciente(cliente: PoolClient, pacienteId: string, urgencia: boolean) {
  const paciente = await cliente.query<{ fecha_nacimiento: string }>(
    `select fecha_nacimiento::text as fecha_nacimiento from pacientes where id = $1`,
    [pacienteId],
  );
  const fila = paciente.rows[0];
  if (!fila) throw new ErrorAtencion(404, 'No se encontró el paciente.');
  const representante = await cliente.query(
    `select 1 from pacientes_representantes where paciente_id = $1 and vigente = true limit 1`,
    [pacienteId],
  );
  const autorizacion = await cliente.query<{ estado: EstadoAutorizacion }>(
    `select estado from autorizaciones
      where paciente_id = $1 and finalidad = $2
      order by registrada_en desc
      limit 1`,
    [pacienteId, CODIGO_TRATAMIENTO],
  );
  const hoy = fechaCivilEnZona(new Date(), ZONA_BOGOTA);
  const puerta = puedeIniciarAtencionClinica({
    urgencia,
    estadoTratamiento: autorizacion.rows[0]?.estado ?? null,
    fechaNacimiento: fila.fecha_nacimiento,
    hoy,
    tieneRepresentanteVigente: representante.rows.length > 0,
  });
  if (!puerta.permitida) {
    const mensaje =
      puerta.motivo === 'menor_sin_representante'
        ? 'No se puede iniciar la atención: el paciente es menor y no tiene representante.'
        : 'No se puede iniciar la atención sin autorización de datos vigente.';
    throw new ErrorAtencion(422, mensaje);
  }
}

async function insertarExamen(cliente: PoolClient, ctx: ContextoAtencion, atencionId: string, examen: ExamenOptometrico) {
  await cliente.query(
    `insert into examenes_optometricos (
       tenant_id, atencion_id, estado, contenido,
       esfera_od, cilindro_od, eje_od, adicion_od, agudeza_od,
       esfera_oi, cilindro_oi, eje_oi, adicion_oi, agudeza_oi,
       dip, dip_monocular_od, dip_monocular_oi
     ) values (
       $1, $2, 'borrador', $3,
       $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13,
       $14, $15, $16
     )`,
    [
      ctx.tenant_id,
      atencionId,
      contenidoExamen(examen),
      nulo(examen.esfera_od),
      nulo(examen.cilindro_od),
      nulo(examen.eje_od),
      nulo(examen.adicion_od),
      nulo(examen.agudeza_od),
      nulo(examen.esfera_oi),
      nulo(examen.cilindro_oi),
      nulo(examen.eje_oi),
      nulo(examen.adicion_oi),
      nulo(examen.agudeza_oi),
      nulo(examen.dip),
      nulo(examen.dip_monocular_od),
      nulo(examen.dip_monocular_oi),
    ],
  );
}

async function insertarDiagnostico(cliente: PoolClient, ctx: ContextoAtencion, atencionId: string, codigo: string) {
  const descripcion = await describirCie10(cliente, codigo);
  const contenido = JSON.stringify({ schema_version: SCHEMA_VERSION_ATENCION, codigo_cie10: codigo, principal: true });
  await cliente.query(
    `insert into diagnosticos (
       tenant_id, atencion_id, estado, contenido, codigo_cie10, descripcion, principal
     ) values ($1, $2, 'borrador', $3, $4, $5, true)`,
    [ctx.tenant_id, atencionId, contenido, codigo, descripcion],
  );
}

async function insertarPlan(
  cliente: PoolClient,
  ctx: ContextoAtencion,
  atencionId: string,
  plan: CrearAtencionEntrada['plan'],
) {
  const recomendaciones = texto(plan.recomendaciones);
  const remision = texto(plan.remision);
  const control = plan.proximo_control ?? null;
  await cliente.query(
    `insert into planes_manejo (
       tenant_id, atencion_id, estado, contenido, conducta, recomendaciones, remision, proximo_control
     ) values ($1, $2, 'borrador', $3, $4, $5, $6, $7)`,
    [
      ctx.tenant_id,
      atencionId,
      JSON.stringify({ schema_version: SCHEMA_VERSION_ATENCION, conducta: plan.conducta }),
      plan.conducta,
      recomendaciones,
      remision,
      control,
    ],
  );
}

async function estadoAtencion(cliente: PoolClient, id: string): Promise<string | null> {
  const filas = await cliente.query<{ estado: string }>(`select estado from atenciones where id = $1`, [id]);
  return filas.rows[0]?.estado ?? null;
}

async function exigirBorrador(cliente: PoolClient, id: string) {
  const estado = await estadoAtencion(cliente, id);
  if (!estado) throw new ErrorAtencion(404, 'No se encontró la atención.');
  if (estado !== 'borrador') throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
}

function numeroFila(valor: string | number | null): number | null {
  if (valor == null || valor === '') return null;
  const numeroValor = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numeroValor) ? numeroValor : null;
}

async function leerVista(cliente: PoolClient, id: string): Promise<AtencionVista> {
  const atencion = await cliente.query<{
    id: string;
    estado: string;
    modalidad: string;
    tipo: string;
    folio: number | null;
    fecha_atencion: Date;
    firmado_en: Date | null;
    contenido: string;
    schema_version: number;
    version_borrador: number;
    firma_documento_id: string | null;
  }>(
    `select id, estado, modalidad, tipo, folio, fecha_atencion, firmado_en, contenido,
            schema_version, version_borrador, firma_documento_id
       from atenciones where id = $1`,
    [id],
  );
  const fila = atencion.rows[0];
  if (!fila) throw new ErrorAtencion(404, 'No se encontró la atención.');
  const contenido = parsearContenido(fila.contenido);
  let sello: string | null = null;
  if (fila.firma_documento_id) {
    const firma = await cliente.query<{
      nombre_firmante: string | null;
      registro_profesional: string | null;
      firmado_en: Date;
    }>(
      `select nombre_firmante, registro_profesional, firmado_en
         from firmas
        where documento_id = $1 and tipo_firmante = 'profesional'
        limit 1`,
      [fila.firma_documento_id],
    );
    const profesional = firma.rows[0];
    if (profesional?.nombre_firmante && profesional.registro_profesional) {
      sello = lineaSelloProfesional(
        profesional.nombre_firmante,
        profesional.registro_profesional,
        new Date(profesional.firmado_en),
      );
    }
  }
  const examen = await cliente.query<Record<string, string | number | null>>(
    `select esfera_od, cilindro_od, eje_od, adicion_od, agudeza_od,
            esfera_oi, cilindro_oi, eje_oi, adicion_oi, agudeza_oi,
            dip, dip_monocular_od, dip_monocular_oi
       from examenes_optometricos where atencion_id = $1`,
    [id],
  );
  const diagnostico = await cliente.query<{ codigo_cie10: string; descripcion: string; principal: boolean }>(
    `select codigo_cie10, descripcion, principal from diagnosticos
      where atencion_id = $1 and principal = true
      limit 1`,
    [id],
  );
  const plan = await cliente.query<{
    conducta: string;
    recomendaciones: string | null;
    remision: string | null;
    proximo_control: string | null;
  }>(
    `select conducta, recomendaciones, remision, proximo_control::text as proximo_control
       from planes_manejo where atencion_id = $1`,
    [id],
  );
  const valores: Record<string, number | null> = {};
  const crudo = examen.rows[0] ?? {};
  for (const campo of CAMPOS_EXAMEN) {
    valores[campo] = numeroFila(crudo[campo] ?? null);
  }
  return {
    id: fila.id,
    estado: fila.estado,
    modalidad: fila.modalidad,
    tipo: fila.tipo,
    folio: fila.folio,
    fecha_atencion: new Date(fila.fecha_atencion).toISOString(),
    firmado_en: fila.firmado_en ? new Date(fila.firmado_en).toISOString() : null,
    hora_bogota: fila.firmado_en ? presentarBogota(new Date(fila.firmado_en)) : null,
    motivo: contenido.motivo,
    antecedentes: contenido.antecedentes.texto,
    queratometria: contenido.queratometria.texto,
    salud_ocular: contenido.salud_ocular.texto,
    sello,
    version_borrador: fila.version_borrador,
    schema_version: fila.schema_version,
    examen: valores,
    diagnostico: diagnostico.rows[0] ?? null,
    plan: plan.rows[0] ?? null,
  };
}

export async function crearAtencion(ctx: ContextoAtencion, entrada: unknown): Promise<AtencionVista> {
  exigir(ctx, 'crear', { borrador: true });
  exigirUuid(ctx);
  try {
    const limites = await leerLimitesCaptura(ctx);
    const datos = parsear(crearEsquemasAtencion(limites.limites).crear.safeParse(entrada));
    const id = await conApp(ctx, async (cliente) => {
      await puertaPaciente(cliente, datos.paciente_id, datos.urgencia === true);
      const insertada = await cliente.query<{ id: string }>(
        `insert into atenciones (
           tenant_id, sede_id, paciente_id, profesional_id, tipo, modalidad, estado, contenido, schema_version
         ) values ($1, $2, $3, $4, $5, $6, 'borrador', $7, $8)
         returning id`,
        [
          ctx.tenant_id,
          ctx.sede_id,
          datos.paciente_id,
          ctx.usuario_id,
          datos.tipo,
          modalidadGuardada(),
          serializarContenido({
            motivo: datos.motivo,
            antecedentes: seccion(datos.antecedentes),
            queratometria: seccion(datos.queratometria),
            salud_ocular: seccion(datos.salud_ocular),
          }),
          SCHEMA_VERSION_ATENCION,
        ],
      );
      const atencionId = insertada.rows[0]?.id;
      if (!atencionId) throw new ErrorAtencion(400, 'No se pudo crear la atención.');
      await insertarExamen(cliente, ctx, atencionId, datos.examen);
      await insertarDiagnostico(cliente, ctx, atencionId, datos.diagnostico.codigo_cie10);
      await insertarPlan(cliente, ctx, atencionId, datos.plan);
      return atencionId;
    });
    return conApp(ctx, (cliente) => leerVista(cliente, id));
  } catch (error) {
    traducir(error);
  }
}

export async function abrirAtencion(ctx: ContextoAtencion, id: string): Promise<AtencionVista> {
  exigir(ctx, 'leer', { pacientesEnSede: true, borrador: true });
  exigirUuid(ctx);
  if (!z.uuid().safeParse(id).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  try {
    const vista = await conApp(ctx, (cliente) => leerVista(cliente, id));
    await abrirHistoriaClinica(
      { tenant_id: ctx.tenant_id, usuario_id: ctx.usuario_id, sede_id: ctx.sede_id, sedes: ctx.sedes, rol: ctx.rol },
      {
        atencionId: id,
        actorId: ctx.usuario_id,
        rol: ctx.rol,
        sedeId: ctx.sede_id,
        ip: ctx.ip,
        agente: ctx.agente,
        requestId: ctx.request_id,
      },
    );
    return vista;
  } catch (error) {
    traducir(error);
  }
}

async function aplicarActualizacion(cliente: PoolClient, ctx: ContextoAtencion, id: string, datos: ActualizarAtencionEntrada) {
  await exigirBorrador(cliente, id);
  const tocaNarrativa =
    datos.motivo !== undefined ||
    datos.antecedentes !== undefined ||
    datos.queratometria !== undefined ||
    datos.salud_ocular !== undefined;
  if (tocaNarrativa) {
    const actual = await cliente.query<{ contenido: string }>(`select contenido from atenciones where id = $1`, [id]);
    const previo = parsearContenido(actual.rows[0]?.contenido ?? '');
    const cambio = await cliente.query(
      `update atenciones
          set contenido = $2, actualizado_en = now()
        where id = $1 and estado = 'borrador'`,
      [
        id,
        serializarContenido({
          motivo: datos.motivo ?? previo.motivo,
          antecedentes: datos.antecedentes ?? previo.antecedentes,
          queratometria: datos.queratometria ?? previo.queratometria,
          salud_ocular: datos.salud_ocular ?? previo.salud_ocular,
        }),
      ],
    );
    if ((cambio.rowCount ?? 0) === 0) throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
  }
  if (datos.examen) {
    const cambio = await cliente.query(
      `update examenes_optometricos set
         contenido = $2,
         esfera_od = $3, cilindro_od = $4, eje_od = $5, adicion_od = $6, agudeza_od = $7,
         esfera_oi = $8, cilindro_oi = $9, eje_oi = $10, adicion_oi = $11, agudeza_oi = $12,
         dip = $13, dip_monocular_od = $14, dip_monocular_oi = $15,
         actualizado_en = now()
       where atencion_id = $1 and estado = 'borrador'`,
      [
        id,
        contenidoExamen(datos.examen),
        nulo(datos.examen.esfera_od),
        nulo(datos.examen.cilindro_od),
        nulo(datos.examen.eje_od),
        nulo(datos.examen.adicion_od),
        nulo(datos.examen.agudeza_od),
        nulo(datos.examen.esfera_oi),
        nulo(datos.examen.cilindro_oi),
        nulo(datos.examen.eje_oi),
        nulo(datos.examen.adicion_oi),
        nulo(datos.examen.agudeza_oi),
        nulo(datos.examen.dip),
        nulo(datos.examen.dip_monocular_od),
        nulo(datos.examen.dip_monocular_oi),
      ],
    );
    if ((cambio.rowCount ?? 0) === 0) throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
  }
  if (datos.diagnostico) {
    const descripcion = await describirCie10(cliente, datos.diagnostico.codigo_cie10);
    const contenido = JSON.stringify({
      schema_version: SCHEMA_VERSION_ATENCION,
      codigo_cie10: datos.diagnostico.codigo_cie10,
      principal: true,
    });
    const cambio = await cliente.query(
      `update diagnosticos
          set codigo_cie10 = $2, descripcion = $3, contenido = $4, actualizado_en = now()
        where atencion_id = $1 and principal = true and estado = 'borrador'`,
      [id, datos.diagnostico.codigo_cie10, descripcion, contenido],
    );
    if ((cambio.rowCount ?? 0) === 0) throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
  }
  if (datos.plan) {
    const cambio = await cliente.query(
      `update planes_manejo
          set conducta = $2, recomendaciones = $3, remision = $4, proximo_control = $5,
              contenido = $6, actualizado_en = now()
        where atencion_id = $1 and estado = 'borrador'`,
      [
        id,
        datos.plan.conducta,
        texto(datos.plan.recomendaciones),
        texto(datos.plan.remision),
        datos.plan.proximo_control ?? null,
        JSON.stringify({ schema_version: SCHEMA_VERSION_ATENCION, conducta: datos.plan.conducta }),
      ],
    );
    if ((cambio.rowCount ?? 0) === 0) throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
  }
  const version = await cliente.query(
    `update atenciones
        set version_borrador = version_borrador + 1, actualizado_en = now()
      where id = $1 and estado = 'borrador'`,
    [id],
  );
  if ((version.rowCount ?? 0) === 0) throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
}

export async function actualizarAtencion(ctx: ContextoAtencion, id: string, entrada: unknown): Promise<AtencionVista> {
  if (!z.uuid().safeParse(id).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  exigirUuid(ctx);
  try {
    const limites = await leerLimitesCaptura(ctx);
    const datos = parsear(crearEsquemasAtencion(limites.limites).actualizar.safeParse(entrada));
    const dueno = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ profesional_id: string; estado: string }>(
        `select profesional_id, estado from atenciones where id = $1`,
        [id],
      );
      return filas.rows[0] ?? null;
    });
    if (!dueno) throw new ErrorAtencion(404, 'No se encontró la atención.');
    exigir(ctx, 'actualizar', { autorId: dueno.profesional_id, borrador: true });
    if (dueno.estado !== 'borrador') {
      throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
    }
    await conApp(ctx, (cliente) => aplicarActualizacion(cliente, ctx, id, datos));
    return conApp(ctx, (cliente) => leerVista(cliente, id));
  } catch (error) {
    traducir(error);
  }
}

function contextoFirma(ctx: ContextoAtencion): ContextoFirma {
  return {
    tenant_id: ctx.tenant_id,
    usuario_id: ctx.usuario_id,
    sede_id: ctx.sede_id,
    sedes: ctx.sedes,
    rol: ctx.rol,
    sesion_id: ctx.sesion_id,
  };
}

export async function firmarAtencion(ctx: ContextoAtencion, id: string, ahora = new Date()): Promise<AtencionVista> {
  if (!puedeFirmarAtencion(ctx.rol)) {
    throw new ErrorAtencion(403, 'Solo el optómetra puede firmar la atención.');
  }
  exigir(ctx, 'firmar');
  exigirUuid(ctx);
  if (!z.uuid().safeParse(id).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  try {
    const previa = await conApp(ctx, (cliente) => leerVista(cliente, id));
    if (previa.estado !== 'borrador') throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
    if (!previa.diagnostico?.codigo_cie10) {
      throw new ErrorAtencion(422, 'El diagnóstico principal exige un código CIE-10 del catálogo cargado.');
    }
    const documento = await crearDocumentoAtencion(contextoFirma(ctx), {
      titulo: 'Atencion optometrica',
      cuerpo: JSON.stringify({
        schema_version: previa.schema_version,
        atencion_id: previa.id,
        motivo: previa.motivo,
        codigo_cie10: previa.diagnostico.codigo_cie10,
      }),
    });
    await firmarProfesional(contextoFirma(ctx), documento.id, ahora);
    await conApp(ctx, async (cliente) => {
      await exigirBorrador(cliente, id);
      await describirCie10(cliente, previa.diagnostico!.codigo_cie10);
      const marca = `estado = 'firmado', firmado_por = $2, actualizado_en = now()`;
      await cliente.query(
        `update examenes_optometricos set ${marca} where atencion_id = $1 and estado = 'borrador'`,
        [id, ctx.usuario_id],
      );
      await cliente.query(
        `update diagnosticos set ${marca} where atencion_id = $1 and estado = 'borrador'`,
        [id, ctx.usuario_id],
      );
      await cliente.query(
        `update planes_manejo set ${marca} where atencion_id = $1 and estado = 'borrador'`,
        [id, ctx.usuario_id],
      );
      const firmada = await cliente.query(
        `update atenciones
            set estado = 'firmado',
                firmado_por = $2,
                firma_documento_id = $3,
                folio = (
                  select coalesce(max(folio), 0) + 1 from atenciones where paciente_id = (
                    select paciente_id from atenciones where id = $1
                  )
                ),
                actualizado_en = now()
          where id = $1 and estado = 'borrador'`,
        [id, ctx.usuario_id, documento.id],
      );
      if ((firmada.rowCount ?? 0) === 0) {
        throw new ErrorAtencion(409, 'El registro firmado no se puede modificar.');
      }
      const folio = await cliente.query<{ paciente_id: string; fecha: string; previa: string | null }>(
        `select a.paciente_id::text, (a.fecha_atencion at time zone 'America/Bogota')::date::text as fecha,
                p.fecha_ultima_atencion::text as previa
           from atenciones a
           join pacientes p on p.id = a.paciente_id
          where a.id = $1`,
        [id],
      );
      const filaFolio = folio.rows[0];
      if (filaFolio) {
        const siguiente = fechaUltimaTrasFolio(filaFolio.previa, filaFolio.fecha);
        await cliente.query(
          `update pacientes set fecha_ultima_atencion = $2::date, actualizado_en = now() where id = $1`,
          [filaFolio.paciente_id, siguiente],
        );
      }
    });
    return conApp(ctx, (cliente) => leerVista(cliente, id));
  } catch (error) {
    traducir(error);
  }
}
