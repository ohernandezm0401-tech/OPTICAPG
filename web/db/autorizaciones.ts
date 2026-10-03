// SEG-05 (T15) — Registro de autorización, revocatoria y política por tenant.
// Reutiliza el hash y la firma de paciente de SEG-08. Las atenciones y el
// motor de mensajería (SEG-16) todavía no existen: las puertas son
// `puedeAbrirAtencion` y `puedeContactarComercialmente`.
// TODO(Q-17): la negativa queda registrada y no bloquea la atención.
// BORRADOR – requiere revisión jurídica.
import type { PoolClient } from 'pg';

import {
  CODIGO_CONTACTO,
  CODIGO_TRATAMIENTO,
  PLANTILLA_CONTACTO_COMERCIAL,
  PLANTILLA_TRATAMIENTO_CLINICO,
  ROTULO_BORRADOR,
  armarEvidencia,
  codigoFinalidadValido,
  esMedioAutorizacion,
  generarAvisoPrivacidad,
  hashTextoLegal,
  puedeAbrirAtencion,
  puedeContactarComercialmente,
  politicaVacia,
  siguienteVersionTexto,
  textoIncluyeRotuloBorrador,
  type EstadoAutorizacion,
  type EvidenciaAutorizacion,
  type PoliticaTratamiento,
} from '../dominio/autorizacion-datos';
import { fechaCivilBogota } from '../dominio/pacientes';
import { puedeRecogerFirmaPaciente } from '../dominio/firma';
import { registrarEvento } from '../lib/auditoria/servicio';
import { descifrarParaTenant } from '../lib/cifrado/almacen.mjs';
import { leerRegistroKek } from '../lib/cifrado/kek.mjs';
import { obtenerPool } from './index';
import { crearDocumentoAutorizacion, firmarPaciente, type ContextoFirma } from './firma';
import type { ContextoTenant } from './tenant';

const ROLES_CAPTURA = new Set(['asesor', 'auxiliar_clinico', 'auxiliar', 'admin']);
const ROLES_LECTURA = new Set([
  'asesor',
  'auxiliar_clinico',
  'auxiliar',
  'admin',
  'auditor',
  'optometra',
  'oftalmologo',
  'director_cientifico',
]);

export class ErrorAutorizacionDatos extends Error {
  readonly codigo: 'permiso' | 'validacion' | 'no_encontrado' | 'estado';

  constructor(codigo: ErrorAutorizacionDatos['codigo'], mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAutorizacionDatos';
    this.codigo = codigo;
  }
}

export interface ContextoAutorizacion extends ContextoTenant {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
}

export interface DecisionRegistro {
  pacienteId: string;
  medio: string;
  ip: string;
  agente: string;
  tratamiento: 'otorgada' | 'negada' | null;
  contacto: boolean;
  opcionales: string[];
  trazoPng?: Buffer | null;
  trazoPuntos?: unknown;
  acuerdoFirma?: boolean;
}

interface FilaTexto {
  id: string;
  tipo: string;
  codigo: string;
  etiqueta: string;
  opcional: boolean;
  version: number;
  contenido: string;
  hash: string;
}

interface FilaAutorizacion {
  id: string;
  finalidad: string;
  otorgada: boolean;
  estado: EstadoAutorizacion;
  medio: string;
  contenido_exacto: string;
  hash_texto: string;
  registrada_en: Date;
  firmada_en: Date | null;
  firma_id: string | null;
  texto_id: string;
}

const SEMILLA = [
  {
    tipo: 'autorizacion_tratamiento',
    codigo: CODIGO_TRATAMIENTO,
    etiqueta: 'Tratamiento clínico',
    opcional: false,
    contenido: PLANTILLA_TRATAMIENTO_CLINICO,
  },
  {
    tipo: 'contacto_comercial',
    codigo: CODIGO_CONTACTO,
    etiqueta: 'Contacto comercial',
    opcional: true,
    contenido: PLANTILLA_CONTACTO_COMERCIAL,
  },
] as const;

async function conApp<T>(contexto: ContextoAutorizacion, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [contexto.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [contexto.usuario_id]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [contexto.sede_id]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [contexto.sedes.join(',')]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [contexto.rol]);
    await cliente.query(`select set_config('app.role', $1, true)`, [contexto.rol]);
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

function exigeCaptura(rol: string) {
  if (!ROLES_CAPTURA.has(rol)) {
    throw new ErrorAutorizacionDatos('permiso', 'No puede registrar la autorización.');
  }
}

function exigeLectura(rol: string) {
  if (!ROLES_LECTURA.has(rol)) {
    throw new ErrorAutorizacionDatos('permiso', 'No puede consultar la autorización.');
  }
}

function exigeAdmin(rol: string) {
  if (rol !== 'admin') {
    throw new ErrorAutorizacionDatos('permiso', 'Solo el administrador edita los textos y la política.');
  }
}

async function anotar(ctx: ContextoAutorizacion, recursoId: string, accion: 'crear' | 'actualizar' | 'exportar' | 'anular') {
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
      recurso: 'autorizaciones',
      recurso_id: recursoId,
      accion,
      resultado: 'ok',
    },
  );
}

async function asegurarPlantillas(cliente: PoolClient, ctx: ContextoAutorizacion, ahora: Date) {
  const existentes = await cliente.query<{ codigo: string }>(`select codigo from textos_legales where es_vigente = true`);
  const codigos = new Set(existentes.rows.map((fila) => fila.codigo));
  for (const item of SEMILLA) {
    if (codigos.has(item.codigo)) continue;
    await cliente.query(
      `insert into textos_legales
         (tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde, es_vigente)
       values ($1, $2, $3, $4, $5, 1, $6, $7, $8, true)`,
      [ctx.tenant_id, item.tipo, item.codigo, item.etiqueta, item.opcional, item.contenido, hashTextoLegal(item.contenido), ahora.toISOString()],
    );
  }
}

async function textosVigentes(cliente: PoolClient): Promise<FilaTexto[]> {
  const filas = await cliente.query<FilaTexto>(
    `select id, tipo, codigo, etiqueta, opcional, version, contenido, hash
       from textos_legales
      where es_vigente = true
      order by opcional, codigo`,
  );
  return filas.rows;
}

async function ultimo(cliente: PoolClient, pacienteId: string, finalidad: string): Promise<EstadoAutorizacion | null> {
  const filas = await cliente.query<{ estado: EstadoAutorizacion }>(
    `select estado from autorizaciones
      where paciente_id = $1 and finalidad = $2
      order by registrada_en desc
      limit 1`,
    [pacienteId, finalidad],
  );
  return filas.rows[0]?.estado ?? null;
}

function nulo(valor: string | null | undefined): string | null {
  const limpio = valor?.trim() ?? '';
  return limpio.length > 0 ? limpio : null;
}

export async function listarPlantillas(ctx: ContextoAutorizacion, ahora = new Date()) {
  exigeLectura(ctx.rol);
  return conApp(ctx, async (cliente) => {
    if (ROLES_CAPTURA.has(ctx.rol)) await asegurarPlantillas(cliente, ctx, ahora);
    return textosVigentes(cliente);
  });
}

export async function publicarVersionTexto(
  ctx: ContextoAutorizacion,
  entrada: { codigo: string; contenido: string },
  ahora = new Date(),
) {
  exigeAdmin(ctx.rol);
  const contenido = entrada.contenido.trim();
  if (!codigoFinalidadValido(entrada.codigo)) {
    throw new ErrorAutorizacionDatos('validacion', 'El código de la finalidad no es válido.');
  }
  if (!textoIncluyeRotuloBorrador(contenido)) {
    throw new ErrorAutorizacionDatos(
      'validacion',
      'El texto debe seguir rotulado como borrador sujeto a revisión jurídica.',
    );
  }
  const publicado = await conApp(ctx, async (cliente) => {
    await asegurarPlantillas(cliente, ctx, ahora);
    const actual = await cliente.query<FilaTexto>(
      `select id, tipo, codigo, etiqueta, opcional, version, contenido, hash
         from textos_legales where codigo = $1 and es_vigente = true`,
      [entrada.codigo],
    );
    const vigente = actual.rows[0];
    if (!vigente) throw new ErrorAutorizacionDatos('no_encontrado', 'No hay un texto vigente para esa finalidad.');
    const siguiente = siguienteVersionTexto(vigente, contenido);
    if (!siguiente.cambia) {
      throw new ErrorAutorizacionDatos('estado', 'El texto no cambió: no se crea otra versión.');
    }
    await cliente.query(`update textos_legales set es_vigente = false where id = $1`, [vigente.id]);
    const nueva = await cliente.query<{ id: string; version: number; hash: string }>(
      `insert into textos_legales
         (tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde, es_vigente)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       returning id, version, hash`,
      [
        ctx.tenant_id,
        vigente.tipo,
        vigente.codigo,
        vigente.etiqueta,
        vigente.opcional,
        siguiente.version,
        siguiente.contenido,
        siguiente.hash,
        ahora.toISOString(),
      ],
    );
    return { id: nueva.rows[0]?.id, version: siguiente.version, hash: siguiente.hash, anterior_id: vigente.id };
  });
  if (publicado.id) await anotar(ctx, publicado.id, 'actualizar');
  return publicado;
}

export async function crearFinalidadOpcional(
  ctx: ContextoAutorizacion,
  entrada: { codigo: string; etiqueta: string; contenido: string },
  ahora = new Date(),
) {
  exigeAdmin(ctx.rol);
  const codigo = entrada.codigo.trim();
  const etiqueta = entrada.etiqueta.trim();
  const contenido = entrada.contenido.trim();
  if (!codigoFinalidadValido(codigo) || codigo === CODIGO_TRATAMIENTO || codigo === CODIGO_CONTACTO) {
    throw new ErrorAutorizacionDatos('validacion', 'Use un código propio para la finalidad opcional.');
  }
  if (!etiqueta || etiqueta.length > 80) {
    throw new ErrorAutorizacionDatos('validacion', 'La etiqueta de la finalidad es obligatoria.');
  }
  if (!textoIncluyeRotuloBorrador(contenido)) {
    throw new ErrorAutorizacionDatos('validacion', 'La finalidad opcional también es un borrador jurídico.');
  }
  const creada = await conApp(ctx, async (cliente) => {
    const ya = await cliente.query(`select id from textos_legales where codigo = $1 limit 1`, [codigo]);
    if (ya.rows.length > 0) {
      throw new ErrorAutorizacionDatos('estado', 'Esa finalidad ya existe. Publique una versión nueva si cambia el texto.');
    }
    const filas = await cliente.query<{ id: string }>(
      `insert into textos_legales
         (tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde, es_vigente)
       values ($1, 'finalidad_opcional', $2, $3, true, 1, $4, $5, $6, true)
       returning id`,
      [ctx.tenant_id, codigo, etiqueta, contenido, hashTextoLegal(contenido), ahora.toISOString()],
    );
    return filas.rows[0]?.id;
  });
  if (!creada) throw new ErrorAutorizacionDatos('estado', 'No se pudo crear la finalidad opcional.');
  await anotar(ctx, creada, 'crear');
  return { id: creada };
}

async function insertarDecision(
  cliente: PoolClient,
  ctx: ContextoAutorizacion,
  entrada: {
    pacienteId: string;
    texto: FilaTexto;
    otorgada: boolean;
    estado: 'otorgada' | 'negada';
    medio: string;
    ip: string;
    agente: string;
    representanteId: string | null;
    firmaId: string | null;
    ahora: Date;
  },
): Promise<string> {
  const previo = await ultimo(cliente, entrada.pacienteId, entrada.texto.codigo);
  if (previo === 'otorgada' || previo === entrada.estado) {
    throw new ErrorAutorizacionDatos('estado', `Ya hay una decisión registrada para ${entrada.texto.etiqueta}.`);
  }
  if (previo === 'revocada' && entrada.estado === 'negada') {
    throw new ErrorAutorizacionDatos('estado', 'La revocatoria ya está registrada. Una nueva decisión debe otorgarse de nuevo.');
  }
  const filas = await cliente.query<{ id: string }>(
    `insert into autorizaciones
       (tenant_id, paciente_id, texto_id, finalidad, otorgada, estado, representante_id, medio,
        evidencia, firma_id, contenido_exacto, hash_texto, registrada_en, firmada_en, ip, agente)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16)
     returning id`,
    [
      ctx.tenant_id,
      entrada.pacienteId,
      entrada.texto.id,
      entrada.texto.codigo,
      entrada.otorgada,
      entrada.estado,
      entrada.representanteId,
      entrada.medio,
      JSON.stringify({
        rotulo: ROTULO_BORRADOR,
        version: entrada.texto.version,
        texto_id: entrada.texto.id,
      }),
      entrada.firmaId,
      entrada.texto.contenido,
      entrada.texto.hash,
      entrada.ahora.toISOString(),
      entrada.otorgada ? entrada.ahora.toISOString() : null,
      entrada.ip,
      entrada.agente,
    ],
  );
  const id = filas.rows[0]?.id;
  if (!id) throw new ErrorAutorizacionDatos('estado', 'No se pudo registrar la autorización.');
  return id;
}

export async function registrarDecisiones(ctx: ContextoAutorizacion, entrada: DecisionRegistro, ahora = new Date()) {
  exigeCaptura(ctx.rol);
  if (!esMedioAutorizacion(entrada.medio)) {
    throw new ErrorAutorizacionDatos('validacion', 'Indique el medio: presencial o electrónico.');
  }
  if (!entrada.tratamiento && !entrada.contacto && entrada.opcionales.length === 0) {
    throw new ErrorAutorizacionDatos('validacion', 'No hay una decisión de autorización para registrar.');
  }
  const ip = entrada.ip.trim().slice(0, 64);
  const agente = entrada.agente.trim().slice(0, 300);
  if (!ip) throw new ErrorAutorizacionDatos('validacion', 'Falta la dirección de red de la captura.');

  let firmaId: string | null = null;
  if (entrada.tratamiento === 'otorgada' && entrada.trazoPng && entrada.trazoPng.length > 0) {
    if (!puedeRecogerFirmaPaciente(ctx.rol)) {
      throw new ErrorAutorizacionDatos('permiso', 'Este rol no recoge la firma del paciente.');
    }
    if (entrada.acuerdoFirma !== true) {
      throw new ErrorAutorizacionDatos('validacion', 'Falta el acuerdo de uso de firma electrónica.');
    }
    if (!Array.isArray(entrada.trazoPuntos)) {
      throw new ErrorAutorizacionDatos('validacion', 'El trazo de la firma no es válido.');
    }
    const identidad = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ nombres: string; apellidos: string; num_doc: string }>(
        `select nombres, apellidos, num_doc from pacientes where id = $1`,
        [entrada.pacienteId],
      );
      return filas.rows[0] ?? null;
    });
    if (!identidad) throw new ErrorAutorizacionDatos('no_encontrado', 'No se encontró el paciente.');
    const documento = (
      await descifrarParaTenant(obtenerPool(), leerRegistroKek(), ctx.tenant_id, identidad.num_doc)
    ).toString('utf8');
    const texto = await conApp(ctx, async (cliente) => {
      await asegurarPlantillas(cliente, ctx, ahora);
      const filas = await cliente.query<FilaTexto>(
        `select id, tipo, codigo, etiqueta, opcional, version, contenido, hash
           from textos_legales where codigo = $1 and es_vigente = true`,
        [CODIGO_TRATAMIENTO],
      );
      return filas.rows[0] ?? null;
    });
    if (!texto) throw new ErrorAutorizacionDatos('estado', 'Falta la plantilla de tratamiento clínico.');
    const firmaCtx: ContextoFirma = { ...ctx, rol: ctx.rol };
    const documentoFirma = await crearDocumentoAutorizacion(firmaCtx, {
      titulo: 'Autorizacion de tratamiento',
      cuerpo: texto.contenido,
    });
    await firmarPaciente(
      firmaCtx,
      {
        documentoId: documentoFirma.id,
        trazoPng: entrada.trazoPng,
        trazoPuntos: entrada.trazoPuntos,
        nombre: `${identidad.nombres} ${identidad.apellidos}`,
        documento,
        ip,
        agente: agente || 'desconocido',
        otp: null,
        acuerdoAceptado: entrada.acuerdoFirma === true,
      },
      ahora,
    );
    firmaId = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ id: string }>(
        `select id from firmas where documento_id = $1 and tipo_firmante = 'paciente'`,
        [documentoFirma.id],
      );
      return filas.rows[0]?.id ?? null;
    });
  }

  const ids = await conApp(ctx, async (cliente) => {
    await asegurarPlantillas(cliente, ctx, ahora);
    const paciente = await cliente.query(`select id from pacientes where id = $1`, [entrada.pacienteId]);
    if (paciente.rows.length === 0) throw new ErrorAutorizacionDatos('no_encontrado', 'No se encontró el paciente.');
    const rep = await cliente.query<{ id: string }>(
      `select id from pacientes_representantes where paciente_id = $1 and vigente = true order by creado_en desc limit 1`,
      [entrada.pacienteId],
    );
    const textos = await textosVigentes(cliente);
    const porCodigo = new Map(textos.map((texto) => [texto.codigo, texto]));
    const creados: string[] = [];
    if (entrada.tratamiento) {
      const texto = porCodigo.get(CODIGO_TRATAMIENTO);
      if (!texto) throw new ErrorAutorizacionDatos('estado', 'Falta la plantilla de tratamiento clínico.');
      creados.push(
        await insertarDecision(cliente, ctx, {
          pacienteId: entrada.pacienteId,
          texto,
          otorgada: entrada.tratamiento === 'otorgada',
          estado: entrada.tratamiento,
          medio: entrada.medio,
          ip,
          agente,
          representanteId: rep.rows[0]?.id ?? null,
          firmaId: entrada.tratamiento === 'otorgada' ? firmaId : null,
          ahora,
        }),
      );
      await cliente.query(
        `update pacientes
            set negativa_autorizacion = $2,
                negativa_autorizacion_en = case when $2 then $3::timestamptz else null end
          where id = $1`,
        [entrada.pacienteId, entrada.tratamiento === 'negada', ahora.toISOString()],
      );
    }
    if (entrada.contacto) {
      const texto = porCodigo.get(CODIGO_CONTACTO);
      if (!texto) throw new ErrorAutorizacionDatos('estado', 'Falta la plantilla de contacto comercial.');
      creados.push(
        await insertarDecision(cliente, ctx, {
          pacienteId: entrada.pacienteId,
          texto,
          otorgada: true,
          estado: 'otorgada',
          medio: entrada.medio,
          ip,
          agente,
          representanteId: rep.rows[0]?.id ?? null,
          firmaId: null,
          ahora,
        }),
      );
    }
    for (const codigo of entrada.opcionales) {
      const texto = porCodigo.get(codigo);
      if (!texto?.opcional || codigo === CODIGO_CONTACTO) {
        throw new ErrorAutorizacionDatos('validacion', 'La finalidad opcional no está publicada.');
      }
      creados.push(
        await insertarDecision(cliente, ctx, {
          pacienteId: entrada.pacienteId,
          texto,
          otorgada: true,
          estado: 'otorgada',
          medio: entrada.medio,
          ip,
          agente,
          representanteId: rep.rows[0]?.id ?? null,
          firmaId: null,
          ahora,
        }),
      );
    }
    return creados;
  });
  for (const id of ids) await anotar(ctx, id, 'crear');
  return { ids };
}

export async function revocarContacto(ctx: ContextoAutorizacion, pacienteId: string, ahora = new Date()) {
  exigeCaptura(ctx.rol);
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `select id from autorizaciones
        where paciente_id = $1 and finalidad = $2 and estado = 'otorgada'
        order by registrada_en desc
        limit 1`,
      [pacienteId, CODIGO_CONTACTO],
    );
    const encontrada = filas.rows[0]?.id;
    if (!encontrada) {
      throw new ErrorAutorizacionDatos('no_encontrado', 'No hay una autorización de contacto vigente para revocar.');
    }
    await cliente.query(
      `update autorizaciones set estado = 'revocada', revocada_en = $2 where id = $1`,
      [encontrada, ahora.toISOString()],
    );
    return encontrada;
  });
  await anotar(ctx, id, 'anular');
  return { id, estado: 'revocada' as const };
}

export async function exportarEvidencia(ctx: ContextoAutorizacion, autorizacionId: string): Promise<EvidenciaAutorizacion> {
  exigeLectura(ctx.rol);
  const evidencia = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaAutorizacion>(
      `select id, finalidad, otorgada, estado, medio, contenido_exacto, hash_texto,
              registrada_en, firmada_en, firma_id, texto_id
         from autorizaciones where id = $1`,
      [autorizacionId],
    );
    const fila = filas.rows[0];
    if (!fila) throw new ErrorAutorizacionDatos('no_encontrado', 'No se encontró la autorización.');
    if (hashTextoLegal(fila.contenido_exacto) !== fila.hash_texto) {
      throw new ErrorAutorizacionDatos('estado', 'El hash no coincide con el texto guardado.');
    }
    const instante = new Date(fila.firmada_en ?? fila.registrada_en);
    return armarEvidencia({
      autorizacion_id: fila.id,
      finalidad: fila.finalidad,
      texto_exacto: fila.contenido_exacto,
      hash: fila.hash_texto,
      instante,
      medio: fila.medio,
      estado: fila.estado,
      otorgada: fila.otorgada,
      firma_id: fila.firma_id,
    });
  });
  await anotar(ctx, autorizacionId, 'exportar');
  return evidencia;
}

export async function estadoPaciente(ctx: ContextoAutorizacion, pacienteId: string) {
  exigeLectura(ctx.rol);
  return conApp(ctx, async (cliente) => {
    const tratamiento = await ultimo(cliente, pacienteId, CODIGO_TRATAMIENTO);
    const contacto = await ultimo(cliente, pacienteId, CODIGO_CONTACTO);
    const opcionales = await cliente.query<{ codigo: string; etiqueta: string; estado: EstadoAutorizacion }>(
      `select distinct on (a.finalidad) a.finalidad as codigo, t.etiqueta, a.estado
         from autorizaciones a
         join textos_legales t on t.id = a.texto_id
        where a.paciente_id = $1 and a.finalidad not in ($2, $3)
        order by a.finalidad, a.registrada_en desc`,
      [pacienteId, CODIGO_TRATAMIENTO, CODIGO_CONTACTO],
    );
    const ultima = await cliente.query<{ id: string; finalidad: string }>(
      `select id, finalidad from autorizaciones where paciente_id = $1 order by registrada_en desc`,
      [pacienteId],
    );
    return {
      tratamiento,
      contacto,
      opcionales: opcionales.rows,
      autorizaciones: ultima.rows,
    };
  });
}

export async function evaluarApertura(ctx: ContextoAutorizacion, pacienteId: string, urgencia: boolean) {
  exigeLectura(ctx.rol);
  const estadoTratamiento = await conApp(ctx, async (cliente) => ultimo(cliente, pacienteId, CODIGO_TRATAMIENTO));
  return puedeAbrirAtencion({ urgencia, estadoTratamiento });
}

export async function evaluarContacto(
  ctx: ContextoAutorizacion,
  pacienteId: string,
  destinatario: 'paciente' | 'representante' = 'paciente',
  ahora = new Date(),
) {
  exigeLectura(ctx.rol);
  const datos = await conApp(ctx, async (cliente) => {
    const paciente = await cliente.query<{ fecha_nacimiento: string }>(
      `select to_char(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento from pacientes where id = $1`,
      [pacienteId],
    );
    if (!paciente.rows[0]) throw new ErrorAutorizacionDatos('no_encontrado', 'No se encontró el paciente.');
    const estadoContacto = await ultimo(cliente, pacienteId, CODIGO_CONTACTO);
    return { fecha_nacimiento: paciente.rows[0].fecha_nacimiento, estadoContacto };
  });
  return puedeContactarComercialmente({
    estadoContacto: datos.estadoContacto,
    fechaNacimiento: datos.fecha_nacimiento,
    hoy: fechaCivilBogota(ahora),
    destinatario,
  });
}

export async function leerPolitica(ctx: ContextoAutorizacion): Promise<PoliticaTratamiento & { aviso: string; campos_sin_dato: string[] }> {
  exigeLectura(ctx.rol);
  const politica = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<PoliticaTratamiento>(
      `select razon_social, domicilio, correo, telefono, finalidades, derechos, area_pqr, procedimiento, vigencia, url_publica
         from politicas_tratamiento where tenant_id = $1`,
      [ctx.tenant_id],
    );
    return filas.rows[0] ?? politicaVacia();
  });
  const aviso = generarAvisoPrivacidad(politica);
  return { ...politica, aviso: aviso.texto, campos_sin_dato: aviso.campos_sin_dato };
}

export async function guardarPolitica(ctx: ContextoAutorizacion, entrada: PoliticaTratamiento) {
  exigeAdmin(ctx.rol);
  const campos: PoliticaTratamiento = {
    razon_social: nulo(entrada.razon_social),
    domicilio: nulo(entrada.domicilio),
    correo: nulo(entrada.correo),
    telefono: nulo(entrada.telefono),
    finalidades: nulo(entrada.finalidades),
    derechos: nulo(entrada.derechos),
    area_pqr: nulo(entrada.area_pqr),
    procedimiento: nulo(entrada.procedimiento),
    vigencia: nulo(entrada.vigencia),
    url_publica: nulo(entrada.url_publica),
  };
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `insert into politicas_tratamiento
         (tenant_id, razon_social, domicilio, correo, telefono, finalidades, derechos, area_pqr, procedimiento, vigencia, url_publica, actualizado_en)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       on conflict (tenant_id) do update set
         razon_social = excluded.razon_social,
         domicilio = excluded.domicilio,
         correo = excluded.correo,
         telefono = excluded.telefono,
         finalidades = excluded.finalidades,
         derechos = excluded.derechos,
         area_pqr = excluded.area_pqr,
         procedimiento = excluded.procedimiento,
         vigencia = excluded.vigencia,
         url_publica = excluded.url_publica,
         actualizado_en = now()`,
      [
        ctx.tenant_id,
        campos.razon_social,
        campos.domicilio,
        campos.correo,
        campos.telefono,
        campos.finalidades,
        campos.derechos,
        campos.area_pqr,
        campos.procedimiento,
        campos.vigencia,
        campos.url_publica,
      ],
    );
  });
  await anotar(ctx, ctx.tenant_id, 'actualizar');
  return leerPolitica(ctx);
}
