// SEG-08 (T14) — Reglas puras de firma electrónica simple.
// TODO(Q-22): firma simple + hash SHA-256 y sellado propio. La TSA externa
// es de pago y no es obligatoria. PDF/A no está garantizado.
// BORRADOR – requiere revisión jurídica.
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { inflateSync } from 'node:zlib';

import { fechaCivilEnZona } from './fechas';

export const ZONA_FIRMA = 'America/Bogota';

export const TEXTO_ACUERDO_FIRMA =
  'BORRADOR – requiere revisión jurídica. Acuerdo de uso de firma electrónica simple: el trazo, la hora, la dirección IP y la verificación OTP quedan como evidencia del documento. TODO(Q-22): la validez de la firma simple en consentimientos (Decreto 2364/2012) no está verificada.';

export const AVISO_PDF_A =
  'PDF/A no garantizado. TODO(Q-22): @react-pdf/renderer no promete PDF/A.';

export const AVISO_DOCUMENTO_EJEMPLO =
  'Documento de ejemplo sintético. No es una historia clínica, una prescripción ni un consentimiento.';

export const CANAL_OTP_PRUEBA = 'pantalla_prueba';

/** Ventana operativa del código en pantalla. No es un plazo legal. */
export const VIGENCIA_OTP_MS = 10 * 60 * 1000;

export const ROLES_FIRMA_PROFESIONAL = ['optometra', 'oftalmologo'] as const;
export const ROLES_FIRMA_PACIENTE = ['optometra', 'oftalmologo', 'asesor', 'auxiliar_clinico'] as const;
export const ROLES_VERIFICAR_FIRMA = [
  'optometra',
  'oftalmologo',
  'asesor',
  'auxiliar_clinico',
  'admin',
  'auditor',
] as const;
export const ROLES_PERFIL_PROFESIONAL = ['admin'] as const;

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_PNG = 400_000;
const MAX_PUNTOS_JSON = 100_000;
const MAX_NOMBRE = 160;
const MAX_DOCUMENTO = 32;
const MAX_REGISTRO = 80;
const MAX_IP = 64;
const MAX_AGENTE = 300;

export type MotivoRechazoFirma = 'mfa_reciente' | 'tarjeta_profesional';

export interface EvidenciaPacienteExportada {
  trazo_png_base64: string;
  trazo_puntos: unknown;
  hora_utc: string;
  hora_bogota: string;
  ip: string;
  otp: {
    verificado: boolean;
    canal: string | null;
    verificado_en: string | null;
  };
}

export function hashSha256(contenido: Uint8Array): string {
  return createHash('sha256').update(contenido).digest('hex');
}

export function verificarHash(contenido: Uint8Array, esperado: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(esperado)) return false;
  const actual = Buffer.from(hashSha256(contenido), 'hex');
  const referencia = Buffer.from(esperado, 'hex');
  return timingSafeEqual(actual, referencia);
}

/** Copia el buffer y voltea un bit del último byte. El original no cambia. */
export function modificarUnByte(contenido: Uint8Array): Uint8Array {
  if (contenido.length === 0) {
    throw new Error('el documento está vacío');
  }
  const copia = new Uint8Array(contenido);
  const ultimo = copia.length - 1;
  copia[ultimo] = (copia[ultimo] ?? 0) ^ 0x01;
  return copia;
}

export function presentarBogota(instante: Date): string {
  if (Number.isNaN(instante.getTime())) {
    throw new Error('el instante no es una fecha válida');
  }
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_FIRMA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(instante);
}

export function lineaSelloProfesional(nombre: string, registro: string, instante: Date): string {
  return `Firmado electrónicamente por ${nombre} (RP ${registro}) el ${presentarBogota(instante)}`;
}

export function hashAcuerdoFirma(): string {
  return hashSha256(Buffer.from(TEXTO_ACUERDO_FIRMA, 'utf8'));
}

/**
 * Vigencia declarada por el tenant. Sin fecha no hay vigencia: no se inventa
 * un plazo. El día civil se evalúa en America/Bogota.
 */
export function tarjetaDeclaradaVigente(
  registro: string | null | undefined,
  vigenteHasta: string | null | undefined,
  ahora: Date,
): boolean {
  const numero = registro?.trim() ?? '';
  if (!numero || numero.length > MAX_REGISTRO) return false;
  if (!vigenteHasta || !/^\d{4}-\d{2}-\d{2}$/.test(vigenteHasta)) return false;
  const hoy = fechaCivilEnZona(ahora, ZONA_FIRMA);
  return vigenteHasta >= hoy;
}

export function evaluarFirmaProfesional(entrada: {
  mfaReciente: boolean;
  registroProfesional: string | null;
  vigenteHasta: string | null;
  ahora: Date;
}): { ok: true } | { ok: false; motivo: MotivoRechazoFirma } {
  if (!entrada.mfaReciente) return { ok: false, motivo: 'mfa_reciente' };
  if (!tarjetaDeclaradaVigente(entrada.registroProfesional, entrada.vigenteHasta, entrada.ahora)) {
    return { ok: false, motivo: 'tarjeta_profesional' };
  }
  return { ok: true };
}

export function puedeFirmarComoProfesional(rol: string): boolean {
  return (ROLES_FIRMA_PROFESIONAL as readonly string[]).includes(rol);
}

export function puedeRecogerFirmaPaciente(rol: string): boolean {
  return (ROLES_FIRMA_PACIENTE as readonly string[]).includes(rol);
}

export function puedeVerificarFirma(rol: string): boolean {
  return (ROLES_VERIFICAR_FIRMA as readonly string[]).includes(rol);
}

export function puedeRegistrarPerfil(rol: string): boolean {
  return (ROLES_PERFIL_PROFESIONAL as readonly string[]).includes(rol);
}

/** Código HTTP de la API de firma. Sin registro vigente la respuesta es 403. */
export function codigoHttpFirma(codigo: string, mensaje: string): number {
  if (codigo === 'permiso' || codigo === 'mfa' || codigo === 'tarjeta') {
    return mensaje.startsWith('Debe iniciar') ? 401 : 403;
  }
  if (codigo === 'no_encontrado') return 404;
  return 400;
}

export function esPng(bytes: Uint8Array): boolean {
  if (bytes.length < PNG.length || bytes.length > MAX_PNG) return false;
  return PNG.every((byte, indice) => bytes[indice] === byte);
}

export function puntosDeTrazoValidos(puntos: unknown): boolean {
  let serializado: string;
  try {
    serializado = JSON.stringify(puntos);
  } catch {
    return false;
  }
  if (!serializado || serializado.length > MAX_PUNTOS_JSON) return false;
  return Array.isArray(puntos);
}

export function validarIdentidadPaciente(nombre: string, documento: string): string | null {
  const limpio = nombre.trim();
  const doc = documento.trim();
  if (!limpio || limpio.length > MAX_NOMBRE) return 'El nombre del paciente es obligatorio.';
  if (!doc || doc.length > MAX_DOCUMENTO) return 'El documento del paciente es obligatorio.';
  if (!/^[A-Za-z0-9-]+$/.test(doc)) return 'El documento solo admite letras, números y guion.';
  return null;
}

export function validarContextoRed(ip: string, agente: string): string | null {
  if (!ip.trim() || ip.length > MAX_IP) return 'La dirección IP de la firma es obligatoria.';
  if (/[^0-9A-Za-z.:[\]]/.test(ip)) return 'La dirección IP no es válida.';
  if (agente.length > MAX_AGENTE) return 'El agente de la firma es demasiado largo.';
  return null;
}

export function generarCodigoOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashCodigoOtp(documentoId: string, codigo: string): string {
  return hashSha256(Buffer.from(`${documentoId}:${codigo}`, 'utf8'));
}

export function codigoOtpCoincide(documentoId: string, codigo: string, hashGuardado: string): boolean {
  if (!/^\d{6}$/.test(codigo)) return false;
  return verificarHash(Buffer.from(`${documentoId}:${codigo}`, 'utf8'), hashGuardado);
}

export function armarEvidenciaPaciente(entrada: {
  trazoPng: Uint8Array;
  trazoPuntos: unknown;
  firmadoEn: Date;
  ip: string;
  otpVerificado: boolean;
  otpCanal: string | null;
  otpVerificadoEn: Date | null;
}): EvidenciaPacienteExportada {
  return {
    trazo_png_base64: Buffer.from(entrada.trazoPng).toString('base64'),
    trazo_puntos: entrada.trazoPuntos,
    hora_utc: entrada.firmadoEn.toISOString(),
    hora_bogota: presentarBogota(entrada.firmadoEn),
    ip: entrada.ip,
    otp: {
      verificado: entrada.otpVerificado,
      canal: entrada.otpCanal,
      verificado_en: entrada.otpVerificadoEn ? entrada.otpVerificadoEn.toISOString() : null,
    },
  };
}

function decodificarHexPdf(flujo: string): string {
  const trozos: string[] = [];
  for (const coincidencia of flujo.matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
    const hex = (coincidencia[1] ?? '').replace(/\s+/g, '');
    if (hex.length < 2 || hex.length % 2 !== 0) continue;
    trozos.push(Buffer.from(hex, 'hex').toString('latin1'));
  }
  return trozos.join('');
}

/** Texto legible del PDF, inflando flujos FlateDecode. Sirve para las pruebas de contenido. */
export function textoVisiblePdf(pdf: Uint8Array): string {
  const crudo = Buffer.from(pdf).toString('latin1');
  const partes = [crudo];
  const flujos = /stream\r?\n([\s\S]*?)endstream/g;
  for (const coincidencia of crudo.matchAll(flujos)) {
    const cuerpo = coincidencia[1];
    if (!cuerpo) continue;
    try {
      partes.push(inflateSync(Buffer.from(cuerpo, 'latin1')).toString('latin1'));
    } catch {
      // Flujo sin comprimir o de imagen.
    }
  }
  const junto = partes.join('\n');
  return `${junto}\n${decodificarHexPdf(junto)}`;
}
