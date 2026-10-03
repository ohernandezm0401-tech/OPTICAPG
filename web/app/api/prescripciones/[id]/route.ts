// OPT-05 (T23) — Lectura y rechazo de modificación.
// El asesor recibe el DTO sin diagnóstico. Actualizar responde 403.
import { NextResponse } from 'next/server';

import { ErrorPrescripcion, actualizarBorrador, leerPrescripcion } from '@/db/prescripciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

function responder(error: unknown) {
  if (error instanceof ErrorPrescripcion) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('No se pudo leer la prescripción.');
  return NextResponse.json({ error: 'No se pudo leer la prescripción.' }, { status: 400 });
}

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await leerPrescripcion(ctx, id));
  } catch (error) {
    return responder(error);
  }
}

export async function PATCH(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await actualizarBorrador(ctx, id, cuerpo));
  } catch (error) {
    return responder(error);
  }
}
