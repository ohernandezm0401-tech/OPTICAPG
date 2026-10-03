// SEG-01 (T08) — Relying party de WebAuthn. En producción hacen falta
// `WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGIN` (no son secretos, pero el origen no se
// toma del encabezado Host para evitar un RP fijado por el cliente). Fuera de
// producción se acepta localhost o 127.0.0.1. El navegador rechaza una IP
// como relying party (`SecurityError: invalid domain`): en local hay que
// abrir la app en `localhost`, no en `127.0.0.1`.
import { esProduccion, type VariablesEntorno } from '../../entorno';

export const NOMBRE_RP = 'OptiSaaS';

export type ContextoWebAuthn = { rpID: string; origin: string };

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1']);

export function resolverWebAuthn(
  origenSolicitud: string | null,
  variables: VariablesEntorno = process.env,
): ContextoWebAuthn | null {
  const rpConfigurado = variables.WEBAUTHN_RP_ID?.trim();
  const origenConfigurado = variables.WEBAUTHN_ORIGIN?.trim();
  if (rpConfigurado && origenConfigurado) {
    if (origenSolicitud && origenSolicitud !== origenConfigurado) return null;
    return { rpID: rpConfigurado, origin: origenConfigurado };
  }
  if (esProduccion(variables)) return null;
  if (!origenSolicitud) return null;
  try {
    const url = new URL(origenSolicitud);
    if (!HOSTS_LOCALES.has(url.hostname)) return null;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return { rpID: url.hostname, origin: url.origin };
  } catch {
    return null;
  }
}
