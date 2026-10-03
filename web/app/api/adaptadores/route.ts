// SEG-12 (T11) — Secretos de adaptadores. La respuesta solo lleva el DTO
// público (`respuestaPublicaAdaptadores`): nunca el valor ni el sobre.
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { respuestaPublicaAdaptadores } from '@/lib/cifrado/almacen.mjs';
import { guardarSecretoAdaptador, listarAdaptadores } from '@/lib/cifrado/servicio';
import { ErrorCifrado } from '@/lib/cifrado/aes.mjs';

async function tenantDeSesion(): Promise<{ tenantId: string; rol: string } | null> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.empresaId) return null;
  return { tenantId: usuario.empresaId, rol: usuario.role ?? '' };
}

export async function GET() {
  const actor = await tenantDeSesion();
  if (!actor) {
    return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
  }
  const cuerpo = await listarAdaptadores(actor.tenantId);
  return NextResponse.json(respuestaPublicaAdaptadores(cuerpo.adaptadores));
}

export async function POST(request: Request) {
  const actor = await tenantDeSesion();
  if (!actor) {
    return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
  }
  if (actor.rol !== 'admin') {
    return NextResponse.json({ error: 'No tiene permiso para guardar secretos de adaptadores.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  const adaptador = typeof body.adaptador === 'string' ? body.adaptador : '';
  const nombre = typeof body.nombre === 'string' ? body.nombre : '';
  const secreto = typeof body.secreto === 'string' ? body.secreto : '';
  try {
    const guardado = await guardarSecretoAdaptador({
      tenantId: actor.tenantId,
      adaptador,
      nombre,
      secreto,
    });
    return NextResponse.json(respuestaPublicaAdaptadores([guardado]));
  } catch (error) {
    if (error instanceof ErrorCifrado) {
      return NextResponse.json({ error: 'No se pudo guardar el secreto.' }, { status: 400 });
    }
    throw error;
  }
}
