// SEG-07 (T26) — Radicación, plazos hábiles, marca, adenda y bitácora.
// Reutiliza el calendario de T06 y la adenda de T21.
// TODO(Q-17): no resuelve la base legal de la HC; solo registra la solicitud.
// TODO(Q-07): la supresión clínica responde con un texto sin plazo en años.
// TODO(Q-32): sin festivos cargados se avisa y se excluyen solo sábados y domingos.
// BORRADOR – requiere revisión jurídica.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import { CAMPOS_REFRACCION_ADENDA } from '../dominio/adenda-atencion';
import { crearAdendaAtencion } from './adendas-atencion';
import { ErrorAtencion, type ContextoAtencion } from './atenciones';
import { revocarContacto, ErrorAutorizacionDatos } from './autorizaciones';
import { obtenerPool } from './index';
import {
  AVISO_SIN_FESTIVOS,
  CAUSA_BLOQUEO_SUPRESION_CLINICA,
  FUENTE_PLAZO_CONSULTA,
  FUENTE_PLAZO_ENCARGADO,
  FUENTE_PLAZO_MARCA,
  FUENTE_PLAZO_PRORROGA,
  FUENTE_PLAZO_RECLAMO,
  LEYENDA_RECLAMO_EN_TRAMITE,
  PLAZO_ACTUALIZACION_ENCARGADO_DIAS_HABILES,
  PLAZO_CONSULTA_DIAS_HABILES,
  PLAZO_MARCA_RECLAMO_HORAS_HABILES,
  PLAZO_PRORROGA_RECLAMO_DIAS_HABILES,
  PLAZO_RECLAMO_DIAS_HABILES,
  ZONA_HABEAS,
  alertaMarcaSinTramite,
  calcularVenceEn,
  causaSupresionVisible,
  diasHabilesRestantes,
  esCampoDemografico,
  etiquetaSemaforo,
  formatearRadicado,
  instanteTrasHorasHabiles,
  plazoDiasDeTipo,
  semaforoDe,
  supresionClinicaBloqueada,
  type AmbitoDato,
  type CanalSolicitud,
  type EstadoSolicitud,
  type Semaforo,
  type TipoSolicitud,
} from '../dominio/habeas-data';
import { fechaCivilEnZona } from '../dominio/fechas';
import { presentarBogota } from '../dominio/firma';
import { sumarDiasHabiles } from '../dominio/calendario-habil';
import { registrarEvento } from '../lib/auditoria/servicio';
import { buildAbility, type ActorAuthz, type SujetoRecurso } from '../lib/authz/ability';
import { ErrorAutorizacion, exigirPuede } from '../lib/authz/exigir';

export class ErrorHabeas extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorHabeas';
    this.status = status;
  }
}

export interface PlazosHabeas {
  consulta_dias: number;
  reclamo_dias: number;
  prorroga_dias: number;
  marca_horas: number;
  encargado_dias: number;
  fuentes: {
    consulta: string;
    reclamo: string;
    prorroga: string;
    marca: string;
    encargado: string;
  };
  causa_supresion: string;
}

export interface EntradaBitacora {
  id: string;
  tipo: string;
  texto: string;
  registrada_en: string;
  hora_bogota: string;
  quien: string;
}

export interface SolicitudVista {
  id: string;
  radicado: string;
  tipo: TipoSolicitud;
  canal: CanalSolicitud;
  ambito: AmbitoDato | null;
  descripcion: string;
  paciente_id: string | null;
  estado: EstadoSolicitud;
  radicada_en: string;
  vence_en: string;
  plazo_dias_habiles: number;
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  prorroga_hasta: string | null;
  semaforo: Semaforo;
  etiqueta_semaforo: string;
  dias_habiles_restantes: number;
  alerta_marca: boolean;
  leyenda: string | null;
  marcada_en: string | null;
  respuesta: string | null;
  respondida_en: string | null;
  hora_respuesta_bogota: string | null;
  quien_respondio: string | null;
  atencion_id: string | null;
  adenda_id: string | null;
  campo_ref: string | null;
  valor_original: string | null;
  valor_rectificado: string | null;
  historial_demografico: { campo: string; valor_anterior: string; valor_nuevo: string }[];
  bitacora: EntradaBitacora[];
}

export interface PanelHabeas {
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  plazos: PlazosHabeas;
  solicitudes: SolicitudVista[];
}

const EsquemaRadicar = z.object({
  tipo: z.enum(['consulta', 'reclamo', 'rectificacion', 'supresion', 'revocatoria']),
  canal: z.enum(['presencial', 'escrito', 'electronico']),
  descripcion: z.string().trim().min(3).max(2000),
  paciente_id: z.uuid().nullable().optional(),
  ambito: z.enum(['clinico', 'demografico']).nullable().optional(),
  recurso: z.string().trim().regex(/^[a-z_]{1,40}$/).nullable().optional(),
  recurso_id: z.uuid().nullable().optional(),
  atencion_id: z.uuid().nullable().optional(),
  campo_ref: z.string().trim().max(40).nullable().optional(),
  nuevo_valor: z.string().trim().max(200).nullable().optional(),
  motivo: z.string().trim().max(4000).nullable().optional(),
  campo_demografico: z.string().trim().max(40).nullable().optional(),
  valor_demografico: z.string().trim().max(300).nullable().optional(),
});

type FilaSolicitud = {
  id: string;
  radicado: string;
  tipo: TipoSolicitud;
  canal: CanalSolicitud;
  ambito: AmbitoDato | null;
  descripcion: string;
  paciente_id: string | null;
  estado: EstadoSolicitud;
  radicada_en: Date;
  vence_en: string;
  plazo_dias_habiles: number;
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  prorroga_hasta: string | null;
  marcada_en: Date | null;
  respuesta: string | null;
  respondida_en: Date | null;
  quien_respondio: string | null;
  atencion_id: string | null;
  adenda_id: string | null;
  campo_ref: string | null;
  recurso: string | null;
  recurso_id: string | null;
  sede_id: string;
};

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

function sujeto(ctx: ContextoAtencion): SujetoRecurso {
  return { tipo: 'R20', tenantId: ctx.tenant_id, sedeId: ctx.sede_id };
}

function exigir(ctx: ContextoAtencion, accion: 'crear' | 'leer' | 'actualizar') {
  try {
    exigirPuede(actorDe(ctx), accion, sujeto(ctx));
  } catch (error) {
    if (error instanceof ErrorAutorizacion) throw new ErrorHabeas(403, error.message);
    throw error;
  }
}

function exigirUuid(ctx: ContextoAtencion) {
  const valido = z.object({ tenant_id: z.uuid(), usuario_id: z.uuid(), sede_id: z.uuid() }).safeParse(ctx);
  if (!valido.success) throw new ErrorHabeas(400, 'La sesión de demostración no puede radicar la solicitud.');
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
  if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) throw error;
  const codigo = (error as { code?: string }).code;
  if (codigo === '42501') throw new ErrorHabeas(403, 'No tiene permiso para esta solicitud.');
  console.error('Habeas data:', error instanceof Error ? error.message : error);
  throw new ErrorHabeas(400, 'No se pudo completar la solicitud de habeas data.');
}

async function anotar(ctx: ContextoAtencion, recursoId: string, accion: 'crear' | 'leer' | 'actualizar') {
  await registrarEvento(
    {
      tenant_id: ctx.tenant_id,
      usuario_id: ctx.usuario_id,
      sede_id: ctx.sede_id,
      sedes: ctx.sedes,
      rol: ctx.rol,
    },
    {
      actor_id: ctx.usuario_id,
      rol: ctx.rol,
      sede_id: ctx.sede_id,
      recurso: 'solicitud_titular',
      recurso_id: recursoId,
      accion,
      resultado: 'ok',
      ip: ctx.ip ?? null,
      agente: ctx.agente ?? null,
      request_id: ctx.request_id ?? null,
    },
  );
}

async function leerFestivos(cliente: PoolClient): Promise<Set<string>> {
  const filas = await cliente.query<{ fecha: string }>(`select fecha::text as fecha from festivos`);
  return new Set(filas.rows.map((fila) => fila.fecha.slice(0, 10)));
}

function entero(valor: unknown, defecto: number): number {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor;
  if (typeof valor === 'string' && /^\d+$/.test(valor)) {
    const numero = Number(valor);
    if (numero > 0) return numero;
  }
  return defecto;
}

async function leerPlazos(cliente: PoolClient): Promise<PlazosHabeas> {
  const filas = await cliente.query<{ clave: string; valor: unknown }>(
    `select clave, valor from parametros_tenant
      where vigente_hasta is null
        and clave = any($1::text[])`,
    [[
      'plazo_consulta_habeas_dias',
      'plazo_reclamo_habeas_dias',
      'plazo_prorroga_reclamo_habeas_dias',
      'plazo_marca_reclamo_horas_habiles',
      'plazo_actualizacion_encargado_dias',
      'causa_bloqueo_supresion_clinica',
    ]],
  );
  const mapa = new Map(filas.rows.map((fila) => [fila.clave, fila.valor]));
  const causa = mapa.get('causa_bloqueo_supresion_clinica');
  return {
    consulta_dias: entero(mapa.get('plazo_consulta_habeas_dias'), PLAZO_CONSULTA_DIAS_HABILES),
    reclamo_dias: entero(mapa.get('plazo_reclamo_habeas_dias'), PLAZO_RECLAMO_DIAS_HABILES),
    prorroga_dias: entero(mapa.get('plazo_prorroga_reclamo_habeas_dias'), PLAZO_PRORROGA_RECLAMO_DIAS_HABILES),
    marca_horas: entero(mapa.get('plazo_marca_reclamo_horas_habiles'), PLAZO_MARCA_RECLAMO_HORAS_HABILES),
    encargado_dias: entero(mapa.get('plazo_actualizacion_encargado_dias'), PLAZO_ACTUALIZACION_ENCARGADO_DIAS_HABILES),
    fuentes: {
      consulta: FUENTE_PLAZO_CONSULTA,
      reclamo: FUENTE_PLAZO_RECLAMO,
      prorroga: FUENTE_PLAZO_PRORROGA,
      marca: FUENTE_PLAZO_MARCA,
      encargado: FUENTE_PLAZO_ENCARGADO,
    },
    causa_supresion: causaSupresionVisible(typeof causa === 'string' ? causa : CAUSA_BLOQUEO_SUPRESION_CLINICA),
  };
}

async function quien(cliente: PoolClient, usuarioId: string): Promise<string> {
  const filas = await cliente.query<{ email: string; nombre: string | null }>(
    `select u.email, p.nombre_completo as nombre
       from usuarios u
       left join perfiles_profesionales p on p.usuario_id = u.id and p.tenant_id = u.tenant_id
      where u.id = $1
      limit 1`,
    [usuarioId],
  );
  return filas.rows[0]?.nombre?.trim() || filas.rows[0]?.email || usuarioId;
}

async function siguienteRadicado(cliente: PoolClient, tenantId: string, anio: number): Promise<string> {
  const filas = await cliente.query<{ ultimo: number }>(
    `insert into secuencias_radicado_hd (tenant_id, anio, ultimo)
     values ($1, $2, 1)
     on conflict (tenant_id, anio)
     do update set ultimo = secuencias_radicado_hd.ultimo + 1
     returning ultimo`,
    [tenantId, anio],
  );
  return formatearRadicado(anio, Number(filas.rows[0]?.ultimo ?? 1));
}

async function insertarBitacora(
  cliente: PoolClient,
  ctx: ContextoAtencion,
  solicitudId: string,
  tipo: 'respuesta' | 'prorroga' | 'marca' | 'alerta' | 'bloqueo_supresion',
  texto: string,
  ahora: Date,
) {
  await cliente.query(
    `insert into bitacora_respuestas_titular (
       tenant_id, sede_id, solicitud_id, tipo, texto, registrada_en, registrada_por
     ) values ($1,$2,$3,$4,$5,$6,$7)`,
    [ctx.tenant_id, ctx.sede_id, solicitudId, tipo, texto, ahora.toISOString(), ctx.usuario_id],
  );
}

const SQL_LISTA = `select s.id::text, s.radicado, s.tipo, s.canal, s.ambito, s.descripcion,
  s.paciente_id::text, s.estado, s.radicada_en, s.vence_en::text as vence_en,
  s.plazo_dias_habiles, s.festivos_cargados, s.aviso_festivos, s.prorroga_hasta::text as prorroga_hasta,
  s.marcada_en, s.respuesta, s.respondida_en, s.atencion_id::text, s.adenda_id::text,
  s.campo_ref, s.recurso, s.recurso_id::text, s.sede_id::text,
  coalesce(p.nombre_completo, u.email) as quien_respondio
 from solicitudes_titular s
 left join usuarios u on u.id = s.respondida_por
 left join perfiles_profesionales p on p.usuario_id = s.respondida_por and p.tenant_id = s.tenant_id`;

function puedeLeerClinico(ctx: ContextoAtencion): boolean {
  return buildAbility(actorDe(ctx)).can('leer', {
    tipo: 'R3',
    tenantId: ctx.tenant_id,
    sedeId: ctx.sede_id,
    autorId: ctx.usuario_id,
    pacientesEnSede: ctx.sedes.includes(ctx.sede_id),
  });
}

async function valorOriginalExamen(cliente: PoolClient, atencionId: string, campo: string): Promise<string | null> {
  if (!(CAMPOS_REFRACCION_ADENDA as readonly string[]).includes(campo)) return null;
  const filas = await cliente.query<{ valor: string | null }>(
    `select ${campo}::text as valor from examenes_optometricos where atencion_id = $1`,
    [atencionId],
  );
  return filas.rows[0]?.valor ?? null;
}

async function armarVistas(
  cliente: PoolClient,
  ctx: ContextoAtencion,
  filas: FilaSolicitud[],
  ahora: Date,
  festivos: Set<string>,
  horasMarca: number,
): Promise<SolicitudVista[]> {
  if (filas.length === 0) return [];
  const ids = filas.map((fila) => fila.id);
  const bitacora = await cliente.query<{
    id: string;
    solicitud_id: string;
    tipo: string;
    texto: string;
    registrada_en: Date;
    quien: string;
  }>(
    `select b.id::text, b.solicitud_id::text, b.tipo, b.texto, b.registrada_en,
            coalesce(p.nombre_completo, u.email) as quien
       from bitacora_respuestas_titular b
       join usuarios u on u.id = b.registrada_por
       left join perfiles_profesionales p on p.usuario_id = b.registrada_por and p.tenant_id = b.tenant_id
      where b.solicitud_id = any($1::uuid[])
      order by b.registrada_en`,
    [ids],
  );
  const banderas = await cliente.query<{ solicitud_id: string; leyenda: string }>(
    `select solicitud_id::text, leyenda from banderas_dato
      where solicitud_id = any($1::uuid[]) and hasta is null`,
    [ids],
  );
  const historial = await cliente.query<{
    solicitud_id: string;
    campo: string;
    valor_anterior: string;
    valor_nuevo: string;
  }>(
    `select solicitud_id::text, campo, valor_anterior, valor_nuevo
       from historial_datos_demograficos
      where solicitud_id = any($1::uuid[])
      order by registrado_en`,
    [ids],
  );
  const hoy = fechaCivilEnZona(ahora, ZONA_HABEAS);
  const porBitacora = new Map<string, EntradaBitacora[]>();
  for (const fila of bitacora.rows) {
    const lista = porBitacora.get(fila.solicitud_id) ?? [];
    lista.push({
      id: fila.id,
      tipo: fila.tipo,
      texto: fila.texto,
      registrada_en: new Date(fila.registrada_en).toISOString(),
      hora_bogota: presentarBogota(new Date(fila.registrada_en)),
      quien: fila.quien,
    });
    porBitacora.set(fila.solicitud_id, lista);
  }
  const porLeyenda = new Map(banderas.rows.map((fila) => [fila.solicitud_id, fila.leyenda]));
  const porHistorial = new Map<string, { campo: string; valor_anterior: string; valor_nuevo: string }[]>();
  for (const fila of historial.rows) {
    const lista = porHistorial.get(fila.solicitud_id) ?? [];
    lista.push({ campo: fila.campo, valor_anterior: fila.valor_anterior, valor_nuevo: fila.valor_nuevo });
    porHistorial.set(fila.solicitud_id, lista);
  }

  const vistas: SolicitudVista[] = [];
  for (const fila of filas) {
    const reloj = {
      tipo: fila.tipo,
      estado: fila.estado,
      radicadaEn: new Date(fila.radicada_en),
      venceEn: fila.vence_en.slice(0, 10),
      prorrogaHasta: fila.prorroga_hasta?.slice(0, 10) ?? null,
      marcada: Boolean(fila.marcada_en),
      respondidaEn: fila.respondida_en ? new Date(fila.respondida_en) : null,
      ahora,
      festivos,
      horasMarca,
    };
    const alerta = alertaMarcaSinTramite(reloj);
    const entradas = porBitacora.get(fila.id) ?? [];
    if (alerta && !entradas.some((entrada) => entrada.tipo === 'alerta')) {
      const textoAlerta =
        'Alerta: pasaron las horas hábiles para marcar «reclamo en trámite» y el reclamo sigue sin marca.';
      await cliente.query(
        `insert into bitacora_respuestas_titular (
           tenant_id, sede_id, solicitud_id, tipo, texto, registrada_en, registrada_por
         ) values ($1,$2,$3,'alerta',$4,$5,$6)
         on conflict (solicitud_id) where tipo = 'alerta' do nothing`,
        [ctx.tenant_id, fila.sede_id, fila.id, textoAlerta, ahora.toISOString(), ctx.usuario_id],
      );
      entradas.push({
        id: 'alerta',
        tipo: 'alerta',
        texto: textoAlerta,
        registrada_en: ahora.toISOString(),
        hora_bogota: presentarBogota(ahora),
        quien: await quien(cliente, ctx.usuario_id),
      });
      porBitacora.set(fila.id, entradas);
    }
    const color = semaforoDe(reloj);
    const limite = reloj.prorrogaHasta ?? reloj.venceEn;
    const valorOriginal =
      puedeLeerClinico(ctx) && fila.atencion_id && fila.campo_ref
        ? await valorOriginalExamen(cliente, fila.atencion_id, fila.campo_ref)
        : null;
    vistas.push({
      id: fila.id,
      radicado: fila.radicado,
      tipo: fila.tipo,
      canal: fila.canal,
      ambito: fila.ambito,
      descripcion: fila.descripcion,
      paciente_id: fila.paciente_id,
      estado: fila.estado,
      radicada_en: new Date(fila.radicada_en).toISOString(),
      vence_en: reloj.venceEn,
      plazo_dias_habiles: fila.plazo_dias_habiles,
      festivos_cargados: fila.festivos_cargados,
      aviso_festivos: fila.aviso_festivos,
      prorroga_hasta: reloj.prorrogaHasta,
      semaforo: color,
      etiqueta_semaforo: etiquetaSemaforo(color),
      dias_habiles_restantes: diasHabilesRestantes(hoy, limite, festivos),
      alerta_marca: alerta,
      leyenda: porLeyenda.get(fila.id) ?? null,
      marcada_en: fila.marcada_en ? new Date(fila.marcada_en).toISOString() : null,
      respuesta: fila.respuesta,
      respondida_en: fila.respondida_en ? new Date(fila.respondida_en).toISOString() : null,
      hora_respuesta_bogota: fila.respondida_en ? presentarBogota(new Date(fila.respondida_en)) : null,
      quien_respondio: fila.quien_respondio,
      atencion_id: fila.atencion_id,
      adenda_id: fila.adenda_id,
      campo_ref: fila.campo_ref,
      valor_original: valorOriginal,
      valor_rectificado: porHistorial.get(fila.id)?.at(-1)?.valor_nuevo ?? null,
      historial_demografico: porHistorial.get(fila.id) ?? [],
      bitacora: porBitacora.get(fila.id) ?? [],
    });
  }
  return vistas;
}

async function leerFila(cliente: PoolClient, id: string): Promise<FilaSolicitud | null> {
  const filas = await cliente.query<FilaSolicitud>(`${SQL_LISTA} where s.id = $1`, [id]);
  return filas.rows[0] ?? null;
}

export async function listarHabeas(ctx: ContextoAtencion, ahora = new Date()): Promise<PanelHabeas> {
  exigirUuid(ctx);
  exigir(ctx, 'leer');
  try {
    return await conApp(ctx, async (cliente) => {
      const festivos = await leerFestivos(cliente);
      const plazos = await leerPlazos(cliente);
      const filas = await cliente.query<FilaSolicitud>(`${SQL_LISTA} order by s.radicada_en desc`);
      const solicitudes = await armarVistas(cliente, ctx, filas.rows, ahora, festivos, plazos.marca_horas);
      return {
        festivos_cargados: festivos.size > 0,
        aviso_festivos: festivos.size > 0 ? null : AVISO_SIN_FESTIVOS,
        plazos,
        solicitudes,
      };
    });
  } catch (error) {
    traducir(error);
  }
}

export async function radicarSolicitud(
  ctx: ContextoAtencion,
  entrada: unknown,
  ahora = new Date(),
): Promise<SolicitudVista & { bloqueo_supresion: boolean }> {
  exigirUuid(ctx);
  exigir(ctx, 'crear');
  const cuerpo = EsquemaRadicar.safeParse(entrada);
  if (!cuerpo.success) throw new ErrorHabeas(400, 'La solicitud no es válida.');
  const datos = cuerpo.data;
  const ambito = datos.ambito ?? null;
  if ((datos.tipo === 'rectificacion' || datos.tipo === 'supresion') && ambito == null && datos.tipo === 'rectificacion') {
    throw new ErrorHabeas(400, 'Indique si la rectificación es clínica o demográfica.');
  }
  if (datos.tipo === 'rectificacion' && ambito === 'clinico') {
    if (!datos.paciente_id || !datos.atencion_id || !datos.campo_ref || !datos.nuevo_valor || !datos.motivo) {
      throw new ErrorHabeas(400, 'La rectificación clínica necesita la atención, el campo, el valor nuevo y el motivo.');
    }
  }
  if (datos.tipo === 'rectificacion' && ambito === 'demografico') {
    if (!datos.paciente_id || !datos.campo_demografico || !datos.valor_demografico) {
      throw new ErrorHabeas(400, 'La rectificación demográfica necesita el campo y el valor nuevo.');
    }
    if (!esCampoDemografico(datos.campo_demografico)) {
      throw new ErrorHabeas(400, 'Ese campo demográfico no se rectifica por este módulo.');
    }
  }
  if (datos.tipo === 'revocatoria' && !datos.paciente_id) {
    throw new ErrorHabeas(400, 'La revocatoria necesita el paciente.');
  }

  let adenda: { id: string; valorOriginal: string; valorNuevo: string } | null = null;
  if (datos.tipo === 'rectificacion' && ambito === 'clinico' && datos.atencion_id && datos.paciente_id) {
    const pacienteAtencion = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ paciente_id: string }>(
        `select paciente_id::text from atenciones where id = $1`,
        [datos.atencion_id],
      );
      return filas.rows[0]?.paciente_id ?? null;
    });
    if (pacienteAtencion !== datos.paciente_id) {
      throw new ErrorHabeas(400, 'La atención no corresponde al paciente de la solicitud.');
    }
    try {
      const historial = await crearAdendaAtencion(
        ctx,
        datos.atencion_id,
        {
          campo_ref: datos.campo_ref,
          nuevo_valor: datos.nuevo_valor,
          motivo: datos.motivo,
        },
        ahora,
      );
      const linea = [...historial.linea].reverse().find((item) => item.tipo === 'adenda');
      const creada = await conApp(ctx, async (cliente) => {
        const ultima = await cliente.query<{ id: string }>(
          `select id::text from atencion_adendas where atencion_id = $1 order by numero desc limit 1`,
          [datos.atencion_id],
        );
        return ultima.rows[0]?.id ?? null;
      });
      if (!creada) throw new ErrorHabeas(400, 'No se encontró la adenda generada.');
      adenda = {
        id: creada,
        valorOriginal: historial.original_refraccion[datos.campo_ref ?? ''] ?? '',
        valorNuevo: linea?.nuevo_valor ?? datos.nuevo_valor ?? '',
      };
    } catch (error) {
      if (error instanceof ErrorAtencion) throw new ErrorHabeas(error.status, error.message);
      throw error;
    }
  }

  try {
    const creada = await conApp(ctx, async (cliente) => {
      const festivos = await leerFestivos(cliente);
      const plazos = await leerPlazos(cliente);
      const dias = plazoDiasDeTipo(datos.tipo, plazos.consulta_dias, plazos.reclamo_dias);
      const vence = calcularVenceEn(ahora, dias, festivos);
      const aviso = festivos.size > 0 ? null : AVISO_SIN_FESTIVOS;
      const anio = Number(fechaCivilEnZona(ahora, ZONA_HABEAS).slice(0, 4));
      const radicado = await siguienteRadicado(cliente, ctx.tenant_id, anio);
      const bloqueada = datos.tipo === 'supresion' && supresionClinicaBloqueada(ambito);
      const causa = bloqueada ? plazos.causa_supresion : null;
      let estado: EstadoSolicitud = 'radicada';
      let respuesta: string | null = null;
      let respondidaEn: string | null = null;
      if (bloqueada && causa) {
        estado = 'respondida';
        respuesta = causa;
        respondidaEn = ahora.toISOString();
      }
      if (adenda) {
        estado = 'respondida';
        respuesta =
          'Se generó una adenda. El valor original de la atención permanece visible. BORRADOR – requiere revisión jurídica.';
        respondidaEn = ahora.toISOString();
      }
      const marcaLimite =
        datos.tipo === 'reclamo' ? instanteTrasHorasHabiles(ahora, plazos.marca_horas, festivos).toISOString() : null;
      const insertada = await cliente.query<{ id: string }>(
        `insert into solicitudes_titular (
           tenant_id, sede_id, paciente_id, radicado, tipo, canal, ambito, descripcion,
           radicada_en, vence_en, plazo_dias_habiles, festivos_cargados, aviso_festivos, estado,
           recurso, recurso_id, atencion_id, adenda_id, campo_ref, marca_limite_en,
           respuesta, respondida_en, respondida_por
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
         ) returning id::text`,
        [
          ctx.tenant_id,
          ctx.sede_id,
          datos.paciente_id ?? null,
          radicado,
          datos.tipo,
          datos.canal,
          ambito,
          datos.descripcion,
          ahora.toISOString(),
          vence,
          dias,
          festivos.size > 0,
          aviso,
          estado,
          datos.recurso ?? (datos.paciente_id ? 'pacientes' : null),
          datos.recurso_id ?? datos.paciente_id ?? null,
          datos.atencion_id ?? null,
          adenda?.id ?? null,
          datos.campo_ref ?? datos.campo_demografico ?? null,
          marcaLimite,
          respuesta,
          respondidaEn,
          respondidaEn ? ctx.usuario_id : null,
        ],
      );
      const id = insertada.rows[0]?.id;
      if (!id) throw new ErrorHabeas(400, 'No se pudo radicar la solicitud.');
      if (bloqueada && causa) {
        await insertarBitacora(cliente, ctx, id, 'bloqueo_supresion', causa, ahora);
      }
      if (adenda) {
        await insertarBitacora(
          cliente,
          ctx,
          id,
          'respuesta',
          'Se generó una adenda y el original queda visible.',
          ahora,
        );
      }
      if (datos.tipo === 'rectificacion' && ambito === 'demografico' && datos.paciente_id && datos.campo_demografico) {
        const campo = datos.campo_demografico;
        const previo = await cliente.query<Record<string, string | null>>(
          `select ${campo} as valor from pacientes where id = $1`,
          [datos.paciente_id],
        );
        const anterior = previo.rows[0]?.valor ?? '';
        const nuevo = datos.valor_demografico ?? '';
        if (anterior === nuevo) throw new ErrorHabeas(400, 'El valor nuevo es igual al que ya está registrado.');
        await cliente.query(
          `insert into historial_datos_demograficos (
             tenant_id, sede_id, paciente_id, solicitud_id, campo, valor_anterior, valor_nuevo,
             registrado_en, registrado_por
           ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [ctx.tenant_id, ctx.sede_id, datos.paciente_id, id, campo, anterior, nuevo, ahora.toISOString(), ctx.usuario_id],
        );
        await cliente.query(`update pacientes set ${campo} = $2, actualizado_en = now() where id = $1`, [
          datos.paciente_id,
          nuevo,
        ]);
        await cliente.query(
          `update solicitudes_titular
              set estado = 'respondida', respuesta = $2, respondida_en = $3, respondida_por = $4
            where id = $1`,
          [
            id,
            'Se rectificó el dato demográfico. El valor anterior permanece en el historial. BORRADOR – requiere revisión jurídica.',
            ahora.toISOString(),
            ctx.usuario_id,
          ],
        );
        await insertarBitacora(
          cliente,
          ctx,
          id,
          'respuesta',
          `Rectificación demográfica del campo ${campo}. El valor anterior permanece en el historial.`,
          ahora,
        );
      }
      const fila = await leerFila(cliente, id);
      if (!fila) throw new ErrorHabeas(400, 'No se pudo leer la solicitud radicada.');
      const [vista] = await armarVistas(cliente, ctx, [fila], ahora, festivos, plazos.marca_horas);
      if (!vista) throw new ErrorHabeas(400, 'No se pudo leer la solicitud radicada.');
      if (adenda?.valorOriginal) vista.valor_original = adenda.valorOriginal;
      if (adenda?.valorNuevo) vista.valor_rectificado = adenda.valorNuevo;
      return { vista, bloqueo: Boolean(bloqueada) };
    });
    await anotar(ctx, creada.vista.id, 'crear');
    if (datos.tipo === 'revocatoria' && datos.paciente_id) {
      try {
        await revocarContacto(
          {
            tenant_id: ctx.tenant_id,
            usuario_id: ctx.usuario_id,
            sede_id: ctx.sede_id,
            sedes: ctx.sedes,
            rol: ctx.rol,
          },
          datos.paciente_id,
          ahora,
        );
      } catch (error) {
        if (!(error instanceof ErrorAutorizacionDatos)) throw error;
      }
    }
    return { ...creada.vista, bloqueo_supresion: creada.bloqueo };
  } catch (error) {
    traducir(error);
  }
}

export async function marcarReclamo(ctx: ContextoAtencion, solicitudId: string, ahora = new Date()): Promise<SolicitudVista> {
  exigirUuid(ctx);
  if (!z.uuid().safeParse(solicitudId).success) throw new ErrorHabeas(400, 'La solicitud no es válida.');
  exigir(ctx, 'actualizar');
  try {
    const vista = await conApp(ctx, async (cliente) => {
      const fila = await leerFila(cliente, solicitudId);
      if (!fila) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      if (fila.tipo !== 'reclamo') throw new ErrorHabeas(409, 'Solo un reclamo se marca en trámite.');
      if (fila.marcada_en) throw new ErrorHabeas(409, 'El reclamo ya está marcado.');
      if (fila.estado === 'respondida' || fila.estado === 'cerrada') {
        throw new ErrorHabeas(409, 'El reclamo ya fue respondido.');
      }
      const recurso = fila.recurso ?? 'solicitudes_titular';
      const recursoId = fila.recurso_id ?? fila.id;
      await cliente.query(
        `update solicitudes_titular
            set estado = 'en_tramite', marcada_en = $2, marcada_por = $3
          where id = $1`,
        [solicitudId, ahora.toISOString(), ctx.usuario_id],
      );
      await cliente.query(
        `insert into banderas_dato (
           tenant_id, sede_id, recurso, recurso_id, tipo, leyenda, desde, solicitud_id
         ) values ($1,$2,$3,$4,'reclamo_en_tramite',$5,$6,$7)`,
        [ctx.tenant_id, ctx.sede_id, recurso, recursoId, LEYENDA_RECLAMO_EN_TRAMITE, ahora.toISOString(), solicitudId],
      );
      await insertarBitacora(cliente, ctx, solicitudId, 'marca', LEYENDA_RECLAMO_EN_TRAMITE, ahora);
      const actualizada = await leerFila(cliente, solicitudId);
      if (!actualizada) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      const festivos = await leerFestivos(cliente);
      const plazos = await leerPlazos(cliente);
      const [armada] = await armarVistas(cliente, ctx, [actualizada], ahora, festivos, plazos.marca_horas);
      if (!armada) throw new ErrorHabeas(400, 'No se pudo leer el reclamo marcado.');
      return armada;
    });
    await anotar(ctx, solicitudId, 'actualizar');
    return vista;
  } catch (error) {
    traducir(error);
  }
}

export async function responderSolicitud(
  ctx: ContextoAtencion,
  solicitudId: string,
  texto: string,
  ahora = new Date(),
): Promise<SolicitudVista> {
  exigirUuid(ctx);
  if (!z.uuid().safeParse(solicitudId).success) throw new ErrorHabeas(400, 'La solicitud no es válida.');
  const limpio = texto.trim();
  if (limpio.length < 3 || limpio.length > 4000) throw new ErrorHabeas(400, 'La respuesta no es válida.');
  exigir(ctx, 'actualizar');
  try {
    const vista = await conApp(ctx, async (cliente) => {
      const fila = await leerFila(cliente, solicitudId);
      if (!fila) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      if (fila.estado === 'respondida' || fila.estado === 'cerrada') {
        throw new ErrorHabeas(409, 'La solicitud ya tiene respuesta archivada.');
      }
      await cliente.query(
        `update solicitudes_titular
            set estado = 'respondida', respuesta = $2, respondida_en = $3, respondida_por = $4
          where id = $1`,
        [solicitudId, limpio, ahora.toISOString(), ctx.usuario_id],
      );
      await insertarBitacora(cliente, ctx, solicitudId, 'respuesta', limpio, ahora);
      const actualizada = await leerFila(cliente, solicitudId);
      if (!actualizada) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      const festivos = await leerFestivos(cliente);
      const plazos = await leerPlazos(cliente);
      const [armada] = await armarVistas(cliente, ctx, [actualizada], ahora, festivos, plazos.marca_horas);
      if (!armada) throw new ErrorHabeas(400, 'No se pudo leer la respuesta.');
      return armada;
    });
    await anotar(ctx, solicitudId, 'actualizar');
    return vista;
  } catch (error) {
    traducir(error);
  }
}

export async function prorrogarReclamo(
  ctx: ContextoAtencion,
  solicitudId: string,
  ahora = new Date(),
): Promise<SolicitudVista> {
  exigirUuid(ctx);
  if (!z.uuid().safeParse(solicitudId).success) throw new ErrorHabeas(400, 'La solicitud no es válida.');
  exigir(ctx, 'actualizar');
  try {
    const vista = await conApp(ctx, async (cliente) => {
      const fila = await leerFila(cliente, solicitudId);
      if (!fila) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      if (fila.tipo !== 'reclamo') throw new ErrorHabeas(409, 'Solo el reclamo admite prórroga.');
      if (fila.prorroga_hasta) throw new ErrorHabeas(409, 'El reclamo ya fue prorrogado.');
      if (fila.estado === 'respondida' || fila.estado === 'cerrada') {
        throw new ErrorHabeas(409, 'El reclamo ya fue respondido.');
      }
      const festivos = await leerFestivos(cliente);
      const plazos = await leerPlazos(cliente);
      const hasta = sumarDiasHabiles(fila.vence_en.slice(0, 10), plazos.prorroga_dias, festivos);
      await cliente.query(
        `update solicitudes_titular set estado = 'prorrogada', prorroga_hasta = $2 where id = $1`,
        [solicitudId, hasta],
      );
      await insertarBitacora(
        cliente,
        ctx,
        solicitudId,
        'prorroga',
        `Prórroga de ${plazos.prorroga_dias} días hábiles. Nuevo vencimiento: ${hasta}. ${FUENTE_PLAZO_PRORROGA}.`,
        ahora,
      );
      const actualizada = await leerFila(cliente, solicitudId);
      if (!actualizada) throw new ErrorHabeas(404, 'No se encontró la solicitud.');
      const [armada] = await armarVistas(cliente, ctx, [actualizada], ahora, festivos, plazos.marca_horas);
      if (!armada) throw new ErrorHabeas(400, 'No se pudo leer la prórroga.');
      return armada;
    });
    await anotar(ctx, solicitudId, 'actualizar');
    return vista;
  } catch (error) {
    traducir(error);
  }
}
