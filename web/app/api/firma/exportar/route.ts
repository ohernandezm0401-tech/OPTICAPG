// SEG-08 (T14) — Exporta el PDF y la evidencia del paciente (trazo, hora, IP, OTP).
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { exportarDocumento } from '@/db/firma';
import { contextoFirmaHttp, respuestaFirma } from '@/lib/firma/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'El documento no es válido.' }, { status: 400 });
  }
  try {
    const ctx = await contextoFirmaHttp();
    return NextResponse.json(await exportarDocumento(ctx, id));
  } catch (error) {
    return respuestaFirma(error);
  }
}
