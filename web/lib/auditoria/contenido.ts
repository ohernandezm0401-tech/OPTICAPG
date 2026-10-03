// SEG-03 (T10) — La bitácora guarda referencias, nunca el contenido clínico.
// TODO(Q-07): el plazo de conservación de la bitácora no tiene valor por defecto.

export const ACCIONES_AUDITORIA = [
  'lectura',
  'crear',
  'leer',
  'actualizar',
  'firmar',
  'anular',
  'exportar',
  'solicitar',
  'autenticacion',
  'cambiar_sede',
  'adenda',
  'impresion',
  'descarga',
  'break_glass',
  'configuracion',
  'retencion',
  'cambio_rol',
] as const;

export type AccionAuditoria = (typeof ACCIONES_AUDITORIA)[number];

export const RESULTADOS_AUDITORIA = ['ok', 'denegado', 'error'] as const;
export type ResultadoAuditoria = (typeof RESULTADOS_AUDITORIA)[number];

const RECURSO = /^[A-Za-z0-9_]{1,40}$/;
const RECURSO_ID = /^[A-Za-z0-9_-]{1,80}$/;
const ROL = /^[a-z_]{1,60}$/;
const IP = /^[0-9A-Za-z.:]{1,64}$/;
const REQUEST = /^[A-Za-z0-9_-]{1,80}$/;
const MARCA_CLINICA =
  /diagn[oó]stico|f[oó]rmula|esfera|cilindro|paciente refiere|texto libre|\bOD\b|\bOI\b|[+-]\d{1,2}\.\d{2}/i;

export class ErrorAuditoria extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAuditoria';
  }
}

function rechazarClinico(campo: string, valor: string): void {
  if (MARCA_CLINICA.test(valor)) {
    throw new ErrorAuditoria(`el campo ${campo} no puede llevar contenido clínico`);
  }
}

export function recursoAuditable(valor: string): string {
  const limpio = valor.trim();
  rechazarClinico('recurso', limpio);
  if (!RECURSO.test(limpio)) {
    throw new ErrorAuditoria('el recurso solo admite letras, números y guion bajo');
  }
  return limpio;
}

export function recursoIdAuditable(valor: string | null | undefined): string | null {
  if (valor == null || valor.trim() === '') return null;
  const limpio = valor.trim();
  rechazarClinico('recurso_id', limpio);
  if (!RECURSO_ID.test(limpio)) {
    throw new ErrorAuditoria('el id del recurso solo admite referencias, no texto libre');
  }
  return limpio;
}

export function rolAuditable(valor: string | null | undefined): string | null {
  if (valor == null || valor.trim() === '') return null;
  const limpio = valor.trim();
  rechazarClinico('rol', limpio);
  if (!ROL.test(limpio)) {
    throw new ErrorAuditoria('el rol no es válido');
  }
  return limpio;
}

export function ipAuditable(valor: string | null | undefined): string | null {
  if (valor == null || valor.trim() === '') return null;
  const limpio = valor.trim();
  rechazarClinico('ip', limpio);
  if (!IP.test(limpio)) return null;
  return limpio;
}

export function agenteAuditable(valor: string | null | undefined): string | null {
  if (valor == null || valor.trim() === '') return null;
  const limpio = valor.trim().slice(0, 300);
  rechazarClinico('agente', limpio);
  return limpio;
}

export function requestIdAuditable(valor: string | null | undefined): string | null {
  if (valor == null || valor.trim() === '') return null;
  const limpio = valor.trim();
  rechazarClinico('request_id', limpio);
  if (!REQUEST.test(limpio)) {
    throw new ErrorAuditoria('request_id solo admite una referencia');
  }
  return limpio;
}

export function accionAuditable(valor: string): AccionAuditoria {
  rechazarClinico('accion', valor);
  if (!(ACCIONES_AUDITORIA as readonly string[]).includes(valor)) {
    throw new ErrorAuditoria('la acción de auditoría no está permitida');
  }
  return valor as AccionAuditoria;
}

export function resultadoAuditable(valor: string): ResultadoAuditoria {
  if (!(RESULTADOS_AUDITORIA as readonly string[]).includes(valor)) {
    throw new ErrorAuditoria('el resultado de auditoría no está permitido');
  }
  return valor as ResultadoAuditoria;
}

const AUTENTICACION_OK = new Set([
  'inicio_ok',
  'sesion_revocada',
  'sesion_rotada',
  'cierre_todas',
  'contrasena_actualizada',
  'mfa_alta',
  'mfa_baja',
  'mfa_ok',
]);

export function resultadoDeAutenticacion(tipo: string): ResultadoAuditoria {
  return AUTENTICACION_OK.has(tipo) ? 'ok' : 'denegado';
}
