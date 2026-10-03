// SEG-09 (T27) — Consulta de la política, marcas y bloqueo de eliminación.
// La purga no se ejecuta: solo se calcula `disposicion_final_pendiente`.
// TODO(Q-07): facturas y logs siguen sin cantidad.
import 'server-only';

import type { PoolClient } from 'pg';

import { obtenerPool } from './index';
import type { ContextoAtencion } from './atenciones';
import { fechaCivilEnZona } from '../dominio/fechas';
import { registrarEvento } from '../lib/auditoria/servicio';
import {
  DECLARACION_CONTRATANTE_NO_PRESTADOR,
  NOTA_PURGA_NO_IMPLEMENTADA,
  POLITICA_RETENCION_INICIAL,
  calcularEstadoArchivo,
  mensajeBloqueoEliminacion,
  normalizarPlazos,
  textoPlazoPantalla,
  type EstadoArchivo,
  type FilaPoliticaRetencion,
  type ResultadoEstadoArchivo,
  type TipoDocumentoRetencion,
  type TipoMarcaRetencion,
} from '../dominio/retencion';
import { ZONA_BOGOTA } from '../dominio/pacientes';

export class ErrorRetencion extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorRetencion';
    this.status = status;
  }
}

type FilaPoliticaDb = {
  tipo_documento: TipoDocumentoRetencion;
  anios: number | null;
  base_normativa: string;
  verificado: boolean;
  aplica_contratante_no_prestador: boolean;
};

function entero(valor: unknown, defecto: number): number {
  if (typeof valor === 'number' && Number.isInteger(valor)) return valor;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor)) return Number(valor);
  return defecto;
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
      // Se conserva el error de la sentencia.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

function exigirAdmin(ctx: ContextoAtencion) {
  if (ctx.rol !== 'admin') {
    throw new ErrorRetencion(403, 'Solo el administrador consulta y marca la retención.');
  }
}

export async function leerPlazosRetencion(
  cliente: PoolClient,
): Promise<{ gestion: number; conservacion: number; filas: FilaPoliticaRetencion[] }> {
  const politica = await cliente.query<FilaPoliticaDb>(
    `select tipo_documento, anios, base_normativa, verificado, aplica_contratante_no_prestador
       from politica_retencion
      order by tipo_documento`,
  );
  const parametros = await cliente.query<{ clave: string; valor: unknown }>(
    `select clave, valor from parametros_tenant
      where vigente_hasta is null
        and clave = any($1::text[])`,
    [['retencion_historias_anios', 'plazo_archivo_gestion_anios']],
  );
  const mapa = new Map(parametros.rows.map((fila) => [fila.clave, fila.valor]));
  const porTipo = new Map(politica.rows.map((fila) => [fila.tipo_documento, fila.anios]));
  const gestionFuente = porTipo.get('archivo_gestion') ?? entero(mapa.get('plazo_archivo_gestion_anios'), 5);
  const conservacionFuente = Math.max(
    porTipo.get('historia_clinica') ?? 0,
    entero(mapa.get('retencion_historias_anios'), 0),
  );
  const plazos = normalizarPlazos(entero(gestionFuente, 5), entero(conservacionFuente, 15));
  const filas =
    politica.rows.length > 0
      ? politica.rows.map((fila) => ({
          tipo_documento: fila.tipo_documento,
          anios: fila.anios,
          base_normativa: fila.base_normativa,
          verificado: fila.verificado,
        }))
      : [...POLITICA_RETENCION_INICIAL];
  return { ...plazos, filas };
}

export async function estadoPacienteEnCliente(
  cliente: PoolClient,
  pacienteId: string,
  hoy: string,
): Promise<ResultadoEstadoArchivo> {
  const paciente = await cliente.query<{ fecha_ultima_atencion: string | null }>(
    `select fecha_ultima_atencion::text as fecha_ultima_atencion from pacientes where id = $1`,
    [pacienteId],
  );
  if (!paciente.rows[0]) throw new ErrorRetencion(404, 'No se encontró el paciente.');
  const marcas = await cliente.query<{ tipo: TipoMarcaRetencion }>(
    `select tipo from marcas_retencion where paciente_id = $1`,
    [pacienteId],
  );
  const plazos = await leerPlazosRetencion(cliente);
  return calcularEstadoArchivo({
    fechaUltimaAtencion: paciente.rows[0].fecha_ultima_atencion,
    hoy,
    gestion: plazos.gestion,
    conservacion: plazos.conservacion,
    marcas: marcas.rows.map((fila) => fila.tipo),
  });
}

export async function listarPoliticaRetencion(ctx: ContextoAtencion) {
  exigirAdmin(ctx);
  return conApp(ctx, async (cliente) => {
    const plazos = await leerPlazosRetencion(cliente);
    const filas = plazos.filas.map((fila) => ({
      ...fila,
      texto: textoPlazoPantalla(fila),
    }));
    return {
      filas,
      declaracion_contratante: DECLARACION_CONTRATANTE_NO_PRESTADOR,
      nota_purga: NOTA_PURGA_NO_IMPLEMENTADA,
      gestion_anios: plazos.gestion,
      conservacion_anios: plazos.conservacion,
    };
  });
}

export async function consultarEstadoRetencion(
  ctx: ContextoAtencion,
  pacienteId: string,
  hoy: string,
): Promise<ResultadoEstadoArchivo> {
  exigirAdmin(ctx);
  return conApp(ctx, (cliente) => estadoPacienteEnCliente(cliente, pacienteId, hoy));
}

export async function marcarRetencion(
  ctx: ContextoAtencion,
  pacienteId: string,
  tipo: TipoMarcaRetencion,
  motivo: string,
): Promise<void> {
  exigirAdmin(ctx);
  if (tipo !== 'duplicada' && tipo !== 'permanente') {
    throw new ErrorRetencion(400, 'La marca de retención no es válida.');
  }
  const texto = motivo.trim();
  if (texto.length < 1 || texto.length > 500) {
    throw new ErrorRetencion(400, 'El motivo de la marca es obligatorio.');
  }
  await conApp(ctx, async (cliente) => {
    const paciente = await cliente.query(`select 1 from pacientes where id = $1`, [pacienteId]);
    if ((paciente.rowCount ?? 0) === 0) throw new ErrorRetencion(404, 'No se encontró el paciente.');
    await cliente.query(
      `insert into marcas_retencion (tenant_id, paciente_id, tipo, motivo, registrada_por)
       values ($1, $2, $3, $4, $5)`,
      [ctx.tenant_id, pacienteId, tipo, texto, ctx.usuario_id],
    );
  });
}

export async function intentarEliminarHistoriaClinica(
  ctx: ContextoAtencion,
  pacienteId: string,
  ahora = new Date(),
): Promise<never> {
  const hoy = fechaCivilEnZona(ahora, ZONA_BOGOTA);
  let estado: EstadoArchivo = 'activo';
  try {
    const calculado = await conApp(ctx, (cliente) => estadoPacienteEnCliente(cliente, pacienteId, hoy));
    estado = calculado.estado;
  } catch (error) {
    if (!(error instanceof ErrorRetencion)) throw error;
    if (error.status !== 404) throw error;
  }
  const mensaje = mensajeBloqueoEliminacion(estado);
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
      recurso: 'historia_clinica',
      recurso_id: pacienteId,
      accion: 'retencion',
      resultado: 'error',
      ip: ctx.ip ?? null,
      agente: ctx.agente ?? null,
      request_id: estado,
    },
  );
  throw new ErrorRetencion(409, mensaje);
}
