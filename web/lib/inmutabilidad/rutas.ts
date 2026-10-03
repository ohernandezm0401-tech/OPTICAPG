// SEG-04 (T12) — No hay borrado HTTP de un registro firmado (AC-SEG-04-4).
// T19 puede añadir GET del registro y POST de la adenda. No debe exportar DELETE.

export const METODOS_REGISTRO_FIRMADO = ['GET', 'POST'] as const;
export type MetodoRegistroFirmado = (typeof METODOS_REGISTRO_FIRMADO)[number];

export const RECURSOS_SIN_DELETE = [
  'historias',
  'atenciones',
  'adendas',
  'prescripciones',
  'consentimientos',
  'registros-firmados',
] as const;

export interface RespuestaRutaFirmada {
  status: number;
  cuerpo: Record<string, unknown>;
}

export function atenderRegistroFirmado(metodo: string): RespuestaRutaFirmada {
  const normalizado = metodo.trim().toUpperCase();
  if (normalizado === 'DELETE') {
    return {
      status: 405,
      cuerpo: { error: 'No existe borrado de un registro firmado.' },
    };
  }
  if ((METODOS_REGISTRO_FIRMADO as readonly string[]).includes(normalizado)) {
    return { status: 200, cuerpo: { metodo: normalizado } };
  }
  return { status: 405, cuerpo: { error: 'Método no permitido.' } };
}
