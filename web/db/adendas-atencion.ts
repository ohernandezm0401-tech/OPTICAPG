// OPT-02 (T21) — Adenda firmada de una atención. No actualiza la fila original.
// Reutiliza el marco de T12 (trigger e hash) y la firma profesional de T14.
// OPT-06 (T25) debe llamar `documentoHistoriaFirmada` y
// `renderizarPdfHistoriaClinica` para la copia al paciente.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import { ErrorAtencion, type ContextoAtencion } from './atenciones';
import { crearDocumentoAtencion, ErrorFirma, firmarProfesional, type ContextoFirma } from './firma';
import { obtenerPool } from './index';
import { leerLimitesCaptura } from './limites-captura';
import {
  CAMPOS_REFRACCION_ADENDA,
  ETIQUETAS_REFRACCION,
  prepararAdenda,
  proyectarHistorial,
  referenciaAdenda,
  referenciaExamen,
  type AdendaPlano,
  type CampoRefraccionAdenda,
  type EntradaPdfHistoria,
  type HistorialProyectado,
  type LineaHistorial,
} from '../dominio/adenda-atencion';
import { codigoHttpFirma, lineaSelloProfesional, presentarBogota } from '../dominio/firma';
import { abrirHistoriaClinica } from '../lib/auditoria/lecturas';
import { registrarEvento } from '../lib/auditoria/servicio';
import type { ActorAuthz, SujetoRecurso } from '../lib/authz/ability';
import { ErrorAutorizacion, exigirPuede } from '../lib/authz/exigir';
import { cifrarCampoClinico, descifrarCampoClinico } from '../lib/cifrado/servicio';
import { renderizarPdfHistoriaClinica } from '../lib/historia/pdf-hc';

export interface HistorialAtencion extends HistorialProyectado {
  atencion_id: string;
  linea: LineaHistorial[];
}

const CAMPOS = CAMPOS_REFRACCION_ADENDA;

function esCampo(valor: string): valor is CampoRefraccionAdenda {
  return (CAMPOS as readonly string[]).includes(valor);
}

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

function exigir(
  ctx: ContextoAtencion,
  accion: 'leer' | 'crear' | 'firmar',
  recurso: 'R3' | 'R4',
  sedeId: string,
) {
  const sujeto: SujetoRecurso = {
    tipo: recurso,
    tenantId: ctx.tenant_id,
    sedeId,
    autorId: ctx.usuario_id,
    pacientesEnSede: ctx.sedes.includes(sedeId),
  };
  try {
    exigirPuede(actorDe(ctx), accion, sujeto);
  } catch (error) {
    if (error instanceof ErrorAutorizacion) throw new ErrorAtencion(403, error.message);
    throw error;
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
  if (error instanceof ErrorAtencion || error instanceof ErrorAutorizacion) throw error;
  if (error instanceof ErrorFirma) {
    throw new ErrorAtencion(codigoHttpFirma(error.codigo, error.message), error.message);
  }
  const mensaje = error instanceof Error ? error.message : '';
  if (/inmutable|prohibido|solo se adenda|nota complementaria|tipo correccion/i.test(mensaje)) {
    throw new ErrorAtencion(409, 'La atención firmada no se modifica. La corrección es una adenda.');
  }
  if (/llave duplicada|duplicate key|atencion_adendas_numero_unico/i.test(mensaje)) {
    throw new ErrorAtencion(409, 'La atención cambió. Intente de nuevo.');
  }
  if (error instanceof Error) throw error;
  throw new ErrorAtencion(400, 'No se pudo guardar la adenda.');
}

function textoValor(valor: unknown): string {
  if (valor == null || valor === '') return '';
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) ? String(numero) : String(valor);
}

function motivoDe(contenido: string): string {
  try {
    const parsed = JSON.parse(contenido) as { motivo?: unknown };
    return typeof parsed.motivo === 'string' ? parsed.motivo : '';
  } catch {
    return '';
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

interface FilaBase {
  sede_id: string;
  estado: string;
  profesional_id: string;
  folio: number | null;
  firmado_en: Date | null;
  contenido: string;
  firma_documento_id: string | null;
  autor_original: string | null;
  examen: Record<string, unknown>;
  diagnostico: string | null;
  plan: string | null;
}

async function leerBase(cliente: PoolClient, id: string): Promise<FilaBase | null> {
  const atencion = await cliente.query<{
    sede_id: string;
    estado: string;
    profesional_id: string;
    folio: number | null;
    firmado_en: Date | null;
    contenido: string;
    firma_documento_id: string | null;
    autor_original: string | null;
  }>(
    `select a.sede_id, a.estado, a.profesional_id, a.folio, a.firmado_en, a.contenido, a.firma_documento_id,
            p.nombre_completo as autor_original
       from atenciones a
       left join perfiles_profesionales p
         on p.usuario_id = a.firmado_por and p.tenant_id = a.tenant_id
      where a.id = $1`,
    [id],
  );
  const fila = atencion.rows[0];
  if (!fila) return null;
  const examen = await cliente.query<Record<string, unknown>>(
    `select esfera_od, cilindro_od, eje_od, adicion_od, agudeza_od,
            esfera_oi, cilindro_oi, eje_oi, adicion_oi, agudeza_oi,
            dip, dip_monocular_od, dip_monocular_oi
       from examenes_optometricos where atencion_id = $1`,
    [id],
  );
  const diagnostico = await cliente.query<{ codigo_cie10: string }>(
    `select codigo_cie10 from diagnosticos where atencion_id = $1 and principal = true limit 1`,
    [id],
  );
  const plan = await cliente.query<{ conducta: string }>(
    `select conducta from planes_manejo where atencion_id = $1 limit 1`,
    [id],
  );
  return {
    ...fila,
    examen: examen.rows[0] ?? {},
    diagnostico: diagnostico.rows[0]?.codigo_cie10 ?? null,
    plan: plan.rows[0]?.conducta ?? null,
  };
}

function refraccionOriginal(examen: Record<string, unknown>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const campo of CAMPOS) {
    const texto = textoValor(examen[campo]);
    if (texto) salida[campo] = texto;
  }
  return salida;
}

async function adendasPlanas(ctx: ContextoAtencion, cliente: PoolClient, atencionId: string): Promise<AdendaPlano[]> {
  const filas = await cliente.query<{
    id: string;
    numero: number;
    campo_ref: string;
    valor_anterior_ref: string;
    nuevo_valor: string;
    motivo: string;
    autor_id: string;
    autor: string | null;
    firmado_en: Date | null;
    tipo_nota: 'correccion' | 'complementaria';
  }>(
    `select d.id, d.numero, d.campo_ref, d.valor_anterior_ref, d.nuevo_valor, d.motivo, d.autor_id,
            d.tipo_nota, d.firmado_en, p.nombre_completo as autor
       from atencion_adendas d
       left join perfiles_profesionales p
         on p.usuario_id = d.autor_id and p.tenant_id = d.tenant_id
      where d.atencion_id = $1
      order by d.numero`,
    [atencionId],
  );
  const planas: AdendaPlano[] = [];
  for (const fila of filas.rows) {
    if (!esCampo(fila.campo_ref)) continue;
    planas.push({
      id: fila.id,
      numero: fila.numero,
      campo_ref: fila.campo_ref,
      valor_anterior_ref: fila.valor_anterior_ref,
      nuevo_valor: await descifrarCampoClinico(ctx.tenant_id, 'atencion_adendas.nuevo_valor', fila.nuevo_valor),
      motivo: await descifrarCampoClinico(ctx.tenant_id, 'atencion_adendas.motivo', fila.motivo),
      autor_id: fila.autor_id,
      autor: fila.autor ?? 'Profesional',
      hora_bogota: fila.firmado_en ? presentarBogota(new Date(fila.firmado_en)) : null,
      tipo_nota: fila.tipo_nota,
    });
  }
  return planas;
}

async function selloDe(cliente: PoolClient, documentoId: string | null): Promise<string | null> {
  if (!documentoId) return null;
  const firma = await cliente.query<{
    nombre_firmante: string | null;
    registro_profesional: string | null;
    firmado_en: Date;
  }>(
    `select nombre_firmante, registro_profesional, firmado_en
       from firmas
      where documento_id = $1 and tipo_firmante = 'profesional'
      limit 1`,
    [documentoId],
  );
  const profesional = firma.rows[0];
  if (!profesional?.nombre_firmante || !profesional.registro_profesional) return null;
  return lineaSelloProfesional(
    profesional.nombre_firmante,
    profesional.registro_profesional,
    new Date(profesional.firmado_en),
  );
}

async function armarHistorial(ctx: ContextoAtencion, atencionId: string): Promise<{
  base: FilaBase;
  historial: HistorialAtencion;
  sello: string | null;
} | null> {
  return conApp(ctx, async (cliente) => {
    const base = await leerBase(cliente, atencionId);
    if (!base) return null;
    const adendas = await adendasPlanas(ctx, cliente, atencionId);
    const proyectado = proyectarHistorial({
      autorOriginal: base.autor_original ?? 'Profesional',
      horaOriginalBogota: base.firmado_en ? presentarBogota(new Date(base.firmado_en)) : null,
      originalRefraccion: refraccionOriginal(base.examen),
      adendas,
    });
    return {
      base,
      sello: await selloDe(cliente, base.firma_documento_id),
      historial: { atencion_id: atencionId, ...proyectado },
    };
  });
}

function exigirLectura(ctx: ContextoAtencion, sedeId: string) {
  exigir(ctx, 'leer', 'R3', sedeId);
  exigir(ctx, 'leer', 'R4', sedeId);
}

export async function listarHistorialAtencion(ctx: ContextoAtencion, atencionId: string): Promise<HistorialAtencion> {
  if (!z.uuid().safeParse(atencionId).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  if (!z.uuid().safeParse(ctx.tenant_id).success) {
    throw new ErrorAtencion(400, 'La sesión de demostración no puede abrir la atención.');
  }
  try {
    const armado = await armarHistorial(ctx, atencionId);
    if (!armado) throw new ErrorAtencion(404, 'No se encontró la atención.');
    exigirLectura(ctx, armado.base.sede_id);
    await abrirHistoriaClinica(
      { tenant_id: ctx.tenant_id, usuario_id: ctx.usuario_id, sede_id: ctx.sede_id, sedes: ctx.sedes, rol: ctx.rol },
      {
        atencionId,
        actorId: ctx.usuario_id,
        rol: ctx.rol,
        sedeId: ctx.sede_id,
        ip: ctx.ip,
        agente: ctx.agente,
        requestId: ctx.request_id,
      },
    );
    return armado.historial;
  } catch (error) {
    traducir(error);
  }
}

/** Datos del PDF. T25 (OPT-06) reutiliza esto para la copia al paciente. */
export async function documentoHistoriaFirmada(ctx: ContextoAtencion, atencionId: string): Promise<EntradaPdfHistoria> {
  if (!z.uuid().safeParse(atencionId).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  try {
    const armado = await armarHistorial(ctx, atencionId);
    if (!armado) throw new ErrorAtencion(404, 'No se encontró la atención.');
    exigirLectura(ctx, armado.base.sede_id);
    const refraccion = Object.entries(armado.historial.original_refraccion)
      .map(([campo, valor]) => {
        const etiqueta = esCampo(campo) ? ETIQUETAS_REFRACCION[campo] : campo;
        const marca = armado.historial.marcas[campo];
        return `${etiqueta}: ${valor}${marca ? ` (${marca})` : ''}`;
      })
      .join('\n');
    return {
      folio: armado.base.folio,
      hora_bogota: armado.base.firmado_en ? presentarBogota(new Date(armado.base.firmado_en)) : null,
      sello: armado.sello,
      secciones: [
        { titulo: 'Motivo de consulta', texto: motivoDe(armado.base.contenido) || 'Sin registro' },
        { titulo: 'Refracción original', texto: refraccion || 'Sin registro' },
        { titulo: 'Diagnóstico', texto: armado.base.diagnostico ?? 'Sin registro' },
        { titulo: 'Plan', texto: armado.base.plan ?? 'Sin registro' },
      ],
      adendas: armado.historial.linea,
    };
  } catch (error) {
    traducir(error);
  }
}

export async function generarPdfHistoriaClinica(ctx: ContextoAtencion, atencionId: string): Promise<Buffer> {
  const documento = await documentoHistoriaFirmada(ctx, atencionId);
  return renderizarPdfHistoriaClinica(documento);
}

export async function crearAdendaAtencion(
  ctx: ContextoAtencion,
  atencionId: string,
  entrada: unknown,
  ahora = new Date(),
): Promise<HistorialAtencion> {
  if (!z.uuid().safeParse(atencionId).success) throw new ErrorAtencion(400, 'La atención no es válida.');
  if (!z.uuid().safeParse(ctx.tenant_id).success || !z.uuid().safeParse(ctx.usuario_id).success) {
    throw new ErrorAtencion(400, 'La sesión de demostración no puede abrir la atención.');
  }
  const cuerpo = z
    .object({
      campo_ref: z.string(),
      nuevo_valor: z.string(),
      motivo: z.string(),
    })
    .safeParse(entrada);
  if (!cuerpo.success) throw new ErrorAtencion(400, 'La adenda no es válida.');
  try {
    const base = await conApp(ctx, (cliente) => leerBase(cliente, atencionId));
    if (!base) throw new ErrorAtencion(404, 'No se encontró la atención.');
    exigir(ctx, 'crear', 'R4', base.sede_id);
    exigir(ctx, 'firmar', 'R4', base.sede_id);
    if (base.estado !== 'firmado') {
      throw new ErrorAtencion(409, 'Solo se agrega una adenda a una atención firmada.');
    }
    const limites = await leerLimitesCaptura(ctx);
    const preparada = prepararAdenda({
      campo: cuerpo.data.campo_ref,
      nuevoValorTexto: cuerpo.data.nuevo_valor,
      motivo: cuerpo.data.motivo,
      autorId: ctx.usuario_id,
      profesionalAtencionId: base.profesional_id,
      limites: limites.limites,
    });
    if (!preparada.ok) throw new ErrorAtencion(400, preparada.mensaje);
    const motivoCifrado = await cifrarCampoClinico(ctx.tenant_id, 'atencion_adendas.motivo', preparada.motivo);
    const valorCifrado = await cifrarCampoClinico(
      ctx.tenant_id,
      'atencion_adendas.nuevo_valor',
      preparada.nuevo_valor,
    );
    const documento = await crearDocumentoAtencion(contextoFirma(ctx), {
      titulo: 'Adenda de atencion optometrica',
      cuerpo: JSON.stringify({
        atencion_id: atencionId,
        campo_ref: preparada.campo,
        motivo: preparada.motivo,
        nuevo_valor: preparada.nuevo_valor,
        tipo_nota: preparada.tipo_nota,
      }),
    });
    await firmarProfesional(contextoFirma(ctx), documento.id, ahora);
    const adendaId = await conApp(ctx, async (cliente) => {
      await cliente.query(`select id from atenciones where id = $1 for update`, [atencionId]);
      const estado = await cliente.query<{ estado: string; profesional_id: string }>(
        `select estado, profesional_id from atenciones where id = $1`,
        [atencionId],
      );
      const fila = estado.rows[0];
      if (!fila || fila.estado !== 'firmado') {
        throw new ErrorAtencion(409, 'Solo se agrega una adenda a una atención firmada.');
      }
      const previa = await cliente.query<{ id: string }>(
        `select id::text from atencion_adendas
          where atencion_id = $1 and campo_ref = $2
          order by numero desc
          limit 1`,
        [atencionId, preparada.campo],
      );
      const numeroFila = await cliente.query<{ numero: number }>(
        `select coalesce(max(numero), 0)::int + 1 as numero from atencion_adendas where atencion_id = $1`,
        [atencionId],
      );
      const numero = Number(numeroFila.rows[0]?.numero ?? 1);
      const valorAnteriorRef = previa.rows[0]?.id
        ? referenciaAdenda(previa.rows[0].id)
        : referenciaExamen(preparada.campo);
      const tipo = fila.profesional_id === ctx.usuario_id ? 'correccion' : 'complementaria';
      const contenido = JSON.stringify({
        schema: 1,
        atencion_id: atencionId,
        campo_ref: preparada.campo,
        numero,
        tipo_nota: tipo,
        valor_anterior_ref: valorAnteriorRef,
      });
      const creada = await cliente.query<{ id: string }>(
        `insert into atencion_adendas (
           tenant_id, atencion_id, numero, campo_ref, valor_anterior_ref, nuevo_valor, motivo,
           autor_id, tipo_nota, estado, contenido, firmado_por, firma_documento_id
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'firmada',$10,$8,$11)
         returning id`,
        [
          ctx.tenant_id,
          atencionId,
          numero,
          preparada.campo,
          valorAnteriorRef,
          valorCifrado.texto,
          motivoCifrado.texto,
          ctx.usuario_id,
          tipo,
          contenido,
          documento.id,
        ],
      );
      const id = creada.rows[0]?.id;
      if (!id) throw new ErrorAtencion(400, 'No se pudo guardar la adenda.');
      return id;
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
        recurso: 'atencion_adenda',
        recurso_id: adendaId,
        accion: 'adenda',
        resultado: 'ok',
        ip: ctx.ip,
        agente: ctx.agente,
        request_id: ctx.request_id,
      },
    );
    const historial = await armarHistorial(ctx, atencionId);
    if (!historial) throw new ErrorAtencion(404, 'No se encontró la atención.');
    return historial.historial;
  } catch (error) {
    traducir(error);
  }
}
