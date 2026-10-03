// OPT-06 (T25) — Solicitud y entrega de la copia gratuita.
// Reutiliza `documentoHistoriaFirmada` y `renderizarPdfHistoriaClinica`.
// El código va al correo registrado por el puerto de T17 (desarrollo: no sale de la máquina).
// TODO(Q-07): sin parámetro `entrega_hc_enlace_horas` el enlace autenticado no expira.
// TODO(Q-22): el PDF no es PDF/A.
// BORRADOR – requiere revisión jurídica.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import {
  CLAVE_PLAZO_ENLACE,
  COSTO_COPIA_HC_COP,
  MENSAJE_TERCERO,
  claseSolicitante,
  codigoParaRespuesta,
  entregaATerceroPermitida,
  ordenCronologico,
  plazoEnlaceHoras,
} from '../dominio/entrega-hc';
import { hashDocumento } from '../dominio/documento-hash';
import type { EntradaPdfHistoria } from '../dominio/adenda-atencion';
import { VIGENCIA_OTP_MS, generarCodigoOtp, hashCodigoOtp, hashSha256, codigoOtpCoincide } from '../dominio/firma';
import { correoValido } from '../dominio/usuarios-adm';
import { registrarEvento } from '../lib/auditoria/servicio';
import type { ActorAuthz, SujetoRecurso } from '../lib/authz/ability';
import { ErrorAutorizacion, exigirPuede } from '../lib/authz/exigir';
import { cifrarParaTenant, descifrarParaTenant } from '../lib/cifrado/almacen.mjs';
import { claveMaestraActiva, leerRegistroKek } from '../lib/cifrado/kek.mjs';
import { obtenerCorreoPort, type CorreoPort } from '../lib/correo/puerto';
import { esProduccion } from '../lib/entorno';
import { renderizarPdfHistoriaClinica } from '../lib/historia/pdf-hc';
import { documentoHistoriaFirmada } from './adendas-atencion';
import { ErrorAtencion, type ContextoAtencion } from './atenciones';
import { obtenerPool } from './index';

export class ErrorEntrega extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorEntrega';
    this.status = status;
  }
}

export interface SolicitudCopia {
  id: string;
  estado: 'solicitada';
  costo_cop: number;
  codigo_desarrollo: string | null;
}

export interface EntregaCopia {
  id: string;
  estado: 'entregada';
  hash_pdf: string;
  costo_cop: number;
  archivo_id: string;
  pdf_base64: string;
}

export interface PdfEntrega {
  hash_pdf: string;
  pdf_base64: string;
  costo_cop: number;
}

const CANAL = 'correo';

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
  return { tipo: 'R23', tenantId: ctx.tenant_id, sedeId: ctx.sede_id };
}

function exigir(ctx: ContextoAtencion, accion: 'crear' | 'exportar') {
  try {
    exigirPuede(actorDe(ctx), accion, sujeto(ctx));
  } catch (error) {
    if (error instanceof ErrorAutorizacion) throw new ErrorEntrega(403, error.message);
    throw error;
  }
}

function exigirUuid(ctx: ContextoAtencion) {
  const valido = z
    .object({ tenant_id: z.uuid(), usuario_id: z.uuid(), sede_id: z.uuid() })
    .safeParse(ctx);
  if (!valido.success) throw new ErrorEntrega(400, 'La sesión de demostración no puede entregar la copia.');
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
  if (error instanceof ErrorEntrega) throw error;
  if (error instanceof ErrorAutorizacion) throw new ErrorEntrega(403, error.message);
  if (error instanceof ErrorAtencion) throw new ErrorEntrega(error.status, error.message);
  const mensaje = error instanceof Error ? error.message : '';
  if (/inmutable|transicion de estado|no se borra|no cambia de paciente/i.test(mensaje)) {
    throw new ErrorEntrega(409, 'La entrega registrada no se puede modificar.');
  }
  console.error('No se pudo completar la copia de la historia clínica.');
  throw new ErrorEntrega(400, 'No se pudo completar la copia de la historia clínica.');
}

async function anotar(
  ctx: ContextoAtencion,
  entrada: { accion: 'solicitar' | 'exportar' | 'descarga'; resultado: 'ok' | 'denegado'; recursoId: string },
) {
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
      recurso: 'entrega_hc',
      recurso_id: entrada.recursoId,
      accion: entrada.accion,
      resultado: entrada.resultado,
      ip: ctx.ip ?? null,
      agente: ctx.agente ?? null,
      request_id: ctx.request_id ?? null,
    },
  );
}

function documentoPlano(valor: unknown): string {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto.length < 3 || texto.length > 32) {
    throw new ErrorEntrega(400, 'El documento no es válido.');
  }
  return texto;
}

async function correoDestino(
  cliente: PoolClient,
  pacienteId: string,
  solicitante: 'titular' | 'representante',
  documento: string,
  representanteId: string | null,
): Promise<string> {
  const paciente = await cliente.query<{ tipo_doc: string; num_doc_hash: string; email: string | null }>(
    `select tipo_doc, num_doc_hash, email from pacientes where id = $1`,
    [pacienteId],
  );
  const fila = paciente.rows[0];
  if (!fila) throw new ErrorEntrega(404, 'No se encontró el paciente.');
  const clave = claveMaestraActiva(leerRegistroKek());
  if (solicitante === 'titular') {
    if (hashDocumento(fila.tipo_doc, documento, clave) !== fila.num_doc_hash) {
      throw new ErrorEntrega(422, 'El documento no corresponde al paciente.');
    }
    const correo = fila.email?.trim().toLowerCase() ?? '';
    if (!correoValido(correo)) throw new ErrorEntrega(422, 'El paciente no tiene un correo registrado.');
    return correo;
  }
  if (!representanteId) throw new ErrorEntrega(400, 'Falta el representante registrado.');
  const vinculo = await cliente.query<{ tipo_doc: string; num_doc_hash: string; contacto: string }>(
    `select r.tipo_doc, r.num_doc_hash, pr.contacto
       from pacientes_representantes pr
       join representantes r on r.id = pr.representante_id
      where pr.paciente_id = $1 and pr.representante_id = $2 and pr.vigente = true`,
    [pacienteId, representanteId],
  );
  const representante = vinculo.rows[0];
  const coincide =
    representante != null &&
    hashDocumento(representante.tipo_doc, documento, clave) === representante.num_doc_hash;
  const tercerosHabilitados: boolean = entregaATerceroPermitida();
  if (!coincide) {
    if (!tercerosHabilitados) throw new ErrorEntrega(403, MENSAJE_TERCERO);
    throw new ErrorEntrega(403, MENSAJE_TERCERO);
  }
  const contacto = representante.contacto.trim().toLowerCase();
  if (!correoValido(contacto)) throw new ErrorEntrega(422, 'El representante no tiene un correo registrado.');
  return contacto;
}

async function horasEnlace(cliente: PoolClient): Promise<number | null> {
  const filas = await cliente.query<{ valor: unknown }>(
    `select valor from parametros_tenant
      where clave = $1 and vigente_hasta is null
      order by vigente_desde desc
      limit 1`,
    [CLAVE_PLAZO_ENLACE],
  );
  return plazoEnlaceHoras(filas.rows[0]?.valor ?? null);
}

async function pdfCronologico(ctx: ContextoAtencion, pacienteId: string): Promise<{ pdf: Buffer; hash: string }> {
  const ids = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string; folio: number | null; firmado_en: Date }>(
      `select id, folio, firmado_en
         from atenciones
        where paciente_id = $1 and estado = 'firmado' and firmado_en is not null`,
      [pacienteId],
    );
    return ordenCronologico(
      filas.rows.map((fila) => ({
        id: fila.id,
        folio: fila.folio ?? 0,
        firmado_en: new Date(fila.firmado_en).toISOString(),
      })),
    ).map((fila) => fila.id);
  });
  if (ids.length === 0) throw new ErrorEntrega(422, 'No hay atenciones firmadas para copiar.');
  const documentos: EntradaPdfHistoria[] = [];
  for (const id of ids) {
    const documento = await documentoHistoriaFirmada(ctx, id);
    if (documentos.length === 0) {
      documentos.push({
        ...documento,
        secciones: [
          {
            titulo: 'Copia',
            texto: 'Copia electrónica gratuita. Costo 0 COP. BORRADOR – requiere revisión jurídica',
          },
          ...documento.secciones,
        ],
      });
    } else {
      documentos.push(documento);
    }
  }
  const pdf = await renderizarPdfHistoriaClinica(documentos);
  return { pdf, hash: hashSha256(pdf) };
}

export async function solicitarCopiaHc(
  ctx: ContextoAtencion,
  entrada: unknown,
  ahora = new Date(),
  correo: CorreoPort = obtenerCorreoPort(),
): Promise<SolicitudCopia> {
  try {
    exigirUuid(ctx);
    exigir(ctx, 'crear');
    exigir(ctx, 'exportar');
    const cuerpo = z
      .object({
        paciente_id: z.uuid(),
        solicitante: z.string(),
        documento: z.string(),
        representante_id: z.uuid().nullable().optional(),
      })
      .safeParse(entrada);
    if (!cuerpo.success) throw new ErrorEntrega(400, 'La solicitud de copia no es válida.');
    const clase = claseSolicitante(cuerpo.data.solicitante);
    const tercerosHabilitados: boolean = entregaATerceroPermitida();
    if (clase === 'tercero') {
      if (!tercerosHabilitados) {
        await anotar(ctx, { accion: 'solicitar', resultado: 'denegado', recursoId: cuerpo.data.paciente_id });
      }
      throw new ErrorEntrega(403, MENSAJE_TERCERO);
    }
    const documento = documentoPlano(cuerpo.data.documento);
    const representanteId = clase === 'representante' ? (cuerpo.data.representante_id ?? null) : null;
    if (clase === 'representante' && !representanteId) {
      throw new ErrorEntrega(400, 'Falta el representante registrado.');
    }
    const codigo = generarCodigoOtp();
    const expiraCodigo = new Date(ahora.getTime() + VIGENCIA_OTP_MS);
    let entregaId = '';
    let destino = '';
    try {
      const creado = await conApp(ctx, async (cliente) => {
        const contacto = await correoDestino(
          cliente,
          cuerpo.data.paciente_id,
          clase,
          documento,
          representanteId,
        );
        const insertado = await cliente.query<{ id: string }>(
          `insert into entregas_hc (
             tenant_id, sede_id, paciente_id, solicitante, representante_id, medio, estado, costo_cop
           ) values ($1, $2, $3, $4, $5, 'electronico', 'solicitada', $6)
           returning id`,
          [ctx.tenant_id, ctx.sede_id, cuerpo.data.paciente_id, clase, representanteId, COSTO_COPIA_HC_COP],
        );
        const id = insertado.rows[0]?.id;
        if (!id) throw new ErrorEntrega(400, 'No se pudo registrar la solicitud.');
        await cliente.query(
          `insert into codigos_entrega_hc (tenant_id, sede_id, entrega_id, codigo_hash, canal, expira_en)
           values ($1, $2, $3, $4, $5, $6)`,
          [ctx.tenant_id, ctx.sede_id, id, hashCodigoOtp(id, codigo), CANAL, expiraCodigo.toISOString()],
        );
        return { id, contacto };
      });
      entregaId = creado.id;
      destino = creado.contacto;
    } catch (error) {
      if (error instanceof ErrorEntrega && error.status === 403) {
        await anotar(ctx, { accion: 'solicitar', resultado: 'denegado', recursoId: cuerpo.data.paciente_id });
      }
      throw error;
    }
    if (!correo.enviarCodigoUnSoloUso) {
      throw new ErrorEntrega(500, 'El puerto de correo no entrega códigos.');
    }
    await correo.enviarCodigoUnSoloUso({ destinatario: destino, codigo, referencia: entregaId });
    await anotar(ctx, { accion: 'solicitar', resultado: 'ok', recursoId: entregaId });
    return {
      id: entregaId,
      estado: 'solicitada',
      costo_cop: COSTO_COPIA_HC_COP,
      codigo_desarrollo: codigoParaRespuesta(esProduccion() ? 'produccion' : 'desarrollo', codigo),
    };
  } catch (error) {
    traducir(error);
  }
}

export async function entregarCopiaHc(
  ctx: ContextoAtencion,
  entregaId: string,
  entrada: unknown,
  ahora = new Date(),
): Promise<EntregaCopia> {
  try {
    exigirUuid(ctx);
    if (!z.uuid().safeParse(entregaId).success) throw new ErrorEntrega(400, 'La solicitud no es válida.');
    exigir(ctx, 'crear');
    exigir(ctx, 'exportar');
    const cuerpo = z.object({ codigo: z.string() }).safeParse(entrada);
    if (!cuerpo.success) throw new ErrorEntrega(400, 'El código no es válido.');
    const previo = await conApp(ctx, async (cliente) => {
      const entrega = await cliente.query<{ id: string; paciente_id: string; estado: string }>(
        `select id, paciente_id, estado from entregas_hc where id = $1`,
        [entregaId],
      );
      const fila = entrega.rows[0];
      if (!fila) throw new ErrorEntrega(404, 'No se encontró la solicitud de copia.');
      if (fila.estado !== 'solicitada') throw new ErrorEntrega(409, 'La copia ya fue generada.');
      const codigos = await cliente.query<{ id: string; codigo_hash: string; expira_en: Date }>(
        `select id, codigo_hash, expira_en
           from codigos_entrega_hc
          where entrega_id = $1 and usado_en is null
          order by creado_en desc
          limit 1`,
        [entregaId],
      );
      return { pacienteId: fila.paciente_id, codigo: codigos.rows[0] ?? null };
    });
    if (!previo.codigo || new Date(previo.codigo.expira_en).getTime() < ahora.getTime()) {
      throw new ErrorEntrega(422, 'El código de un solo uso expiró.');
    }
    if (!codigoOtpCoincide(entregaId, cuerpo.data.codigo.trim(), previo.codigo.codigo_hash)) {
      throw new ErrorEntrega(422, 'El código de un solo uso no coincide.');
    }
    const generado = await pdfCronologico(ctx, previo.pacienteId);
    const registro = leerRegistroKek();
    const cifrado = await cifrarParaTenant(obtenerPool(), registro, ctx.tenant_id, generado.pdf);
    const guardado = await conApp(ctx, async (cliente) => {
      const usado = await cliente.query(
        `update codigos_entrega_hc set usado_en = now() where id = $1 and usado_en is null`,
        [previo.codigo?.id],
      );
      if ((usado.rowCount ?? 0) !== 1) throw new ErrorEntrega(422, 'El código de un solo uso ya no sirve.');
      const horas = await horasEnlace(cliente);
      const expira = horas == null ? null : new Date(ahora.getTime() + horas * 60 * 60 * 1000).toISOString();
      const anexo = await cliente.query<{ id: string }>(
        `insert into anexos (tenant_id, nombre, mime, tamano, hash_sha256, contenido_cifrado, clave_version)
         values ($1, 'copia-hc.pdf', 'application/pdf', $2, $3, $4, $5)
         returning id`,
        [ctx.tenant_id, generado.pdf.length, generado.hash, cifrado.bytes, cifrado.version],
      );
      const archivoId = anexo.rows[0]?.id;
      if (!archivoId) throw new ErrorEntrega(400, 'No se pudo guardar la copia.');
      const generada = await cliente.query(
        `update entregas_hc
            set estado = 'generada', archivo_id = $2, hash_pdf = $3, expira_en = $4
          where id = $1 and estado = 'solicitada'`,
        [entregaId, archivoId, generado.hash, expira],
      );
      if ((generada.rowCount ?? 0) !== 1) throw new ErrorEntrega(409, 'La copia ya fue generada.');
      const entregada = await cliente.query(
        `update entregas_hc
            set estado = 'entregada', entregada_en = now(), entregada_por = $2
          where id = $1 and estado = 'generada'`,
        [entregaId, ctx.usuario_id],
      );
      if ((entregada.rowCount ?? 0) !== 1) throw new ErrorEntrega(409, 'La entrega registrada no se puede modificar.');
      return archivoId;
    });
    await anotar(ctx, { accion: 'exportar', resultado: 'ok', recursoId: entregaId });
    return {
      id: entregaId,
      estado: 'entregada',
      hash_pdf: generado.hash,
      costo_cop: COSTO_COPIA_HC_COP,
      archivo_id: guardado,
      pdf_base64: generado.pdf.toString('base64'),
    };
  } catch (error) {
    traducir(error);
  }
}

export async function leerPdfEntrega(ctx: ContextoAtencion, entregaId: string, ahora = new Date()): Promise<PdfEntrega> {
  try {
    exigirUuid(ctx);
    if (!z.uuid().safeParse(entregaId).success) throw new ErrorEntrega(400, 'La solicitud no es válida.');
    exigir(ctx, 'exportar');
    const fila = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{
        hash_pdf: string | null;
        archivo_id: string | null;
        estado: string;
        expira_en: Date | null;
        costo_cop: number;
        contenido_cifrado: Buffer | null;
      }>(
        `select e.hash_pdf, e.archivo_id, e.estado, e.expira_en, e.costo_cop, a.contenido_cifrado
           from entregas_hc e
           left join anexos a on a.id = e.archivo_id
          where e.id = $1`,
        [entregaId],
      );
      return filas.rows[0] ?? null;
    });
    if (!fila || fila.estado !== 'entregada' || !fila.hash_pdf || !fila.contenido_cifrado) {
      throw new ErrorEntrega(404, 'No se encontró la copia entregada.');
    }
    if (fila.expira_en && new Date(fila.expira_en).getTime() < ahora.getTime()) {
      throw new ErrorEntrega(410, 'El enlace de la copia expiró.');
    }
    const plano = await descifrarParaTenant(obtenerPool(), leerRegistroKek(), ctx.tenant_id, fila.contenido_cifrado);
    const pdf = Buffer.from(plano);
    if (hashSha256(pdf) !== fila.hash_pdf) throw new ErrorEntrega(409, 'El hash de la copia no coincide.');
    await anotar(ctx, { accion: 'descarga', resultado: 'ok', recursoId: entregaId });
    return { hash_pdf: fila.hash_pdf, pdf_base64: pdf.toString('base64'), costo_cop: fila.costo_cop };
  } catch (error) {
    traducir(error);
  }
}
