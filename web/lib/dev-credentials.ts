/**
 * CREDENCIALES SOLO DE DESARROLLO.
 *
 * Cuentas ficticias para probar la app sin base de datos.
 * No son usuarios reales y no deben usarse en producción.
 * `lib/auth.ts` las ignora en cuanto Supabase está configurado.
 */
export const DEV_ONLY_CREDENTIALS: Readonly<Record<string, string>> = {
  'owner@optisaas.co': 'owner123',
  'admin@visiontotal.com': 'admin123',
  'carlos@visiontotal.com': 'asesor123',
  'dra.vega@visiontotal.com': 'opto123',
  'admin@opticentro.com': 'admin123',
};
