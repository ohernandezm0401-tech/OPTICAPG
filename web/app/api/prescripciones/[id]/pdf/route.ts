// OPT-05 (T23/T24) — PDF sellado con el servicio de firma (T14).
// TODO(Q-22): no es PDF/A. La descarga y la impresión quedan en la bitácora.
import { NextResponse } from 'next/server';

import { ErrorPrescripcion, leerPdfPrescripcion } from '@/db/prescripciones';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    const medio = new URL(request.url).searchParams.get('medio') === 'impresion' ? 'impresion' : 'descarga';
    const ctx = await contextoAtencionHttp(request);
    const archivo = await leerPdfPrescripcion(ctx, id, medio);
    const bytes = Buffer.from(archivo.pdf_base64, 'base64');
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${medio === 'impresion' ? 'inline' : 'attachment'}; filename="prescripcion.pdf"`,
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
