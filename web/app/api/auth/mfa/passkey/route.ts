// SEG-01 (T08) — Passkeys opcionales (WebAuthn). El origen tiene que
// coincidir con el relying party; si no, la respuesta es la misma que un fallo.
import { NextResponse } from 'next/server';

import { obtenerAuthPort } from '@/lib/auth/authjs';
import { contextoDe, errorMfa, leerJson, ticketValido } from '@/lib/auth/mfa/solicitud';

export const dynamic = 'force-dynamic';

function respuestaPasskey(valor: unknown): boolean {
  if (!valor || typeof valor !== 'object') return false;
  const texto = JSON.stringify(valor);
  return texto.length > 2 && texto.length < 16_000;
}

export async function POST(request: Request) {
  const cuerpo = await leerJson(request);
  if (!cuerpo || !ticketValido(cuerpo.ticket)) {
    return NextResponse.json(errorMfa(), { status: 400 });
  }
  const contexto = contextoDe(request);
  if (!contexto) return NextResponse.json(errorMfa(), { status: 400 });
  const puerto = obtenerAuthPort();
  const modo = cuerpo.modo === 'autenticacion' ? 'autenticacion' : cuerpo.modo === 'registro' ? 'registro' : null;
  if (!modo) return NextResponse.json(errorMfa(), { status: 400 });

  try {
    if (cuerpo.accion === 'opciones') {
      const opciones =
        modo === 'registro'
          ? await puerto.opcionesRegistroPasskey({ ticket: cuerpo.ticket, contexto })
          : await puerto.opcionesAutenticacionPasskey({ ticket: cuerpo.ticket, contexto });
      if (!opciones.ok) return NextResponse.json(errorMfa(), { status: 400 });
      return NextResponse.json({ ok: true, opciones: opciones.opciones });
    }
    if (cuerpo.accion === 'confirmar' && respuestaPasskey(cuerpo.respuesta)) {
      const resultado =
        modo === 'registro'
          ? await puerto.confirmarRegistroPasskey({
              ticket: cuerpo.ticket,
              respuesta: cuerpo.respuesta,
              contexto,
            })
          : await puerto.confirmarAutenticacionPasskey({
              ticket: cuerpo.ticket,
              respuesta: cuerpo.respuesta,
              contexto,
            });
      if (!resultado.ok || !('pase' in resultado) || !resultado.pase) {
        return NextResponse.json(errorMfa(), { status: 400 });
      }
      return NextResponse.json({ ok: true, pase: resultado.pase });
    }
  } catch {
    console.error('No se pudo completar la llave de acceso.');
    return NextResponse.json(errorMfa(), { status: 400 });
  }
  return NextResponse.json(errorMfa(), { status: 400 });
}
