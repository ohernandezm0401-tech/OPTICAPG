// PLT-07 (T28) — RPO y RTO.
// TODO(Q-07): valores editables y rotulados «provisional». Ningún número se
// asume ni se presenta como obligación legal.

/**
 * @param {{ clave: string, valor: string | null, rotulo?: string | null }[]} filas
 */
export function leerParContinuidad(filas) {
  // TODO(Q-07): sin valor por defecto.
  const campo = (clave) => {
    const fila = filas.find((item) => item.clave === clave);
    if (!fila || fila.valor == null) return null;
    const texto = String(fila.valor).trim();
    return texto === '' ? null : texto;
  };
  return {
    rpo: campo('rpo'),
    rto: campo('rto'),
    rotulo: 'provisional',
    nota: 'TODO(Q-07)',
  };
}

/**
 * @param {Record<string, string | undefined>} [variables]
 */
export function entornoPermitePruebaRestauracion(variables = process.env) {
  if (variables.APP_ENV === 'produccion') return false;
  return variables.APP_ENV === 'desarrollo' || variables.APP_ENV === 'pruebas' || variables.APP_ENV === 'demo';
}
