// OPT-01 (T19) — Valores ópticos numéricos. Los límites son de captura
// (spec OPT-01 regla 2): propuestos para detectar errores de digitación,
// no son normativos ni diagnósticos. La agudeza no trae rango en la spec;
// 0 a 2,00 es un tope de captura en la misma línea, no una cifra legal.
// TODO(Q-25): `telemedicina` queda reservada en el tipo y no se acepta aquí.
import { z } from 'zod';

export const LIMITES_CAPTURA = {
  esfera: { min: -30, max: 30 },
  cilindro: { min: -10, max: 10 },
  eje: { min: 0, max: 180 },
  adicion: { min: 0.25, max: 4 },
  agudeza: { min: 0, max: 2 },
  dip: { min: 40, max: 80 },
  dipMonocular: { min: 20, max: 40 },
} as const;

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

function mensajeRango(min: number, max: number): string {
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

const esfera = dioptria(LIMITES_CAPTURA.esfera.min, LIMITES_CAPTURA.esfera.max);
const cilindro = dioptria(LIMITES_CAPTURA.cilindro.min, LIMITES_CAPTURA.cilindro.max);
const adicion = dioptria(LIMITES_CAPTURA.adicion.min, LIMITES_CAPTURA.adicion.max);
const eje = z
  .number()
  .int('El eje debe ser un entero.')
  .min(LIMITES_CAPTURA.eje.min, mensajeRango(LIMITES_CAPTURA.eje.min, LIMITES_CAPTURA.eje.max))
  .max(LIMITES_CAPTURA.eje.max, mensajeRango(LIMITES_CAPTURA.eje.min, LIMITES_CAPTURA.eje.max));
const agudeza = z
  .number()
  .min(LIMITES_CAPTURA.agudeza.min, mensajeRango(LIMITES_CAPTURA.agudeza.min, LIMITES_CAPTURA.agudeza.max))
  .max(LIMITES_CAPTURA.agudeza.max, mensajeRango(LIMITES_CAPTURA.agudeza.min, LIMITES_CAPTURA.agudeza.max));
const dip = z
  .number()
  .int('La DIP se registra en milímetros enteros.')
  .min(LIMITES_CAPTURA.dip.min, mensajeRango(LIMITES_CAPTURA.dip.min, LIMITES_CAPTURA.dip.max))
  .max(LIMITES_CAPTURA.dip.max, mensajeRango(LIMITES_CAPTURA.dip.min, LIMITES_CAPTURA.dip.max));
const dipMonocular = z
  .number()
  .int('La DIP monocular se registra en milímetros enteros.')
  .min(LIMITES_CAPTURA.dipMonocular.min, mensajeRango(LIMITES_CAPTURA.dipMonocular.min, LIMITES_CAPTURA.dipMonocular.max))
  .max(LIMITES_CAPTURA.dipMonocular.max, mensajeRango(LIMITES_CAPTURA.dipMonocular.min, LIMITES_CAPTURA.dipMonocular.max));

export const esquemaExamenOptometrico = z
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

export type ExamenOptometrico = z.infer<typeof esquemaExamenOptometrico>;

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

export const esquemaCrearAtencion = z
  .object({
    paciente_id: z.uuid('El paciente no es válido.'),
    tipo: z.enum(TIPOS_ATENCION),
    modalidad: z.enum(MODALIDADES_ATENCION).optional(),
    urgencia: z.boolean().optional(),
    motivo: z.string().trim().min(1, 'El motivo es obligatorio.').max(4000),
    examen: esquemaExamenOptometrico,
    diagnostico: esquemaDiagnosticoAtencion,
    plan: esquemaPlanManejo,
  })
  .strict()
  .superRefine((dato, ctx) => {
    if (dato.modalidad === 'telemedicina') {
      ctx.addIssue({
        code: 'custom',
        path: ['modalidad'],
        message: 'La telemedicina no está habilitada.',
      });
    }
  });

export const esquemaActualizarAtencion = z
  .object({
    motivo: z.string().trim().min(1).max(4000).optional(),
    examen: esquemaExamenOptometrico.optional(),
    diagnostico: esquemaDiagnosticoAtencion.optional(),
    plan: esquemaPlanManejo.optional(),
    modalidad: z.enum(MODALIDADES_ATENCION).optional(),
  })
  .strict()
  .superRefine((dato, ctx) => {
    if (dato.modalidad === 'telemedicina') {
      ctx.addIssue({
        code: 'custom',
        path: ['modalidad'],
        message: 'La telemedicina no está habilitada.',
      });
    }
  });

export type CrearAtencionEntrada = z.infer<typeof esquemaCrearAtencion>;
export type ActualizarAtencionEntrada = z.infer<typeof esquemaActualizarAtencion>;

export function modalidadGuardada(): 'presencial' {
  return 'presencial';
}
