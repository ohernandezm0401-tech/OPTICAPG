// SEG-12 (T11) — Consulta de adaptadores para la API.
// El cuerpo solo usa la vista pública: nunca el sobre ni el secreto.
import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ErrorCifrado } from './aes';
import { ADAPTADORES, NOMBRES_SECRETO_ADAPTADOR, type Adaptador, type NombreSecretoAdaptador } from './campos';
import { obtenerCifrado } from './servicio';

const EsquemaGuardar = z.object({
  tenant_id: z.uuid(),
  adaptador: z.enum(ADAPTADORES),
  nombre: z.enum(NOMBRES_SECRETO_ADAPTADOR),
  secreto: z.string().trim().min(1).max(4000),
});

export type SesionAdaptadores = {
  user?: {
    id?: string;
    role?: string;
    empresaId?: string;
  } | null;
} | null;

function exigirPlataforma(sesion: SesionAdaptadores): { ok: true } | { ok: false; respuesta: NextResponse } {
  if (!sesion?.user?.id) {
    return { ok: false, respuesta: NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 }) };
  }
  if (sesion.user.role !== 'owner') {
    return {
      ok: false,
      respuesta: NextResponse.json({ error: 'No tiene permiso para consultar los adaptadores.' }, { status: 403 }),
    };
  }
  return { ok: true };
}

export async function responderConsultaAdaptadores(
  sesion: SesionAdaptadores,
  parametros: URLSearchParams,
): Promise<NextResponse> {
  const permiso = exigirPlataforma(sesion);
  if (!permiso.ok) return permiso.respuesta;
  const tenant = z.uuid().safeParse(parametros.get('tenant_id'));
  if (!tenant.success) {
    return NextResponse.json({ error: 'Indique el tenant.' }, { status: 400 });
  }
  const adaptadores = await obtenerCifrado().listarAdaptadores(tenant.data);
  return NextResponse.json({ adaptadores });
}

export async function responderGuardadoAdaptador(sesion: SesionAdaptadores, cuerpo: unknown): Promise<NextResponse> {
  const permiso = exigirPlataforma(sesion);
  if (!permiso.ok) return permiso.respuesta;
  const datos = EsquemaGuardar.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: 'Los datos del adaptador no son válidos.' }, { status: 400 });
  }
  try {
    await obtenerCifrado().guardarSecretoAdaptador(
      datos.data.tenant_id,
      datos.data.adaptador as Adaptador,
      datos.data.nombre as NombreSecretoAdaptador,
      datos.data.secreto,
    );
  } catch (error) {
    const mensaje = error instanceof ErrorCifrado ? error.message : 'No se pudo guardar el adaptador.';
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    adaptador: datos.data.adaptador,
    nombre: datos.data.nombre,
    configurado: true,
  });
}
