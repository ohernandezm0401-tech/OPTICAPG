// SEG-09 (T27) — Lectura de la política de retención.
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import { ErrorRetencion, listarPoliticaRetencion } from '@/db/retencion';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await listarPoliticaRetencion(ctx));
  } catch (error) {
    if (error instanceof ErrorRetencion || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo leer la política de retención.');
    return NextResponse.json({ error: 'No se pudo leer la política de retención.' }, { status: 400 });
  }
}
