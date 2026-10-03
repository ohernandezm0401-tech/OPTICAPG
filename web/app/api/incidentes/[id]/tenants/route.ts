// SEG-11 (T29) — Marca las ópticas afectadas y avisa a su admin.
import { NextResponse } from 'next/server';

import { ErrorIncidente, marcarTenantsAfectados } from '@/db/incidentes';
import { contextoIncidenteHttp } from '@/lib/incidentes/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await contextoIncidenteHttp(request);
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as { tenant_ids?: string[] };
    const resultado = await marcarTenantsAfectados(ctx, id, cuerpo.tenant_ids ?? []);
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof ErrorIncidente) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo avisar a las ópticas.');
    return NextResponse.json({ error: 'No se pudo avisar a las ópticas.' }, { status: 400 });
  }
}
