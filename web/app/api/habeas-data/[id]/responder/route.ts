// SEG-07 (T26) — Archiva la respuesta con fecha y autor.
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import { ErrorHabeas, responderSolicitud } from '@/db/habeas-data';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as { texto?: string };
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await responderSolicitud(ctx, id, cuerpo.texto ?? ''));
  } catch (error) {
    if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La respuesta no es válida.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'No se pudo archivar la respuesta.' }, { status: 400 });
  }
}
