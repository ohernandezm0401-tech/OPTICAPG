import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { cambiarSedeActiva } from '@/lib/authz/sede';
import { actorDesdeSesion } from '@/lib/authz/sesion';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
  }
  const cuerpo = (await request.json().catch(() => ({}))) as { sedeId?: unknown };
  const actor = actorDesdeSesion({
    id: session.user.id,
    role: session.user.role,
    empresaId: session.user.empresaId,
    sedeId: session.user.sedeId,
    sedesAccess: session.user.sedesAccess,
  });
  const resultado = cambiarSedeActiva(actor, String(cuerpo.sedeId ?? ''));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.mensaje }, { status: resultado.status });
  }
  return NextResponse.json({ sedeId: resultado.sedeId });
}
