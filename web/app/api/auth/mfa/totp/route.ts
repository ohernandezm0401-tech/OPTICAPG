// SEG-01 (T08) — Enrolar o confirmar TOTP. No devuelve contraseñas ni
// distingue un ticket inexistente de un código malo.
import { NextResponse } from 'next/server';

import { obtenerAuthPort } from '@/lib/auth/authjs';
import { errorMfa, leerJson, ticketValido } from '@/lib/auth/mfa/solicitud';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cuerpo = await leerJson(request);
  if (!cuerpo || !ticketValido(cuerpo.ticket)) {
    return NextResponse.json(errorMfa(), { status: 400 });
  }
  const puerto = obtenerAuthPort();
  try {
    if (cuerpo.accion === 'preparar') {
      const alta = await puerto.prepararEnrolamientoTotp(cuerpo.ticket);
      if (!alta.ok) return NextResponse.json(errorMfa(), { status: 400 });
      return NextResponse.json({
        ok: true,
        secreto: alta.secreto,
        svg: alta.svg,
        codigos: alta.codigos,
      });
    }
    if (cuerpo.accion === 'confirmar' && typeof cuerpo.codigo === 'string' && cuerpo.codigo.length <= 32) {
      const resultado = await puerto.confirmarSegundoFactor({
        ticket: cuerpo.ticket,
        codigo: cuerpo.codigo,
      });
      if (!resultado.ok || !resultado.pase) return NextResponse.json(errorMfa(), { status: 400 });
      return NextResponse.json({ ok: true, pase: resultado.pase });
    }
  } catch {
    console.error('No se pudo completar el segundo factor.');
    return NextResponse.json(errorMfa(), { status: 400 });
  }
  return NextResponse.json(errorMfa(), { status: 400 });
}
