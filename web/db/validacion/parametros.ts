// PLT-11 (T06) — DTOs de parámetros, festivos y tarifas. Sin porcentajes ni
// plazos legales por defecto (TODO Q-07, Q-31, Q-32).
import { z } from 'zod';

import { CLAVES_PARAMETRO, zonaHorariaValida, type ClaveParametro } from '../../dominio/parametros-iniciales';

const UUID = z.uuid('debe ser un UUID válido');

const valorZona = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(zonaHorariaValida, 'la zona horaria no es válida');

const valorMoneda = z.literal('COP', 'la moneda de esta versión es COP');

const valorAnios = z.number().int().positive().max(200);

const valorPlazo = z.number().int().positive().max(200).nullable();

export const EsquemaActualizarParametro = z
  .object({
    tenant_id: UUID,
    clave: z.enum(CLAVES_PARAMETRO),
    valor: z.union([z.string(), z.number(), z.null()]),
  })
  .superRefine((dato, ctx) => {
    const esquema = esquemaValor(dato.clave);
    const resultado = esquema.safeParse(dato.valor);
    if (!resultado.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['valor'],
        message: resultado.error.issues[0]?.message ?? 'el valor no corresponde a la clave',
      });
    }
  });

function esquemaValor(clave: ClaveParametro): z.ZodType<string | number | null> {
  switch (clave) {
    case 'zona_horaria':
      return valorZona;
    case 'moneda':
      return valorMoneda;
    case 'retencion_historias_anios':
      return valorAnios;
    case 'plazo_conservacion_logs':
    case 'plazo_conservacion_facturas':
    case 'plazo_aviso_incidente':
      return valorPlazo;
    default: {
      const agotado: never = clave;
      return agotado;
    }
  }
}

export const EsquemaTarifaImpuesto = z.object({
  tenant_id: UUID,
  nombre: z.string().trim().min(1, 'el nombre de la tarifa es obligatorio').max(120),
  porcentaje_bp: z
    .number()
    .int('el porcentaje en puntos básicos es un entero')
    .min(0)
    .max(10000),
  excluido: z.boolean(),
  exento: z.boolean(),
});

export const EsquemaCambiarTarifa = EsquemaTarifaImpuesto.extend({
  tarifa_id: UUID,
});

export type ActualizarParametro = z.input<typeof EsquemaActualizarParametro>;
export type TarifaImpuestoEntrada = z.input<typeof EsquemaTarifaImpuesto>;
export type CambiarTarifaEntrada = z.input<typeof EsquemaCambiarTarifa>;
