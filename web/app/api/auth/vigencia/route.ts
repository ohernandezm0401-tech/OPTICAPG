// SEG-01 (T07) — Una sesión revocada deja de ser válida en esta petición.
// El JWT se decodifica y `sesionVigente` consulta `sesiones.revocada_en`.
// La respuesta no incluye contraseñas ni hashes.
import { NextResponse } from 'next/server';

import { permiteCuentasLocales } from '@/lib/auth/cuentas-locales';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sesion = await auth();
  if (sesion?.user?.devLocal && !sesion.user.sesionId) {
    if (permiteCuentasLocales()) return NextResponse.json({ vigente: true });
    return NextResponse.json({ vigente: false }, { status: 401 });
  }
  if (!sesion?.user?.sesionId) {
    return NextResponse.json({ vigente: false }, { status: 401 });
  }
  return NextResponse.json({ vigente: true });
}
