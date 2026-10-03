// SEG-01 (T07) — Cierra todas las sesiones de servidor del usuario actual.
import { NextResponse } from 'next/server';

import { obtenerAuthPort } from '@/lib/auth/authjs';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const sesion = await auth();
  const usuarioId = sesion?.user?.id;
  if (!usuarioId || sesion.user.devLocal || !sesion.user.sesionId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const cerradas = await obtenerAuthPort().revocarTodas(usuarioId);
  return NextResponse.json({ cerradas });
}
