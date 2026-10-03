// SEG-01 (T08) — Lectura del cuerpo HTTP del segundo factor.
// La respuesta de error es siempre la misma: no dice si el ticket existe.
import { MENSAJE_MFA_INVALIDO } from '../puerto';
import { resolverWebAuthn, type ContextoWebAuthn } from './webauthn';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ticketValido(valor: unknown): valor is string {
  return typeof valor === 'string' && UUID.test(valor);
}

export async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo = (await request.json()) as unknown;
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return null;
    return cuerpo as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function origenSolicitud(request: Request): string | null {
  const origin = request.headers.get('origin');
  if (origin) return origin;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return null;
  const proto = (request.headers.get('x-forwarded-proto') ?? 'http').split(',')[0]?.trim() || 'http';
  return `${proto}://${host.split(',')[0]?.trim()}`;
}

export function contextoDe(request: Request): ContextoWebAuthn | null {
  return resolverWebAuthn(origenSolicitud(request));
}

export function errorMfa(): { error: string } {
  return { error: MENSAJE_MFA_INVALIDO };
}
