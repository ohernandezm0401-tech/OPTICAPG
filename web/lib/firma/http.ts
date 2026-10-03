// SEG-08 (T14) — Borde HTTP de la firma. La sesión de demostración sin UUID
// no llega a la base.
import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ErrorFirma, type ContextoFirma } from '../../db/firma';
import { codigoHttpFirma } from '../../dominio/firma';
import { auth } from '../auth';

const Uuid = z.uuid();

export async function contextoFirmaHttp(): Promise<ContextoFirma> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.id || !usuario.role) {
    throw new ErrorFirma('permiso', 'Debe iniciar sesión.');
  }
  const tenant = usuario.empresaId ?? '';
  const sede = usuario.sedeId ?? '';
  if (!Uuid.safeParse(tenant).success || !Uuid.safeParse(usuario.id).success || !Uuid.safeParse(sede).success) {
    throw new ErrorFirma(
      'validacion',
      'La sesión de demostración no puede firmar. Firmar exige un segundo factor reciente y tarjeta profesional vigente.',
    );
  }
  const sedes = (usuario.sedesAccess ?? []).filter((item) => Uuid.safeParse(item).success);
  const sesionId = usuario.sesionId && Uuid.safeParse(usuario.sesionId).success ? usuario.sesionId : null;
  return {
    tenant_id: tenant,
    usuario_id: usuario.id,
    sede_id: sede,
    sedes: sedes.length > 0 ? sedes : [sede],
    rol: usuario.role,
    sesion_id: sesionId,
  };
}

export function respuestaFirma(error: unknown) {
  if (error instanceof ErrorFirma) {
    const status = codigoHttpFirma(error.codigo, error.message);
    return NextResponse.json({ error: error.message, codigo: error.codigo }, { status });
  }
  console.error('No se pudo completar la firma.');
  return NextResponse.json({ error: 'No se pudo completar la firma.' }, { status: 400 });
}
