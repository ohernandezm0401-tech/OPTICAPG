import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { ErrorAuditoria, listarBitacora, alcanceBitacora } from '@/lib/auditoria/servicio';
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
  if (!actor.tenantId || alcanceBitacora(actor.rol, 'leer') === 'ninguno') {
    return NextResponse.json({ error: 'No tiene permiso para consultar la bitácora.' }, { status: 403 });
  }
  const url = new URL(request.url);
  try {
    const filas = await listarBitacora(
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
    return NextResponse.json({
      filas,
      puedeExportar: alcanceBitacora(actor.rol, 'exportar') === 'sedes',
    });
  } catch (error) {
    const mensaje = error instanceof ErrorAuditoria ? error.message : 'No se pudo consultar la bitácora.';
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
