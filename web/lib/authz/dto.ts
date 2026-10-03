// SEG-02 (T09) — DTO de prescripción para dispensación (spec §4 regla 2, B-04).
// Sin diagnóstico, sin anamnesis y sin el id de la atención.
// Los valores son sintéticos: quien llame esta función no debe pasar datos reales.

export interface PrescripcionCompleta {
  id: string;
  numero_verificacion: string;
  atencion_id: string;
  diagnostico: string;
  anamnesis: string;
  valores_opticos: Record<string, string>;
  vigencia: string;
}

export interface PrescripcionDispensacion {
  id: string;
  numero_verificacion: string;
  valores_opticos: Record<string, string>;
  vigencia: string;
}

const CLAVES_PROHIBIDAS = ['diagnostico', 'anamnesis', 'atencion_id', 'atencion'] as const;

export function dtoPrescripcionParaDispensacion(origen: PrescripcionCompleta): PrescripcionDispensacion {
  return {
    id: origen.id,
    numero_verificacion: origen.numero_verificacion,
    valores_opticos: { ...origen.valores_opticos },
    vigencia: origen.vigencia,
  };
}

export function dtoTieneDiagnostico(dto: object): boolean {
  return CLAVES_PROHIBIDAS.some((clave) => Object.prototype.hasOwnProperty.call(dto, clave));
}
