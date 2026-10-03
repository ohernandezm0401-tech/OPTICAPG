// SEG-08 (T14) — Verificador interno: el PDF subido se compara con el hash registrado.
import { NextResponse } from 'next/server';

import { verificarDocumento } from '@/db/firma';
import { contextoFirmaHttp, respuestaFirma } from '@/lib/firma/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ctx = await contextoFirmaHttp();
    const formulario = await request.formData();
    const archivo = formulario.get('pdf');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ valido: false, error: 'Adjunte un PDF.' }, { status: 400 });
    }
    if (archivo.type && archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ valido: false }, { status: 200 });
    }
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const valido = await verificarDocumento(ctx, bytes);
    return NextResponse.json({ valido });
  } catch (error) {
    return respuestaFirma(error);
  }
}
