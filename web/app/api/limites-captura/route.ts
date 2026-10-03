// OPT-01 (T20) — Límites de captura del tenant. Cambiarlos es configuración.
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import { ErrorLimites, guardarLimitesCaptura, leerLimitesCaptura } from '@/db/limites-captura';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await contextoAtencionHttp();
    return NextResponse.json(await leerLimitesCaptura(ctx));
  } catch (error) {
    if (error instanceof ErrorLimites || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudieron leer los límites de captura.');
    return NextResponse.json({ error: 'No se pudieron leer los límites de captura.' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    const limites = await guardarLimitesCaptura(ctx, cuerpo);
    return NextResponse.json({ origen: 'configurado', limites });
  } catch (error) {
    if (error instanceof ErrorLimites || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudieron guardar los límites de captura.');
    return NextResponse.json({ error: 'No se pudieron guardar los límites de captura.' }, { status: 400 });
  }
}
