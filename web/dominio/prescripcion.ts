// OPT-05 (T23) — Prescripción del art. 17 del Decreto 1030/2007.
// La vigencia no tiene plazo ni valor por defecto (NV-26).
// TODO(Q-18): el profesional la escribe cada vez. No se siembra en parámetros.
// ASE-07 (dispensación) todavía no existe: `esDispensable` es la puerta.
// BORRADOR – requiere revisión jurídica.
//
// El rol `oftalmologo` ya está en `ROLES_SEDE` y como alias de `optometra`
// en la matriz. No se crea un rol nuevo. La firma reutiliza
// `ROLES_FIRMA_PROFESIONAL` (T14): optómetra u oftalmólogo con registro vigente.

import { fechaCivilEnZona, parsearFechaIso } from './fechas';
import { hashSha256, puedeFirmarComoProfesional, tarjetaDeclaradaVigente, ZONA_FIRMA } from './firma';
import { MARCA_NO_APLICA } from './pacientes';
import { ZONA_HORARIA_INICIAL } from './parametros-iniciales';

export const ROTULO_PRESCRIPCION = 'BORRADOR – requiere revisión jurídica';

export const NOTA_Q18 =
  'TODO(Q-18): la vigencia y la cantidad no tienen valor por defecto; las escribe el profesional al firmar.';

/** Tipos nombrados por OPT-05 regla 6. No es un catálogo de productos. */
export const TIPOS_PRESCRIPCION = [
  'lentes_oftalmicos',
  'lentes_contacto',
  'baja_vision',
  'protesis_ocular',
  'terapia_visual',
] as const;

export type TipoPrescripcion = (typeof TIPOS_PRESCRIPCION)[number];

export const ESTADOS_ALMACENADOS_PRESCRIPCION = ['borrador', 'firmada'] as const;
export type EstadoAlmacenadoPrescripcion = (typeof ESTADOS_ALMACENADOS_PRESCRIPCION)[number];

export const ESTADOS_VISIBLES_PRESCRIPCION = ['borrador', 'firmada', 'sustituida', 'vencida'] as const;
export type EstadoVisiblePrescripcion = (typeof ESTADOS_VISIBLES_PRESCRIPCION)[number];

/**
 * Elementos del art. 17. Cada clave es un campo que la firma rechaza si falta.
 * Los compuestos (a, b, c, l, o) se prueban por cada subcampo.
 */
export const CAMPOS_ART17 = [
  'prestador_nombre',
  'direccion',
  'telefono',
  'correo',
  'lugar',
  'fecha',
  'paciente_nombre',
  'paciente_documento',
  'numero_hc',
  'tipo_usuario',
  'dispositivo',
  'agudeza_visual',
  'forma_uso',
  'distancia_pupilar',
  'filtro',
  'duracion_tratamiento',
  'cantidad_num',
  'cantidad_letras',
  'indicaciones',
  'vigencia_hasta',
  'nombre_prescriptor',
  'registro_profesional',
  'firma',
] as const;

export type CampoArt17 = (typeof CAMPOS_ART17)[number];

/** «No aplica» explícito solo donde el elemento puede no aplicar. Identidad, cantidad, vigencia, fecha, lugar y registro no. */
const ADMITEN_NO_APLICA = new Set<CampoArt17>([
  'direccion',
  'telefono',
  'correo',
  'tipo_usuario',
  'dispositivo',
  'agudeza_visual',
  'forma_uso',
  'distancia_pupilar',
  'filtro',
  'duracion_tratamiento',
  'indicaciones',
]);

const ETIQUETA_CAMPO: Record<CampoArt17, string> = {
  prestador_nombre: 'prestador o profesional',
  direccion: 'dirección',
  telefono: 'teléfono',
  correo: 'correo',
  lugar: 'lugar',
  fecha: 'fecha',
  paciente_nombre: 'paciente',
  paciente_documento: 'documento del paciente',
  numero_hc: 'número de historia clínica',
  tipo_usuario: 'tipo de usuario',
  dispositivo: 'dispositivo prescrito',
  agudeza_visual: 'agudeza visual',
  forma_uso: 'forma de uso',
  distancia_pupilar: 'distancia pupilar',
  filtro: 'filtro',
  duracion_tratamiento: 'duración del tratamiento',
  cantidad_num: 'cantidad en números',
  cantidad_letras: 'cantidad en letras',
  indicaciones: 'indicaciones',
  vigencia_hasta: 'vigencia',
  nombre_prescriptor: 'nombre del prescriptor',
  registro_profesional: 'registro profesional',
  firma: 'firma',
};

/** Tope de la representación en letras (seis dígitos). No es un máximo legal. */
export const CANTIDAD_MAXIMA_REPRESENTABLE = 999_999;

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'] as const;
const DIEZ = [
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
] as const;
const VEINTI = [
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
] as const;
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'] as const;
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
] as const;

export interface ProblemaPrescripcion {
  campo: CampoArt17 | 'tipo' | 'fecha';
  mensaje: string;
}

export interface PrescripcionFirmaEntrada {
  prestador_nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  lugar: string;
  fecha: string;
  paciente_nombre: string;
  paciente_documento: string;
  numero_hc: string;
  tipo_usuario: string;
  dispositivo: string;
  agudeza_visual: string;
  forma_uso: string;
  distancia_pupilar: string;
  filtro: string;
  duracion_tratamiento: string;
  cantidad_num: number | null;
  cantidad_letras: string;
  indicaciones: string;
  /** Sin valor por defecto. TODO(Q-18). */
  vigencia_hasta: string;
  nombre_prescriptor: string;
  registro_profesional: string;
  firma: boolean;
  tipo: string;
}

export interface PrescripcionNormalizada extends Omit<PrescripcionFirmaEntrada, 'cantidad_num' | 'firma' | 'tipo'> {
  cantidad_num: number;
  tipo: TipoPrescripcion;
}

export type MotivoNoDispensable =
  | 'sin_firma'
  | 'sustituida'
  | 'sin_numero_hc'
  | 'sin_vigencia'
  | 'vencida'
  | 'sin_registro'
  | 'registro_no_vigente';

export interface ResultadoDispensacion {
  dispensable: boolean;
  motivo: 'vigente' | MotivoNoDispensable;
}

function falta(campo: CampoArt17): ProblemaPrescripcion {
  return {
    campo,
    mensaje: `Falta el campo «${campo}» del art. 17 (${ETIQUETA_CAMPO[campo]}).`,
  };
}

function grupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena] ?? '');
  if (resto > 0 && resto < 10) partes.push(UNIDADES[resto] ?? '');
  else if (resto >= 10 && resto < 20) partes.push(DIEZ[resto - 10] ?? '');
  else if (resto >= 20 && resto < 30) partes.push(VEINTI[resto - 20] ?? '');
  else if (resto >= 30) {
    const decena = Math.floor(resto / 10);
    const unidad = resto % 10;
    const nombre = DECENAS[decena] ?? '';
    partes.push(unidad === 0 ? nombre : `${nombre} y ${UNIDADES[unidad] ?? ''}`);
  }
  return partes.filter((parte) => parte.length > 0).join(' ');
}

/** Cantidad en letras, sin género del dispositivo (no está fijado por la norma leída). */
export function cantidadEnLetras(cantidad: number): string {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA_REPRESENTABLE) {
    throw new Error('la cantidad en letras solo cubre enteros de 1 a 999999');
  }
  if (cantidad < 1000) return grupo(cantidad);
  const miles = Math.floor(cantidad / 1000);
  const resto = cantidad % 1000;
  const cabeza = miles === 1 ? 'mil' : `${grupo(miles)} mil`;
  if (resto === 0) return cabeza;
  return `${cabeza} ${grupo(resto)}`;
}

export function normalizarLetras(valor: string): string {
  return valor.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function cantidadCoincide(cantidad: number, letras: string): boolean {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA_REPRESENTABLE) return false;
  return normalizarLetras(letras) === cantidadEnLetras(cantidad);
}

export function puedeFirmarPrescripcion(rol: string): boolean {
  return puedeFirmarComoProfesional(rol);
}

export function fechaDeFirma(ahora: Date, zona: string = ZONA_HORARIA_INICIAL): string {
  return fechaCivilEnZona(ahora, zona || ZONA_FIRMA);
}

export function formatearNumeroPrescripcion(anio: number, consecutivo: number): string {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 9999) {
    throw new Error('el año del número de prescripción no es válido');
  }
  if (!Number.isInteger(consecutivo) || consecutivo < 1 || consecutivo > CANTIDAD_MAXIMA_REPRESENTABLE) {
    throw new Error('el consecutivo de la prescripción no es válido');
  }
  return `RX-${anio}-${String(consecutivo).padStart(6, '0')}`;
}

export function anioDeNumero(numero: string): number | null {
  const coincidencia = /^RX-(\d{4})-\d{6}$/.exec(numero);
  if (!coincidencia?.[1]) return null;
  return Number(coincidencia[1]);
}

function textoDe(entrada: PrescripcionFirmaEntrada, campo: Exclude<CampoArt17, 'cantidad_num' | 'firma'>): string {
  return entrada[campo];
}

/**
 * AC-OPT-05-1 y AC-OPT-05-2. No rellena la vigencia ni la cantidad.
 * TODO(Q-18): si `vigencia_hasta` viene vacío, el problema nombra ese campo.
 */
export function validarFirmaPrescripcion(
  entrada: PrescripcionFirmaEntrada,
  ahora: Date,
  zona: string = ZONA_HORARIA_INICIAL,
): { ok: true; datos: PrescripcionNormalizada } | { ok: false; problemas: ProblemaPrescripcion[] } {
  const problemas: ProblemaPrescripcion[] = [];
  const textos: Partial<Record<CampoArt17, string>> = {};

  for (const campo of CAMPOS_ART17) {
    if (campo === 'cantidad_num' || campo === 'firma') continue;
    const valor = textoDe(entrada, campo).trim();
    if (!valor) {
      problemas.push(falta(campo));
      continue;
    }
    if (valor === MARCA_NO_APLICA && !ADMITEN_NO_APLICA.has(campo)) {
      problemas.push({
        campo,
        mensaje: `Falta el campo «${campo}» del art. 17 (${ETIQUETA_CAMPO[campo]}). «No aplica» no sustituye este elemento.`,
      });
      continue;
    }
    if (campo === 'fecha' || campo === 'vigencia_hasta') {
      try {
        parsearFechaIso(valor);
      } catch {
        problemas.push({
          campo,
          mensaje: `Falta el campo «${campo}» del art. 17 (${ETIQUETA_CAMPO[campo]}). Use AAAA-MM-DD.`,
        });
        continue;
      }
    }
    textos[campo] = valor;
  }

  if (entrada.cantidad_num === null || entrada.cantidad_num === undefined) {
    problemas.push(falta('cantidad_num'));
  } else if (!Number.isInteger(entrada.cantidad_num) || entrada.cantidad_num < 1 || entrada.cantidad_num > CANTIDAD_MAXIMA_REPRESENTABLE) {
    problemas.push({
      campo: 'cantidad_num',
      mensaje: 'Falta el campo «cantidad_num» del art. 17 (cantidad en números). Debe ser un entero positivo.',
    });
  } else if (!cantidadCoincide(entrada.cantidad_num, entrada.cantidad_letras)) {
    problemas.push({
      campo: 'cantidad_letras',
      mensaje: `La cantidad en letras no coincide con el número ${entrada.cantidad_num}.`,
    });
  }

  if (entrada.firma !== true) problemas.push(falta('firma'));

  if (!(TIPOS_PRESCRIPCION as readonly string[]).includes(entrada.tipo)) {
    problemas.push({ campo: 'tipo', mensaje: 'El tipo de prescripción no está en la lista de OPT-05.' });
  }

  const fecha = textos.fecha;
  if (fecha) {
    const hoy = fechaDeFirma(ahora, zona);
    if (fecha !== hoy) {
      problemas.push({
        campo: 'fecha',
        mensaje: `La fecha de la prescripción es el día de la firma (${hoy}, ${zona || ZONA_FIRMA}).`,
      });
    }
  }

  if (entrada.tipo === 'lentes_contacto') {
    for (const campo of ['dispositivo', 'forma_uso', 'distancia_pupilar'] as const) {
      const valor = (textos[campo] ?? '').trim();
      if (!valor || valor === MARCA_NO_APLICA) {
        problemas.push({
          campo,
          mensaje: `Los lentes de contacto exigen ${ETIQUETA_CAMPO[campo]}. «No aplica» no sustituye la adaptación.`,
        });
      }
    }
  }

  if (problemas.length > 0) return { ok: false, problemas };

  return {
    ok: true,
    datos: {
      prestador_nombre: textos.prestador_nombre ?? '',
      direccion: textos.direccion ?? '',
      telefono: textos.telefono ?? '',
      correo: textos.correo ?? '',
      lugar: textos.lugar ?? '',
      fecha: textos.fecha ?? '',
      paciente_nombre: textos.paciente_nombre ?? '',
      paciente_documento: textos.paciente_documento ?? '',
      numero_hc: textos.numero_hc ?? '',
      tipo_usuario: textos.tipo_usuario ?? '',
      dispositivo: textos.dispositivo ?? '',
      agudeza_visual: textos.agudeza_visual ?? '',
      forma_uso: textos.forma_uso ?? '',
      distancia_pupilar: textos.distancia_pupilar ?? '',
      filtro: textos.filtro ?? '',
      duracion_tratamiento: textos.duracion_tratamiento ?? '',
      cantidad_num: entrada.cantidad_num as number,
      cantidad_letras: normalizarLetras(entrada.cantidad_letras),
      indicaciones: textos.indicaciones ?? '',
      vigencia_hasta: textos.vigencia_hasta ?? '',
      nombre_prescriptor: textos.nombre_prescriptor ?? '',
      registro_profesional: textos.registro_profesional ?? '',
      tipo: entrada.tipo as TipoPrescripcion,
    },
  };
}

export function estadoVisiblePrescripcion(entrada: {
  estadoAlmacenado: string;
  sustituida: boolean;
  vigenciaHasta: string | null;
  hoyBogota: string;
}): EstadoVisiblePrescripcion {
  if (entrada.estadoAlmacenado === 'borrador') return 'borrador';
  if (entrada.sustituida) return 'sustituida';
  if (!entrada.vigenciaHasta || entrada.vigenciaHasta < entrada.hoyBogota) return 'vencida';
  return 'firmada';
}

/**
 * AC-OPT-05-6. ASE-07 aún no dispensa: quien arme la orden debe llamar esto.
 * Una prescripción vencida, sustituida, sin HC, sin vigencia o sin registro vigente no es dispensable.
 */
export function esDispensable(entrada: {
  estadoAlmacenado: string;
  sustituida: boolean;
  numeroHc: string | null | undefined;
  vigenciaHasta: string | null | undefined;
  hoyBogota: string;
  registroProfesional: string | null | undefined;
  registroVigenteHasta: string | null | undefined;
  ahora: Date;
}): ResultadoDispensacion {
  if (entrada.estadoAlmacenado !== 'firmada') return { dispensable: false, motivo: 'sin_firma' };
  if (entrada.sustituida) return { dispensable: false, motivo: 'sustituida' };
  const hc = entrada.numeroHc?.trim() ?? '';
  if (!hc) return { dispensable: false, motivo: 'sin_numero_hc' };
  const vigencia = entrada.vigenciaHasta?.trim() ?? '';
  if (!vigencia) return { dispensable: false, motivo: 'sin_vigencia' };
  if (vigencia < entrada.hoyBogota) return { dispensable: false, motivo: 'vencida' };
  const registro = entrada.registroProfesional?.trim() ?? '';
  if (!registro) return { dispensable: false, motivo: 'sin_registro' };
  if (!tarjetaDeclaradaVigente(registro, entrada.registroVigenteHasta, entrada.ahora)) {
    return { dispensable: false, motivo: 'registro_no_vigente' };
  }
  return { dispensable: true, motivo: 'vigente' };
}

/**
 * Los 15 elementos del art. 17, en castellano y sin siglas.
 * Cada cadena es un renglón del PDF. (a) prestador y contacto · (b) lugar y fecha
 * · (c) paciente y documento · (d) historia clínica · (e) tipo de usuario
 * · (f) dispositivo · (g) agudeza visual · (h) forma de uso · (i) distancia pupilar
 * · (j) filtro · (k) duración · (l) cantidad en números y letras · (m) indicaciones
 * · (n) vigencia · (o) nombre, firma y registro del prescriptor.
 */
export function textosElementosArt17(datos: PrescripcionNormalizada & { numero: string }): readonly string[] {
  return [
    `Prestador o profesional: ${datos.prestador_nombre}. Dirección: ${datos.direccion}. Teléfono: ${datos.telefono}. Correo: ${datos.correo}.`,
    `Lugar: ${datos.lugar}. Fecha: ${datos.fecha}.`,
    `Paciente: ${datos.paciente_nombre}. Documento: ${datos.paciente_documento}.`,
    `Número de historia clínica: ${datos.numero_hc}.`,
    `Tipo de usuario: ${datos.tipo_usuario}.`,
    `Dispositivo prescrito: ${datos.dispositivo}.`,
    `Agudeza visual: ${datos.agudeza_visual}.`,
    `Forma de uso: ${datos.forma_uso}.`,
    `Distancia pupilar: ${datos.distancia_pupilar}.`,
    `Filtro: ${datos.filtro}.`,
    `Duración del tratamiento: ${datos.duracion_tratamiento}.`,
    `Cantidad total: ${datos.cantidad_num} (${datos.cantidad_letras}).`,
    `Indicaciones: ${datos.indicaciones}.`,
    `Vigencia: ${datos.vigencia_hasta}.`,
    `Nombre completo del prescriptor: ${datos.nombre_prescriptor}. Registro profesional: ${datos.registro_profesional}. Firma: electrónica del prescriptor.`,
  ];
}

/** Hash del texto canónico, antes de dibujar la URL o el código QR. */
export function hashVerificacionPrescripcion(lineas: readonly string[]): string {
  return hashSha256(Buffer.from(lineas.join('\n'), 'utf8'));
}

/**
 * Ruta propia de la app. Sin base, queda el camino relativo: no hay dominio por defecto.
 * `PRESCRIPCION_VERIFICACION_BASE_URL` solo se antepone si quien despliega la define.
 */
export function urlVerificacionPrescripcion(hash: string, base?: string | null): string {
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error('El hash de verificación no tiene el formato esperado.');
  }
  const ruta = `/verificar/prescripcion/${hash}`;
  const origen = (base ?? '').trim().replace(/\/+$/, '');
  if (!origen) return ruta;
  if (!/^https?:\/\/[^\s/]+(?::\d+)?$/i.test(origen)) {
    throw new Error('PRESCRIPCION_VERIFICACION_BASE_URL debe ser un origen http o https, sin ruta.');
  }
  return `${origen}${ruta}`;
}

export function presentarFechaEmision(iso: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!partes) return iso.trim();
  return `${partes[3]}/${partes[2]}/${partes[1]}`;
}

export interface VerificacionPublicaPrescripcion {
  coincide: boolean;
  numero?: string;
  fecha_emision?: string;
  nombre_prescriptor?: string;
  registro_profesional?: string;
}

function textoPublico(fila: Record<string, unknown>, clave: string): string {
  const valor = fila[clave];
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Solo los cuatro datos públicos. Ignora cualquier otro campo que traiga la fila. */
export function respuestaVerificacion(fila: Record<string, unknown> | null): VerificacionPublicaPrescripcion {
  if (!fila) return { coincide: false };
  const numero = textoPublico(fila, 'numero');
  const fecha = textoPublico(fila, 'fecha_emision');
  const nombre = textoPublico(fila, 'nombre_prescriptor');
  const registro = textoPublico(fila, 'registro_profesional');
  if (!numero || !fecha || !nombre || !registro) return { coincide: false };
  return {
    coincide: true,
    numero,
    fecha_emision: presentarFechaEmision(fecha),
    nombre_prescriptor: nombre,
    registro_profesional: registro,
  };
}

export function lineasPrescripcion(datos: PrescripcionNormalizada & { numero: string }): string[] {
  return [
    ROTULO_PRESCRIPCION,
    NOTA_Q18,
    `Número de la prescripción: ${datos.numero}`,
    ...textosElementosArt17(datos),
    `Tipo: ${datos.tipo}`,
  ];
}

export function contenidoPrescripcion(datos: PrescripcionNormalizada & { numero: string }): string {
  return lineasPrescripcion(datos).join('\n');
}
