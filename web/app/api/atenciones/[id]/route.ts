// OPT-01 (T19) — Apertura y corrección del borrador.
import { NextResponse } from 'next/server';

import { abrirAtencion, actualizarAtencion, ErrorAtencion } from '@/db/atenciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await abrirAtencion(ctx, id));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo abrir la atención.');
    return NextResponse.json({ error: 'No se pudo abrir la atención.' }, { status: 400 });
  }
}

export async function PATCH(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await actualizarAtencion(ctx, id, cuerpo));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudo actualizar la atención.');
    return NextResponse.json({ error: 'No se pudo actualizar la atención.' }, { status: 400 });
  }
}
