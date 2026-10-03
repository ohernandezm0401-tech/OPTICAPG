// SEG-11 (T29) — Alta y consulta de incidentes.
import { NextResponse } from 'next/server';

import { ErrorIncidente, crearIncidente, listarIncidentes } from '@/db/incidentes';
import { ErrorDatoIncidente } from '@/dominio/incidentes';
import { parsearCsvFestivos } from '@/dominio/festivos-csv';
import { contextoIncidenteHttp } from '@/lib/incidentes/http';

export const dynamic = 'force-dynamic';

function errorDe(error: unknown) {
  if (error instanceof ErrorIncidente) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ErrorDatoIncidente) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error('No se pudo completar la operación de incidentes.');
  return NextResponse.json({ error: 'No se pudo completar la operación de incidentes.' }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const ctx = await contextoIncidenteHttp(request);
    return NextResponse.json(await listarIncidentes(ctx));
  } catch (error) {
    return errorDe(error);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await contextoIncidenteHttp(request);
    const cuerpo = (await request.json()) as {
      detectado_en?: string;
      descripcion?: string;
      alcance?: string;
      datos_afectados?: string;
      severidad?: string;
      festivos_csv?: string;
    };
    const detectado = cuerpo.detectado_en?.trim() ? new Date(cuerpo.detectado_en) : new Date();
    let festivos: string[] = [];
    if (cuerpo.festivos_csv?.trim()) {
      festivos = parsearCsvFestivos(cuerpo.festivos_csv).map((fila) => fila.fecha);
    }
    const creado = await crearIncidente(ctx, {
      detectado_en: detectado,
      descripcion: cuerpo.descripcion ?? '',
      alcance: cuerpo.alcance ?? '',
      datos_afectados: cuerpo.datos_afectados ?? '',
      severidad: cuerpo.severidad ?? '',
      festivos,
    });
    return NextResponse.json(creado, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name !== 'ErrorIncidente' && /CSV|encabezado|festivo|fila/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return errorDe(error);
  }
}
