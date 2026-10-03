// OPT-06 (T25) — Verifica el código y entrega el PDF con hash.
import { NextResponse } from 'next/server';

import { ErrorEntrega, entregarCopiaHc } from '@/db/entregas-hc';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    const cuerpo = await request.json().catch(() => null);
    const entrega = await entregarCopiaHc(ctx, id, cuerpo);
    return NextResponse.json({
      id: entrega.id,
      estado: entrega.estado,
      hash_pdf: entrega.hash_pdf,
      costo_cop: entrega.costo_cop,
      archivo_id: entrega.archivo_id,
    });
  } catch (error) {
    if (error instanceof ErrorEntrega) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo entregar la copia de la historia clínica.');
    return NextResponse.json({ error: 'No se pudo entregar la copia de la historia clínica.' }, { status: 400 });
  }
}
