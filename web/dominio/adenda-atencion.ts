// OPT-02 (T21) — Corrección de una atención firmada por adenda.
// El original no se reescribe: la proyección copia los valores y agrega
// la nota. La hora la pone el servidor; aquí solo se presenta.
import { crearEsquemaExamen, type LimitesCaptura } from './valores-opticos';

export const CAMPOS_REFRACCION_ADENDA = [
  'esfera_od',
  'cilindro_od',
  'eje_od',
  'adicion_od',
  'agudeza_od',
  'esfera_oi',
  'cilindro_oi',
  'eje_oi',
  'adicion_oi',
  'agudeza_oi',
  'dip',
  'dip_monocular_od',
  'dip_monocular_oi',
] as const;

export type CampoRefraccionAdenda = (typeof CAMPOS_REFRACCION_ADENDA)[number];

export const ETIQUETAS_REFRACCION: Record<CampoRefraccionAdenda, string> = {
  esfera_od: 'Esfera ojo derecho',
  cilindro_od: 'Cilindro ojo derecho',
  eje_od: 'Eje ojo derecho',
  adicion_od: 'Adición ojo derecho',
  agudeza_od: 'Agudeza ojo derecho',
  esfera_oi: 'Esfera ojo izquierdo',
  cilindro_oi: 'Cilindro ojo izquierdo',
  eje_oi: 'Eje ojo izquierdo',
  adicion_oi: 'Adición ojo izquierdo',
  agudeza_oi: 'Agudeza ojo izquierdo',
  dip: 'DIP binocular (mm)',
  dip_monocular_od: 'DIP monocular ojo derecho',
  dip_monocular_oi: 'DIP monocular ojo izquierdo',
};

const MOTIVO_MAX = 4000;

export interface AdendaPlano {
  id: string;
  numero: number;
  campo_ref: CampoRefraccionAdenda;
  valor_anterior_ref: string;
  nuevo_valor: string;
  motivo: string;
  autor_id: string;
  autor: string;
  hora_bogota: string | null;
  tipo_nota: 'correccion' | 'complementaria';
}

export interface LineaHistorial {
  orden: number;
  tipo: 'original' | 'adenda';
  numero: number | null;
  tipo_nota: 'correccion' | 'complementaria' | null;
  campo_ref: string | null;
  campo_etiqueta: string | null;
  valor_anterior: string | null;
  nuevo_valor: string | null;
  motivo: string | null;
  autor: string;
  hora_bogota: string | null;
  marca: string | null;
}

export interface HistorialProyectado {
  original_refraccion: Record<string, string>;
  marcas: Record<string, string>;
  linea: LineaHistorial[];
}

export interface SeccionPdfHistoria {
  titulo: string;
  texto: string;
}

export interface EntradaPdfHistoria {
  folio: number | null;
  hora_bogota: string | null;
  sello: string | null;
  secciones: SeccionPdfHistoria[];
  adendas: LineaHistorial[];
}

export type PreparacionAdenda =
  | {
      ok: true;
      campo: CampoRefraccionAdenda;
      nuevo_valor: string;
      motivo: string;
      tipo_nota: 'correccion' | 'complementaria';
    }
  | { ok: false; mensaje: string };

function esCampo(valor: string): valor is CampoRefraccionAdenda {
  return (CAMPOS_REFRACCION_ADENDA as readonly string[]).includes(valor);
}

function numeroCampo(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

export function referenciaExamen(campo: CampoRefraccionAdenda): string {
  return `examenes_optometricos.${campo}`;
}

export function referenciaAdenda(id: string): string {
  return `atencion_adendas:${id}`;
}

export function marcaCorreccion(numero: number): string {
  return `corregido por adenda #${numero}`;
}

export function prepararAdenda(entrada: {
  campo: string;
  nuevoValorTexto: string;
  motivo: string;
  autorId: string;
  profesionalAtencionId: string;
  limites: LimitesCaptura;
}): PreparacionAdenda {
  const motivo = entrada.motivo.trim();
  if (!motivo) return { ok: false, mensaje: 'El motivo de la adenda es obligatorio.' };
  if (motivo.length > MOTIVO_MAX) {
    return { ok: false, mensaje: 'El motivo de la adenda es demasiado largo.' };
  }
  if (!esCampo(entrada.campo)) {
    return { ok: false, mensaje: 'Elija un campo de refracción.' };
  }
  const numero = numeroCampo(entrada.nuevoValorTexto);
  if (numero == null) return { ok: false, mensaje: 'El nuevo valor de refracción no es un número.' };
  const validado = crearEsquemaExamen(entrada.limites).safeParse({ [entrada.campo]: numero });
  if (!validado.success) {
    return {
      ok: false,
      mensaje: validado.error.issues[0]?.message ?? 'El nuevo valor está fuera del límite de captura.',
    };
  }
  const guardado = validado.data[entrada.campo];
  if (guardado == null) return { ok: false, mensaje: 'El nuevo valor de refracción es obligatorio.' };
  return {
    ok: true,
    campo: entrada.campo,
    nuevo_valor: String(guardado),
    motivo,
    tipo_nota: entrada.autorId === entrada.profesionalAtencionId ? 'correccion' : 'complementaria',
  };
}

function valorAnterior(adenda: AdendaPlano, original: Record<string, string>, porId: Map<string, AdendaPlano>): string {
  if (adenda.valor_anterior_ref.startsWith('atencion_adendas:')) {
    const id = adenda.valor_anterior_ref.slice('atencion_adendas:'.length);
    return porId.get(id)?.nuevo_valor ?? 'Sin registro';
  }
  return original[adenda.campo_ref] || 'Sin registro';
}

/**
 * Copia el original y arma la línea de tiempo. No muta `originalRefraccion`.
 * La marca «corregido por adenda #n» solo la pone una corrección del mismo
 * profesional. La nota de otro profesional es complementaria.
 */
export function proyectarHistorial(entrada: {
  autorOriginal: string;
  horaOriginalBogota: string | null;
  originalRefraccion: Record<string, string>;
  adendas: AdendaPlano[];
}): HistorialProyectado {
  const original = { ...entrada.originalRefraccion };
  const ordenadas = [...entrada.adendas].sort((a, b) => a.numero - b.numero || a.id.localeCompare(b.id));
  const porId = new Map(ordenadas.map((adenda) => [adenda.id, adenda]));
  const marcas: Record<string, string> = {};
  const linea: LineaHistorial[] = [
    {
      orden: 0,
      tipo: 'original',
      numero: null,
      tipo_nota: null,
      campo_ref: null,
      campo_etiqueta: null,
      valor_anterior: null,
      nuevo_valor: null,
      motivo: null,
      autor: entrada.autorOriginal,
      hora_bogota: entrada.horaOriginalBogota,
      marca: null,
    },
  ];
  ordenadas.forEach((adenda, indice) => {
    const marca = adenda.tipo_nota === 'correccion' ? marcaCorreccion(adenda.numero) : null;
    if (marca) marcas[adenda.campo_ref] = marca;
    linea.push({
      orden: indice + 1,
      tipo: 'adenda',
      numero: adenda.numero,
      tipo_nota: adenda.tipo_nota,
      campo_ref: adenda.campo_ref,
      campo_etiqueta: ETIQUETAS_REFRACCION[adenda.campo_ref],
      valor_anterior: valorAnterior(adenda, original, porId),
      nuevo_valor: adenda.nuevo_valor,
      motivo: adenda.motivo,
      autor: adenda.autor,
      hora_bogota: adenda.hora_bogota,
      marca,
    });
  });
  return { original_refraccion: original, marcas, linea };
}

export function armarDocumentoHistoriaClinica(entrada: EntradaPdfHistoria): {
  titulo: string;
  aviso: string;
  lineas: string[];
} {
  const lineas = [
    'BORRADOR – requiere revisión jurídica',
    entrada.folio == null ? 'Folio: sin folio' : `Folio: ${entrada.folio}`,
    `Hora (America/Bogota): ${entrada.hora_bogota ?? 'sin hora'}`,
    entrada.sello ? `Sello: ${entrada.sello}` : 'Sello: sin sello',
    'Atención original',
  ];
  for (const seccion of entrada.secciones) {
    lineas.push(`${seccion.titulo}: ${seccion.texto}`);
  }
  lineas.push('Adendas');
  const adendas = entrada.adendas.filter((linea) => linea.tipo === 'adenda');
  if (adendas.length === 0) lineas.push('Sin adendas');
  for (const adenda of adendas) {
    lineas.push(
      `Adenda #${adenda.numero ?? ''} ${adenda.tipo_nota === 'complementaria' ? 'nota complementaria' : 'corrección'}`,
    );
    lineas.push(`Campo: ${adenda.campo_etiqueta ?? adenda.campo_ref ?? ''}`);
    lineas.push(`Valor original de referencia: ${adenda.valor_anterior ?? 'Sin registro'}`);
    lineas.push(`Valor de la adenda: ${adenda.nuevo_valor ?? ''}`);
    lineas.push(`Quién: ${adenda.autor}`);
    lineas.push(`Cuándo: ${adenda.hora_bogota ?? 'sin hora'}`);
    lineas.push(`Por qué: ${adenda.motivo ?? ''}`);
    if (adenda.marca) lineas.push(adenda.marca);
  }
  return {
    titulo: 'Historia clínica',
    aviso: 'BORRADOR – requiere revisión jurídica',
    lineas,
  };
}
