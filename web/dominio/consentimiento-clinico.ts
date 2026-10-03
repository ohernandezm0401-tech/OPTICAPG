// OPT-04 (T22) — Consentimiento informado clínico, separado de la autorización
// de datos (T15). Plantilla versionada, firma del paciente o representante
// y puerta para iniciar el procedimiento.
// TODO(Q-17): el valor por defecto registra la negativa de datos y deja
// continuar la atención con datos mínimos. Esta puerta no resuelve esa
// tensión: el procedimiento que exige consentimiento no inicia sin la
// plantilla vigente firmada. La negativa y la revocatoria se registran.
// BORRADOR – requiere revisión jurídica.
//
// OPT-07 (adaptación de lentes de contacto), OPT-18 (terapia visual) y
// OPT-21 (prótesis oculares) todavía no tienen módulo. Deben llamar
// `puedeIniciarProcedimiento` antes de iniciar. La ficha de atención ya
// muestra y exige el consentimiento.

export const ROTULO_CONSENTIMIENTO = 'BORRADOR – requiere revisión jurídica';

export const PROCEDIMIENTO_ADAPTACION_LC = 'adaptacion_lc';

export const PROCEDIMIENTOS_CON_CONSENTIMIENTO = [
  'adaptacion_lc',
  'dilatacion',
  'tonometria',
  'terapia_visual',
  'protesis_ocular',
] as const;

export type ProcedimientoConsentimiento = (typeof PROCEDIMIENTOS_CON_CONSENTIMIENTO)[number];

export const ETIQUETAS_PROCEDIMIENTO: Record<ProcedimientoConsentimiento, string> = {
  adaptacion_lc: 'Adaptación de lentes de contacto',
  dilatacion: 'Examen con dilatación',
  tonometria: 'Tonometría',
  terapia_visual: 'Terapia visual',
  protesis_ocular: 'Entrega de prótesis ocular',
};

/** Tareas que crean el módulo y deben usar esta puerta. Aún no existen. */
export const MODULOS_PENDIENTES_DE_CONSENTIMIENTO = [
  'OPT-07',
  'OPT-18',
  'OPT-21',
] as const;

export const ROLES_REGISTRO_CONSENTIMIENTO = ['optometra', 'oftalmologo', 'asesor', 'auxiliar_clinico'] as const;
export const ROLES_PUBLICAR_PLANTILLA = ['admin', 'optometra', 'oftalmologo'] as const;

export type FirmanteConsentimiento = 'paciente' | 'representante';
export type EstadoConsentimientoVisible = 'pendiente' | 'firmado' | 'negado' | 'revocado';

export type MotivoInicioProcedimiento =
  | 'no_exige'
  | 'firmado_vigente'
  | 'sin_plantilla'
  | 'sin_consentimiento'
  | 'negado'
  | 'revocado'
  | 'version_no_vigente';

export interface PlantillaVigente {
  version: number;
  hash: string;
}

export interface ConsentimientoParaPuerta {
  otorgado: boolean;
  version: number;
  hash: string;
  revocado: boolean;
}

export function esProcedimientoConsentimiento(valor: string): valor is ProcedimientoConsentimiento {
  return (PROCEDIMIENTOS_CON_CONSENTIMIENTO as readonly string[]).includes(valor);
}

export function procedimientoExigeConsentimiento(codigo: string): boolean {
  return esProcedimientoConsentimiento(codigo);
}

export function puedeRegistrarConsentimiento(rol: string): boolean {
  return (ROLES_REGISTRO_CONSENTIMIENTO as readonly string[]).includes(rol);
}

export function puedePublicarPlantillaConsentimiento(rol: string): boolean {
  return (ROLES_PUBLICAR_PLANTILLA as readonly string[]).includes(rol);
}

export function textoIncluyeRotuloConsentimiento(contenido: string): boolean {
  return contenido.includes(ROTULO_CONSENTIMIENTO);
}

export function textoBorradorProcedimiento(etiqueta: string): string {
  return [
    ROTULO_CONSENTIMIENTO,
    'TODO(Q-17): este borrador no fija la base legal del consentimiento informado ni de la historia clínica.',
    `Procedimiento: ${etiqueta}.`,
    'El profesional o el abogado del responsable debe reemplazar este texto antes de usarlo con pacientes.',
    'Este instrumento no es la autorización de tratamiento de datos ni el contacto comercial.',
    'La persona puede aceptar o negar. La negativa se registra.',
    'Una revocatoria posterior se registra aparte y no borra este documento.',
  ].join('\n');
}

export function plantillaBorrador(procedimiento: ProcedimientoConsentimiento): string {
  return textoBorradorProcedimiento(ETIQUETAS_PROCEDIMIENTO[procedimiento]);
}

/**
 * AC-OPT-04-1. Sin consentimiento firmado de la plantilla vigente no inicia.
 * La revocatoria bloquea y no borra el original: eso lo decide quien llama,
 * que conserva la fila y marca `revocado`.
 */
export function puedeIniciarProcedimiento(entrada: {
  procedimiento: string;
  plantillaVigente: PlantillaVigente | null;
  consentimiento: ConsentimientoParaPuerta | null;
}): { permitida: boolean; motivo: MotivoInicioProcedimiento } {
  if (!procedimientoExigeConsentimiento(entrada.procedimiento)) {
    return { permitida: true, motivo: 'no_exige' };
  }
  if (!entrada.plantillaVigente) return { permitida: false, motivo: 'sin_plantilla' };
  const consentimiento = entrada.consentimiento;
  if (!consentimiento) return { permitida: false, motivo: 'sin_consentimiento' };
  if (consentimiento.revocado) return { permitida: false, motivo: 'revocado' };
  if (!consentimiento.otorgado) return { permitida: false, motivo: 'negado' };
  if (
    consentimiento.version !== entrada.plantillaVigente.version ||
    consentimiento.hash !== entrada.plantillaVigente.hash
  ) {
    return { permitida: false, motivo: 'version_no_vigente' };
  }
  return { permitida: true, motivo: 'firmado_vigente' };
}

/** AC-OPT-04-2. Un texto distinto crea otra versión. El anterior no se reescribe. */
export function planVersionPlantilla(
  actual: { version: number; contenido: string } | null,
  contenidoNuevo: string,
): { accion: 'crear'; version: 1 } | { accion: 'igual'; version: number } | { accion: 'nueva'; version: number } {
  if (!actual) return { accion: 'crear', version: 1 };
  if (contenidoNuevo === actual.contenido) return { accion: 'igual', version: actual.version };
  return { accion: 'nueva', version: actual.version + 1 };
}

export function versionConservada(consentimiento: { version: number; hash: string }): {
  version: number;
  hash: string;
} {
  return { version: consentimiento.version, hash: consentimiento.hash };
}

export function resolverFirmante(
  menor: boolean,
  hayRepresentanteVigente: boolean,
): { firmante: FirmanteConsentimiento } | { error: 'menor_sin_representante' } {
  if (menor) {
    if (!hayRepresentanteVigente) return { error: 'menor_sin_representante' };
    return { firmante: 'representante' };
  }
  return { firmante: 'paciente' };
}

export function estadoVisibleConsentimiento(fila: {
  otorgado: boolean;
  revocado: boolean;
} | null): EstadoConsentimientoVisible {
  if (!fila) return 'pendiente';
  if (fila.revocado) return 'revocado';
  if (!fila.otorgado) return 'negado';
  return 'firmado';
}

/** AC-OPT-04-3. El anexo exige hash, firma y atención. */
export function anexoConsentimientoCompleto(entrada: {
  atencionId: string | null;
  firmaId: string | null;
  hashAnexo: string | null;
  hashDocumento: string | null;
}): boolean {
  if (!entrada.atencionId || !entrada.firmaId || !entrada.hashAnexo || !entrada.hashDocumento) return false;
  return /^[a-f0-9]{64}$/.test(entrada.hashAnexo) && entrada.hashAnexo === entrada.hashDocumento;
}
