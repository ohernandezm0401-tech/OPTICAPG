import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { ErrorAuditoria, exportarBitacoraCsv, alcanceBitacora } from '@/lib/auditoria/servicio';
import { actorDesdeSesion } from '@/lib/authz/sesion';

export async function GET(request: Request) {
  const sesion = await auth();
  if (!sesion?.user) {
    return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
  }
  const actor = actorDesdeSesion({
    id: sesion.user.id,
    role: sesion.user.role,
    empresaId: sesion.user.empresaId,
    sedeId: sesion.user.sedeId,
    sedesAccess: sesion.user.sedesAccess,
  });
  if (alcanceBitacora(actor.rol, 'exportar') !== 'sedes' || !actor.tenantId) {
    return NextResponse.json({ error: 'No tiene permiso para exportar la bitácora.' }, { status: 403 });
  }
  const url = new URL(request.url);
  try {
    const csv = await exportarBitacoraCsv(
      {
        tenant_id: actor.tenantId,
        usuario_id: actor.id,
        sede_id: actor.sedeActiva || null,
        sedes: actor.sedesAutorizadas,
        rol: actor.rol,
      },
      {
        recurso: url.searchParams.get('recurso'),
        accion: url.searchParams.get('accion'),
      },
    );
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="auditoria.csv"',
      },
    });
  } catch (error) {
    const mensaje = error instanceof ErrorAuditoria ? error.message : 'No se pudo exportar la bitácora.';
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
