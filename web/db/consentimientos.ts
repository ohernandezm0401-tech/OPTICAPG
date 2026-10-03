// OPT-04 (T22) — Consentimiento informado de un procedimiento.
// Reutiliza la plantilla versionada de T15, la firma de paciente de T14
// y el marco de inmutabilidad de T12. La revocatoria no borra el original.
// TODO(Q-17): la negativa de datos no bloquea la atención; aquí el
// procedimiento no inicia sin el consentimiento vigente.
// BORRADOR – requiere revisión jurídica.
// TODO(Q-22): el PDF no es PDF/A.
import 'server-only';

import type { PoolClient } from 'pg';
import { z } from 'zod';

import type { ContextoAtencion } from './atenciones';
import {
  crearDocumentoConsentimiento,
  ErrorFirma,
  firmarPaciente,
  sellarConsentimientoPaciente,
  type ContextoFirma,
} from './firma';
import { obtenerPool } from './index';
import {
  ETIQUETAS_PROCEDIMIENTO,
  MODULOS_PENDIENTES_DE_CONSENTIMIENTO,
  PROCEDIMIENTOS_CON_CONSENTIMIENTO,
  anexoConsentimientoCompleto,
  esProcedimientoConsentimiento,
  estadoVisibleConsentimiento,
  plantillaBorrador,
  planVersionPlantilla,
  puedeIniciarProcedimiento,
  puedePublicarPlantillaConsentimiento,
  puedeRegistrarConsentimiento,
  resolverFirmante,
  textoIncluyeRotuloConsentimiento,
  type EstadoConsentimientoVisible,
  type MotivoInicioProcedimiento,
  type ProcedimientoConsentimiento,
} from '../dominio/consentimiento-clinico';
import { esPng, hashSha256, presentarBogota, puntosDeTrazoValidos } from '../dominio/firma';
import { esMenorDeEdad, fechaCivilBogota } from '../dominio/pacientes';
import { registrarEvento } from '../lib/auditoria/servicio';
import { descifrarParaTenant } from '../lib/cifrado/almacen.mjs';
import { leerRegistroKek } from '../lib/cifrado/kek.mjs';

export { MODULOS_PENDIENTES_DE_CONSENTIMIENTO, puedeIniciarProcedimiento };

export class ErrorConsentimiento extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorConsentimiento';
    this.status = status;
  }
}

interface FilaPlantilla {
  id: string;
  procedimiento: ProcedimientoConsentimiento;
  version: number;
  texto: string;
  hash: string;
}

interface FilaConsentimiento {
  id: string;
  procedimiento: ProcedimientoConsentimiento;
  version_plantilla: number;
  hash_plantilla: string;
  otorgado: boolean;
  revocado: boolean;
  firma_id: string | null;
  hash_anexo: string | null;
  anexo_id: string | null;
  documento_firma_id: string | null;
  hash_documento: string | null;
  contenido: string;
  firmado_en: Date;
}

export interface ConsentimientoVista {
  id: string;
  procedimiento: ProcedimientoConsentimiento;
  etiqueta: string;
  version: number;
  hash: string;
  otorgado: boolean;
  revocado: boolean;
  estado: EstadoConsentimientoVisible;
  firma_id: string | null;
  hash_anexo: string | null;
  anexo_id: string | null;
  atencion_id: string;
  hora_bogota: string;
  texto: string;
}

export interface VistaConsentimientos {
  atencion_id: string;
  plantillas: {
    procedimiento: ProcedimientoConsentimiento;
    etiqueta: string;
    version: number;
    hash: string;
    texto: string;
  }[];
  consentimientos: ConsentimientoVista[];
  puertas: Record<ProcedimientoConsentimiento, { permitida: boolean; motivo: MotivoInicioProcedimiento }>;
  modulos_pendientes: readonly string[];
}

function hashTexto(contenido: string): string {
  return hashSha256(Buffer.from(contenido, 'utf8'));
}

function traducirFirma(error: unknown): never {
  if (error instanceof ErrorFirma) {
    const status = error.codigo === 'permiso' ? 403 : error.codigo === 'no_encontrado' ? 404 : 400;
    throw new ErrorConsentimiento(status, error.message);
  }
  throw error;
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

function ipDe(ctx: ContextoAtencion): string {
  const ip = ctx.ip?.trim() ?? '';
  if (/^[0-9A-Za-z.:[\]]+$/.test(ip) && ip.length <= 64) return ip;
  return '127.0.0.1';
}

async function descifrar(tenantId: string, sobre: string): Promise<string> {
  const plano = await descifrarParaTenant(obtenerPool(), leerRegistroKek(), tenantId, sobre);
  return Buffer.from(plano as Buffer).toString('utf8');
}

async function asegurarPlantillas(cliente: PoolClient, tenantId: string) {
  for (const procedimiento of PROCEDIMIENTOS_CON_CONSENTIMIENTO) {
    const texto = plantillaBorrador(procedimiento);
    await cliente.query(
      `insert into plantillas_consentimiento (tenant_id, procedimiento, version, texto, hash, vigente)
       select $1, $2, 1, $3, $4, true
        where not exists (
          select 1 from plantillas_consentimiento where tenant_id = $1 and procedimiento = $2
        )`,
      [tenantId, procedimiento, texto, hashTexto(texto)],
    );
  }
}

async function exigirAtencion(cliente: PoolClient, atencionId: string): Promise<{ paciente_id: string }> {
  if (!z.uuid().safeParse(atencionId).success) {
    throw new ErrorConsentimiento(400, 'La atención no es válida.');
  }
  const filas = await cliente.query<{ paciente_id: string }>(
    `select paciente_id from atenciones where id = $1`,
    [atencionId],
  );
  const fila = filas.rows[0];
  if (!fila) throw new ErrorConsentimiento(404, 'No se encontró la atención.');
  return fila;
}

async function plantillasVigentes(cliente: PoolClient): Promise<FilaPlantilla[]> {
  const filas = await cliente.query<FilaPlantilla>(
    `select id, procedimiento, version, texto, hash
       from plantillas_consentimiento
      where vigente = true
      order by procedimiento`,
  );
  return filas.rows.filter((fila) => esProcedimientoConsentimiento(fila.procedimiento));
}

async function consentimientosDe(cliente: PoolClient, atencionId: string): Promise<FilaConsentimiento[]> {
  const filas = await cliente.query<FilaConsentimiento>(
    `select c.id, c.procedimiento, c.version_plantilla, c.hash_plantilla, c.otorgado,
            exists (
              select 1 from consentimientos_revocatorias r where r.consentimiento_id = c.id
            ) as revocado,
            c.firma_id, c.hash_anexo, c.anexo_id, c.documento_firma_id,
            d.hash_documento, c.contenido, c.firmado_en
       from consentimientos c
       left join documentos_firma d on d.id = c.documento_firma_id
      where c.atencion_id = $1
      order by c.firmado_en desc`,
    [atencionId],
  );
  return filas.rows.filter((fila) => esProcedimientoConsentimiento(fila.procedimiento));
}

function ultimoPorProcedimiento(filas: FilaConsentimiento[]): Map<ProcedimientoConsentimiento, FilaConsentimiento> {
  const mapa = new Map<ProcedimientoConsentimiento, FilaConsentimiento>();
  for (const fila of filas) {
    if (!mapa.has(fila.procedimiento)) mapa.set(fila.procedimiento, fila);
  }
  return mapa;
}

function armarVista(
  atencionId: string,
  plantillas: FilaPlantilla[],
  filas: FilaConsentimiento[],
): VistaConsentimientos {
  const porPlantilla = new Map(plantillas.map((fila) => [fila.procedimiento, fila]));
  const ultimos = ultimoPorProcedimiento(filas);
  const puertas = {} as VistaConsentimientos['puertas'];
  for (const procedimiento of PROCEDIMIENTOS_CON_CONSENTIMIENTO) {
    const plantilla = porPlantilla.get(procedimiento) ?? null;
    const ultimo = ultimos.get(procedimiento) ?? null;
    puertas[procedimiento] = puedeIniciarProcedimiento({
      procedimiento,
      plantillaVigente: plantilla ? { version: plantilla.version, hash: plantilla.hash } : null,
      consentimiento: ultimo
        ? {
            otorgado: ultimo.otorgado,
            version: ultimo.version_plantilla,
            hash: ultimo.hash_plantilla,
            revocado: ultimo.revocado,
          }
        : null,
    });
  }
  return {
    atencion_id: atencionId,
    plantillas: plantillas.map((fila) => ({
      procedimiento: fila.procedimiento,
      etiqueta: ETIQUETAS_PROCEDIMIENTO[fila.procedimiento],
      version: fila.version,
      hash: fila.hash,
      texto: fila.texto,
    })),
    consentimientos: filas.map((fila) => ({
      id: fila.id,
      procedimiento: fila.procedimiento,
      etiqueta: ETIQUETAS_PROCEDIMIENTO[fila.procedimiento],
      version: fila.version_plantilla,
      hash: fila.hash_plantilla,
      otorgado: fila.otorgado,
      revocado: fila.revocado,
      estado: estadoVisibleConsentimiento(fila),
      firma_id: fila.firma_id,
      hash_anexo: fila.hash_anexo,
      anexo_id: fila.anexo_id,
      atencion_id: atencionId,
      hora_bogota: presentarBogota(new Date(fila.firmado_en)),
      texto: fila.contenido,
    })),
    puertas,
    modulos_pendientes: MODULOS_PENDIENTES_DE_CONSENTIMIENTO,
  };
}

async function anotar(
  ctx: ContextoAtencion,
  recursoId: string,
  accion: 'crear' | 'firmar' | 'anular' | 'configuracion',
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
      recurso: 'consentimiento_clinico',
      recurso_id: recursoId,
      accion,
      resultado: 'ok',
      ip: ctx.ip,
      agente: ctx.agente,
      request_id: ctx.request_id,
    },
  );
}

export async function listarConsentimientos(ctx: ContextoAtencion, atencionId: string): Promise<VistaConsentimientos> {
  if (!puedeRegistrarConsentimiento(ctx.rol) && !puedePublicarPlantillaConsentimiento(ctx.rol)) {
    throw new ErrorConsentimiento(403, 'No puede ver los consentimientos de la atención.');
  }
  return conApp(ctx, async (cliente) => {
    await exigirAtencion(cliente, atencionId);
    await asegurarPlantillas(cliente, ctx.tenant_id);
    const plantillas = await plantillasVigentes(cliente);
    const filas = await consentimientosDe(cliente, atencionId);
    return armarVista(atencionId, plantillas, filas);
  });
}

export async function evaluarInicioProcedimiento(
  ctx: ContextoAtencion,
  atencionId: string,
  procedimiento: string,
): Promise<{ permitida: boolean; motivo: MotivoInicioProcedimiento }> {
  if (!esProcedimientoConsentimiento(procedimiento)) {
    return puedeIniciarProcedimiento({ procedimiento, plantillaVigente: null, consentimiento: null });
  }
  const vista = await listarConsentimientos(ctx, atencionId);
  return vista.puertas[procedimiento];
}

async function identidadFirmante(
  ctx: ContextoAtencion,
  pacienteId: string,
  ahora: Date,
): Promise<{ firmante: 'paciente' | 'representante'; nombre: string; documento: string; representanteId: string | null }> {
  const persona = await conApp(ctx, async (cliente) => {
    const paciente = await cliente.query<{
      nombres: string;
      apellidos: string;
      num_doc: string;
      fecha_nacimiento: string;
    }>(
      `select nombres, apellidos, num_doc, fecha_nacimiento::text as fecha_nacimiento
         from pacientes where id = $1`,
      [pacienteId],
    );
    const fila = paciente.rows[0];
    if (!fila) return null;
    const vinculo = await cliente.query<{ id: string; nombre: string; num_doc: string }>(
      `select v.id, r.nombre, r.num_doc
         from pacientes_representantes v
         join representantes r on r.id = v.representante_id
        where v.paciente_id = $1 and v.vigente = true
        order by v.creado_en desc
        limit 1`,
      [pacienteId],
    );
    return { paciente: fila, vinculo: vinculo.rows[0] ?? null };
  });
  if (!persona) throw new ErrorConsentimiento(404, 'No se encontró el paciente.');
  const menor = esMenorDeEdad(persona.paciente.fecha_nacimiento, fechaCivilBogota(ahora));
  const resuelto = resolverFirmante(menor, Boolean(persona.vinculo));
  if ('error' in resuelto) {
    throw new ErrorConsentimiento(400, 'La persona menor necesita un representante vigente para firmar.');
  }
  if (resuelto.firmante === 'representante' && persona.vinculo) {
    return {
      firmante: 'representante',
      nombre: persona.vinculo.nombre,
      documento: await descifrar(ctx.tenant_id, persona.vinculo.num_doc),
      representanteId: persona.vinculo.id,
    };
  }
  return {
    firmante: 'paciente',
    nombre: `${persona.paciente.nombres} ${persona.paciente.apellidos}`.trim(),
    documento: await descifrar(ctx.tenant_id, persona.paciente.num_doc),
    representanteId: null,
  };
}

export async function registrarConsentimiento(
  ctx: ContextoAtencion,
  entrada: {
    atencionId: string;
    procedimiento: string;
    decision: 'otorgado' | 'negado';
    trazoPng?: Buffer | null;
    trazoPuntos?: unknown;
    acuerdo?: boolean;
  },
  ahora = new Date(),
): Promise<VistaConsentimientos> {
  if (!puedeRegistrarConsentimiento(ctx.rol)) {
    throw new ErrorConsentimiento(403, 'No puede registrar el consentimiento.');
  }
  if (!esProcedimientoConsentimiento(entrada.procedimiento)) {
    throw new ErrorConsentimiento(400, 'El procedimiento no tiene consentimiento en este módulo.');
  }
  if (entrada.decision !== 'otorgado' && entrada.decision !== 'negado') {
    throw new ErrorConsentimiento(400, 'Indique si el consentimiento se otorga o se niega.');
  }
  const procedimiento = entrada.procedimiento;
  const etiqueta = ETIQUETAS_PROCEDIMIENTO[procedimiento];
  const atencion = await conApp(ctx, async (cliente) => {
    const fila = await exigirAtencion(cliente, entrada.atencionId);
    await asegurarPlantillas(cliente, ctx.tenant_id);
    const plantillas = await plantillasVigentes(cliente);
    return { pacienteId: fila.paciente_id, plantilla: plantillas.find((item) => item.procedimiento === procedimiento) ?? null };
  });
  if (!atencion.plantilla) throw new ErrorConsentimiento(400, 'No hay plantilla vigente para el procedimiento.');

  if (entrada.decision === 'negado') {
    const id = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ id: string }>(
        `insert into consentimientos (
           tenant_id, atencion_id, plantilla_id, paciente_id, procedimiento, version_plantilla,
           hash_plantilla, firmante, otorgado, estado, contenido, firmado_por
         ) values ($1,$2,$3,$4,$5,$6,$7,'paciente',false,'firmado',$8,$9)
         returning id`,
        [
          ctx.tenant_id,
          entrada.atencionId,
          atencion.plantilla!.id,
          atencion.pacienteId,
          procedimiento,
          atencion.plantilla!.version,
          atencion.plantilla!.hash,
          atencion.plantilla!.texto,
          ctx.usuario_id,
        ],
      );
      return filas.rows[0]?.id;
    });
    if (!id) throw new ErrorConsentimiento(400, 'No se pudo registrar la negativa.');
    await anotar(ctx, id, 'crear');
    return listarConsentimientos(ctx, entrada.atencionId);
  }

  if (entrada.acuerdo !== true) {
    throw new ErrorConsentimiento(400, 'Falta el acuerdo de uso de firma electrónica.');
  }
  if (!entrada.trazoPng || !esPng(entrada.trazoPng)) {
    throw new ErrorConsentimiento(400, 'El trazo debe ser un PNG.');
  }
  if (!puntosDeTrazoValidos(entrada.trazoPuntos)) {
    throw new ErrorConsentimiento(400, 'El trazo de la firma no es válido.');
  }
  const firmante = await identidadFirmante(ctx, atencion.pacienteId, ahora);
  const firmaCtx = contextoFirma(ctx);
  let documentoId = '';
  try {
    const documento = await crearDocumentoConsentimiento(firmaCtx, {
      titulo: `Consentimiento ${etiqueta}`.slice(0, 160),
      cuerpo: atencion.plantilla.texto,
    });
    documentoId = documento.id;
    await firmarPaciente(
      firmaCtx,
      {
        documentoId,
        trazoPng: entrada.trazoPng,
        trazoPuntos: entrada.trazoPuntos,
        nombre: firmante.nombre,
        documento: firmante.documento,
        ip: ipDe(ctx),
        agente: (ctx.agente ?? 'desconocido').slice(0, 300),
        otp: null,
        acuerdoAceptado: true,
      },
      ahora,
    );
  } catch (error) {
    traducirFirma(error);
  }
  let sellado: { hash: string; anexo_id: string; firma_id: string };
  try {
    sellado = await sellarConsentimientoPaciente(
      firmaCtx,
      documentoId,
      {
        procedimiento: etiqueta,
        version: atencion.plantilla.version,
        hashTexto: atencion.plantilla.hash,
        firmante: firmante.firmante === 'representante' ? 'la persona representante' : 'el paciente',
      },
      ahora,
    );
  } catch (error) {
    traducirFirma(error);
  }
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string; hash_anexo: string; firma_id: string; hash_documento: string }>(
      `insert into consentimientos (
         tenant_id, atencion_id, plantilla_id, paciente_id, procedimiento, version_plantilla,
         hash_plantilla, firmante, representante_id, firma_id, otorgado, documento_firma_id,
         anexo_id, hash_anexo, estado, contenido, firmado_por
       ) values (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,'firmado',$14,$15
       )
       returning id, hash_anexo, firma_id,
         (select hash_documento from documentos_firma where id = $11) as hash_documento`,
      [
        ctx.tenant_id,
        entrada.atencionId,
        atencion.plantilla!.id,
        atencion.pacienteId,
        procedimiento,
        atencion.plantilla!.version,
        atencion.plantilla!.hash,
        firmante.firmante,
        firmante.representanteId,
        sellado.firma_id,
        documentoId,
        sellado.anexo_id,
        sellado.hash,
        atencion.plantilla!.texto,
        ctx.usuario_id,
      ],
    );
    const fila = filas.rows[0];
    if (!fila) return null;
    if (
      !anexoConsentimientoCompleto({
        atencionId: entrada.atencionId,
        firmaId: fila.firma_id,
        hashAnexo: fila.hash_anexo,
        hashDocumento: fila.hash_documento,
      })
    ) {
      throw new ErrorConsentimiento(400, 'El anexo del consentimiento no quedó ligado a la atención.');
    }
    return fila.id;
  });
  if (!id) throw new ErrorConsentimiento(400, 'No se pudo guardar el consentimiento.');
  await anotar(ctx, id, 'firmar');
  return listarConsentimientos(ctx, entrada.atencionId);
}

export async function revocarConsentimiento(
  ctx: ContextoAtencion,
  atencionId: string,
  procedimiento: string,
): Promise<VistaConsentimientos> {
  if (!puedeRegistrarConsentimiento(ctx.rol)) {
    throw new ErrorConsentimiento(403, 'No puede revocar el consentimiento.');
  }
  if (!esProcedimientoConsentimiento(procedimiento)) {
    throw new ErrorConsentimiento(400, 'El procedimiento no tiene consentimiento en este módulo.');
  }
  const id = await conApp(ctx, async (cliente) => {
    await exigirAtencion(cliente, atencionId);
    const filas = await cliente.query<{ id: string }>(
      `select c.id
         from consentimientos c
        where c.atencion_id = $1
          and c.procedimiento = $2
          and c.otorgado = true
          and not exists (
            select 1 from consentimientos_revocatorias r where r.consentimiento_id = c.id
          )
        order by c.firmado_en desc
        limit 1`,
      [atencionId, procedimiento],
    );
    const consentimientoId = filas.rows[0]?.id;
    if (!consentimientoId) {
      throw new ErrorConsentimiento(404, 'No hay un consentimiento otorgado para revocar.');
    }
    await cliente.query(
      `insert into consentimientos_revocatorias (tenant_id, consentimiento_id, registrada_por)
       values ($1, $2, $3)`,
      [ctx.tenant_id, consentimientoId, ctx.usuario_id],
    );
    const sigue = await cliente.query<{ id: string; otorgado: boolean }>(
      `select id, otorgado from consentimientos where id = $1`,
      [consentimientoId],
    );
    if (!sigue.rows[0]?.otorgado) {
      throw new ErrorConsentimiento(400, 'La revocatoria no debe borrar el consentimiento original.');
    }
    return consentimientoId;
  });
  await anotar(ctx, id, 'anular');
  return listarConsentimientos(ctx, atencionId);
}

export async function publicarPlantillaConsentimiento(
  ctx: ContextoAtencion,
  entrada: { procedimiento: string; contenido: string },
): Promise<{ version: number; hash: string; cambio: boolean }> {
  if (!puedePublicarPlantillaConsentimiento(ctx.rol)) {
    throw new ErrorConsentimiento(403, 'No puede publicar la plantilla de consentimiento.');
  }
  if (!esProcedimientoConsentimiento(entrada.procedimiento)) {
    throw new ErrorConsentimiento(400, 'El procedimiento no tiene consentimiento en este módulo.');
  }
  const contenido = entrada.contenido.trim();
  if (!contenido || contenido.length > 20000) {
    throw new ErrorConsentimiento(400, 'El texto de la plantilla es obligatorio.');
  }
  if (!textoIncluyeRotuloConsentimiento(contenido)) {
    throw new ErrorConsentimiento(400, 'El texto debe llevar el rótulo BORRADOR – requiere revisión jurídica.');
  }
  const procedimiento = entrada.procedimiento;
  const resultado = await conApp(ctx, async (cliente) => {
    await asegurarPlantillas(cliente, ctx.tenant_id);
    const actuales = await cliente.query<{ id: string; version: number; texto: string; hash: string }>(
      `select id, version, texto, hash
         from plantillas_consentimiento
        where procedimiento = $1 and vigente = true`,
      [procedimiento],
    );
    const actual = actuales.rows[0] ?? null;
    const plan = planVersionPlantilla(actual ? { version: actual.version, contenido: actual.texto } : null, contenido);
    if (plan.accion === 'igual' && actual) {
      return { version: actual.version, hash: actual.hash, cambio: false };
    }
    if (plan.accion === 'nueva') {
      await cliente.query(
        `update plantillas_consentimiento set vigente = false
          where procedimiento = $1 and vigente = true`,
        [procedimiento],
      );
    }
    const hash = hashTexto(contenido);
    const filas = await cliente.query<{ version: number; hash: string }>(
      `insert into plantillas_consentimiento (tenant_id, procedimiento, version, texto, hash, vigente)
       values ($1, $2, $3, $4, $5, true)
       returning version, hash`,
      [ctx.tenant_id, procedimiento, plan.version, contenido, hash],
    );
    const creada = filas.rows[0];
    if (!creada) throw new ErrorConsentimiento(400, 'No se pudo publicar la plantilla.');
    if (actual) {
      const previa = await cliente.query<{ texto: string; version: number }>(
        `select texto, version from plantillas_consentimiento where id = $1`,
        [actual.id],
      );
      if (previa.rows[0]?.texto !== actual.texto || previa.rows[0]?.version !== actual.version) {
        throw new ErrorConsentimiento(400, 'La versión anterior no debe cambiar de texto.');
      }
    }
    return { version: creada.version, hash: creada.hash, cambio: true };
  });
  await anotar(ctx, procedimiento, 'configuracion');
  return resultado;
}

export function puertaDe(vista: VistaConsentimientos, procedimiento: ProcedimientoConsentimiento) {
  return vista.puertas[procedimiento];
}
