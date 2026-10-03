// OPT-05 (T23) — PDF sellado con el servicio de firma (T14).
// TODO(Q-22): no es PDF/A. La pantalla completa de la fórmula es T24.
import { NextResponse } from 'next/server';

import { ErrorPrescripcion, leerPdfPrescripcion } from '@/db/prescripciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    const archivo = await leerPdfPrescripcion(ctx, id);
    const bytes = Buffer.from(archivo.pdf_base64, 'base64');
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="prescripcion.pdf"',
        'X-Prescripcion-Hash': archivo.hash_documento,
      },
    });
  } catch (error) {
    if (error instanceof ErrorPrescripcion) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('No se pudo entregar el PDF de la prescripción.');
    return NextResponse.json({ error: 'No se pudo entregar el PDF de la prescripción.' }, { status: 400 });
  }
}
