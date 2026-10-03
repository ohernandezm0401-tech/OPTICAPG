// OPT-01 (T19) — Sesión HTTP de la atención. Sin UUID no hay fila clínica.
import 'server-only';

import { ErrorAtencion, type ContextoAtencion } from '../../db/atenciones';
import { auth } from '../auth';

export async function contextoAtencionHttp(request?: Request): Promise<ContextoAtencion> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.id || !usuario.role) {
    throw new ErrorAtencion(401, 'Debe iniciar sesión.');
  }
  const sede = usuario.sedeId ?? '';
  const sedes = (usuario.sedesAccess ?? []).filter((item) => item.length > 0);
  const profesional = usuario.role === 'optometra' || usuario.role === 'oftalmologo';
  return {
    tenant_id: usuario.empresaId ?? '',
    usuario_id: usuario.id,
    sede_id: sede,
    sedes: sedes.length > 0 ? sedes : sede ? [sede] : [],
    rol: usuario.role,
    sesion_id: usuario.sesionId ?? null,
    tarjeta_profesional_vigente: profesional ? false : true,
    ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    agente: request?.headers.get('user-agent') ?? null,
  };
}
