// OPT-01 (T19) — Firma del optómetra. Reutiliza el servicio de T14.
import { NextResponse } from 'next/server';

import { ErrorAtencion, firmarAtencion } from '@/db/atenciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await firmarAtencion(ctx, id));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo firmar la atención.');
    return NextResponse.json({ error: 'No se pudo firmar la atención.' }, { status: 400 });
  }
}
