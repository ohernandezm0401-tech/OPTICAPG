// OPT-05 (T23) — La corrección es una prescripción nueva. La anterior queda sustituida.
import { NextResponse } from 'next/server';

import { ErrorPrescripcion, corregirPrescripcion, leerPrescripcion } from '@/db/prescripciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    const nueva = await corregirPrescripcion(ctx, id, cuerpo);
    const anterior = await leerPrescripcion(ctx, id);
    return NextResponse.json({ nueva, anterior });
  } catch (error) {
    if (error instanceof ErrorPrescripcion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudo corregir la prescripción.');
    return NextResponse.json({ error: 'No se pudo corregir la prescripción.' }, { status: 400 });
  }
}
