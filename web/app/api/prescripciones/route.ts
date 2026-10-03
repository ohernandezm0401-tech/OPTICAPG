// OPT-05 (T23) — Alta de prescripción firmada. Sin vigencia por defecto.
import { NextResponse } from 'next/server';

import { ErrorPrescripcion, crearPrescripcion, prepararPrescripcion } from '@/db/prescripciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

function responder(error: unknown) {
  if (error instanceof ErrorPrescripcion) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }
  console.error('No se pudo guardar la prescripción.');
  return NextResponse.json({ error: 'No se pudo guardar la prescripción.' }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const atencionId = url.searchParams.get('atencion_id') ?? '';
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await prepararPrescripcion(ctx, atencionId));
  } catch (error) {
    return responder(error);
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await crearPrescripcion(ctx, cuerpo));
  } catch (error) {
    return responder(error);
  }
}
