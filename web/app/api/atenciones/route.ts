// OPT-01 (T19) — Alta de atención. La sesión de demostración no tiene UUID.
import { NextResponse } from 'next/server';

import { crearAtencion, ErrorAtencion } from '@/db/atenciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp();
    return NextResponse.json(await crearAtencion(ctx, cuerpo));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudo crear la atención.');
    return NextResponse.json({ error: 'No se pudo crear la atención.' }, { status: 400 });
  }
}
