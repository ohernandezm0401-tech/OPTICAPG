// SEG-01 (T07) — Las cuentas locales generadas por `npm run seed:dev` solo
// sirven en `desarrollo` (y el alias `demo`) con el modo demo. En `pruebas`
// y `produccion` el inicio es solo contra la base (Argon2id).

import { obtenerAppEnv, type VariablesEntorno } from '../entorno';

export function permiteCuentasLocales(variables: VariablesEntorno = process.env): boolean {
  const entorno = obtenerAppEnv(variables);
  if (entorno !== 'desarrollo' && entorno !== 'demo') return false;
  const modo = variables.APP_MODE ?? variables.NEXT_PUBLIC_APP_MODE;
  if (modo === 'demo') return true;
  if (modo) return false;
  return variables.NODE_ENV !== 'production';
}
