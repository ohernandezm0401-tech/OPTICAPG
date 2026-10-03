// PLT-11 (T06) — Tarifas de impuesto y snapshot de línea cerrada.
// TODO(Q-31): valor por defecto aplicado — no hay tarifa ni porcentaje
// embebido. Quien crea la tarifa entrega `porcentaje_bp` (puntos básicos:
// 1 % = 100). El dinero se calcula en COP enteros.
// Cambiar la tarifa vigente no reescribe el snapshot ya guardado en la línea.

export type TarifaParaInstantanea = {
  id: string;
  nombre: string;
  porcentaje_bp: number;
  excluido: boolean;
  exento: boolean;
  vigente_desde: Date;
};

export type ImpuestoSnapshot = {
  tarifa_impuesto_id: string;
  nombre: string;
  porcentaje_bp: number;
  excluido: boolean;
  exento: boolean;
  vigente_desde: string;
};

export function capturarInstantaneaImpuesto(tarifa: TarifaParaInstantanea): ImpuestoSnapshot {
  if (!Number.isInteger(tarifa.porcentaje_bp) || tarifa.porcentaje_bp < 0 || tarifa.porcentaje_bp > 10000) {
    throw new Error('el porcentaje en puntos básicos debe ser un entero entre 0 y 10000');
  }
  if (Number.isNaN(tarifa.vigente_desde.getTime())) {
    throw new Error('la vigencia de la tarifa no es una fecha válida');
  }
  return {
    tarifa_impuesto_id: tarifa.id,
    nombre: tarifa.nombre,
    porcentaje_bp: tarifa.porcentaje_bp,
    excluido: tarifa.excluido,
    exento: tarifa.exento,
    vigente_desde: tarifa.vigente_desde.toISOString(),
  };
}

/** COP enteros a partir del snapshot. Excluido o exento no suma impuesto. */
export function impuestoLineaCerradaCop(baseCop: number, instantanea: ImpuestoSnapshot): number {
  if (!Number.isInteger(baseCop) || baseCop < 0) {
    throw new Error('la base debe ser un entero en COP mayor o igual a cero');
  }
  if (instantanea.excluido || instantanea.exento) return 0;
  return Math.round((baseCop * instantanea.porcentaje_bp) / 10000);
}
