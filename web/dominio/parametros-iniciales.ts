// PLT-11 (T06) — Valores iniciales editables de `parametros_tenant`.
// La zona `America/Bogota` y la moneda COP son convención de producto
// (regla 3), no una tarifa. La retención de historias clínicas arranca en
// 15 años, editable, rotulada según la norma ya verificada en la spec.
// TODO(Q-07): plazos de logs, facturas y aviso de incidente quedan sin
// cantidad: editables y rotulados «provisional»; ningún número se presenta
// como obligación legal.
// TODO(Q-18): la vigencia y la cantidad de la prescripción no se siembran
// aquí (sin valor por defecto; las escribe el profesional en OPT-05).

export const ZONA_HORARIA_INICIAL = 'America/Bogota';
export const MONEDA_INICIAL = 'COP';
export const RETENCION_HISTORIAS_ANIOS_INICIAL = 15;
export const ROTULO_RETENCION_HISTORIAS = 'según Res. 839/2017 (verificada)';
export const ROTULO_PROVISIONAL = 'provisional';

export const CLAVES_PARAMETRO = [
  'zona_horaria',
  'moneda',
  'retencion_historias_anios',
  'plazo_conservacion_logs',
  'plazo_conservacion_facturas',
  'plazo_aviso_incidente',
  // SEG-01 (T08): el asesor no exige MFA salvo que el tenant lo active.
  'mfa_obligatoria_asesor',
] as const;

export type ClaveParametro = (typeof CLAVES_PARAMETRO)[number];

export type ParametroInicial = {
  clave: ClaveParametro;
  valor: string | number | boolean | null;
  rotulo: string | null;
};

export function parametrosIniciales(): ParametroInicial[] {
  return [
    { clave: 'zona_horaria', valor: ZONA_HORARIA_INICIAL, rotulo: null },
    { clave: 'moneda', valor: MONEDA_INICIAL, rotulo: null },
    {
      clave: 'retencion_historias_anios',
      valor: RETENCION_HISTORIAS_ANIOS_INICIAL,
      rotulo: ROTULO_RETENCION_HISTORIAS,
    },
    // TODO(Q-07): sin cantidad por defecto.
    { clave: 'plazo_conservacion_logs', valor: null, rotulo: ROTULO_PROVISIONAL },
    { clave: 'plazo_conservacion_facturas', valor: null, rotulo: ROTULO_PROVISIONAL },
    { clave: 'plazo_aviso_incidente', valor: null, rotulo: ROTULO_PROVISIONAL },
    { clave: 'mfa_obligatoria_asesor', valor: false, rotulo: null },
  ];
}

export function zonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('es-CO', { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}
