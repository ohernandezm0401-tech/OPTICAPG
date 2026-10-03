import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { responderConsultaAdaptadores, responderGuardadoAdaptador } from '@/lib/cifrado/consulta-adaptadores';

export async function GET(request: Request) {
  const sesion = await auth();
  return responderConsultaAdaptadores(sesion, new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  const sesion = await auth();
  let cuerpo: unknown = null;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'Los datos del adaptador no son válidos.' }, { status: 400 });
  }
  return responderGuardadoAdaptador(sesion, cuerpo);
}
