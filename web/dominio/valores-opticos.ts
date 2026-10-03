// OPT-01 (T19/T20) — Valores ópticos numéricos. Los rangos de captura salen
// de la configuración del tenant (tabla `limites_captura`). Si no hay fila,
// se usan los valores propuestos por la spec (regla 2): no son normativos
// ni diagnósticos. El paso de 0,25 es la regla de la spec, no un límite.
// La agudeza no trae rango en la spec; 0 a 2,00 es el propuesto de captura.
// TODO(Q-25): `telemedicina` queda reservada en el tipo y no se acepta aquí.
import { z } from 'zod';

export interface RangoCaptura {
  min: number;
  max: number;
}

export interface LimitesCaptura {
  esfera: RangoCaptura;
  cilindro: RangoCaptura;
  eje: RangoCaptura;
  adicion: RangoCaptura;
  agudeza: RangoCaptura;
  dip: RangoCaptura;
  dipMonocular: RangoCaptura;
}

/** Propuestos por OPT-01 regla 2. La fila del tenant los reemplaza. */
export const LIMITES_CAPTURA_PROPUESTOS: LimitesCaptura = {
  esfera: { min: -30, max: 30 },
  cilindro: { min: -10, max: 10 },
  eje: { min: 0, max: 180 },
  adicion: { min: 0.25, max: 4 },
  agudeza: { min: 0, max: 2 },
  dip: { min: 40, max: 80 },
  dipMonocular: { min: 20, max: 40 },
};

export const LIMITES_CAPTURA = LIMITES_CAPTURA_PROPUESTOS;

/** Hipótesis de UX de la spec (≤ 30 s). No es un plazo legal. */
export const AUTOGUARDADO_MS = 1500;

export const MODALIDADES_ATENCION = ['presencial', 'telemedicina'] as const;
export type ModalidadAtencion = (typeof MODALIDADES_ATENCION)[number];

export const TIPOS_ATENCION = [
  'primera_vez',
  'control',
  'lc',
  'pediatrica',
  'baja_vision',
  'terapia',
  'tamizaje',
] as const;
export type TipoAtencion = (typeof TIPOS_ATENCION)[number];

export const SCHEMA_VERSION_ATENCION = 1;

const CODIGO_CIE10 = /^[A-Z0-9][A-Z0-9.\-]{0,31}$/;

export function esPasoCuarto(valor: number): boolean {
  if (!Number.isFinite(valor)) return false;
  const centesimas = Math.round(valor * 100);
  return Math.abs(valor * 100 - centesimas) < 1e-6 && centesimas % 25 === 0;
}

export function mensajeRango(min: number, max: number): string {
  return `Fuera del límite de captura (${min} a ${max}).`;
}

function dioptria(min: number, max: number) {
  return z
    .number()
    .min(min, mensajeRango(min, max))
    .max(max, mensajeRango(min, max))
    .refine(esPasoCuarto, 'Use pasos de 0,25.');
}

function opcional<T extends z.ZodType>(esquema: T) {
  return esquema.nullable().optional();
}

export function crearEsquemaExamen(limites: LimitesCaptura = LIMITES_CAPTURA_PROPUESTOS) {
  const esfera = dioptria(limites.esfera.min, limites.esfera.max);
  const cilindro = dioptria(limites.cilindro.min, limites.cilindro.max);
  const adicion = dioptria(limites.adicion.min, limites.adicion.max);
  const eje = z
    .number()
    .int('El eje debe ser un entero.')
    .min(limites.eje.min, mensajeRango(limites.eje.min, limites.eje.max))
    .max(limites.eje.max, mensajeRango(limites.eje.min, limites.eje.max));
  const agudeza = z
    .number()
    .min(limites.agudeza.min, mensajeRango(limites.agudeza.min, limites.agudeza.max))
    .max(limites.agudeza.max, mensajeRango(limites.agudeza.min, limites.agudeza.max));
  const dip = z
    .number()
    .int('La DIP se registra en milímetros enteros.')
    .min(limites.dip.min, mensajeRango(limites.dip.min, limites.dip.max))
    .max(limites.dip.max, mensajeRango(limites.dip.min, limites.dip.max));
  const dipMonocular = z
    .number()
    .int('La DIP monocular se registra en milímetros enteros.')
    .min(limites.dipMonocular.min, mensajeRango(limites.dipMonocular.min, limites.dipMonocular.max))
    .max(limites.dipMonocular.max, mensajeRango(limites.dipMonocular.min, limites.dipMonocular.max));

  return z
    .object({
      esfera_od: opcional(esfera),
      cilindro_od: opcional(cilindro),
      eje_od: opcional(eje),
      adicion_od: opcional(adicion),
      agudeza_od: opcional(agudeza),
      esfera_oi: opcional(esfera),
      cilindro_oi: opcional(cilindro),
      eje_oi: opcional(eje),
      adicion_oi: opcional(adicion),
      agudeza_oi: opcional(agudeza),
      dip: opcional(dip),
      dip_monocular_od: opcional(dipMonocular),
      dip_monocular_oi: opcional(dipMonocular),
    })
    .strict();
}

export const esquemaExamenOptometrico = crearEsquemaExamen();
export type ExamenOptometrico = z.infer<typeof esquemaExamenOptometrico>;

export const esquemaTextoSeccion = z
  .object({
    texto: z.string().trim().max(4000),
  })
  .strict();

export type TextoSeccion = z.infer<typeof esquemaTextoSeccion>;

export const esquemaDiagnosticoAtencion = z
  .object({
    codigo_cie10: z
      .string()
      .trim()
      .regex(CODIGO_CIE10, 'El diagnóstico principal exige un código CIE-10 del catálogo, no texto libre.'),
  })
  .strict();

export const esquemaPlanManejo = z
  .object({
    conducta: z.string().trim().min(1, 'La conducta es obligatoria.').max(4000),
    recomendaciones: z.string().trim().max(4000).nullable().optional(),
    remision: z.string().trim().max(4000).nullable().optional(),
    proximo_control: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de control debe ser AAAA-MM-DD.')
      .nullable()
      .optional(),
  })
  .strict();

export type PlanManejoEntrada = z.infer<typeof esquemaPlanManejo>;

function rechazarTelemedicina(dato: { modalidad?: string }, ctx: z.RefinementCtx) {
  if (dato.modalidad === 'telemedicina') {
    ctx.addIssue({
      code: 'custom',
      path: ['modalidad'],
      message: 'La telemedicina no está habilitada.',
    });
  }
}

export function crearEsquemasAtencion(limites: LimitesCaptura = LIMITES_CAPTURA_PROPUESTOS) {
  const examen = crearEsquemaExamen(limites);
  const crear = z
    .object({
      paciente_id: z.uuid('El paciente no es válido.'),
      tipo: z.enum(TIPOS_ATENCION),
      modalidad: z.enum(MODALIDADES_ATENCION).optional(),
      urgencia: z.boolean().optional(),
      motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(4000),
      antecedentes: esquemaTextoSeccion.optional(),
      queratometria: esquemaTextoSeccion.optional(),
      salud_ocular: esquemaTextoSeccion.optional(),
      examen,
      diagnostico: esquemaDiagnosticoAtencion,
      plan: esquemaPlanManejo,
    })
    .strict()
    .superRefine(rechazarTelemedicina);
  const actualizar = z
    .object({
      motivo: z.string().trim().min(1).max(4000).optional(),
      antecedentes: esquemaTextoSeccion.optional(),
      queratometria: esquemaTextoSeccion.optional(),
      salud_ocular: esquemaTextoSeccion.optional(),
      examen: examen.optional(),
      diagnostico: esquemaDiagnosticoAtencion.optional(),
      plan: esquemaPlanManejo.optional(),
      modalidad: z.enum(MODALIDADES_ATENCION).optional(),
    })
    .strict()
    .superRefine(rechazarTelemedicina);
  return { examen, crear, actualizar };
}

export const esquemaCrearAtencion = crearEsquemasAtencion().crear;
export const esquemaActualizarAtencion = crearEsquemasAtencion().actualizar;

export type CrearAtencionEntrada = z.infer<typeof esquemaCrearAtencion>;
export type ActualizarAtencionEntrada = z.infer<typeof esquemaActualizarAtencion>;

const CAMPOS_TEXTO_EXAMEN = [
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

export type CampoTextoExamen = (typeof CAMPOS_TEXTO_EXAMEN)[number];

export interface CapturaTexto {
  paciente_id: string;
  motivo: string;
  antecedentes: string;
  agudeza_od: string;
  agudeza_oi: string;
  esfera_od: string;
  cilindro_od: string;
  eje_od: string;
  adicion_od: string;
  esfera_oi: string;
  cilindro_oi: string;
  eje_oi: string;
  adicion_oi: string;
  dip: string;
  queratometria: string;
  salud_ocular: string;
  codigo_cie10: string;
  conducta: string;
  recomendaciones: string;
}

export const CAPTURA_VACIA: CapturaTexto = {
  paciente_id: '',
  motivo: '',
  antecedentes: '',
  agudeza_od: '',
  agudeza_oi: '',
  esfera_od: '',
  cilindro_od: '',
  eje_od: '',
  adicion_od: '',
  esfera_oi: '',
  cilindro_oi: '',
  eje_oi: '',
  adicion_oi: '',
  dip: '',
  queratometria: '',
  salud_ocular: '',
  codigo_cie10: '',
  conducta: '',
  recomendaciones: '',
};

function numeroCampo(texto: string): number | null | typeof Number.NaN {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : Number.NaN;
}

export function examenDesdeCaptura(captura: CapturaTexto): { examen: ExamenOptometrico } | { error: string } {
  const examen: Record<string, number | null> = {};
  for (const campo of CAMPOS_TEXTO_EXAMEN) {
    const texto = campo in captura ? (captura[campo as keyof CapturaTexto] ?? '') : '';
    const valor = numeroCampo(texto);
    if (typeof valor === 'number' && Number.isNaN(valor)) {
      return { error: `${campo} no es un número.` };
    }
    if (valor != null) examen[campo] = valor;
  }
  return { examen };
}

export function esquemaCapturaTexto(limites: LimitesCaptura = LIMITES_CAPTURA_PROPUESTOS) {
  return z
    .object({
      paciente_id: z.string().trim().min(1, 'El paciente es obligatorio.'),
      motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(4000),
      antecedentes: z.string().max(4000),
      agudeza_od: z.string(),
      agudeza_oi: z.string(),
      esfera_od: z.string(),
      cilindro_od: z.string(),
      eje_od: z.string(),
      adicion_od: z.string(),
      esfera_oi: z.string(),
      cilindro_oi: z.string(),
      eje_oi: z.string(),
      adicion_oi: z.string(),
      dip: z.string(),
      queratometria: z.string().max(4000),
      salud_ocular: z.string().max(4000),
      codigo_cie10: z
        .string()
        .trim()
        .regex(CODIGO_CIE10, 'El diagnóstico principal exige un código CIE-10 del catálogo, no texto libre.'),
      conducta: z.string().trim().min(1, 'La conducta es obligatoria.').max(4000),
      recomendaciones: z.string().max(4000),
    })
    .superRefine((dato, ctx) => {
      const armado = examenDesdeCaptura(dato);
      if ('error' in armado) {
        ctx.addIssue({ code: 'custom', message: armado.error });
        return;
      }
      const examen = crearEsquemaExamen(limites).safeParse(armado.examen);
      if (!examen.success) {
        for (const issue of examen.error.issues) {
          const campo = issue.path[0];
          ctx.addIssue({
            code: 'custom',
            path: typeof campo === 'string' ? [campo] : [],
            message: issue.message,
          });
        }
      }
      const paciente = z.uuid().safeParse(dato.paciente_id.trim());
      if (!paciente.success) {
        ctx.addIssue({ code: 'custom', path: ['paciente_id'], message: 'El paciente no es válido.' });
      }
    });
}

export function modalidadGuardada(): 'presencial' {
  return 'presencial';
}
