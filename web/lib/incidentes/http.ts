// SEG-11 (T29) — Sesión de la pantalla de incidentes.
import 'server-only';

import { ErrorIncidente, type ContextoIncidente } from '../../db/incidentes';
import { auth } from '../auth';

export async function contextoIncidenteHttp(request?: Request): Promise<ContextoIncidente> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.id || !usuario.role) {
    throw new ErrorIncidente(401, 'Debe iniciar sesión.');
  }
  return {
    tenant_id: usuario.empresaId ?? '',
    usuario_id: usuario.id,
    rol: usuario.role,
    sede_id: usuario.sedeId ?? null,
    ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    agente: request?.headers.get('user-agent') ?? null,
  };
}
