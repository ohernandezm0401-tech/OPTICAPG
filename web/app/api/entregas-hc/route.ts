// OPT-06 (T25) — Solicitud de la copia gratuita. El código sale por el puerto de correo.
import { NextResponse } from 'next/server';

import { ErrorEntrega, solicitarCopiaHc } from '@/db/entregas-hc';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ctx = await contextoAtencionHttp(request);
    const cuerpo = await request.json().catch(() => null);
    const solicitud = await solicitarCopiaHc(ctx, cuerpo);
    return NextResponse.json(solicitud);
  } catch (error) {
    if (error instanceof ErrorEntrega) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo solicitar la copia de la historia clínica.');
    return NextResponse.json({ error: 'No se pudo solicitar la copia de la historia clínica.' }, { status: 400 });
  }
}
