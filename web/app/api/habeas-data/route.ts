// SEG-07 (T26) — Listado y radicación de solicitudes del titular.
import { NextResponse } from 'next/server';

import { ErrorHabeas, listarHabeas, radicarSolicitud } from '@/db/habeas-data';
import { ErrorAtencion } from '@/db/atenciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await listarHabeas(ctx));
  } catch (error) {
    if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo listar habeas data.');
    return NextResponse.json({ error: 'No se pudo listar las solicitudes.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = (await request.json()) as unknown;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await radicarSolicitud(ctx, cuerpo));
  } catch (error) {
    if (error instanceof ErrorHabeas || error instanceof ErrorAtencion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
    }
    console.error('No se pudo radicar la solicitud.');
    return NextResponse.json({ error: 'No se pudo radicar la solicitud.' }, { status: 400 });
  }
}
