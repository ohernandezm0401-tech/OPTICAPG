// OPT-04 (T22) — Consentimiento informado ligado a la atención.
import { NextResponse } from 'next/server';

import { ErrorAtencion } from '@/db/atenciones';
import {
  ErrorConsentimiento,
  evaluarInicioProcedimiento,
  listarConsentimientos,
  publicarPlantillaConsentimiento,
  registrarConsentimiento,
  revocarConsentimiento,
} from '@/db/consentimientos';
import { contextoAtencionHttp } from '@/lib/atencion/http';

export const dynamic = 'force-dynamic';

interface ContextoRuta {
  params: Promise<{ id: string }>;
}

function responder(error: unknown) {
  if (error instanceof ErrorConsentimiento || error instanceof ErrorAtencion) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }
  console.error('No se pudo completar el consentimiento.');
  return NextResponse.json({ error: 'No se pudo completar el consentimiento.' }, { status: 400 });
}

function pngDe(valor: unknown): Buffer | null {
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 600_000) return null;
  const limpio = valor.includes(',') ? (valor.split(',')[1] ?? '') : valor;
  return Buffer.from(limpio, 'base64');
}

export async function GET(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const ctx = await contextoAtencionHttp(request);
    return NextResponse.json(await listarConsentimientos(ctx, id));
  } catch (error) {
    return responder(error);
  }
}

export async function POST(request: Request, contexto: ContextoRuta) {
  try {
    const { id } = await contexto.params;
    const cuerpo = (await request.json()) as {
      accion?: string;
      procedimiento?: string;
      decision?: 'otorgado' | 'negado';
      contenido?: string;
      trazo_png_base64?: string;
      trazo_puntos?: unknown;
      acuerdo?: boolean;
    };
    const ctx = await contextoAtencionHttp(request);
    const procedimiento = cuerpo.procedimiento ?? '';
    if (cuerpo.accion === 'iniciar') {
      return NextResponse.json(await evaluarInicioProcedimiento(ctx, id, procedimiento));
    }
    if (cuerpo.accion === 'revocar') {
      return NextResponse.json(await revocarConsentimiento(ctx, id, procedimiento));
    }
    if (cuerpo.accion === 'publicar') {
      return NextResponse.json(
        await publicarPlantillaConsentimiento(ctx, { procedimiento, contenido: cuerpo.contenido ?? '' }),
      );
    }
    if (cuerpo.accion === 'registrar') {
      return NextResponse.json(
        await registrarConsentimiento(ctx, {
          atencionId: id,
          procedimiento,
          decision: cuerpo.decision === 'negado' ? 'negado' : 'otorgado',
          trazoPng: pngDe(cuerpo.trazo_png_base64),
          trazoPuntos: cuerpo.trazo_puntos,
          acuerdo: cuerpo.acuerdo === true,
        }),
      );
    }
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  } catch (error) {
    return responder(error);
  }
}
