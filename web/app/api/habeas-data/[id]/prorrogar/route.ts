// SEG-07 (T26) — Prórroga de 8 días hábiles del reclamo (Ley 1581 art. 15).
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import { ErrorHabeas, prorrogarReclamo } from '@/db/habeas-data';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await prorrogarReclamo(ctx, id));
  } catch (error) {
    if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'No se pudo prorrogar el reclamo.' }, { status: 400 });
  }
}
