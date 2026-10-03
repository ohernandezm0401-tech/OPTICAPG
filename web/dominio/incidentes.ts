// SEG-11 (T29) — Plazo de reporte a la SIC y borradores de aviso.
// El calendario es el de T06 (`sumarDiasHabiles`): sábado, domingo y festivos
// que un humano haya cargado. TODO(Q-32): sin festivos, solo sábado y domingo.
// Los 15 días hábiles están en la ficha SEG-11 (Circular Única ✅). El aviso
// contractual a la óptica no tiene plazo: TODO(Q-07), sin valor por defecto.
// BORRADOR – requiere revisión jurídica. El sistema no envía nada a la SIC.
import { esDiaHabil, sumarDiasHabiles } from './calendario-habil';
import { desplazarDias, fechaCivilEnZona, parsearFechaIso } from './fechas';

export const ZONA_INCIDENTE = 'America/Bogota';

/** Días hábiles del reporte a la SIC. Fuente en `FUENTE_PLAZO_SIC`. */
export const PLAZO_SIC_DIAS_HABILES = 15;
export const FUENTE_PLAZO_SIC =
  'Circular Única SIC Título V 2.1.f(ii), versión Res. SIC 56579/2025 (spec SEG-11)';
export const ROTULO_PLAZO_SIC = 'verificado';

/** AC-SEG-11-1: alertas a T-5, T-2 y T-0, en días hábiles antes del límite. */
export const ALERTAS_SIC = [
  { codigo: 'T-5', dias_habiles_antes: 5 },
  { codigo: 'T-2', dias_habiles_antes: 2 },
  { codigo: 'T-0', dias_habiles_antes: 0 },
] as const;

export type CodigoAlertaSic = (typeof ALERTAS_SIC)[number]['codigo'];

export const AVISO_SIN_FESTIVOS =
  'No hay festivos cargados. El cálculo del plazo excluye solo sábados y domingos. TODO(Q-32): los festivos los aporta un humano; no hay lista por defecto.';

export const ROTULO_BORRADOR = 'BORRADOR – requiere revisión jurídica';

export const NOTA_Q07_AVISO_OPTICA =
  'TODO(Q-07): el plazo de aviso a la óptica no tiene valor por defecto. El parámetro del tenant plazo_aviso_incidente sigue vacío y rotulado provisional. No se presenta como obligación legal.';

export const REGLA_SIN_DATOS_PERSONALES =
  'No escriba datos personales de pacientes: ni nombres, ni documentos, ni correos, ni historia clínica. Describa solo categorías (por ejemplo, credenciales de acceso o metadatos de cuenta).';

export const ESTADOS_INCIDENTE = [
  'detectado',
  'contenido',
  'notificado_responsable',
  'reportado_sic',
  'cerrado',
] as const;
export type EstadoIncidente = (typeof ESTADOS_INCIDENTE)[number];

export const ROLES_OPERACION_PLATAFORMA = ['owner_plataforma', 'soporte_plataforma'] as const;

const PATRON_DATO_PERSONAL =
  /@|\d{6,}|paciente|c[eé]dula|historia cl[ií]nica|diagn[oó]stico|f[oó]rmula|\bnombres\b|\bapellidos\b/i;

const TOPE_TEXTO = 500;
const TOPE_CORTO = 80;

export class ErrorDatoIncidente extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDatoIncidente';
  }
}

export function rechazarDatoPersonal(campo: string, valor: string, tope = TOPE_TEXTO): string {
  const limpio = valor.trim();
  if (!limpio) throw new ErrorDatoIncidente(`el campo ${campo} es obligatorio`);
  if (limpio.length > tope) throw new ErrorDatoIncidente(`el campo ${campo} supera ${tope} caracteres`);
  if (PATRON_DATO_PERSONAL.test(limpio)) {
    throw new ErrorDatoIncidente(
      `el campo ${campo} no puede guardar datos personales de pacientes ni documentos, correos o números largos`,
    );
  }
  return limpio;
}

export function textoCortoIncidente(campo: string, valor: string): string {
  return rechazarDatoPersonal(campo, valor, TOPE_CORTO);
}

export interface AlertaCalculada {
  codigo: CodigoAlertaSic;
  dias_habiles_antes: number;
  fecha: string;
}

export interface PlazoIncidente {
  dia_deteccion: string;
  plazo_sic: string;
  plazo_sic_dias: number;
  fuente_plazo: string;
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  festivos_aplicados: string[];
  alertas: AlertaCalculada[];
}

function conjuntoFestivos(festivos: readonly string[]): Set<string> {
  const conjunto = new Set<string>();
  for (const fecha of festivos) {
    parsearFechaIso(fecha);
    conjunto.add(fecha);
  }
  return conjunto;
}

/** Resta `n` días hábiles. `n = 0` devuelve la misma fecha. Reutiliza `esDiaHabil` de T06. */
export function restarDiasHabiles(fecha: string, n: number, festivos: ReadonlySet<string>): string {
  parsearFechaIso(fecha);
  if (!Number.isInteger(n) || n < 0) {
    throw new ErrorDatoIncidente('n debe ser un entero mayor o igual a cero');
  }
  if (n === 0) return fecha;
  let cursor = fecha;
  let restantes = n;
  let pasos = 0;
  while (restantes > 0) {
    cursor = desplazarDias(cursor, -1);
    if (esDiaHabil(cursor, festivos)) restantes -= 1;
    pasos += 1;
    if (pasos > n * 7 + 400) throw new ErrorDatoIncidente('no se pudo retroceder el calendario hábil');
  }
  return cursor;
}

export function calcularPlazoIncidente(entrada: {
  detectado_en: Date;
  plazo_dias: number;
  festivos: readonly string[];
}): PlazoIncidente {
  if (!Number.isInteger(entrada.plazo_dias) || entrada.plazo_dias <= 0) {
    throw new ErrorDatoIncidente('el plazo de la SIC debe ser un entero positivo');
  }
  const festivos = conjuntoFestivos(entrada.festivos);
  const dia = fechaCivilEnZona(entrada.detectado_en, ZONA_INCIDENTE);
  const plazo = sumarDiasHabiles(dia, entrada.plazo_dias, festivos);
  const alertas: AlertaCalculada[] = ALERTAS_SIC.map((alerta) => ({
    codigo: alerta.codigo,
    dias_habiles_antes: alerta.dias_habiles_antes,
    fecha: restarDiasHabiles(plazo, alerta.dias_habiles_antes, festivos),
  }));
  const cargados = festivos.size > 0;
  return {
    dia_deteccion: dia,
    plazo_sic: plazo,
    plazo_sic_dias: entrada.plazo_dias,
    fuente_plazo: FUENTE_PLAZO_SIC,
    festivos_cargados: cargados,
    aviso_festivos: cargados ? null : AVISO_SIN_FESTIVOS,
    festivos_aplicados: [...festivos].sort(),
    alertas,
  };
}

/** Días hábiles desde el día siguiente a `hoy` hasta `limite`, inclusive. */
export function diasHabilesRestantes(hoy: string, limite: string, festivos: ReadonlySet<string>): number {
  parsearFechaIso(hoy);
  parsearFechaIso(limite);
  if (hoy >= limite) return 0;
  let total = 0;
  let cursor = hoy;
  while (cursor < limite) {
    cursor = desplazarDias(cursor, 1);
    if (esDiaHabil(cursor, festivos)) total += 1;
  }
  return total;
}

export function siguienteEstado(actual: EstadoIncidente): EstadoIncidente | null {
  const indice = ESTADOS_INCIDENTE.indexOf(actual);
  if (indice < 0 || indice === ESTADOS_INCIDENTE.length - 1) return null;
  return ESTADOS_INCIDENTE[indice + 1] ?? null;
}

export function exigirSiguienteEstado(actual: EstadoIncidente, destino: EstadoIncidente): void {
  const esperado = siguienteEstado(actual);
  if (destino !== esperado) {
    throw new ErrorDatoIncidente(
      esperado
        ? `desde ${actual} el siguiente estado es ${esperado}`
        : `el incidente en estado ${actual} no admite otro estado`,
    );
  }
}

export interface DatosPlantilla {
  incidente_id: string;
  dia_deteccion: string;
  plazo_sic: string;
  plazo_sic_dias: number;
  fuente_plazo: string;
  alcance: string;
  datos_afectados: string;
  severidad: string;
  razon_social?: string | null;
}

function bloqueComun(datos: DatosPlantilla): string {
  const optica = datos.razon_social?.trim() ? `Óptica: ${datos.razon_social.trim()}.` : 'Óptica: (la que marque la operación de plataforma).';
  return [
    ROTULO_BORRADOR,
    '',
    'El sistema no envía este texto a la SIC ni a terceros. Un humano lo usa fuera del sistema, después de la revisión jurídica.',
    `Referencia interna: ${datos.incidente_id}.`,
    `Día de detección (America/Bogota): ${datos.dia_deteccion}.`,
    `Fecha límite del reporte a la SIC: ${datos.plazo_sic} (${datos.plazo_sic_dias} días hábiles).`,
    `Fuente del plazo: ${datos.fuente_plazo}.`,
    optica,
    `Alcance (categorías, sin datos de pacientes): ${datos.alcance}.`,
    `Datos afectados (categorías): ${datos.datos_afectados}.`,
    `Severidad operativa: ${datos.severidad}.`,
    NOTA_Q07_AVISO_OPTICA,
  ].join('\n');
}

export function plantillaAvisoOptica(datos: DatosPlantilla): string {
  return [
    bloqueComun(datos),
    '',
    'Aviso preparado para la óptica responsable. No sustituye el texto que apruebe el abogado.',
  ].join('\n');
}

export function plantillaReporteSic(datos: DatosPlantilla): string {
  return [
    bloqueComun(datos),
    '',
    'Borrador de reporte ante la SIC. OptiSaaS no lo transmite. Quien opere la plataforma lo presenta por el canal que indique el abogado y luego registra la fecha en el sistema.',
  ].join('\n');
}

export function textoNotificacionInterna(datos: DatosPlantilla): string {
  return [
    ROTULO_BORRADOR,
    `Aviso interno: un incidente de plataforma afecta a esta óptica. Referencia ${datos.incidente_id}.`,
    `Fecha límite del reporte a la SIC: ${datos.plazo_sic}.`,
    'El texto para el abogado está en este panel. El sistema no lo envía por correo ni a la SIC.',
    REGLA_SIN_DATOS_PERSONALES,
  ].join(' ');
}
