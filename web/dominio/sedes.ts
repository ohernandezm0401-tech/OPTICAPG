// ADM-01 (T16) — Tipo de establecimiento, certificado y módulos por sede.
// El enum persistido es el de T03 (`tipo`). El prompt de T16 nombra
// «laboratorio»; la spec §10.3 y AC-ADM-01-4 dicen `laboratorio_oftalmico`.
// No se añade un valor `laboratorio` para no duplicar el catálogo.
// TODO(Q-01): sede vencida = banner y alerta, sin bloquear la atención clínica.
// TODO(Q-19): director científico y responsable de tecnovigilancia obligatorios;
// sin ellos hay alerta de sede incompleta y no se bloquea la atención.
// TODO(Q-20): código REPS = campo libre, sin catálogo ni valor por defecto.

import { desplazarDias, fechaCivilEnZona, parsearFechaIso } from './fechas';

export const TIPOS_ESTABLECIMIENTO = [
  'optica_con_consultorio',
  'optica_sin_consultorio',
  'profesional_independiente',
  'ips',
  'taller_optico',
  'laboratorio_oftalmico',
  'laboratorio_lc_protesis',
] as const;

export type TipoEstablecimiento = (typeof TIPOS_ESTABLECIMIENTO)[number];

export const ETIQUETAS_ESTABLECIMIENTO: Record<TipoEstablecimiento, string> = {
  optica_con_consultorio: 'Óptica con consultorio',
  optica_sin_consultorio: 'Óptica sin consultorio',
  profesional_independiente: 'Profesional independiente',
  ips: 'IPS',
  taller_optico: 'Taller óptico',
  laboratorio_oftalmico: 'Laboratorio oftálmico',
  laboratorio_lc_protesis: 'Laboratorio de lentes de contacto y prótesis',
};

export const TIPOS_CERTIFICADO = ['dispensacion', 'adecuacion', 'produccion'] as const;
export type TipoCertificado = (typeof TIPOS_CERTIFICADO)[number];

export const ETIQUETAS_CERTIFICADO: Record<TipoCertificado, string> = {
  dispensacion: 'certificado de dispensación',
  adecuacion: 'certificado de adecuación',
  produccion: 'certificado de producción',
};

export const ZONA_PRESENTACION = 'America/Bogota';

/** Tope del D. 1030/2007 art. 7 par. 2 (citado por la spec). No es una cifra inventada. */
export const TOPE_ESTABLECIMIENTOS_DIRECTOR = 3;

export const MODULOS_SEDE = [
  'hc',
  'prescripcion_propia',
  'pos_publico',
  'dispensacion_externa',
  'taller',
  'inventario',
  'compras',
  'produccion',
  'pedidos_opticas',
  'trazabilidad',
] as const;

export type ModuloSede = (typeof MODULOS_SEDE)[number];

export const ETIQUETAS_MODULO: Record<ModuloSede, string> = {
  hc: 'Historia clínica propia',
  prescripcion_propia: 'Prescripción propia',
  pos_publico: 'POS al público',
  dispensacion_externa: 'Dispensación con prescripción externa',
  taller: 'Taller',
  inventario: 'Inventario',
  compras: 'Compras',
  produccion: 'Producción',
  pedidos_opticas: 'Pedidos de ópticas',
  trazabilidad: 'Trazabilidad',
};

export type EstadoCertificado = 'vigente' | 'por_vencer' | 'vencido';
export type UmbralAlerta = 90 | 60 | 30;

export interface AlertaVencimiento {
  estado: EstadoCertificado;
  umbral: UmbralAlerta | null;
  roja: boolean;
  dias: number;
  /** TODO(Q-01): siempre falso. El vencimiento no bloquea la atención clínica. */
  bloqueaAtencionClinica: false;
}

export interface CertificadoSede {
  tipo: TipoCertificado;
  numero: string;
  vence: string;
  entidad?: string | null;
  expedido?: string | null;
}

export interface PerfilSede {
  tipo_establecimiento: TipoEstablecimiento;
  reps_codigo?: string | null;
  director_cientifico_id?: string | null;
  responsable_tecnovigilancia_id?: string | null;
  certificado?: CertificadoSede | null;
}

export function esTipoEstablecimiento(valor: string): valor is TipoEstablecimiento {
  return (TIPOS_ESTABLECIMIENTO as readonly string[]).includes(valor);
}

export function diasEntre(desde: string, hasta: string): number {
  const a = parsearFechaIso(desde);
  const b = parsearFechaIso(hasta);
  const ua = Date.UTC(a.anio, a.mes - 1, a.dia);
  const ub = Date.UTC(b.anio, b.mes - 1, b.dia);
  return Math.round((ub - ua) / 86_400_000);
}

export function presentarFechaCivil(fecha: string): string {
  const { anio, mes, dia } = parsearFechaIso(fecha);
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_PRESENTACION,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(anio, mes - 1, dia, 17, 0, 0)));
}

/** Certificado que la spec asocia al tipo. Los demás tipos no tienen uno fijado aquí. */
export function certificadoExigido(tipo: TipoEstablecimiento): TipoCertificado | null {
  switch (tipo) {
    case 'optica_sin_consultorio':
      return 'dispensacion';
    case 'taller_optico':
      return 'adecuacion';
    case 'laboratorio_oftalmico':
    case 'laboratorio_lc_protesis':
      return 'produccion';
    default:
      return null;
  }
}

export function requiereRepsParaHc(tipo: TipoEstablecimiento): boolean {
  return tipo === 'optica_con_consultorio' || tipo === 'ips' || tipo === 'profesional_independiente';
}

export function ofrecePosPublico(tipo: TipoEstablecimiento): boolean {
  return tipo !== 'taller_optico' && tipo !== 'laboratorio_oftalmico' && tipo !== 'laboratorio_lc_protesis';
}

export function modulosDeSede(tipo: TipoEstablecimiento, repsCodigo: string | null | undefined): {
  habilitados: ModuloSede[];
  bloqueados: ModuloSede[];
} {
  const reps = Boolean(repsCodigo?.trim());
  let habilitados: ModuloSede[];
  switch (tipo) {
    case 'optica_con_consultorio':
      habilitados = ['pos_publico', 'dispensacion_externa', 'taller', 'inventario', 'compras'];
      if (reps) habilitados = ['hc', 'prescripcion_propia', ...habilitados];
      break;
    case 'optica_sin_consultorio':
      habilitados = ['pos_publico', 'dispensacion_externa', 'taller', 'inventario'];
      break;
    case 'profesional_independiente':
    case 'ips':
      habilitados = ['pos_publico'];
      if (reps) habilitados = ['hc', 'prescripcion_propia', ...habilitados];
      break;
    case 'taller_optico':
      habilitados = ['taller', 'inventario', 'compras'];
      break;
    case 'laboratorio_oftalmico':
    case 'laboratorio_lc_protesis':
      habilitados = ['produccion', 'pedidos_opticas', 'trazabilidad'];
      break;
    default: {
      const _agotado: never = tipo;
      return _agotado;
    }
  }
  const bloqueados = MODULOS_SEDE.filter((modulo) => !habilitados.includes(modulo));
  return { habilitados, bloqueados };
}

export function faltantesDeSede(perfil: PerfilSede): string[] {
  const faltantes: string[] = [];
  const exigido = certificadoExigido(perfil.tipo_establecimiento);
  const cert = perfil.certificado;
  if (exigido && (!cert || cert.tipo !== exigido || !cert.numero.trim() || !cert.vence)) {
    faltantes.push(ETIQUETAS_CERTIFICADO[exigido]);
  }
  if (!perfil.director_cientifico_id) faltantes.push('director científico');
  // TODO(Q-19): el responsable de tecnovigilancia es obligatorio en el perfil.
  if (!perfil.responsable_tecnovigilancia_id) faltantes.push('responsable de tecnovigilancia');
  if (requiereRepsParaHc(perfil.tipo_establecimiento) && !perfil.reps_codigo?.trim()) {
    faltantes.push('código REPS');
  }
  return faltantes;
}

export function completitudDeSede(perfil: PerfilSede): 'completa' | 'incompleta' {
  return faltantesDeSede(perfil).length === 0 ? 'completa' : 'incompleta';
}

export function evaluarVencimiento(vence: string, ahora: Date, zona = ZONA_PRESENTACION): AlertaVencimiento {
  const hoy = fechaCivilEnZona(ahora, zona);
  const dias = diasEntre(hoy, vence);
  const base = { dias, bloqueaAtencionClinica: false as const };
  if (dias < 0) return { ...base, estado: 'vencido', umbral: null, roja: true };
  if (dias <= 30) return { ...base, estado: 'por_vencer', umbral: 30, roja: false };
  if (dias <= 60) return { ...base, estado: 'por_vencer', umbral: 60, roja: false };
  if (dias <= 90) return { ...base, estado: 'por_vencer', umbral: 90, roja: false };
  return { ...base, estado: 'vigente', umbral: null, roja: false };
}

export function fechaDentroDe(ahora: Date, dias: number, zona = ZONA_PRESENTACION): string {
  return desplazarDias(fechaCivilEnZona(ahora, zona), dias);
}

export function evaluarTopeDirector(establecimientosYaAsignados: number): { bloquea: boolean; mensaje: string } {
  if (!Number.isInteger(establecimientosYaAsignados) || establecimientosYaAsignados < 0) {
    throw new Error('el conteo de establecimientos debe ser un entero no negativo');
  }
  if (establecimientosYaAsignados >= TOPE_ESTABLECIMIENTOS_DIRECTOR) {
    return {
      bloquea: true,
      mensaje: `Este director científico ya figura en ${TOPE_ESTABLECIMIENTOS_DIRECTOR} establecimientos. Asignar otro exige la autorización del administrador.`,
    };
  }
  return { bloquea: false, mensaje: '' };
}

export interface VistaSede {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string | null;
  tipo_establecimiento: TipoEstablecimiento;
  reps_codigo: string | null;
  director_cientifico_id: string | null;
  responsable_tecnovigilancia_id: string | null;
  certificado_numero: string | null;
  certificado_vence: string | null;
  certificado_tipo: TipoCertificado | null;
  completitud: 'completa' | 'incompleta';
  faltantes: string[];
  alerta: AlertaVencimiento | null;
  ofrece_pos_publico: boolean;
  modulos_habilitados: ModuloSede[];
  modulos_bloqueados: ModuloSede[];
  bloquea_atencion_clinica: false;
}

export function armarVistaSede(
  fila: {
    id: string;
    nombre: string;
    ciudad: string;
    direccion: string | null;
    tipo_establecimiento: TipoEstablecimiento;
    reps_codigo: string | null;
    director_cientifico_id: string | null;
    responsable_tecnovigilancia_id: string | null;
    certificado: CertificadoSede | null;
  },
  ahora: Date,
): VistaSede {
  const perfil: PerfilSede = {
    tipo_establecimiento: fila.tipo_establecimiento,
    reps_codigo: fila.reps_codigo,
    director_cientifico_id: fila.director_cientifico_id,
    responsable_tecnovigilancia_id: fila.responsable_tecnovigilancia_id,
    certificado: fila.certificado,
  };
  const modulos = modulosDeSede(fila.tipo_establecimiento, fila.reps_codigo);
  const alerta = fila.certificado?.vence ? evaluarVencimiento(fila.certificado.vence, ahora) : null;
  return {
    id: fila.id,
    nombre: fila.nombre,
    ciudad: fila.ciudad,
    direccion: fila.direccion,
    tipo_establecimiento: fila.tipo_establecimiento,
    reps_codigo: fila.reps_codigo,
    director_cientifico_id: fila.director_cientifico_id,
    responsable_tecnovigilancia_id: fila.responsable_tecnovigilancia_id,
    certificado_numero: fila.certificado?.numero ?? null,
    certificado_vence: fila.certificado?.vence ?? null,
    certificado_tipo: fila.certificado?.tipo ?? null,
    completitud: completitudDeSede(perfil),
    faltantes: faltantesDeSede(perfil),
    alerta,
    ofrece_pos_publico: ofrecePosPublico(fila.tipo_establecimiento),
    modulos_habilitados: modulos.habilitados,
    modulos_bloqueados: modulos.bloqueados,
    bloquea_atencion_clinica: false,
  };
}
