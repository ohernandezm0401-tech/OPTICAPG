// SEG-11 (T29) — Avanza el estado. El reporte a la SIC no sale del sistema.
import { NextResponse } from 'next/server';

import { ErrorIncidente, avanzarEstadoIncidente } from '@/db/incidentes';
import { contextoIncidenteHttp } from '@/lib/incidentes/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contextoIncidenteHttp(request);
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as {
      estado?: string;
      nota?: string;
      constancia_humana?: boolean;
    };
    await avanzarEstadoIncidente(ctx, id, cuerpo.estado ?? '', cuerpo.nota ?? null, cuerpo.constancia_humana === true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ErrorIncidente) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo actualizar el incidente.');
    return NextResponse.json({ error: 'No se pudo actualizar el incidente.' }, { status: 400 });
  }
}
