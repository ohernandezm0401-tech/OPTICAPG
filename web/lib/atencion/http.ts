// OPT-01 (T19/T20) — Sesión HTTP de la atención. Sin UUID no hay fila clínica.
// La tarjeta vigente se lee del perfil; no se asume por el rol.
import 'server-only';

import { z } from 'zod';

import { ErrorAtencion, type ContextoAtencion } from '../../db/atenciones';
import { obtenerPool } from '../../db/index';
import { tarjetaDeclaradaVigente } from '../../dominio/firma';
import { auth } from '../auth';

async function tarjetaVigente(tenantId: string, usuarioId: string): Promise<boolean> {
  if (!z.uuid().safeParse(tenantId).success || !z.uuid().safeParse(usuarioId).success) return false;
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const filas = await cliente.query<{ registro_profesional: string; vigente_hasta: string | null }>(
      `select registro_profesional, vigente_hasta::text as vigente_hasta
         from perfiles_profesionales
        where usuario_id = $1`,
      [usuarioId],
    );
    await cliente.query('COMMIT');
    const perfil = filas.rows[0];
    if (!perfil) return false;
    return tarjetaDeclaradaVigente(perfil.registro_profesional, perfil.vigente_hasta, new Date());
  } catch {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Sin perfil no hay tarjeta vigente.
    }
    return false;
  } finally {
    cliente.release();
  }
}

export async function contextoAtencionHttp(request?: Request): Promise<ContextoAtencion> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.id || !usuario.role) {
    throw new ErrorAtencion(401, 'Debe iniciar sesión.');
  }
  const sede = usuario.sedeId ?? '';
  const sedes = (usuario.sedesAccess ?? []).filter((item) => item.length > 0);
  const profesional = usuario.role === 'optometra' || usuario.role === 'oftalmologo';
  const tenantId = usuario.empresaId ?? '';
  return {
    tenant_id: tenantId,
    usuario_id: usuario.id,
    sede_id: sede,
    sedes: sedes.length > 0 ? sedes : sede ? [sede] : [],
    rol: usuario.role,
    sesion_id: usuario.sesionId ?? null,
    tarjeta_profesional_vigente: profesional ? await tarjetaVigente(tenantId, usuario.id) : true,
    ip: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    agente: request?.headers.get('user-agent') ?? null,
  };
}
