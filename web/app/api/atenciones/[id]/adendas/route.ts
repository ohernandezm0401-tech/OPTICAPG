// OPT-02 (T21) — Alta y lectura de adendas. La atención firmada no se edita.
import { NextResponse } from 'next/server';

import { crearAdendaAtencion, listarHistorialAtencion } from '@/db/adendas-atencion';
import { ErrorAtencion } from '@/db/atenciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await listarHistorialAtencion(ctx, id));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo leer el historial de la atención.');
    return NextResponse.json({ error: 'No se pudo leer el historial de la atención.' }, { status: 400 });
  }
}

export async function POST(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await crearAdendaAtencion(ctx, id, cuerpo));
  } catch (error) {
    if (error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudo guardar la adenda.');
    return NextResponse.json({ error: 'No se pudo guardar la adenda.' }, { status: 400 });
  }
}
