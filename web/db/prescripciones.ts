// OPT-05 (T23) — Prescripción: numeración por tenant, firma (T14) e
// inmutabilidad (T12). La vigencia no tiene valor por defecto.
// TODO(Q-18): la escribe el profesional. ASE-07 debe llamar `esDispensable`.
// BORRADOR – requiere revisión jurídica.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import { crearDocumentoPrescripcion, ErrorFirma, exportarDocumento, firmarProfesional, sellarPrescripcionProfesional, type ContextoFirma } from './firma';
import { obtenerPool } from './index';
import { hashDocumento } from '../dominio/documento-hash';
import { codigoHttpFirma } from '../dominio/firma';
import { registrarEvento } from '../lib/auditoria/servicio';
import {
  contenidoPrescripcion,
  esDispensable,
  estadoVisiblePrescripcion,
  fechaDeFirma,
  formatearNumeroPrescripcion,
  hashVerificacionPrescripcion,
  lineasPrescripcion,
  puedeFirmarPrescripcion,
  urlVerificacionPrescripcion,
  validarFirmaPrescripcion,
  type EstadoVisiblePrescripcion,
  type PrescripcionFirmaEntrada,
  type ResultadoDispensacion,
} from '../dominio/prescripcion';
import { ZONA_HORARIA_INICIAL } from '../dominio/parametros-iniciales';
import { claveMaestraActiva, leerRegistroKek } from '../lib/cifrado/kek.mjs';
import type { ActorAuthz, SujetoRecurso } from '../lib/authz/ability';
import { ErrorAutorizacion, exigirPuede } from '../lib/authz/exigir';
import { dtoPrescripcionParaDispensacion, dtoTieneDiagnostico, type PrescripcionCompleta } from '../lib/authz/dto';

export class ErrorPrescripcion extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorPrescripcion';
    this.status = status;
  }
}

export interface ContextoPrescripcion {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
  sesion_id: string | null;
  tarjeta_profesional_vigente: boolean;
  ip?: string | null;
  agente?: string | null;
}

export interface PrescripcionVista {
  id: string;
  atencion_id: string;
  paciente_id: string;
  numero: string | null;
  tipo: string;
  estado: string;
  estado_visible: EstadoVisiblePrescripcion;
  numero_hc: string | null;
  vigencia_hasta: string | null;
  cantidad_num: number | null;
  cantidad_letras: string | null;
  hash_pdf: string | null;
  hash_verificacion: string | null;
  verificacion_url: string | null;
  hash_contenido: string | null;
  sustituye_a: string | null;
  dispensacion: ResultadoDispensacion;
  campos: Record<string, string | number | null>;
}

function actorDe(ctx: ContextoPrescripcion): ActorAuthz {
  return {
    id: ctx.usuario_id,
    rol: ctx.rol,
    tenantId: ctx.tenant_id,
    sedeActiva: ctx.sede_id,
    sedesAutorizadas: ctx.sedes,
    tarjetaProfesionalVigente: ctx.tarjeta_profesional_vigente,
  };
}

function sujeto(ctx: ContextoPrescripcion, extra: Partial<SujetoRecurso> = {}): SujetoRecurso {
  return {
    tipo: 'R5',
    tenantId: ctx.tenant_id,
    sedeId: ctx.sede_id,
    autorId: extra.autorId ?? ctx.usuario_id,
    ...extra,
  };
}

function exigir(ctx: ContextoPrescripcion, accion: 'crear' | 'leer' | 'actualizar' | 'firmar' | 'exportar', extra: Partial<SujetoRecurso> = {}) {
  try {
    exigirPuede(actorDe(ctx), accion, sujeto(ctx, extra));
  } catch (error) {
    if (error instanceof ErrorAutorizacion) throw new ErrorPrescripcion(403, error.message);
    throw error;
  }
}

function exigirUuid(ctx: ContextoPrescripcion) {
  const valido = z.object({
    tenant_id: z.uuid(),
    usuario_id: z.uuid(),
    sede_id: z.uuid(),
  }).safeParse(ctx);
  if (!valido.success) throw new ErrorPrescripcion(400, 'La sesión de demostración no puede crear la prescripción.');
}

async function conApp<T>(ctx: ContextoPrescripcion, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
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
  if (error instanceof ErrorPrescripcion || error instanceof ErrorAutorizacion) throw error;
  if (error instanceof ErrorFirma) {
    throw new ErrorPrescripcion(codigoHttpFirma(error.codigo, error.message), error.message);
  }
  const mensaje = error instanceof Error ? error.message : '';
  if (mensaje.includes('row-level security') || mensaje.includes('42501') || mensaje.includes('solo optometra')) {
    throw new ErrorPrescripcion(403, 'No tiene permiso para esta acción.');
  }
  if (mensaje.includes('inmutable') || mensaje.includes('55000') && mensaje.includes('UPDATE prohibido')) {
    throw new ErrorPrescripcion(409, 'La prescripción firmada es inmutable.');
  }
  if (mensaje.includes('registro vigente') || mensaje.includes('atencion firmada') || mensaje.includes('diagnostico') || mensaje.includes('historia clinica') || mensaje.includes('correccion debe')) {
    throw new ErrorPrescripcion(422, mensaje);
  }
  if (mensaje.includes('prescripciones_art17') || mensaje.includes('cantidad')) {
    throw new ErrorPrescripcion(422, 'La prescripción no cumple los elementos del art. 17.');
  }
  throw new ErrorPrescripcion(400, 'No se pudo guardar la prescripción.');
}

function contextoFirma(ctx: ContextoPrescripcion): ContextoFirma {
  return {
    tenant_id: ctx.tenant_id,
    usuario_id: ctx.usuario_id,
    sede_id: ctx.sede_id,
    sedes: ctx.sedes,
    rol: ctx.rol,
    sesion_id: ctx.sesion_id,
  };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function entero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isInteger(valor)) return valor;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor.trim());
  return null;
}

export function entradaDesdeCuerpo(cuerpo: unknown, firma: boolean): PrescripcionFirmaEntrada {
  const fila = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  return {
    prestador_nombre: texto(fila.prestador_nombre),
    direccion: texto(fila.direccion),
    telefono: texto(fila.telefono),
    correo: texto(fila.correo),
    lugar: texto(fila.lugar),
    fecha: texto(fila.fecha),
    paciente_nombre: texto(fila.paciente_nombre),
    paciente_documento: texto(fila.paciente_documento),
    numero_hc: texto(fila.numero_hc),
    tipo_usuario: texto(fila.tipo_usuario),
    dispositivo: texto(fila.dispositivo),
    agudeza_visual: texto(fila.agudeza_visual),
    forma_uso: texto(fila.forma_uso),
    distancia_pupilar: texto(fila.distancia_pupilar),
    filtro: texto(fila.filtro),
    duracion_tratamiento: texto(fila.duracion_tratamiento),
    cantidad_num: entero(fila.cantidad_num),
    cantidad_letras: texto(fila.cantidad_letras),
    indicaciones: texto(fila.indicaciones),
    vigencia_hasta: texto(fila.vigencia_hasta),
    nombre_prescriptor: texto(fila.nombre_prescriptor),
    registro_profesional: texto(fila.registro_profesional),
    firma,
    tipo: texto(fila.tipo),
  };
}

interface FilaPrescripcion {
  id: string;
  atencion_id: string;
  paciente_id: string;
  profesional_id: string;
  numero: string | null;
  tipo: string;
  estado: string;
  numero_hc: string | null;
  vigencia_hasta: string | null;
  cantidad_num: number | null;
  cantidad_letras: string | null;
  hash_pdf: string | null;
  hash_verificacion: string | null;
  hash_contenido: string | null;
  sustituye_a: string | null;
  documento_firma_id: string | null;
  sustituida: boolean;
  registro_profesional: string | null;
  registro_vigente_hasta: string | null;
  prestador_nombre: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  lugar: string | null;
  fecha: string | null;
  paciente_nombre: string | null;
  paciente_documento: string | null;
  tipo_usuario: string | null;
  dispositivo: string | null;
  agudeza_visual: string | null;
  forma_uso: string | null;
  distancia_pupilar: string | null;
  filtro: string | null;
  duracion_tratamiento: string | null;
  indicaciones: string | null;
  nombre_prescriptor: string | null;
}

const SELECT_VISTA = `
  select p.id, p.atencion_id, p.paciente_id, p.profesional_id, p.numero, p.tipo, p.estado,
         p.numero_hc, p.vigencia_hasta::text as vigencia_hasta, p.cantidad_num, p.cantidad_letras,
         p.hash_pdf, p.hash_verificacion, p.hash_contenido, p.sustituye_a::text as sustituye_a, p.documento_firma_id,
         p.registro_profesional, pf.vigente_hasta::text as registro_vigente_hasta,
         p.prestador_nombre, p.direccion, p.telefono, p.correo, p.lugar, p.fecha::text as fecha,
         p.paciente_nombre, p.paciente_documento, p.tipo_usuario, p.dispositivo, p.agudeza_visual,
         p.forma_uso, p.distancia_pupilar, p.filtro, p.duracion_tratamiento, p.indicaciones,
         p.nombre_prescriptor,
         exists (
           select 1 from prescripciones s
            where s.sustituye_a = p.id and s.estado = 'firmada'
         ) as sustituida
    from prescripciones p
    left join perfiles_profesionales pf
      on pf.usuario_id = p.firmado_por and pf.tenant_id = p.tenant_id
`;

function vistaDe(fila: FilaPrescripcion, ahora: Date, zona: string): PrescripcionVista {
  const hoy = fechaDeFirma(ahora, zona);
  const visible = estadoVisiblePrescripcion({
    estadoAlmacenado: fila.estado,
    sustituida: fila.sustituida,
    vigenciaHasta: fila.vigencia_hasta,
    hoyBogota: hoy,
  });
  const dispensacion = esDispensable({
    estadoAlmacenado: fila.estado,
    sustituida: fila.sustituida,
    numeroHc: fila.numero_hc,
    vigenciaHasta: fila.vigencia_hasta,
    hoyBogota: hoy,
    registroProfesional: fila.registro_profesional,
    registroVigenteHasta: fila.registro_vigente_hasta,
    ahora,
  });
  return {
    id: fila.id,
    atencion_id: fila.atencion_id,
    paciente_id: fila.paciente_id,
    numero: fila.numero,
    tipo: fila.tipo,
    estado: fila.estado,
    estado_visible: visible,
    numero_hc: fila.numero_hc,
    vigencia_hasta: fila.vigencia_hasta,
    cantidad_num: fila.cantidad_num,
    cantidad_letras: fila.cantidad_letras,
    hash_pdf: fila.hash_pdf,
    hash_verificacion: fila.hash_verificacion,
    verificacion_url: fila.hash_verificacion
      ? urlVerificacionPrescripcion(fila.hash_verificacion, process.env.PRESCRIPCION_VERIFICACION_BASE_URL)
      : null,
    hash_contenido: fila.hash_contenido,
    sustituye_a: fila.sustituye_a,
    dispensacion,
    campos: {
      prestador_nombre: fila.prestador_nombre,
      direccion: fila.direccion,
      telefono: fila.telefono,
      correo: fila.correo,
      lugar: fila.lugar,
      fecha: fila.fecha,
      paciente_nombre: fila.paciente_nombre,
      paciente_documento: fila.paciente_documento,
      numero_hc: fila.numero_hc,
      tipo_usuario: fila.tipo_usuario,
      dispositivo: fila.dispositivo,
      agudeza_visual: fila.agudeza_visual,
      forma_uso: fila.forma_uso,
      distancia_pupilar: fila.distancia_pupilar,
      filtro: fila.filtro,
      duracion_tratamiento: fila.duracion_tratamiento,
      cantidad_num: fila.cantidad_num,
      cantidad_letras: fila.cantidad_letras,
      indicaciones: fila.indicaciones,
      vigencia_hasta: fila.vigencia_hasta,
      nombre_prescriptor: fila.nombre_prescriptor,
      registro_profesional: fila.registro_profesional,
    },
  };
}

async function zonaTenant(cliente: PoolClient): Promise<string> {
  const filas = await cliente.query<{ valor: string | null }>(
    `select valor #>> '{}' as valor
       from parametros_tenant
      where clave = 'zona_horaria' and vigente_hasta is null
      limit 1`,
  );
  const zona = filas.rows[0]?.valor?.trim();
  return zona || ZONA_HORARIA_INICIAL;
}

async function leerFila(cliente: PoolClient, id: string): Promise<FilaPrescripcion | null> {
  const filas = await cliente.query<FilaPrescripcion>(`${SELECT_VISTA} where p.id = $1`, [id]);
  return filas.rows[0] ?? null;
}

export async function prepararPrescripcion(ctx: ContextoPrescripcion, atencionId: string, ahora = new Date()) {
  if (!puedeFirmarPrescripcion(ctx.rol)) throw new ErrorPrescripcion(403, 'No tiene permiso para esta acción.');
  exigir(ctx, 'crear');
  exigirUuid(ctx);
  if (!z.uuid().safeParse(atencionId).success) throw new ErrorPrescripcion(400, 'La atención no es válida.');
  try {
    return await conApp(ctx, async (cliente) => {
      const zona = await zonaTenant(cliente);
      const atencion = await cliente.query<{
        paciente_id: string;
        estado: string;
        nombres: string;
        apellidos: string;
        num_hc: number;
        tipo_doc: string;
        tipo_vinculacion: string;
        razon_social: string;
        direccion: string | null;
        ciudad: string;
        nombre_completo: string | null;
        registro_profesional: string | null;
      }>(
        `select a.paciente_id, a.estado, p.nombres, p.apellidos, p.num_hc, p.tipo_doc, p.tipo_vinculacion,
                t.razon_social, s.direccion, s.ciudad, pf.nombre_completo, pf.registro_profesional
           from atenciones a
           join pacientes p on p.id = a.paciente_id
           join tenants t on t.id = a.tenant_id
           join sedes s on s.id = a.sede_id
           left join perfiles_profesionales pf on pf.usuario_id = $2 and pf.tenant_id = a.tenant_id
          where a.id = $1`,
        [atencionId, ctx.usuario_id],
      );
      const fila = atencion.rows[0];
      if (!fila) throw new ErrorPrescripcion(404, 'No se encontró la atención.');
      if (fila.estado !== 'firmado') {
        throw new ErrorPrescripcion(422, 'La prescripción se emite después de firmar la atención.');
      }
      return {
        atencion_id: atencionId,
        paciente_id: fila.paciente_id,
        fecha: fechaDeFirma(ahora, zona),
        prestador_nombre: fila.razon_social,
        direccion: fila.direccion ?? '',
        telefono: '',
        correo: '',
        lugar: fila.ciudad,
        paciente_nombre: `${fila.nombres} ${fila.apellidos}`.trim(),
        paciente_documento: '',
        paciente_tipo_doc: fila.tipo_doc,
        numero_hc: String(fila.num_hc),
        tipo_usuario: fila.tipo_vinculacion,
        nombre_prescriptor: fila.nombre_completo ?? '',
        registro_profesional: fila.registro_profesional ?? '',
        vigencia_hasta: '',
        cantidad_num: null,
        cantidad_letras: '',
        nota: 'TODO(Q-18): la vigencia y la cantidad no tienen valor por defecto.',
      };
    });
  } catch (error) {
    traducir(error);
  }
}

async function verificarDocumentoPaciente(cliente: PoolClient, pacienteId: string, documento: string) {
  const filas = await cliente.query<{ tipo_doc: string; num_doc_hash: string }>(
    `select tipo_doc, num_doc_hash from pacientes where id = $1`,
    [pacienteId],
  );
  const fila = filas.rows[0];
  if (!fila) throw new ErrorPrescripcion(404, 'No se encontró el paciente.');
  const clave = claveMaestraActiva(leerRegistroKek());
  const hash = hashDocumento(fila.tipo_doc, documento, clave);
  if (hash !== fila.num_doc_hash) {
    throw new ErrorPrescripcion(422, 'El documento no corresponde al paciente.');
  }
}

async function reservarNumero(cliente: PoolClient, anio: number): Promise<string> {
  const filas = await cliente.query<{ ultimo: number }>(
    `insert into secuencias_prescripcion (tenant_id, anio, ultimo)
     values (current_setting('app.tenant_id')::uuid, $1, 1)
     on conflict (tenant_id, anio)
     do update set ultimo = secuencias_prescripcion.ultimo + 1
     returning ultimo`,
    [anio],
  );
  const ultimo = filas.rows[0]?.ultimo;
  if (!ultimo) throw new ErrorPrescripcion(400, 'No se pudo numerar la prescripción.');
  return formatearNumeroPrescripcion(anio, ultimo);
}

async function insertarBorrador(
  cliente: PoolClient,
  ctx: ContextoPrescripcion,
  entrada: { atencionId: string; pacienteId: string; tipo: string; sustituyeA: string | null },
): Promise<string> {
  const filas = await cliente.query<{ id: string }>(
    `insert into prescripciones (
       tenant_id, sede_id, atencion_id, paciente_id, profesional_id, tipo, estado, contenido, sustituye_a
     ) values ($1, $2, $3, $4, $5, $6, 'borrador', 'borrador', $7)
     returning id`,
    [ctx.tenant_id, ctx.sede_id, entrada.atencionId, entrada.pacienteId, ctx.usuario_id, entrada.tipo, entrada.sustituyeA],
  );
  const id = filas.rows[0]?.id;
  if (!id) throw new ErrorPrescripcion(400, 'No se pudo crear la prescripción.');
  return id;
}

function problemasAError(problemas: { campo: string; mensaje: string }[]): ErrorPrescripcion {
  const primero = problemas[0];
  const textoProblemas = problemas.map((item) => item.mensaje).join(' ');
  return new ErrorPrescripcion(422, primero ? textoProblemas : 'La prescripción no cumple el art. 17.');
}

async function emitir(
  ctx: ContextoPrescripcion,
  cuerpo: unknown,
  sustituyeA: string | null,
  ahora: Date,
): Promise<PrescripcionVista> {
  if (!puedeFirmarPrescripcion(ctx.rol)) throw new ErrorPrescripcion(403, 'No tiene permiso para esta acción.');
  if (!ctx.tarjeta_profesional_vigente) throw new ErrorPrescripcion(403, 'El registro profesional no está vigente.');
  exigir(ctx, 'crear');
  exigir(ctx, 'firmar');
  exigirUuid(ctx);
  const bruto = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  const atencionId = texto(bruto.atencion_id);
  if (!z.uuid().safeParse(atencionId).success) throw new ErrorPrescripcion(400, 'La atención no es válida.');
  const entrada = entradaDesdeCuerpo(cuerpo, true);
  let zona = ZONA_HORARIA_INICIAL;
  let pacienteId = '';
  try {
    const previo = await conApp(ctx, async (cliente) => {
      zona = await zonaTenant(cliente);
      const atencion = await cliente.query<{ paciente_id: string; estado: string; tipo_doc: string; num_hc: number }>(
        `select a.paciente_id, a.estado, p.tipo_doc, p.num_hc
           from atenciones a
           join pacientes p on p.id = a.paciente_id
          where a.id = $1`,
        [atencionId],
      );
      return atencion.rows[0] ?? null;
    });
    if (!previo) throw new ErrorPrescripcion(404, 'No se encontró la atención.');
    if (previo.estado !== 'firmado') throw new ErrorPrescripcion(422, 'La prescripción se emite después de firmar la atención.');
    if (entrada.numero_hc.trim() !== String(previo.num_hc)) {
      throw new ErrorPrescripcion(422, 'Falta el campo «numero_hc» del art. 17 (número de historia clínica).');
    }
    pacienteId = previo.paciente_id;
  } catch (error) {
    traducir(error);
  }
  const validacion = validarFirmaPrescripcion(entrada, ahora, zona);
  if (!validacion.ok) throw problemasAError(validacion.problemas);
  const datos = validacion.datos;
  try {
    await conApp(ctx, async (cliente) => {
      await verificarDocumentoPaciente(cliente, pacienteId, datos.paciente_documento);
    });
  } catch (error) {
    traducir(error);
  }
  const anio = Number(datos.fecha.slice(0, 4));
  let numero = '';
  try {
    numero = await conApp(ctx, (cliente) => reservarNumero(cliente, anio));
  } catch (error) {
    traducir(error);
  }
  const conNumero = { ...datos, numero };
  const lineas = lineasPrescripcion(conNumero);
  const hashVerificacion = hashVerificacionPrescripcion(lineas);
  const urlVerificacion = urlVerificacionPrescripcion(hashVerificacion, process.env.PRESCRIPCION_VERIFICACION_BASE_URL);
  const firmaCtx = contextoFirma(ctx);
  let sellado: { hash: string; firma_id: string };
  let idPrescripcion = '';
  try {
    const documento = await crearDocumentoPrescripcion(firmaCtx, {
      titulo: `Prescripcion ${numero}`.slice(0, 160),
      cuerpo: lineas.join('\n'),
    });
    await firmarProfesional(firmaCtx, documento.id, ahora);
    sellado = await sellarPrescripcionProfesional(firmaCtx, documento.id, lineas, { url: urlVerificacion }, ahora);
    const id = await conApp(ctx, async (cliente) => {
      const nuevo = await insertarBorrador(cliente, ctx, {
        atencionId,
        pacienteId,
        tipo: datos.tipo,
        sustituyeA,
      });
      const cambio = await cliente.query(
        `update prescripciones set
           estado = 'firmada',
           firmado_por = $2,
           contenido = $3,
           numero = $4,
           anio = $5,
           consecutivo = $6,
           prestador_nombre = $7,
           direccion = $8,
           telefono = $9,
           correo = $10,
           lugar = $11,
           fecha = $12,
           paciente_nombre = $13,
           paciente_documento = $14,
           numero_hc = $15,
           tipo_usuario = $16,
           dispositivo = $17,
           agudeza_visual = $18,
           forma_uso = $19,
           distancia_pupilar = $20,
           filtro = $21,
           duracion_tratamiento = $22,
           cantidad_num = $23,
           cantidad_letras = $24,
           indicaciones = $25,
           vigencia_hasta = $26,
           nombre_prescriptor = $27,
           registro_profesional = $28,
           firma_id = $29,
           documento_firma_id = $30,
           hash_pdf = $31,
           hash_verificacion = $32
         where id = $1 and estado = 'borrador'`,
        [
          nuevo,
          ctx.usuario_id,
          contenidoPrescripcion(conNumero),
          numero,
          anio,
          Number(numero.slice(-6)),
          datos.prestador_nombre,
          datos.direccion,
          datos.telefono,
          datos.correo,
          datos.lugar,
          datos.fecha,
          datos.paciente_nombre,
          datos.paciente_documento,
          datos.numero_hc,
          datos.tipo_usuario,
          datos.dispositivo,
          datos.agudeza_visual,
          datos.forma_uso,
          datos.distancia_pupilar,
          datos.filtro,
          datos.duracion_tratamiento,
          datos.cantidad_num,
          datos.cantidad_letras,
          datos.indicaciones,
          datos.vigencia_hasta,
          datos.nombre_prescriptor,
          datos.registro_profesional,
          sellado.firma_id,
          documento.id,
          sellado.hash,
          hashVerificacion,
        ],
      );
      if ((cambio.rowCount ?? 0) === 0) throw new ErrorPrescripcion(409, 'La prescripción firmada es inmutable.');
      idPrescripcion = nuevo;
      return nuevo;
    });
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
        recurso: 'prescripcion',
        recurso_id: idPrescripcion,
        accion: 'firmar',
        resultado: 'ok',
        ip: ctx.ip,
        agente: ctx.agente,
      },
    );
    return await conApp(ctx, async (cliente) => {
      const fila = await leerFila(cliente, id);
      if (!fila) throw new ErrorPrescripcion(404, 'No se encontró la prescripción.');
      const zonaActual = await zonaTenant(cliente);
      return vistaDe(fila, ahora, zonaActual);
    });
  } catch (error) {
    traducir(error);
  }
}

export async function crearPrescripcion(ctx: ContextoPrescripcion, cuerpo: unknown, ahora = new Date()) {
  return emitir(ctx, cuerpo, null, ahora);
}

export async function corregirPrescripcion(ctx: ContextoPrescripcion, id: string, cuerpo: unknown, ahora = new Date()) {
  if (!z.uuid().safeParse(id).success) throw new ErrorPrescripcion(400, 'La prescripción no es válida.');
  exigirUuid(ctx);
  let anterior: FilaPrescripcion | null = null;
  try {
    anterior = await conApp(ctx, (cliente) => leerFila(cliente, id));
  } catch (error) {
    traducir(error);
  }
  if (!anterior || anterior.estado !== 'firmada') {
    throw new ErrorPrescripcion(409, 'Solo se corrige una prescripción firmada, con una nueva.');
  }
  const bruto = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>) : {};
  const completo: Record<string, unknown> = { ...bruto, atencion_id: anterior.atencion_id };
  if (!texto(completo.vigencia_hasta)) {
    throw new ErrorPrescripcion(422, 'Falta el campo «vigencia_hasta» del art. 17 (vigencia).');
  }
  return emitir(ctx, completo, anterior.id, ahora);
}

export async function actualizarBorrador(ctx: ContextoPrescripcion, id: string, cuerpo: unknown) {
  if (!puedeFirmarPrescripcion(ctx.rol)) throw new ErrorPrescripcion(403, 'No tiene permiso para esta acción.');
  exigir(ctx, 'actualizar');
  if (!z.uuid().safeParse(id).success) throw new ErrorPrescripcion(400, 'La prescripción no es válida.');
  if (cuerpo === null) throw new ErrorPrescripcion(400, 'La prescripción no es válida.');
  throw new ErrorPrescripcion(403, 'No tiene permiso para esta acción.');
}

export async function leerPrescripcion(ctx: ContextoPrescripcion, id: string, ahora = new Date()) {
  exigir(ctx, 'leer');
  exigirUuid(ctx);
  if (!z.uuid().safeParse(id).success) throw new ErrorPrescripcion(400, 'La prescripción no es válida.');
  try {
    const fila = await conApp(ctx, async (cliente) => {
      const zona = await zonaTenant(cliente);
      const encontrada = await leerFila(cliente, id);
      return { encontrada, zona };
    });
    if (!fila.encontrada) throw new ErrorPrescripcion(404, 'No se encontró la prescripción.');
    const vista = vistaDe(fila.encontrada, ahora, fila.zona);
    const veHc = actorDe(ctx).rol === 'optometra' || actorDe(ctx).rol === 'oftalmologo';
    const habilidadClinica = veHc;
    if (!habilidadClinica) {
      const completa: PrescripcionCompleta = {
        id: vista.id,
        numero_verificacion: vista.numero ?? '',
        atencion_id: vista.atencion_id,
        diagnostico: 'no se entrega',
        anamnesis: 'no se entrega',
        valores_opticos: {
          dispositivo: String(vista.campos.dispositivo ?? ''),
          agudeza_visual: String(vista.campos.agudeza_visual ?? ''),
          distancia_pupilar: String(vista.campos.distancia_pupilar ?? ''),
          cantidad: vista.cantidad_num === null ? '' : String(vista.cantidad_num),
          cantidad_letras: vista.cantidad_letras ?? '',
        },
        vigencia: vista.vigencia_hasta ?? '',
      };
      const dto = dtoPrescripcionParaDispensacion(completa);
      return { reducido: true as const, dto, tieneDiagnostico: dtoTieneDiagnostico(dto) };
    }
    return { reducido: false as const, prescripcion: vista };
  } catch (error) {
    traducir(error);
  }
}

export async function leerPdfPrescripcion(
  ctx: ContextoPrescripcion,
  id: string,
  medio: 'descarga' | 'impresion' = 'descarga',
) {
  exigir(ctx, 'exportar');
  exigirUuid(ctx);
  if (!z.uuid().safeParse(id).success) throw new ErrorPrescripcion(400, 'La prescripción no es válida.');
  try {
    const documentoId = await conApp(ctx, async (cliente) => {
      const fila = await leerFila(cliente, id);
      return fila?.documento_firma_id ?? null;
    });
    if (!documentoId) throw new ErrorPrescripcion(404, 'No se encontró el PDF de la prescripción.');
    const archivo = await exportarDocumento(contextoFirma(ctx), documentoId);
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
        recurso: 'prescripcion',
        recurso_id: id,
        accion: medio,
        resultado: 'ok',
        ip: ctx.ip,
        agente: ctx.agente,
      },
    );
    return archivo;
  } catch (error) {
    traducir(error);
  }
}
