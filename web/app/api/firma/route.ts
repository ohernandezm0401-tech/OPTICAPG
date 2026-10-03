// SEG-08 (T14) — Acciones de firma del documento de ejemplo.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  crearDocumentoEjemplo,
  emitirOtpPaciente,
  estadoFirma,
  firmarPaciente,
  firmarProfesional,
  guardarPerfilProfesional,
  sellarDocumento,
} from '@/db/firma';
import { contextoFirmaHttp, respuestaFirma } from '@/lib/firma/http';

export const dynamic = 'force-dynamic';

const Uuid = z.uuid();

async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo = (await request.json()) as unknown;
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return null;
    return cuerpo as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const ctx = await contextoFirmaHttp();
    return NextResponse.json(await estadoFirma(ctx));
  } catch (error) {
    return respuestaFirma(error);
  }
}

export async function POST(request: Request) {
  const cuerpo = await leerJson(request);
  if (!cuerpo || typeof cuerpo.accion !== 'string') {
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }
  try {
    const ctx = await contextoFirmaHttp();
    if (cuerpo.accion === 'crear') {
      const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo : '';
      const texto = typeof cuerpo.cuerpo === 'string' ? cuerpo.cuerpo : '';
      return NextResponse.json(await crearDocumentoEjemplo(ctx, { titulo, cuerpo: texto }));
    }
    if (cuerpo.accion === 'perfil') {
      const usuarioId = typeof cuerpo.usuario_id === 'string' ? cuerpo.usuario_id : '';
      if (!Uuid.safeParse(usuarioId).success) {
        return NextResponse.json({ error: 'El usuario no es válido.' }, { status: 400 });
      }
      const guardado = await guardarPerfilProfesional(ctx, {
        usuarioId,
        nombreCompleto: typeof cuerpo.nombre_completo === 'string' ? cuerpo.nombre_completo : '',
        registroProfesional: typeof cuerpo.registro_profesional === 'string' ? cuerpo.registro_profesional : '',
        vigenteHasta: typeof cuerpo.vigente_hasta === 'string' ? cuerpo.vigente_hasta : null,
      });
      return NextResponse.json(guardado);
    }
    const documentoId = typeof cuerpo.documento_id === 'string' ? cuerpo.documento_id : '';
    if (!Uuid.safeParse(documentoId).success) {
      return NextResponse.json({ error: 'El documento no es válido.' }, { status: 400 });
    }
    if (cuerpo.accion === 'profesional') {
      return NextResponse.json(await firmarProfesional(ctx, documentoId));
    }
    if (cuerpo.accion === 'otp') {
      return NextResponse.json(await emitirOtpPaciente(ctx, documentoId));
    }
    if (cuerpo.accion === 'paciente') {
      const png = typeof cuerpo.trazo_png_base64 === 'string' ? cuerpo.trazo_png_base64 : '';
      const resultado = await firmarPaciente(ctx, {
        documentoId,
        trazoPng: Buffer.from(png, 'base64'),
        trazoPuntos: cuerpo.trazo_puntos,
        nombre: typeof cuerpo.nombre === 'string' ? cuerpo.nombre : '',
        documento: typeof cuerpo.documento === 'string' ? cuerpo.documento : '',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '192.0.2.10',
        agente: request.headers.get('user-agent') ?? '',
        otp: typeof cuerpo.otp === 'string' ? cuerpo.otp : null,
        acuerdoAceptado: cuerpo.acuerdo_aceptado === true,
      });
      return NextResponse.json(resultado);
    }
    if (cuerpo.accion === 'sellar') {
      return NextResponse.json(await sellarDocumento(ctx, documentoId));
    }
    return NextResponse.json({ error: 'La acción no existe.' }, { status: 400 });
  } catch (error) {
    return respuestaFirma(error);
  }
}
