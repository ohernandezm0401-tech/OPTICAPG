// ASE-01 / SEG-06 (T13) — Identificación del paciente y menores.
// La edad se calcula; no se digita. Fechas civiles en America/Bogota.
// TODO(Q-17): registrar la negativa de autorización permite continuar con
// los datos de identificación. El sistema no resuelve la tensión entre la
// Res. 1995/1999 y el D. 1377/2013 art. 6.
// BORRADOR – requiere revisión jurídica.

export const ZONA_BOGOTA = 'America/Bogota';
export const MARCA_NO_APLICA = 'No aplica';
export const NOTA_Q17 =
  'BORRADOR – requiere revisión jurídica. TODO(Q-17): la negativa queda registrada y el registro de identificación continúa; esto no define la base legal de la historia clínica.';

export const TIPOS_DOCUMENTO = ['CC', 'TI', 'RC', 'CE', 'PA', 'PE', 'PPT', 'NUIP'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const TIPOS_VINCULACION = [
  'particular',
  'contributivo',
  'subsidiado',
  'especial',
  'otro',
  'no_aplica',
] as const;
export type TipoVinculacion = (typeof TIPOS_VINCULACION)[number];

export const ESTADOS_PACIENTE = ['activo', 'inactivo', 'fusionado'] as const;

/** Campos del art. 9 citados por la spec (ASE-01). La edad no se guarda: se calcula. */
export const CAMPOS_ART9 = [
  'nombres',
  'apellidos',
  'tipo_doc',
  'num_doc',
  'fecha_nacimiento',
  'sexo',
  'estado_civil',
  'ocupacion',
  'direccion',
  'telefono',
  'acompanante',
  'responsable',
  'aseguradora',
  'tipo_vinculacion',
] as const;

const ADMITEN_NO_APLICA = new Set<string>([
  'sexo',
  'estado_civil',
  'ocupacion',
  'direccion',
  'telefono',
  'acompanante',
  'responsable',
  'aseguradora',
]);

const ETIQUETAS: Record<(typeof CAMPOS_ART9)[number], string> = {
  nombres: 'nombres',
  apellidos: 'apellidos',
  tipo_doc: 'tipo de documento',
  num_doc: 'número de documento',
  fecha_nacimiento: 'fecha de nacimiento',
  sexo: 'sexo',
  estado_civil: 'estado civil',
  ocupacion: 'ocupación',
  direccion: 'dirección',
  telefono: 'teléfono',
  acompanante: 'acompañante',
  responsable: 'responsable del usuario',
  aseguradora: 'aseguradora',
  tipo_vinculacion: 'tipo de vinculación',
};

export interface RepresentanteEntrada {
  nombre: string;
  tipo_doc: string;
  num_doc: string;
  parentesco: string;
  contacto: string;
  escucho_menor?: boolean;
}

export interface PacienteEntrada {
  nombres: string;
  apellidos: string;
  tipo_doc: string;
  num_doc: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  ocupacion: string;
  direccion: string;
  telefono: string;
  email?: string | null;
  acompanante: string;
  responsable: string;
  aseguradora: string;
  tipo_vinculacion: string;
  representante?: RepresentanteEntrada | null;
  /** Ya hay un vínculo vigente guardado (lo aporta el servicio, no el formulario). */
  tiene_representante_vigente?: boolean;
  negativa_autorizacion?: boolean;
}

export interface PacienteNormalizado extends Omit<PacienteEntrada, 'tipo_vinculacion' | 'tipo_doc' | 'representante'> {
  tipo_doc: TipoDocumento;
  tipo_vinculacion: TipoVinculacion;
  representante: (RepresentanteEntrada & { tipo_doc: TipoDocumento }) | null;
}

export function fechaCivilBogota(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_BOGOTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

export function esFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

/** Años cumplidos en la fecha civil `hoy` (inclusive el cumpleaños). */
export function edadCumplida(fechaNacimiento: string, hoy: string): number {
  if (!esFechaIso(fechaNacimiento) || !esFechaIso(hoy)) {
    throw new Error('la fecha de nacimiento o la fecha de corte no es válida');
  }
  const [anioN, mesN, diaN] = fechaNacimiento.split('-').map(Number);
  const [anioH, mesH, diaH] = hoy.split('-').map(Number);
  let edad = anioH - anioN;
  if (mesH < mesN || (mesH === mesN && diaH < diaN)) edad -= 1;
  return edad;
}

export function esMenorDeEdad(fechaNacimiento: string, hoy: string): boolean {
  return edadCumplida(fechaNacimiento, hoy) < 18;
}

export function faltaRepresentante(
  fechaNacimiento: string,
  hoy: string,
  tieneRepresentante: boolean,
): boolean {
  return esMenorDeEdad(fechaNacimiento, hoy) && !tieneRepresentante;
}

/**
 * Aviso de mayoría de edad. No cambia el estado del paciente: la revisión
 * es explícita (cerrar la vigencia del representante).
 */
export function avisoMayoriaDeEdad(fechaNacimiento: string, hoy: string, tieneHistorico: boolean): string | null {
  if (esMenorDeEdad(fechaNacimiento, hoy) || !tieneHistorico) return null;
  return 'Este paciente ya cumplió 18 años: el representante deja de ser obligatorio. El histórico de quién firmó se conserva. El estado del paciente no cambia solo.';
}

export function enmascararDocumento(numero: string): string {
  const limpio = numero.trim();
  const ultimos = limpio.slice(-4);
  return `••••${ultimos}`;
}

/** Cédula del padre o la madre + consecutivo, para el menor sin documento propio (spec SEG-06). */
export function numeroDocumentoConsecutivo(cedulaAcudiente: string, consecutivo: number): string {
  const cedula = cedulaAcudiente.trim();
  if (!/^\d{5,12}$/.test(cedula)) {
    throw new Error('la cédula del acudiente no tiene el formato esperado');
  }
  if (!Number.isInteger(consecutivo) || consecutivo < 1) {
    throw new Error('el consecutivo del menor sin documento debe ser un entero positivo');
  }
  return `${cedula}-${consecutivo}`;
}

/** El número de HC solo crece. Fusionar un duplicado no devuelve el número al cupo. */
export function siguienteNumHc(ultimoEmitido: number): number {
  if (!Number.isInteger(ultimoEmitido) || ultimoEmitido < 0) {
    throw new Error('la secuencia de historia clínica no es válida');
  }
  return ultimoEmitido + 1;
}

export function numerosHcTrasFusion(emitidos: readonly number[]): number[] {
  return [...emitidos];
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function representanteCompleto(rep: RepresentanteEntrada | null | undefined): boolean {
  if (!rep) return false;
  return (
    texto(rep.nombre).length > 0 &&
    (TIPOS_DOCUMENTO as readonly string[]).includes(texto(rep.tipo_doc)) &&
    texto(rep.num_doc).length >= 3 &&
    texto(rep.parentesco).length > 0 &&
    texto(rep.contacto).length > 0
  );
}

export function validarPaciente(
  entrada: PacienteEntrada,
  hoy: string,
): { ok: true; datos: PacienteNormalizado } | { ok: false; errores: string[] } {
  const errores: string[] = [];
  if (!esFechaIso(hoy)) errores.push('la fecha de corte no es válida');

  for (const campo of CAMPOS_ART9) {
    const valor = texto(entrada[campo]);
    const etiqueta = ETIQUETAS[campo];
    if (!valor) {
      errores.push(`El campo ${etiqueta} es obligatorio. Si no aplica, márquelo «${MARCA_NO_APLICA}».`);
      continue;
    }
    if (valor === MARCA_NO_APLICA && !ADMITEN_NO_APLICA.has(campo) && campo !== 'tipo_vinculacion') {
      errores.push(`El campo ${etiqueta} no admite «${MARCA_NO_APLICA}».`);
    }
  }

  const tipo = texto(entrada.tipo_doc);
  if (tipo && !(TIPOS_DOCUMENTO as readonly string[]).includes(tipo)) {
    errores.push('el tipo de documento no está permitido');
  }
  const numDoc = texto(entrada.num_doc);
  if (numDoc && numDoc !== MARCA_NO_APLICA && !/^[0-9A-Za-z.-]{3,40}$/.test(numDoc)) {
    errores.push('el número de documento no tiene un formato utilizable');
  }
  const nacimiento = texto(entrada.fecha_nacimiento);
  if (nacimiento && !esFechaIso(nacimiento)) {
    errores.push('la fecha de nacimiento no es válida');
  }
  if (nacimiento && esFechaIso(hoy) && esFechaIso(nacimiento) && nacimiento > hoy) {
    errores.push('la fecha de nacimiento no puede ser posterior a hoy');
  }

  let vinculacion = texto(entrada.tipo_vinculacion);
  if (vinculacion === MARCA_NO_APLICA) vinculacion = 'no_aplica';
  if (vinculacion && !(TIPOS_VINCULACION as readonly string[]).includes(vinculacion)) {
    errores.push('el tipo de vinculación no está permitido');
  }

  const traeRepresentante = representanteCompleto(entrada.representante);
  const tieneRepresentante = traeRepresentante || entrada.tiene_representante_vigente === true;
  if (nacimiento && esFechaIso(nacimiento) && esFechaIso(hoy) && faltaRepresentante(nacimiento, hoy, tieneRepresentante)) {
    errores.push('Un paciente menor de 18 años requiere representante legal (documento, parentesco y contacto).');
  }
  if (entrada.representante && !traeRepresentante && texto(entrada.representante.nombre).length > 0) {
    errores.push('el representante está incompleto: faltan documento, parentesco o contacto');
  }

  if (errores.length > 0) return { ok: false, errores };

  const rep = traeRepresentante ? entrada.representante! : null;
  return {
    ok: true,
    datos: {
      ...entrada,
      nombres: texto(entrada.nombres),
      apellidos: texto(entrada.apellidos),
      tipo_doc: tipo as TipoDocumento,
      num_doc: numDoc,
      fecha_nacimiento: nacimiento,
      sexo: texto(entrada.sexo),
      estado_civil: texto(entrada.estado_civil),
      ocupacion: texto(entrada.ocupacion),
      direccion: texto(entrada.direccion),
      telefono: texto(entrada.telefono),
      email: texto(entrada.email ?? '') || null,
      acompanante: texto(entrada.acompanante),
      responsable: texto(entrada.responsable),
      aseguradora: texto(entrada.aseguradora),
      tipo_vinculacion: vinculacion as TipoVinculacion,
      representante: rep
        ? {
            nombre: texto(rep.nombre),
            tipo_doc: texto(rep.tipo_doc) as TipoDocumento,
            num_doc: texto(rep.num_doc),
            parentesco: texto(rep.parentesco),
            contacto: texto(rep.contacto),
            escucho_menor: rep.escucho_menor === true,
          }
        : null,
      negativa_autorizacion: entrada.negativa_autorizacion === true,
    },
  };
}

/** Ficha al abrir. El asesor no recibe diagnósticos (R3 denegado, spec ASE-01). */
export function fichaSinDiagnosticoParaRol<T extends { diagnosticos?: unknown }>(rol: string, ficha: T): T {
  if (rol === 'optometra' || rol === 'oftalmologo' || rol === 'director_cientifico') return ficha;
  const resto = { ...ficha };
  delete resto.diagnosticos;
  return resto;
}
