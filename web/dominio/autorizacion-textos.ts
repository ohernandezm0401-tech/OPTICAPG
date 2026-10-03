// SEG-05 (T15) — Textos y tipos que la interfaz puede importar.
// Sin módulos de Node: el navegador no carga `node:crypto`.
// BORRADOR – requiere revisión jurídica.
// TODO(Q-17): la negativa se registra y no bloquea la atención.

export const ROTULO_BORRADOR =
  'Borrador sujeto a revisión jurídica. BORRADOR – requiere revisión jurídica.';

export const CODIGO_TRATAMIENTO = 'tratamiento_clinico';
export const CODIGO_CONTACTO = 'contacto_comercial';

export const MEDIOS_AUTORIZACION = ['presencial', 'electronico'] as const;
export type MedioAutorizacion = (typeof MEDIOS_AUTORIZACION)[number];

export const ESTADOS_AUTORIZACION = ['pendiente', 'otorgada', 'negada', 'revocada'] as const;
export type EstadoAutorizacion = (typeof ESTADOS_AUTORIZACION)[number];

export const NOTA_INSTRUMENTOS =
  'La autorización de datos, el consentimiento informado clínico y el contacto comercial son instrumentos separados. El consentimiento clínico no se captura en esta casilla.';

/** Plantilla editable. No es un texto jurídico definitivo. */
export const PLANTILLA_TRATAMIENTO_CLINICO = `${ROTULO_BORRADOR}
TODO(Q-17): este borrador no fija la base legal de la historia clínica.
El titular no está obligado a autorizar el tratamiento de datos sensibles.
Datos sensibles de este instrumento: los de salud que se usen en la atención.
Finalidad separada: tratamiento clínico.
Derechos, responsable y canales: los que publique la política de tratamiento del responsable.
Esta decisión no viene marcada.`;

export const PLANTILLA_CONTACTO_COMERCIAL = `${ROTULO_BORRADOR}
Finalidad separada y opcional: contacto comercial.
No es obligatoria. No condiciona el registro ni la atención.
Esta casilla no viene marcada.`;

const CAMPOS_POLITICA = [
  'razon_social',
  'domicilio',
  'correo',
  'telefono',
  'finalidades',
  'derechos',
  'area_pqr',
  'procedimiento',
  'vigencia',
] as const;

export type CampoPolitica = (typeof CAMPOS_POLITICA)[number];

export interface PoliticaTratamiento {
  razon_social: string | null;
  domicilio: string | null;
  correo: string | null;
  telefono: string | null;
  finalidades: string | null;
  derechos: string | null;
  area_pqr: string | null;
  procedimiento: string | null;
  vigencia: string | null;
  url_publica: string | null;
}

export function contactoComercialPorDefecto(): false {
  return false;
}

/** AC-SEG-05-2: la casilla de contacto no impide guardar el paciente. */
export function contactoBloqueaRegistro(): false {
  return false;
}

export function textoIncluyeRotuloBorrador(contenido: string): boolean {
  return contenido.includes('Borrador sujeto a revisión jurídica') || contenido.includes('BORRADOR – requiere revisión jurídica');
}

export function politicaVacia(): PoliticaTratamiento {
  return {
    razon_social: null,
    domicilio: null,
    correo: null,
    telefono: null,
    finalidades: null,
    derechos: null,
    area_pqr: null,
    procedimiento: null,
    vigencia: null,
    url_publica: null,
  };
}

function dato(valor: string | null): string {
  const limpio = valor?.trim() ?? '';
  return limpio.length > 0 ? limpio : 'sin dato configurado';
}

/** Aviso generado solo con lo que el tenant escribió. Sin plazos ni cifras de relleno. */
export function generarAvisoPrivacidad(politica: PoliticaTratamiento): { texto: string; campos_sin_dato: CampoPolitica[] } {
  const campos_sin_dato = CAMPOS_POLITICA.filter((campo) => !politica[campo]?.trim());
  const lineas = [
    ROTULO_BORRADOR,
    'Aviso de privacidad generado desde la política de tratamiento del responsable.',
    `Razón social: ${dato(politica.razon_social)}`,
    `Domicilio: ${dato(politica.domicilio)}`,
    `Correo: ${dato(politica.correo)}`,
    `Teléfono: ${dato(politica.telefono)}`,
    `Finalidades: ${dato(politica.finalidades)}`,
    `Derechos: ${dato(politica.derechos)}`,
    `Área de PQR: ${dato(politica.area_pqr)}`,
    `Procedimiento: ${dato(politica.procedimiento)}`,
    `Vigencia: ${dato(politica.vigencia)}`,
    `URL pública: ${dato(politica.url_publica)}`,
  ];
  return { texto: lineas.join('\n'), campos_sin_dato };
}

export function codigoFinalidadValido(codigo: string): boolean {
  return /^[a-z0-9_]{1,40}$/.test(codigo);
}

export function esMedioAutorizacion(valor: string): valor is MedioAutorizacion {
  return (MEDIOS_AUTORIZACION as readonly string[]).includes(valor);
}
