// SEG-07 (T26) — Habeas Data y PQR del titular.
// Plazos tomados de la ficha SEG-07 (Ley 1581 arts. 14-15 y 18 lit. d).
// El calendario es el de T06: sábado, domingo y festivos cargados.
// TODO(Q-32): si el tenant no cargó festivos, solo se excluyen sábado y domingo.
// TODO(Q-17): el sistema registra la solicitud y no resuelve la tensión entre
// la historia clínica y la negativa de autorización.
// TODO(Q-07): la causa de bloqueo de supresión clínica no fija años de retención.
// SEG-09 puede sustituir {estado_retencion} por el estado de archivo.
// BORRADOR – requiere revisión jurídica.
import { esDiaHabil, sumarDiasHabiles } from './calendario-habil';
import { desplazarDias, fechaCivilEnZona, parsearFechaIso } from './fechas';

export const ZONA_HABEAS = 'America/Bogota';

export const PLAZO_CONSULTA_DIAS_HABILES = 10;
export const PLAZO_RECLAMO_DIAS_HABILES = 15;
export const PLAZO_PRORROGA_RECLAMO_DIAS_HABILES = 8;
export const PLAZO_MARCA_RECLAMO_HORAS_HABILES = 48;
export const PLAZO_ACTUALIZACION_ENCARGADO_DIAS_HABILES = 5;

export const FUENTE_PLAZO_CONSULTA = 'Ley 1581 de 2012 art. 14 (spec SEG-07)';
export const FUENTE_PLAZO_RECLAMO = 'Ley 1581 de 2012 arts. 14-15 (spec SEG-07)';
export const FUENTE_PLAZO_PRORROGA = 'Ley 1581 de 2012 art. 15 (spec SEG-07)';
export const FUENTE_PLAZO_MARCA =
  'Ley 1581 de 2012 art. 15 num. 2: 2 días hábiles (spec SEG-07; AC-SEG-07-2: 48 h hábiles)';
export const FUENTE_PLAZO_ENCARGADO = 'Ley 1581 de 2012 art. 18 lit. d (spec SEG-07)';

export const AVISO_SIN_FESTIVOS =
  'No hay festivos cargados para este tenant. El cálculo del plazo excluye solo sábados y domingos. TODO(Q-32): los festivos los aporta un humano; no hay lista por defecto.';

export const LEYENDA_RECLAMO_EN_TRAMITE = 'reclamo en trámite';

export const CAUSA_BLOQUEO_SUPRESION_CLINICA =
  'BORRADOR – requiere revisión jurídica. La supresión de datos clínicos no se ejecuta: la historia clínica permanece bajo retención documental del responsable. Estado de retención: {estado_retencion}. Este texto no fija un número de años. TODO(Q-07). La purga no está implementada.';

export const ROTULO_BORRADOR_JURIDICO = 'BORRADOR – requiere revisión jurídica';

export const TIPOS_SOLICITUD = ['consulta', 'reclamo', 'rectificacion', 'supresion', 'revocatoria'] as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

export const ESTADOS_SOLICITUD = ['radicada', 'en_tramite', 'respondida', 'prorrogada', 'cerrada'] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

export const CANALES_SOLICITUD = ['presencial', 'escrito', 'electronico'] as const;
export type CanalSolicitud = (typeof CANALES_SOLICITUD)[number];

export const AMBITOS_DATO = ['clinico', 'demografico'] as const;
export type AmbitoDato = (typeof AMBITOS_DATO)[number];

export const CAMPOS_DEMOGRAFICOS = [
  'nombres',
  'apellidos',
  'direccion',
  'telefono',
  'email',
  'ocupacion',
  'estado_civil',
  'sexo',
  'acompanante',
  'responsable',
  'aseguradora',
] as const;
export type CampoDemografico = (typeof CAMPOS_DEMOGRAFICOS)[number];

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

const MS_HORA = 3_600_000;

export function esTipoSolicitud(valor: string): valor is TipoSolicitud {
  return (TIPOS_SOLICITUD as readonly string[]).includes(valor);
}

export function esCampoDemografico(valor: string): valor is CampoDemografico {
  return (CAMPOS_DEMOGRAFICOS as readonly string[]).includes(valor);
}

export function avisoFestivos(festivosCargados: boolean): string | null {
  return festivosCargados ? null : AVISO_SIN_FESTIVOS;
}

/**
 * Consulta (art. 14) usa 10 días hábiles. Reclamo, rectificación, supresión
 * y revocatoria siguen el procedimiento del art. 15 (15 días hábiles).
 */
export function plazoDiasDeTipo(tipo: TipoSolicitud, consultaDias: number, reclamoDias: number): number {
  if (!Number.isInteger(consultaDias) || consultaDias <= 0) {
    throw new Error('el plazo de consulta debe ser un entero positivo');
  }
  if (!Number.isInteger(reclamoDias) || reclamoDias <= 0) {
    throw new Error('el plazo de reclamo debe ser un entero positivo');
  }
  return tipo === 'consulta' ? consultaDias : reclamoDias;
}

export function calcularVenceEn(radicadaEn: Date, diasHabiles: number, festivos: ReadonlySet<string>, zona = ZONA_HABEAS): string {
  const inicio = fechaCivilEnZona(radicadaEn, zona);
  return sumarDiasHabiles(inicio, diasHabiles, festivos);
}

export function causaSupresionVisible(configurada: string | null | undefined): string {
  const texto = (configurada ?? '').trim();
  const base = texto.length > 0 ? texto : CAUSA_BLOQUEO_SUPRESION_CLINICA;
  if (base.includes(ROTULO_BORRADOR_JURIDICO)) return base;
  return `${ROTULO_BORRADOR_JURIDICO}. ${base}`;
}

/**
 * La causa configurable puede incluir `{estado_retencion}`.
 * Si no trae el hueco, se anexa el estado para que T26 siga citándolo.
 */
export function causaSupresionConEstado(configurada: string | null | undefined, estado: string | null): string {
  const visible = causaSupresionVisible(configurada);
  const nombre = estado && estado.trim() !== '' ? estado.trim() : 'sin_paciente';
  if (visible.includes('{estado_retencion}')) return visible.replaceAll('{estado_retencion}', nombre);
  return `${visible} Estado de retención: ${nombre}.`;
}

/** Sin ámbito explícito se trata como clínico: la supresión queda bloqueada. */
export function supresionClinicaBloqueada(ambito: AmbitoDato | null): boolean {
  return ambito !== 'demografico';
}

function partesZona(instante: Date, zona: string) {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const mapa: Record<string, string> = {};
  for (const parte of formato.formatToParts(instante)) {
    if (parte.type !== 'literal') mapa[parte.type] = parte.value;
  }
  return {
    anio: Number(mapa.year),
    mes: Number(mapa.month),
    dia: Number(mapa.day),
    hora: Number(mapa.hour),
    minuto: Number(mapa.minute),
    segundo: Number(mapa.second),
  };
}

/** 00:00:00 del día civil en la zona, como instante UTC. */
export function inicioDiaCivilEnZona(fecha: string, zona = ZONA_HABEAS): Date {
  const { anio, mes, dia } = parsearFechaIso(fecha);
  let guess = Date.UTC(anio, mes - 1, dia, 5, 0, 0);
  for (let i = 0; i < 4; i += 1) {
    const partes = partesZona(new Date(guess), zona);
    const actual = Date.UTC(partes.anio, partes.mes - 1, partes.dia, partes.hora, partes.minuto, partes.segundo);
    const deseado = Date.UTC(anio, mes - 1, dia, 0, 0, 0);
    const delta = deseado - actual;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}

export function milisegundosHabiles(
  desde: Date,
  hasta: Date,
  festivos: ReadonlySet<string>,
  zona = ZONA_HABEAS,
): number {
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime())) {
    throw new Error('el instante no es una fecha válida');
  }
  if (hasta.getTime() <= desde.getTime()) return 0;
  let total = 0;
  let cursor = desde.getTime();
  const fin = hasta.getTime();
  let guardia = 0;
  while (cursor < fin) {
    const fecha = fechaCivilEnZona(new Date(cursor), zona);
    const siguiente = inicioDiaCivilEnZona(desplazarDias(fecha, 1), zona).getTime();
    if (siguiente <= cursor) throw new Error('no se pudo avanzar el día civil');
    const tramo = Math.min(siguiente, fin) - cursor;
    if (esDiaHabil(fecha, festivos)) total += tramo;
    cursor = Math.min(siguiente, fin);
    guardia += 1;
    if (guardia > 4000) throw new Error('el intervalo de horas hábiles es demasiado largo');
  }
  return total;
}

export function instanteTrasHorasHabiles(
  desde: Date,
  horas: number,
  festivos: ReadonlySet<string>,
  zona = ZONA_HABEAS,
): Date {
  if (!Number.isInteger(horas) || horas < 0) {
    throw new Error('las horas hábiles deben ser un entero mayor o igual a cero');
  }
  if (horas === 0) return new Date(desde.getTime());
  let faltan = horas * MS_HORA;
  let cursor = desde.getTime();
  let guardia = 0;
  while (faltan > 0) {
    const fecha = fechaCivilEnZona(new Date(cursor), zona);
    const siguiente = inicioDiaCivilEnZona(desplazarDias(fecha, 1), zona).getTime();
    const disponible = siguiente - cursor;
    if (disponible <= 0) throw new Error('no se pudo avanzar el día civil');
    if (esDiaHabil(fecha, festivos)) {
      if (disponible >= faltan) return new Date(cursor + faltan);
      faltan -= disponible;
    }
    cursor = siguiente;
    guardia += 1;
    if (guardia > 4000) throw new Error('no se pudo calcular el límite de horas hábiles');
  }
  return new Date(cursor);
}

export function horasHabilesCumplidas(
  desde: Date,
  hasta: Date,
  horas: number,
  festivos: ReadonlySet<string>,
  zona = ZONA_HABEAS,
): boolean {
  if (!Number.isInteger(horas) || horas < 0) {
    throw new Error('las horas hábiles deben ser un entero mayor o igual a cero');
  }
  return milisegundosHabiles(desde, hasta, festivos, zona) >= horas * MS_HORA;
}

export interface RelojSolicitud {
  tipo: TipoSolicitud;
  estado: EstadoSolicitud;
  radicadaEn: Date;
  venceEn: string;
  prorrogaHasta: string | null;
  marcada: boolean;
  respondidaEn: Date | null;
  ahora: Date;
  festivos: ReadonlySet<string>;
  horasMarca: number;
  zona?: string;
}

export function limiteVigente(reloj: Pick<RelojSolicitud, 'venceEn' | 'prorrogaHasta'>): string {
  return reloj.prorrogaHasta ?? reloj.venceEn;
}

export function plazoVencido(reloj: RelojSolicitud): boolean {
  const hoy = fechaCivilEnZona(reloj.ahora, reloj.zona ?? ZONA_HABEAS);
  return hoy > limiteVigente(reloj);
}

export function alertaMarcaSinTramite(reloj: RelojSolicitud): boolean {
  if (reloj.tipo !== 'reclamo' || reloj.marcada) return false;
  if (reloj.estado === 'respondida' || reloj.estado === 'cerrada' || reloj.estado === 'prorrogada') return false;
  return horasHabilesCumplidas(
    reloj.radicadaEn,
    reloj.ahora,
    reloj.horasMarca,
    reloj.festivos,
    reloj.zona ?? ZONA_HABEAS,
  );
}

export function semaforoDe(reloj: RelojSolicitud): Semaforo {
  if (reloj.estado === 'respondida' || reloj.estado === 'cerrada') {
    if (reloj.respondidaEn) {
      const dia = fechaCivilEnZona(reloj.respondidaEn, reloj.zona ?? ZONA_HABEAS);
      if (dia > limiteVigente(reloj)) return 'rojo';
    }
    return 'verde';
  }
  if (plazoVencido(reloj)) return 'rojo';
  if (alertaMarcaSinTramite(reloj)) return 'amarillo';
  return 'verde';
}

export function etiquetaSemaforo(semaforo: Semaforo): string {
  if (semaforo === 'rojo') return 'Vencido';
  if (semaforo === 'amarillo') return 'Alerta de plazo';
  return 'En plazo';
}

/** Días hábiles estrictamente posteriores a `hoy` y hasta `vence` inclusive. Negativo si ya venció. */
export function diasHabilesRestantes(hoy: string, vence: string, festivos: ReadonlySet<string>): number {
  parsearFechaIso(hoy);
  parsearFechaIso(vence);
  if (hoy === vence) return 0;
  if (hoy < vence) return contarHabilesEntre(hoy, vence, festivos);
  return -contarHabilesEntre(vence, hoy, festivos);
}

function contarHabilesEntre(desdeExclusivo: string, hastaInclusivo: string, festivos: ReadonlySet<string>): number {
  let total = 0;
  let cursor = desdeExclusivo;
  let guardia = 0;
  while (cursor < hastaInclusivo) {
    cursor = desplazarDias(cursor, 1);
    if (esDiaHabil(cursor, festivos)) total += 1;
    guardia += 1;
    if (guardia > 20000) throw new Error('no se pudo contar los días hábiles');
  }
  return total;
}

export function formatearRadicado(anio: number, consecutivo: number): string {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 9999) throw new Error('el año del radicado no es válido');
  if (!Number.isInteger(consecutivo) || consecutivo < 1) throw new Error('el consecutivo del radicado no es válido');
  return `HD-${anio}-${String(consecutivo).padStart(6, '0')}`;
}
