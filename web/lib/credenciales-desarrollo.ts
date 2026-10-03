// PLT-10 (T05) — Cuentas locales de desarrollo (módulo puro, apto para Edge).
//
// Las cuentas son sintéticas y solo viven en la máquina del desarrollador:
// `npm run seed:dev` genera contraseñas aleatorias y las deja en la variable
// `CUENTAS_DEV_JSON` de `.env.local` (no versionado) y en
// `.credenciales-desarrollo.local.json` (para las pruebas E2E). Este módulo
// solo lee la variable de entorno (sin `node:*`) para que `lib/auth.ts`
// siga empaquetándose en el middleware. En producción la variable no existe
// y el inicio de sesión de demostración está desactivado.
export const VARIABLE_CUENTAS_DEV = 'CUENTAS_DEV_JSON';

function esRegistroValido(datos: unknown): datos is Record<string, string> {
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) return false;
  return Object.entries(datos).every(
    ([correo, clave]) =>
      typeof correo === 'string' &&
      correo.includes('@') &&
      typeof clave === 'string' &&
      clave.length >= 12,
  );
}

// Lee las cuentas generadas por `npm run seed:dev`. Devuelve un registro
// vacío si la variable no existe o es inválida (nunca aborta: en producción
// simplemente no hay cuentas de demostración).
export function cargarCredencialesDesarrollo(
  variables: Record<string, string | undefined> = process.env,
): Record<string, string> {
  const crudo = variables[VARIABLE_CUENTAS_DEV];
  if (!crudo) return {};
  try {
    const datos: unknown = JSON.parse(crudo);
    if (!esRegistroValido(datos)) return {};
    const normalizadas: Record<string, string> = {};
    for (const [correo, clave] of Object.entries(datos)) {
      normalizadas[correo.trim().toLowerCase()] = clave;
    }
    return normalizadas;
  } catch {
    return {};
  }
}
