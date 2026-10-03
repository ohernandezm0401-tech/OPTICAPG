// SEG-05 (T15) — Puertas de atención y contacto, hash y evidencia.
// TODO(Q-17): se registra la negativa y se puede continuar con datos mínimos.
// BORRADOR – requiere revisión jurídica.
//
// SEG-16 y las atenciones clínicas todavía no existen. Esas tareas deben
// llamar `puedeContactarComercialmente` y `puedeAbrirAtencion`.
import { hashSha256, presentarBogota } from './firma';
import { evaluarElegibilidadMensajeComercial } from './elegibilidad-comercial';
import {
  ROTULO_BORRADOR,
  type EstadoAutorizacion,
} from './autorizacion-textos';

export {
  CODIGO_CONTACTO,
  CODIGO_TRATAMIENTO,
  ESTADOS_AUTORIZACION,
  MEDIOS_AUTORIZACION,
  NOTA_INSTRUMENTOS,
  PLANTILLA_CONTACTO_COMERCIAL,
  PLANTILLA_TRATAMIENTO_CLINICO,
  ROTULO_BORRADOR,
  codigoFinalidadValido,
  contactoBloqueaRegistro,
  contactoComercialPorDefecto,
  esMedioAutorizacion,
  generarAvisoPrivacidad,
  politicaVacia,
  textoIncluyeRotuloBorrador,
} from './autorizacion-textos';
export type { CampoPolitica, EstadoAutorizacion, MedioAutorizacion, PoliticaTratamiento } from './autorizacion-textos';

export interface TextoVersionado {
  id?: string;
  version: number;
  contenido: string;
  hash: string;
}

export interface EvidenciaAutorizacion {
  autorizacion_id: string;
  finalidad: string;
  texto_exacto: string;
  hash: string;
  hora_utc: string;
  hora_bogota: string;
  medio: string;
  estado: EstadoAutorizacion;
  otorgada: boolean;
  rotulo: string;
  firma_id: string | null;
}

export function hashTextoLegal(contenido: string): string {
  return hashSha256(Buffer.from(contenido, 'utf8'));
}

export function siguienteVersionTexto(
  actual: TextoVersionado,
  contenidoNuevo: string,
): { cambia: false; version: number; contenido: string; hash: string } | {
  cambia: true;
  version: number;
  contenido: string;
  hash: string;
  anterior: TextoVersionado;
} {
  if (contenidoNuevo === actual.contenido) {
    return { cambia: false, version: actual.version, contenido: actual.contenido, hash: actual.hash };
  }
  return {
    cambia: true,
    version: actual.version + 1,
    contenido: contenidoNuevo,
    hash: hashTextoLegal(contenidoNuevo),
    anterior: { ...actual },
  };
}

/**
 * AC-SEG-05-1. La urgencia es una marca del responsable.
 * TODO(Q-17): Ley 1581 art. 10, a validar por abogado. No se define aquí cuándo hay urgencia.
 */
export function puedeAbrirAtencion(entrada: {
  urgencia: boolean;
  estadoTratamiento: EstadoAutorizacion | null;
}): { permitida: boolean; motivo: 'urgencia' | 'otorgada' | 'negada_registrada' | 'sin_captura' | 'revocada' } {
  if (entrada.urgencia) return { permitida: true, motivo: 'urgencia' };
  if (entrada.estadoTratamiento === 'otorgada') return { permitida: true, motivo: 'otorgada' };
  if (entrada.estadoTratamiento === 'negada') {
    return { permitida: true, motivo: 'negada_registrada' };
  }
  if (entrada.estadoTratamiento === 'revocada') return { permitida: false, motivo: 'revocada' };
  return { permitida: false, motivo: 'sin_captura' };
}

/**
 * AC-SEG-05-5. Sin autorización de contacto, o con revocatoria, no hay envío comercial.
 * SEG-16 debe consultar esta función antes de enviar.
 */
export function puedeContactarComercialmente(entrada: {
  estadoContacto: EstadoAutorizacion | null;
  fechaNacimiento?: string;
  hoy?: string;
  destinatario?: 'paciente' | 'representante';
}): { permitida: boolean; motivo: 'otorgada' | 'sin_autorizacion' | 'negada' | 'revocada' | 'menor_de_edad' } {
  if (entrada.fechaNacimiento && entrada.hoy && entrada.destinatario) {
    const menor = evaluarElegibilidadMensajeComercial({
      fechaNacimiento: entrada.fechaNacimiento,
      hoy: entrada.hoy,
      destinatario: entrada.destinatario,
    });
    if (!menor.aceptada) return { permitida: false, motivo: 'menor_de_edad' };
  }
  if (entrada.estadoContacto === 'revocada') return { permitida: false, motivo: 'revocada' };
  if (entrada.estadoContacto === 'negada') return { permitida: false, motivo: 'negada' };
  if (entrada.estadoContacto !== 'otorgada') return { permitida: false, motivo: 'sin_autorizacion' };
  return { permitida: true, motivo: 'otorgada' };
}

export function armarEvidencia(entrada: {
  autorizacion_id: string;
  finalidad: string;
  texto_exacto: string;
  hash: string;
  instante: Date;
  medio: string;
  estado: EstadoAutorizacion;
  otorgada: boolean;
  firma_id: string | null;
}): EvidenciaAutorizacion {
  return {
    autorizacion_id: entrada.autorizacion_id,
    finalidad: entrada.finalidad,
    texto_exacto: entrada.texto_exacto,
    hash: entrada.hash,
    hora_utc: entrada.instante.toISOString(),
    hora_bogota: presentarBogota(entrada.instante),
    medio: entrada.medio,
    estado: entrada.estado,
    otorgada: entrada.otorgada,
    rotulo: ROTULO_BORRADOR,
    firma_id: entrada.firma_id,
  };
}
