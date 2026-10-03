// SEG-09 (T27) — Retención de la historia clínica y estados de archivo.
// Plazos tomados de la ficha SEG-09. No se inventan otros.
// 15 años (Res. 839/2017 art. 3, ✅) y el reparto 5 gestión + 10 central (✅).
// Facturas (art. 632 ET) y logs quedan sin cantidad: TODO(Q-07).
// La disposición final (purga, SEG-10) no se implementa.
// BORRADOR – requiere revisión jurídica en los textos que ve el titular.

import { parsearFechaIso } from './fechas';

export const ANIOS_GESTION_VERIFICADOS = 5;
export const ANIOS_CONSERVACION_VERIFICADOS = 15;
export const ANIOS_ARCHIVO_CENTRAL_VERIFICADOS =
  ANIOS_CONSERVACION_VERIFICADOS - ANIOS_GESTION_VERIFICADOS;

export const FUENTE_CONSERVACION_HC =
  'Res. 839/2017 art. 3 (modifica Res. 1995 art. 15); spec SEG-09 ✅';
export const FUENTE_ARCHIVO_GESTION =
  'spec SEG-09: retención mínima 15 años (5 gestión + 10 central) ✅; Res. 839/2017 art. 3';
export const FUENTE_ARCHIVO_CENTRAL =
  'spec SEG-09: 10 años de archivo central (15 - 5) ✅; Res. 839/2017 art. 3';
export const FUENTE_ANEXO_HC =
  'anexo de la historia clínica; misma retención mínima de la spec SEG-09 ✅';
export const FUENTE_FACTURA_PROVISIONAL =
  'art. 632 ET ⚠️ NO VERIFICADO. TODO(Q-07). Sin valor por defecto; no es una obligación legal.';
export const FUENTE_LOG_PROVISIONAL =
  'plazo de logs ⚠️ NO VERIFICADO. TODO(Q-07). Sin valor por defecto; no es una obligación legal.';

export const DECLARACION_CONTRATANTE_NO_PRESTADOR =
  'BORRADOR – requiere revisión jurídica. Esta política aplica también si la óptica contrata profesionales de la salud sin ser prestadora (Res. 839/2017 art. 12; Res. 1995 art. 13; spec SEG-09, E-04). El módulo no se desactiva por tipo de sede.';

export const NOTA_PURGA_NO_IMPLEMENTADA =
  'La disposición final (purga) no está implementada. El estado disposicion_final_pendiente solo registra que el plazo mínimo ya corrió. El borrado sigue bloqueado hasta SEG-10.';

export const ESTADOS_ARCHIVO = [
  'activo',
  'archivo_gestion',
  'archivo_central',
  'disposicion_final_pendiente',
] as const;
export type EstadoArchivo = (typeof ESTADOS_ARCHIVO)[number];

export const TIPOS_MARCA_RETENCION = ['duplicada', 'permanente'] as const;
export type TipoMarcaRetencion = (typeof TIPOS_MARCA_RETENCION)[number];

export const TIPOS_DOCUMENTO_RETENCION = [
  'historia_clinica',
  'archivo_gestion',
  'archivo_central',
  'prescripcion',
  'consentimiento',
  'factura_electronica',
  'log_auditoria',
] as const;
export type TipoDocumentoRetencion = (typeof TIPOS_DOCUMENTO_RETENCION)[number];

export const TABLAS_CLINICAS_SIN_BORRADO = [
  'pacientes',
  'atenciones',
  'examenes_optometricos',
  'diagnosticos',
  'planes_manejo',
  'adendas',
  'atencion_adendas',
  'consentimientos',
  'prescripciones',
  'autorizaciones',
  'firmas',
  'entregas_hc',
] as const;

export type FilaPoliticaRetencion = {
  tipo_documento: TipoDocumentoRetencion;
  anios: number | null;
  base_normativa: string;
  verificado: boolean;
};

export const POLITICA_RETENCION_INICIAL: readonly FilaPoliticaRetencion[] = [
  {
    tipo_documento: 'historia_clinica',
    anios: ANIOS_CONSERVACION_VERIFICADOS,
    base_normativa: FUENTE_CONSERVACION_HC,
    verificado: true,
  },
  {
    tipo_documento: 'archivo_gestion',
    anios: ANIOS_GESTION_VERIFICADOS,
    base_normativa: FUENTE_ARCHIVO_GESTION,
    verificado: true,
  },
  {
    tipo_documento: 'archivo_central',
    anios: ANIOS_ARCHIVO_CENTRAL_VERIFICADOS,
    base_normativa: FUENTE_ARCHIVO_CENTRAL,
    verificado: true,
  },
  {
    tipo_documento: 'prescripcion',
    anios: ANIOS_CONSERVACION_VERIFICADOS,
    base_normativa: FUENTE_ANEXO_HC,
    verificado: true,
  },
  {
    tipo_documento: 'consentimiento',
    anios: ANIOS_CONSERVACION_VERIFICADOS,
    base_normativa: FUENTE_ANEXO_HC,
    verificado: true,
  },
  {
    tipo_documento: 'factura_electronica',
    anios: null,
    base_normativa: FUENTE_FACTURA_PROVISIONAL,
    verificado: false,
  },
  {
    tipo_documento: 'log_auditoria',
    anios: null,
    base_normativa: FUENTE_LOG_PROVISIONAL,
    verificado: false,
  },
];

export type PlazosRetencion = {
  gestion: number;
  conservacion: number;
};

export function sumarAnios(fecha: string, anios: number): string {
  if (!Number.isInteger(anios)) {
    throw new Error('los años de retención deben ser un entero');
  }
  const { anio, mes, dia } = parsearFechaIso(fecha);
  const anioR = anio + anios;
  const ultimo = new Date(Date.UTC(anioR, mes, 0)).getUTCDate();
  const diaR = Math.min(dia, ultimo);
  const mesR = String(mes).padStart(2, '0');
  return `${anioR}-${mesR}-${String(diaR).padStart(2, '0')}`;
}

export function sumarMeses(fecha: string, meses: number): string {
  if (!Number.isInteger(meses)) {
    throw new Error('los meses deben ser un entero');
  }
  const { anio, mes, dia } = parsearFechaIso(fecha);
  const indice = mes - 1 + meses;
  const anioR = anio + Math.floor(indice / 12);
  const mes0 = ((indice % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(anioR, mes0 + 1, 0)).getUTCDate();
  const diaR = Math.min(dia, ultimo);
  return `${anioR}-${String(mes0 + 1).padStart(2, '0')}-${String(diaR).padStart(2, '0')}`;
}

/** El mínimo verificado no baja. Un parámetro mayor sí alza el plazo (spec SEG-09). */
export function normalizarPlazos(gestion: number, conservacion: number): PlazosRetencion {
  const base =
    Number.isInteger(conservacion) && conservacion >= ANIOS_CONSERVACION_VERIFICADOS
      ? conservacion
      : ANIOS_CONSERVACION_VERIFICADOS;
  const archivo =
    Number.isInteger(gestion) && gestion > 0 && gestion < base ? gestion : ANIOS_GESTION_VERIFICADOS;
  return { gestion: archivo, conservacion: base };
}

export function aniosConservacionEfectivos(
  conservacion: number,
  marcas: readonly TipoMarcaRetencion[],
): number | null {
  if (marcas.includes('permanente')) return null;
  if (marcas.includes('duplicada')) return conservacion * 2;
  return conservacion;
}

export type EntradaEstadoArchivo = {
  fechaUltimaAtencion: string | null;
  hoy: string;
  gestion: number;
  conservacion: number;
  marcas?: readonly TipoMarcaRetencion[];
};

export type ResultadoEstadoArchivo = {
  estado: EstadoArchivo;
  elegible: boolean;
  anios_efectivos: number | null;
  purga_permitida: false;
};

function noPosterior(hoy: string, limite: string): boolean {
  return hoy <= limite;
}

export function calcularEstadoArchivo(entrada: EntradaEstadoArchivo): ResultadoEstadoArchivo {
  const plazos = normalizarPlazos(entrada.gestion, entrada.conservacion);
  const marcas = entrada.marcas ?? [];
  const efectivos = aniosConservacionEfectivos(plazos.conservacion, marcas);
  if (entrada.fechaUltimaAtencion == null) {
    return { estado: 'activo', elegible: false, anios_efectivos: efectivos, purga_permitida: false };
  }
  parsearFechaIso(entrada.hoy);
  const ultima = entrada.fechaUltimaAtencion;
  const finGestion = sumarAnios(ultima, plazos.gestion);
  if (noPosterior(entrada.hoy, finGestion)) {
    return {
      estado: 'archivo_gestion',
      elegible: false,
      anios_efectivos: efectivos,
      purga_permitida: false,
    };
  }
  if (efectivos == null || noPosterior(entrada.hoy, sumarAnios(ultima, efectivos))) {
    return {
      estado: 'archivo_central',
      elegible: false,
      anios_efectivos: efectivos,
      purga_permitida: false,
    };
  }
  return {
    estado: 'disposicion_final_pendiente',
    elegible: true,
    anios_efectivos: efectivos,
    purga_permitida: false,
  };
}

export function fechaUltimaTrasFolio(anterior: string | null, folioCivil: string): string {
  parsearFechaIso(folioCivil);
  if (anterior == null || anterior === '') return folioCivil;
  parsearFechaIso(anterior);
  return anterior > folioCivil ? anterior : folioCivil;
}

export function marcaVerificacionPantalla(verificado: boolean): string {
  return verificado ? '✅ verificado' : '⚠️ provisional';
}

export function textoPlazoPantalla(fila: FilaPoliticaRetencion): string {
  const marca = marcaVerificacionPantalla(fila.verificado);
  const cantidad = fila.anios == null ? 'sin plazo por defecto' : `${fila.anios} años`;
  const aviso = fila.verificado ? '' : ' TODO(Q-07).';
  return `${fila.tipo_documento}: ${cantidad}. ${marca}.${aviso} ${fila.base_normativa}`;
}

export function puedePurgarHistoria(): false {
  return false;
}

export function mensajeBloqueoEliminacion(estado: EstadoArchivo): string {
  if (estado === 'disposicion_final_pendiente') {
    return 'La disposición final está pendiente y la purga no está implementada. DELETE prohibido.';
  }
  return `No se puede eliminar la historia clínica: la retención sigue vigente (estado ${estado}). DELETE prohibido.`;
}
