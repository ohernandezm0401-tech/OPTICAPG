// SEG-07 (T26) — Marca «reclamo en trámite».
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import { ErrorHabeas, marcarReclamo } from '@/db/habeas-data';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await marcarReclamo(ctx, id));
  } catch (error) {
    if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'No se pudo marcar el reclamo.' }, { status: 400 });
  }
}
