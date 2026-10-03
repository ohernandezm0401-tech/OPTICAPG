// SEG-12 (T11) — Texto libre clínico que se cifra en la aplicación.
// Las tablas de atención y prescripción llegan en OPT-01 / OPT-05; el nombre
// del campo queda fijo aquí para que esas tareas no elijan otro cifrado.
// No se inventan secciones distintas de las de la spec §17.3 (contenido de
// la atención, descripción del diagnóstico, motivo y valor de la adenda,
// indicaciones de la prescripción).

export const CAMPOS_TEXTO_CLINICO = [
  'atenciones.contenido',
  'atencion_diagnosticos.descripcion',
  'atencion_adendas.motivo',
  'atencion_adendas.nuevo_valor',
  'prescripciones.indicaciones',
];

/** @param {string} campo */
export function esCampoTextoClinico(campo) {
  return CAMPOS_TEXTO_CLINICO.includes(campo);
}
