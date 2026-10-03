// OPT-06 (T25) — Descarga de la copia ya entregada. Cada lectura queda en la bitácora.
// TODO(Q-22): el PDF no es PDF/A.
import { NextResponse } from 'next/server';

import { ErrorEntrega, leerPdfEntrega } from '@/db/entregas-hc';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    const archivo = await leerPdfEntrega(ctx, id);
    const bytes = Buffer.from(archivo.pdf_base64, 'base64');
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="copia-historia-clinica.pdf"',
        'X-Entrega-Hash': archivo.hash_pdf,
        'X-Entrega-Costo-Cop': String(archivo.costo_cop),
      },
    });
  } catch (error) {
    if (error instanceof ErrorEntrega) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo descargar la copia de la historia clínica.');
    return NextResponse.json({ error: 'No se pudo descargar la copia de la historia clínica.' }, { status: 400 });
  }
}
