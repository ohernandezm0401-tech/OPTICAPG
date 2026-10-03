// SEG-08 (T14) — Servicio de firma electrónica simple sobre un documento
// de ejemplo. El consentimiento clínico (T22) usa `consentimiento_clinico`.
// La prescripción (T23) usa `prescripcion`.
// TODO(Q-22): sello de tiempo externo nulo; el sellado propio es SHA-256
// más la hora del servidor. PDF/A no garantizado.
// BORRADOR – requiere revisión jurídica.
import type { PoolClient } from 'pg';

import {
  AVISO_DOCUMENTO_EJEMPLO,
  AVISO_PDF_A,
  CANAL_OTP_PRUEBA,
  TEXTO_ACUERDO_FIRMA,
  VIGENCIA_OTP_MS,
  armarEvidenciaPaciente,
  codigoOtpCoincide,
  esPng,
  evaluarFirmaProfesional,
  generarCodigoOtp,
  hashAcuerdoFirma,
  hashCodigoOtp,
  hashSha256,
  lineaSelloProfesional,
  presentarBogota,
  puedeFirmarComoProfesional,
  puedeRecogerFirmaPaciente,
  puedeRegistrarPerfil,
  puedeVerificarFirma,
  puntosDeTrazoValidos,
  tarjetaDeclaradaVigente,
  validarContextoRed,
  validarIdentidadPaciente,
  verificarHash,
  type EvidenciaPacienteExportada,
} from '../dominio/firma';
import { exigirMfaParaFirmarAtencion } from '../lib/auth/mfa/flujo';
import { evaluarMfaParaFirma } from '../lib/auth/mfa/reciente';
import { registrarEvento } from '../lib/auditoria/servicio';
import { crearAlmacenBdCifrada, crearAlmacenDiscoCifrado } from '../lib/firma/almacen';
import { renderizarPdfConsentimiento, renderizarPdfFirma, renderizarPdfPrescripcion } from '../lib/firma/pdf';
import {
  crearSelloNulo,
  crearSelloServidor,
  type AlmacenamientoPort,
} from '../lib/firma/puertos';
import { cifrarParaTenant, descifrarParaTenant } from '../lib/cifrado/almacen.mjs';
import { leerRegistroKek } from '../lib/cifrado/kek.mjs';
import { obtenerPool } from './index';
import type { ContextoTenant } from './tenant';

export class ErrorFirma extends Error {
  readonly codigo: 'mfa' | 'tarjeta' | 'permiso' | 'estado' | 'validacion' | 'no_encontrado';

  constructor(codigo: ErrorFirma['codigo'], mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFirma';
    this.codigo = codigo;
  }
}

export interface ContextoFirma extends ContextoTenant {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
  sesion_id?: string | null;
}

export interface ExportacionFirma {
  documento_id: string;
  hash_documento: string;
  pdf_base64: string;
  aviso: string;
  pdf_a: false;
  sello_tsa_proveedor: string;
  sello_tsa_token: null;
  sellado_en: string;
  hora_bogota: string;
  profesional: {
    nombre_completo: string;
    registro_profesional: string;
    hora_bogota: string;
  };
  evidencia_paciente: EvidenciaPacienteExportada | null;
  acuerdo: string;
  acuerdo_hash: string;
}

interface FilaDocumento {
  id: string;
  tipo: string;
  estado: string;
  titulo: string;
  cuerpo: string;
  hash_documento: string | null;
  almacen_adaptador: string | null;
  almacen_id: string | null;
  sello_tsa_proveedor: string;
  sellado_en: Date | null;
}

interface FilaFirma {
  id: string;
  tipo_firmante: string;
  nombre_firmante: string | null;
  nombre_cifrado: string | null;
  documento_cifrado: string | null;
  registro_profesional: string | null;
  trazo_png_cifrado: string | null;
  trazo_puntos_cifrado: string | null;
  otp_verificado: boolean;
  otp_canal: string | null;
  otp_verificado_en: Date | null;
  ip: string | null;
  firmado_en: Date;
}

let almacenDePrueba: AlmacenamientoPort | null = null;

export function fijarAlmacenamientoParaPruebas(port: AlmacenamientoPort | null) {
  almacenDePrueba = port;
}

function almacenPorNombre(nombre: string | null): AlmacenamientoPort {
  if (almacenDePrueba) return almacenDePrueba;
  if (nombre === 'disco_cifrado') return crearAlmacenDiscoCifrado();
  return crearAlmacenBdCifrada();
}

async function cifrar(tenantId: string, plano: Buffer | string): Promise<string> {
  const bytes = typeof plano === 'string' ? Buffer.from(plano, 'utf8') : plano;
  const sobre = await cifrarParaTenant(obtenerPool(), leerRegistroKek(), tenantId, bytes);
  return sobre.texto as string;
}

async function descifrar(tenantId: string, sobre: string): Promise<Buffer> {
  const plano = await descifrarParaTenant(obtenerPool(), leerRegistroKek(), tenantId, sobre);
  return Buffer.from(plano as Buffer);
}

async function conApp<T>(contexto: ContextoFirma, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [contexto.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [contexto.usuario_id ?? '']);
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

async function anotar(ctx: ContextoFirma, documentoId: string | null, resultado: 'ok' | 'denegado') {
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
      recurso: 'firma_documento',
      recurso_id: documentoId,
      accion: resultado === 'ok' ? 'firmar' : 'firmar',
      resultado,
    },
  );
}

function mensajeRechazo(motivo: 'mfa_reciente' | 'tarjeta_profesional'): ErrorFirma {
  if (motivo === 'mfa_reciente') {
    return new ErrorFirma('mfa', 'Firmar exige un segundo factor reciente.');
  }
  return new ErrorFirma('tarjeta', 'Firmar exige tarjeta profesional vigente.');
}

async function gateProfesional(ctx: ContextoFirma, ahora: Date) {
  if (!puedeFirmarComoProfesional(ctx.rol)) {
    throw new ErrorFirma('permiso', 'Solo el profesional puede firmar el documento.');
  }
  if (!ctx.sesion_id) {
    throw mensajeRechazo('mfa_reciente');
  }
  const sesion = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ usuario_id: string; mfa_verificada_en: Date | null; revocada_en: Date | null }>(
      `select usuario_id, mfa_verificada_en, revocada_en from sesiones where id = $1`,
      [ctx.sesion_id],
    );
    return filas.rows[0] ?? null;
  });
  const port = await exigirMfaParaFirmarAtencion(ctx.sesion_id, ahora);
  const reciente =
    sesion &&
    sesion.usuario_id === ctx.usuario_id &&
    !sesion.revocada_en &&
    evaluarMfaParaFirma(sesion.mfa_verificada_en ? new Date(sesion.mfa_verificada_en) : null, ahora).ok &&
    port.ok;
  const perfil = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{
      nombre_completo: string;
      registro_profesional: string;
      vigente_hasta: string | null;
    }>(
      `select nombre_completo, registro_profesional, vigente_hasta::text as vigente_hasta
         from perfiles_profesionales
        where usuario_id = $1`,
      [ctx.usuario_id],
    );
    return filas.rows[0] ?? null;
  });
  const decision = evaluarFirmaProfesional({
    mfaReciente: Boolean(reciente),
    registroProfesional: perfil?.registro_profesional ?? null,
    vigenteHasta: perfil?.vigente_hasta ?? null,
    ahora,
  });
  if (!decision.ok) throw mensajeRechazo(decision.motivo);
  return {
    nombre: perfil!.nombre_completo,
    registro: perfil!.registro_profesional,
  };
}

export async function estadoFirma(ctx: ContextoFirma, ahora = new Date()) {
  const perfil = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ registro_profesional: string; vigente_hasta: string | null; nombre_completo: string }>(
      `select nombre_completo, registro_profesional, vigente_hasta::text as vigente_hasta
         from perfiles_profesionales where usuario_id = $1`,
      [ctx.usuario_id],
    );
    return filas.rows[0] ?? null;
  });
  let mfaReciente = false;
  if (ctx.sesion_id) {
    const port = await exigirMfaParaFirmarAtencion(ctx.sesion_id, ahora);
    mfaReciente = port.ok;
  }
  const tarjetaVigente = tarjetaDeclaradaVigente(
    perfil?.registro_profesional ?? null,
    perfil?.vigente_hasta ?? null,
    ahora,
  );
  const decision = evaluarFirmaProfesional({
    mfaReciente,
    registroProfesional: perfil?.registro_profesional ?? null,
    vigenteHasta: perfil?.vigente_hasta ?? null,
    ahora,
  });
  return {
    puede_firmar: decision.ok && puedeFirmarComoProfesional(ctx.rol),
    motivo: decision.ok ? null : decision.motivo,
    mfa_reciente: mfaReciente,
    tarjeta_vigente: tarjetaVigente,
    nombre_profesional: perfil?.nombre_completo ?? null,
    registro_profesional: perfil?.registro_profesional ?? null,
    aviso: `${AVISO_DOCUMENTO_EJEMPLO} ${AVISO_PDF_A}`,
  };
}

export async function guardarPerfilProfesional(
  ctx: ContextoFirma,
  entrada: {
    usuarioId: string;
    nombreCompleto: string;
    registroProfesional: string;
    vigenteHasta: string | null;
  },
  ahora = new Date(),
) {
  if (!puedeRegistrarPerfil(ctx.rol)) {
    throw new ErrorFirma('permiso', 'Solo el administrador registra la tarjeta profesional.');
  }
  const nombre = entrada.nombreCompleto.trim();
  const registro = entrada.registroProfesional.trim();
  if (!nombre || nombre.length > 160) throw new ErrorFirma('validacion', 'El nombre completo es obligatorio.');
  if (!registro || registro.length > 80) throw new ErrorFirma('validacion', 'El registro profesional es obligatorio.');
  if (entrada.vigenteHasta && !/^\d{4}-\d{2}-\d{2}$/.test(entrada.vigenteHasta)) {
    throw new ErrorFirma('validacion', 'La vigencia declarada usa la forma AAAA-MM-DD.');
  }
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into perfiles_profesionales
         (tenant_id, usuario_id, nombre_completo, registro_profesional, vigente_hasta, verificado_por, verificado_en, estado)
       values ($1, $2, $3, $4, $5, $6, $7, 'verificado')
       on conflict (tenant_id, usuario_id)
       do update set nombre_completo = excluded.nombre_completo,
                     registro_profesional = excluded.registro_profesional,
                     vigente_hasta = excluded.vigente_hasta,
                     verificado_por = excluded.verificado_por,
                     verificado_en = excluded.verificado_en,
                     estado = 'verificado',
                     actualizado_en = now()
       returning id`,
      [ctx.tenant_id, entrada.usuarioId, nombre, registro, entrada.vigenteHasta, ctx.usuario_id, ahora.toISOString()],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo guardar el perfil profesional.');
  return { id };
}

export async function crearDocumentoEjemplo(ctx: ContextoFirma, entrada: { titulo: string; cuerpo: string }) {
  if (!puedeFirmarComoProfesional(ctx.rol) && !puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede crear el documento de ejemplo.');
  }
  const titulo = entrada.titulo.trim();
  const cuerpo = entrada.cuerpo.trim();
  if (!titulo || titulo.length > 160) throw new ErrorFirma('validacion', 'El título es obligatorio.');
  if (!cuerpo || cuerpo.length > 4000) throw new ErrorFirma('validacion', 'El cuerpo es obligatorio.');
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into documentos_firma (tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, 'ejemplo_sintetico', 'pendiente', $3, $4)
       returning id`,
      [ctx.tenant_id, ctx.sede_id, titulo, cuerpo],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo crear el documento.');
  return { id, aviso: AVISO_DOCUMENTO_EJEMPLO };
}

/** Documento de la atención (OPT-01). Lo firma `firmarProfesional`; no es el ejemplo. */
export async function crearDocumentoAtencion(ctx: ContextoFirma, entrada: { titulo: string; cuerpo: string }) {
  if (!puedeFirmarComoProfesional(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede preparar la firma de la atención.');
  }
  const titulo = entrada.titulo.trim();
  const cuerpo = entrada.cuerpo.trim();
  if (!titulo || titulo.length > 160) throw new ErrorFirma('validacion', 'El título es obligatorio.');
  if (!cuerpo || cuerpo.length > 20000) throw new ErrorFirma('validacion', 'El contenido de la atención es obligatorio.');
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into documentos_firma (tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, 'atencion_clinica', 'pendiente', $3, $4)
       returning id`,
      [ctx.tenant_id, ctx.sede_id, titulo, cuerpo],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo crear el documento de la atención.');
  return { id };
}

/** Documento de la autorización de datos (SEG-05). No es el ejemplo sintético. */
export async function crearDocumentoAutorizacion(ctx: ContextoFirma, entrada: { titulo: string; cuerpo: string }) {
  if (!puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede preparar la firma de la autorización.');
  }
  const titulo = entrada.titulo.trim();
  const cuerpo = entrada.cuerpo.trim();
  if (!titulo || titulo.length > 160) throw new ErrorFirma('validacion', 'El título es obligatorio.');
  if (!cuerpo || cuerpo.length > 20000) throw new ErrorFirma('validacion', 'El texto de la autorización es obligatorio.');
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into documentos_firma (tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, 'autorizacion_datos', 'pendiente', $3, $4)
       returning id`,
      [ctx.tenant_id, ctx.sede_id, titulo, cuerpo],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo crear el documento de autorización.');
  return { id };
}

/** Documento de la prescripción (OPT-05). Lo firma el profesional con `firmarProfesional`. */
export async function crearDocumentoPrescripcion(ctx: ContextoFirma, entrada: { titulo: string; cuerpo: string }) {
  if (!puedeFirmarComoProfesional(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede preparar la firma de la prescripción.');
  }
  const titulo = entrada.titulo.trim();
  const cuerpo = entrada.cuerpo.trim();
  if (!titulo || titulo.length > 160) throw new ErrorFirma('validacion', 'El título es obligatorio.');
  if (!cuerpo || cuerpo.length > 20000) throw new ErrorFirma('validacion', 'El contenido de la prescripción es obligatorio.');
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into documentos_firma (tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, 'prescripcion', 'pendiente', $3, $4)
       returning id`,
      [ctx.tenant_id, ctx.sede_id, titulo, cuerpo],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo crear el documento de la prescripción.');
  return { id };
}

/** Documento del consentimiento informado (OPT-04). Lo firma el paciente o su representante. */
export async function crearDocumentoConsentimiento(ctx: ContextoFirma, entrada: { titulo: string; cuerpo: string }) {
  if (!puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede preparar la firma del consentimiento.');
  }
  const titulo = entrada.titulo.trim();
  const cuerpo = entrada.cuerpo.trim();
  if (!titulo || titulo.length > 160) throw new ErrorFirma('validacion', 'El título es obligatorio.');
  if (!cuerpo || cuerpo.length > 20000) throw new ErrorFirma('validacion', 'El texto del consentimiento es obligatorio.');
  const id = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into documentos_firma (tenant_id, sede_id, tipo, estado, titulo, cuerpo)
       values ($1, $2, 'consentimiento_clinico', 'pendiente', $3, $4)
       returning id`,
      [ctx.tenant_id, ctx.sede_id, titulo, cuerpo],
    );
    return filas.rows[0]?.id;
  });
  if (!id) throw new ErrorFirma('validacion', 'No se pudo crear el documento del consentimiento.');
  return { id };
}

async function leerDocumento(ctx: ContextoFirma, documentoId: string): Promise<FilaDocumento | null> {
  return conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaDocumento>(
      `select id, tipo, estado, titulo, cuerpo, hash_documento, almacen_adaptador, almacen_id,
              sello_tsa_proveedor, sellado_en
         from documentos_firma where id = $1`,
      [documentoId],
    );
    return filas.rows[0] ?? null;
  });
}

export async function firmarProfesional(ctx: ContextoFirma, documentoId: string, ahora = new Date()) {
  let profesional: { nombre: string; registro: string };
  try {
    profesional = await gateProfesional(ctx, ahora);
  } catch (error) {
    if (error instanceof ErrorFirma && (error.codigo === 'mfa' || error.codigo === 'tarjeta')) {
      await anotar(ctx, documentoId, 'denegado');
    }
    throw error;
  }
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.estado !== 'pendiente') {
    throw new ErrorFirma('estado', 'El profesional solo firma un documento pendiente.');
  }
  await conApp(ctx, async (cliente) => {
    const ya = await cliente.query(`select id from firmas where documento_id = $1 and tipo_firmante = 'profesional'`, [
      documentoId,
    ]);
    if (ya.rows.length > 0) throw new ErrorFirma('estado', 'El profesional ya firmó este documento.');
    await cliente.query(
      `insert into firmas
         (tenant_id, sede_id, tipo_firmante, firmante_id, documento_tipo, documento_id,
          nombre_firmante, registro_profesional, otp_verificado, acuerdo_aceptado, sesion_id, firmado_en)
       values ($1, $2, 'profesional', $3, $4, $5, $6, $7, false, true, $8, $9)`,
      [
        ctx.tenant_id,
        ctx.sede_id,
        ctx.usuario_id,
        documento.tipo,
        documentoId,
        profesional.nombre,
        profesional.registro,
        ctx.sesion_id,
        ahora.toISOString(),
      ],
    );
    await cliente.query(
      `update documentos_firma set estado = 'firmado', actualizado_en = now() where id = $1`,
      [documentoId],
    );
  });
  await anotar(ctx, documentoId, 'ok');
  return { estado: 'firmado' as const };
}

export async function emitirOtpPaciente(ctx: ContextoFirma, documentoId: string, ahora = new Date()) {
  if (!puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede emitir el código de verificación.');
  }
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.estado === 'sellado') throw new ErrorFirma('estado', 'El documento ya está sellado.');
  const codigo = generarCodigoOtp();
  const expira = new Date(ahora.getTime() + VIGENCIA_OTP_MS);
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `insert into codigos_otp_firma (tenant_id, documento_id, codigo_hash, canal, expira_en)
       values ($1, $2, $3, $4, $5)`,
      [ctx.tenant_id, documentoId, hashCodigoOtp(documentoId, codigo), CANAL_OTP_PRUEBA, expira.toISOString()],
    );
  });
  return {
    codigo,
    canal: CANAL_OTP_PRUEBA,
    expira_en: expira.toISOString(),
    aviso: 'Canal de prueba en pantalla. El envío por correo no forma parte de esta tarea.',
  };
}

export async function firmarPaciente(
  ctx: ContextoFirma,
  entrada: {
    documentoId: string;
    trazoPng: Buffer;
    trazoPuntos: unknown;
    nombre: string;
    documento: string;
    ip: string;
    agente: string;
    otp: string | null;
    acuerdoAceptado: boolean;
  },
  ahora = new Date(),
) {
  if (!puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede recoger la firma del paciente.');
  }
  if (!entrada.acuerdoAceptado) {
    throw new ErrorFirma('validacion', 'Falta el acuerdo de uso de firma electrónica.');
  }
  if (!esPng(entrada.trazoPng)) throw new ErrorFirma('validacion', 'El trazo debe ser un PNG.');
  if (!puntosDeTrazoValidos(entrada.trazoPuntos)) {
    throw new ErrorFirma('validacion', 'El trazo de la firma no es válido.');
  }
  const identidad = validarIdentidadPaciente(entrada.nombre, entrada.documento);
  if (identidad) throw new ErrorFirma('validacion', identidad);
  const red = validarContextoRed(entrada.ip, entrada.agente);
  if (red) throw new ErrorFirma('validacion', red);

  const documento = await leerDocumento(ctx, entrada.documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.estado === 'sellado') throw new ErrorFirma('estado', 'El documento ya está sellado.');

  let otpVerificado = false;
  let otpEn: Date | null = null;
  if (entrada.otp) {
    const codigo = entrada.otp.trim();
    const usado = await conApp(ctx, async (cliente) => {
      const filas = await cliente.query<{ id: string; codigo_hash: string; expira_en: Date }>(
        `select id, codigo_hash, expira_en from codigos_otp_firma
          where documento_id = $1 and usado_en is null
          order by creado_en desc`,
        [entrada.documentoId],
      );
      const coincide = filas.rows.find(
        (fila) =>
          new Date(fila.expira_en).getTime() >= ahora.getTime() &&
          codigoOtpCoincide(entrada.documentoId, codigo, fila.codigo_hash),
      );
      if (!coincide) return false;
      const marca = await cliente.query(
        `update codigos_otp_firma set usado_en = $2 where id = $1 and usado_en is null`,
        [coincide.id, ahora.toISOString()],
      );
      return (marca.rowCount ?? 0) > 0;
    });
    if (!usado) throw new ErrorFirma('validacion', 'El código OTP no es válido.');
    otpVerificado = true;
    otpEn = ahora;
  }

  const [nombreCifrado, documentoCifrado, trazoCifrado, puntosCifrado] = await Promise.all([
    cifrar(ctx.tenant_id, entrada.nombre.trim()),
    cifrar(ctx.tenant_id, entrada.documento.trim()),
    cifrar(ctx.tenant_id, entrada.trazoPng),
    cifrar(ctx.tenant_id, JSON.stringify(entrada.trazoPuntos)),
  ]);

  await conApp(ctx, async (cliente) => {
    const ya = await cliente.query(`select id from firmas where documento_id = $1 and tipo_firmante = 'paciente'`, [
      entrada.documentoId,
    ]);
    if (ya.rows.length > 0) throw new ErrorFirma('estado', 'El paciente ya firmó este documento.');
    await cliente.query(
      `insert into firmas
         (tenant_id, sede_id, tipo_firmante, documento_tipo, documento_id, trazo_png_cifrado,
          trazo_puntos_cifrado, nombre_cifrado, documento_cifrado, otp_verificado, otp_canal,
          otp_verificado_en, ip, agente, acuerdo_aceptado, firmado_en)
       values ($1,$2,'paciente',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14)`,
      [
        ctx.tenant_id,
        ctx.sede_id,
        documento.tipo,
        entrada.documentoId,
        trazoCifrado,
        puntosCifrado,
        nombreCifrado,
        documentoCifrado,
        otpVerificado,
        otpVerificado ? CANAL_OTP_PRUEBA : null,
        otpEn ? otpEn.toISOString() : null,
        entrada.ip.trim(),
        entrada.agente.slice(0, 300),
        ahora.toISOString(),
      ],
    );
  });
  return { otp_verificado: otpVerificado };
}

export async function sellarDocumento(
  ctx: ContextoFirma,
  documentoId: string,
  ahora = new Date(),
  almacen: AlmacenamientoPort = almacenPorNombre(null),
) {
  const profesionalGate = await gateProfesional(ctx, ahora);
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.estado !== 'firmado') {
    throw new ErrorFirma('estado', 'Solo se sella un documento ya firmado por el profesional.');
  }
  const firmasFila = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaFirma>(
      `select id, tipo_firmante, nombre_firmante, nombre_cifrado, documento_cifrado, registro_profesional,
              trazo_png_cifrado, trazo_puntos_cifrado, otp_verificado, otp_canal, otp_verificado_en, ip, firmado_en
         from firmas where documento_id = $1`,
      [documentoId],
    );
    return filas.rows;
  });
  const profesional = firmasFila.find((fila) => fila.tipo_firmante === 'profesional');
  const paciente = firmasFila.find((fila) => fila.tipo_firmante === 'paciente');
  if (!profesional?.nombre_firmante || !profesional.registro_profesional) {
    throw new ErrorFirma('estado', 'Falta la firma del profesional.');
  }
  if (!paciente?.trazo_png_cifrado || !paciente.nombre_cifrado || !paciente.documento_cifrado || !paciente.ip) {
    throw new ErrorFirma('estado', 'Falta la firma del paciente.');
  }
  const nombrePaciente = (await descifrar(ctx.tenant_id, paciente.nombre_cifrado)).toString('utf8');
  const documentoPaciente = (await descifrar(ctx.tenant_id, paciente.documento_cifrado)).toString('utf8');
  const trazo = await descifrar(ctx.tenant_id, paciente.trazo_png_cifrado);
  const horaProfesional = new Date(profesional.firmado_en);
  const linea = lineaSelloProfesional(profesional.nombre_firmante, profesional.registro_profesional, horaProfesional);
  const pdf = await renderizarPdfFirma({
    titulo: documento.titulo,
    cuerpo: documento.cuerpo,
    lineaProfesional: linea,
    nombreProfesional: profesional.nombre_firmante,
    registroProfesional: profesional.registro_profesional,
    horaBogota: presentarBogota(horaProfesional),
    paciente: {
      nombre: nombrePaciente,
      documento: documentoPaciente,
      horaBogota: presentarBogota(new Date(paciente.firmado_en)),
      ip: paciente.ip,
      otpVerificado: paciente.otp_verificado,
      otpCanal: paciente.otp_canal,
      trazoDataUrl: `data:image/png;base64,${trazo.toString('base64')}`,
    },
  });
  const hash = hashSha256(pdf);
  const tsa = await crearSelloNulo().sellar(hash, ahora);
  const propio = await crearSelloServidor().sellar(hash, ahora);
  const guardado = await almacen.guardar({
    tenantId: ctx.tenant_id,
    nombre: `${documentoId}.pdf`,
    mime: 'application/pdf',
    contenido: pdf,
  });
  if (guardado.hash !== hash) {
    throw new ErrorFirma('estado', 'El almacén no conservó el hash del PDF.');
  }
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `update documentos_firma
          set estado = 'sellado',
              hash_documento = $2,
              almacen_adaptador = $3,
              almacen_id = $4,
              sello_tsa_proveedor = $5,
              sello_tsa_token = $6,
              sellado_en = $7,
              actualizado_en = now()
        where id = $1`,
      [documentoId, hash, almacen.nombre, guardado.id, tsa.proveedor, tsa.token, propio.sellado_en],
    );
    await cliente.query(`update firmas set hash_documento = $2 where documento_id = $1 and hash_documento is null`, [
      documentoId,
      hash,
    ]);
  });
  await anotar(ctx, documentoId, 'ok');
  return {
    hash,
    sellado_en: propio.sellado_en,
    sello_tsa_proveedor: tsa.proveedor,
    sello_tsa_token: tsa.token,
    nombre: profesionalGate.nombre,
  };
}

export async function sellarConsentimientoPaciente(
  ctx: ContextoFirma,
  documentoId: string,
  extra: { procedimiento: string; version: number; hashTexto: string; firmante: string },
  ahora = new Date(),
  almacen: AlmacenamientoPort = almacenPorNombre(null),
) {
  if (!puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede sellar el consentimiento.');
  }
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.tipo !== 'consentimiento_clinico') {
    throw new ErrorFirma('estado', 'El documento no es un consentimiento clínico.');
  }
  if (documento.estado !== 'pendiente') {
    throw new ErrorFirma('estado', 'El consentimiento ya fue sellado.');
  }
  const firmasFila = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaFirma>(
      `select id, tipo_firmante, nombre_firmante, nombre_cifrado, documento_cifrado, registro_profesional,
              trazo_png_cifrado, trazo_puntos_cifrado, otp_verificado, otp_canal, otp_verificado_en, ip, firmado_en
         from firmas where documento_id = $1 and tipo_firmante = 'paciente'`,
      [documentoId],
    );
    return filas.rows[0] ?? null;
  });
  if (!firmasFila?.trazo_png_cifrado || !firmasFila.nombre_cifrado || !firmasFila.documento_cifrado || !firmasFila.ip) {
    throw new ErrorFirma('estado', 'Falta la firma del paciente o del representante.');
  }
  const nombre = (await descifrar(ctx.tenant_id, firmasFila.nombre_cifrado)).toString('utf8');
  const documentoFirmante = (await descifrar(ctx.tenant_id, firmasFila.documento_cifrado)).toString('utf8');
  const trazo = await descifrar(ctx.tenant_id, firmasFila.trazo_png_cifrado);
  const pdf = await renderizarPdfConsentimiento({
    titulo: documento.titulo,
    cuerpo: documento.cuerpo,
    procedimiento: extra.procedimiento,
    version: extra.version,
    hashTexto: extra.hashTexto,
    firmante: extra.firmante,
    nombre,
    documento: documentoFirmante,
    horaBogota: presentarBogota(new Date(firmasFila.firmado_en)),
    ip: firmasFila.ip,
    trazoDataUrl: `data:image/png;base64,${trazo.toString('base64')}`,
  });
  const hash = hashSha256(pdf);
  const guardado = await almacen.guardar({
    tenantId: ctx.tenant_id,
    nombre: `${documentoId}.pdf`,
    mime: 'application/pdf',
    contenido: pdf,
  });
  if (guardado.hash !== hash) {
    throw new ErrorFirma('estado', 'El almacén no conservó el hash del PDF.');
  }
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `update documentos_firma set estado = 'firmado', actualizado_en = now() where id = $1 and estado = 'pendiente'`,
      [documentoId],
    );
    const propio = await crearSelloServidor().sellar(hash, ahora);
    const tsa = await crearSelloNulo().sellar(hash, ahora);
    await cliente.query(
      `update documentos_firma
          set estado = 'sellado',
              hash_documento = $2,
              almacen_adaptador = $3,
              almacen_id = $4,
              sello_tsa_proveedor = $5,
              sello_tsa_token = $6,
              sellado_en = $7,
              actualizado_en = now()
        where id = $1`,
      [documentoId, hash, almacen.nombre, guardado.id, tsa.proveedor, tsa.token, propio.sellado_en],
    );
    await cliente.query(`update firmas set hash_documento = $2 where documento_id = $1 and hash_documento is null`, [
      documentoId,
      hash,
    ]);
  });
  return { hash, anexo_id: guardado.id, firma_id: firmasFila.id };
}

/** Sella el PDF de la prescripción ya firmada por el profesional. No pide firma del paciente. */
export async function sellarPrescripcionProfesional(
  ctx: ContextoFirma,
  documentoId: string,
  lineas: string[],
  ahora = new Date(),
  almacen: AlmacenamientoPort = almacenPorNombre(null),
) {
  const profesionalGate = await gateProfesional(ctx, ahora);
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento) throw new ErrorFirma('no_encontrado', 'No se encontró el documento.');
  if (documento.tipo !== 'prescripcion') {
    throw new ErrorFirma('estado', 'El documento no es una prescripción.');
  }
  if (documento.estado !== 'firmado') {
    throw new ErrorFirma('estado', 'La prescripción solo se sella después de la firma del profesional.');
  }
  const profesional = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaFirma>(
      `select id, tipo_firmante, nombre_firmante, nombre_cifrado, documento_cifrado, registro_profesional,
              trazo_png_cifrado, trazo_puntos_cifrado, otp_verificado, otp_canal, otp_verificado_en, ip, firmado_en
         from firmas where documento_id = $1 and tipo_firmante = 'profesional'`,
      [documentoId],
    );
    return filas.rows[0] ?? null;
  });
  if (!profesional?.nombre_firmante || !profesional.registro_profesional) {
    throw new ErrorFirma('estado', 'Falta la firma del profesional.');
  }
  const hora = new Date(profesional.firmado_en);
  const pdf = await renderizarPdfPrescripcion({
    lineas,
    nombreProfesional: profesional.nombre_firmante,
    registroProfesional: profesional.registro_profesional,
    lineaProfesional: lineaSelloProfesional(profesional.nombre_firmante, profesional.registro_profesional, hora),
  });
  const hash = hashSha256(pdf);
  const guardado = await almacen.guardar({
    tenantId: ctx.tenant_id,
    nombre: `${documentoId}.pdf`,
    mime: 'application/pdf',
    contenido: pdf,
  });
  if (guardado.hash !== hash) {
    throw new ErrorFirma('estado', 'El almacén no conservó el hash del PDF.');
  }
  const propio = await crearSelloServidor().sellar(hash, ahora);
  const tsa = await crearSelloNulo().sellar(hash, ahora);
  await conApp(ctx, async (cliente) => {
    await cliente.query(
      `update documentos_firma
          set estado = 'sellado',
              hash_documento = $2,
              almacen_adaptador = $3,
              almacen_id = $4,
              sello_tsa_proveedor = $5,
              sello_tsa_token = $6,
              sellado_en = $7,
              actualizado_en = now()
        where id = $1 and estado = 'firmado'`,
      [documentoId, hash, almacen.nombre, guardado.id, tsa.proveedor, tsa.token, propio.sellado_en],
    );
    await cliente.query(`update firmas set hash_documento = $2 where documento_id = $1 and hash_documento is null`, [
      documentoId,
      hash,
    ]);
  });
  return { hash, anexo_id: guardado.id, firma_id: profesional.id, nombre: profesionalGate.nombre };
}

export async function verificarDocumento(ctx: ContextoFirma, pdf: Buffer): Promise<boolean> {
  if (!puedeVerificarFirma(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede verificar documentos.');
  }
  if (pdf.length === 0 || pdf.length > 8_000_000) return false;
  const hash = hashSha256(pdf);
  const encontrado = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<{ hash_documento: string }>(
      `select hash_documento from documentos_firma
        where estado = 'sellado' and hash_documento = $1`,
      [hash],
    );
    return filas.rows[0]?.hash_documento ?? null;
  });
  if (!encontrado) return false;
  return verificarHash(pdf, encontrado);
}

export async function exportarDocumento(ctx: ContextoFirma, documentoId: string): Promise<ExportacionFirma> {
  if (!puedeVerificarFirma(ctx.rol) && !puedeRecogerFirmaPaciente(ctx.rol)) {
    throw new ErrorFirma('permiso', 'No puede exportar el documento.');
  }
  const documento = await leerDocumento(ctx, documentoId);
  if (!documento || documento.estado !== 'sellado' || !documento.hash_documento || !documento.almacen_id) {
    throw new ErrorFirma('no_encontrado', 'No hay un documento sellado para exportar.');
  }
  const lectura = await almacenPorNombre(documento.almacen_adaptador).leer(ctx.tenant_id, documento.almacen_id);
  if (!lectura || !verificarHash(lectura.contenido, documento.hash_documento)) {
    throw new ErrorFirma('estado', 'El archivo guardado no coincide con el hash.');
  }
  const firmasFila = await conApp(ctx, async (cliente) => {
    const filas = await cliente.query<FilaFirma>(
      `select id, tipo_firmante, nombre_firmante, nombre_cifrado, documento_cifrado, registro_profesional,
              trazo_png_cifrado, trazo_puntos_cifrado, otp_verificado, otp_canal, otp_verificado_en, ip, firmado_en
         from firmas where documento_id = $1`,
      [documentoId],
    );
    return filas.rows;
  });
  const profesional = firmasFila.find((fila) => fila.tipo_firmante === 'profesional');
  const paciente = firmasFila.find((fila) => fila.tipo_firmante === 'paciente');
  if (!profesional?.nombre_firmante || !profesional.registro_profesional) {
    throw new ErrorFirma('estado', 'Falta la firma del profesional.');
  }
  let evidencia: EvidenciaPacienteExportada | null = null;
  if (paciente?.trazo_png_cifrado && paciente.trazo_puntos_cifrado && paciente.nombre_cifrado && paciente.ip) {
    const trazo = await descifrar(ctx.tenant_id, paciente.trazo_png_cifrado);
    const puntos = JSON.parse((await descifrar(ctx.tenant_id, paciente.trazo_puntos_cifrado)).toString('utf8')) as unknown;
    evidencia = armarEvidenciaPaciente({
      trazoPng: trazo,
      trazoPuntos: puntos,
      firmadoEn: new Date(paciente.firmado_en),
      ip: paciente.ip,
      otpVerificado: paciente.otp_verificado,
      otpCanal: paciente.otp_canal,
      otpVerificadoEn: paciente.otp_verificado_en ? new Date(paciente.otp_verificado_en) : null,
    });
  }
  const hora = new Date(profesional.firmado_en);
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
      recurso: 'firma_documento',
      recurso_id: documentoId,
      accion: 'exportar',
      resultado: 'ok',
    },
  );
  return {
    documento_id: documentoId,
    hash_documento: documento.hash_documento,
    pdf_base64: lectura.contenido.toString('base64'),
    aviso: 'BORRADOR – requiere revisión jurídica',
    pdf_a: false,
    sello_tsa_proveedor: documento.sello_tsa_proveedor,
    sello_tsa_token: null,
    sellado_en: documento.sellado_en ? new Date(documento.sellado_en).toISOString() : '',
    hora_bogota: presentarBogota(documento.sellado_en ? new Date(documento.sellado_en) : hora),
    profesional: {
      nombre_completo: profesional.nombre_firmante,
      registro_profesional: profesional.registro_profesional,
      hora_bogota: presentarBogota(hora),
    },
    evidencia_paciente: evidencia,
    acuerdo: TEXTO_ACUERDO_FIRMA,
    acuerdo_hash: hashAcuerdoFirma(),
  };
}
