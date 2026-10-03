// SEG-12 (T11) — Lista de texto libre clínico y de anexos que se cifran en la
// aplicación (AES-256-GCM) antes de guardarse. Los valores numéricos de la
// refracción y el código CIE-10 no están en esta lista: la spec los trata
// como números y como catálogo (OPT-01). Las tablas de atención todavía no
// existen; el módulo guarda el sobre en `contenidos_cifrados` hasta que
// OPT-01 / OPT-14 persistan la fila de negocio.
//
// Nombres tomados de la spec (secciones A, B, F, I de OPT-01; adenda OPT-02;
// remisión OPT-16; anexo OPT-14). No se inventan campos adicionales.

export const CAMPOS_TEXTO_CLINICO = [
  'atenciones.contenido.a',
  'atenciones.contenido.b',
  'atenciones.contenido.f',
  'atenciones.contenido.i',
  'atencion_adendas.motivo',
  'atencion_adendas.nuevo_valor',
  'remisiones.motivo',
] as const;

export type CampoTextoClinico = (typeof CAMPOS_TEXTO_CLINICO)[number];

export const CAMPO_ANEXO = 'archivo';

export const ADAPTADORES = ['facturacion', 'rda'] as const;
export const NOMBRES_SECRETO_ADAPTADOR = ['token', 'client_id', 'client_secret'] as const;

export type Adaptador = (typeof ADAPTADORES)[number];
export type NombreSecretoAdaptador = (typeof NOMBRES_SECRETO_ADAPTADOR)[number];

export function esCampoTextoClinico(campo: string): campo is CampoTextoClinico {
  return (CAMPOS_TEXTO_CLINICO as readonly string[]).includes(campo);
}

export type VistaAdaptador = {
  adaptador: Adaptador;
  nombre: NombreSecretoAdaptador;
  configurado: true;
};

// Allowlist: la API solo puede devolver estos tres campos. El sobre y el
// secreto en claro no forman parte de la vista.
export function vistaPublicaAdaptador(fila: {
  adaptador: Adaptador;
  nombre: NombreSecretoAdaptador;
}): VistaAdaptador {
  return { adaptador: fila.adaptador, nombre: fila.nombre, configurado: true };
}
