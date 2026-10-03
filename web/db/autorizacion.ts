// SEG-02 (T09) — Persistencia de intentos denegados dentro de `withTenantTx`.
// SEG-03 (T10) — El mismo intento, si se persiste, entra en la bitácora.
// El filtro en memoria de `lib/authz/intentos.ts` no escribe la cadena:
// TODO: unificarlo exigiría volver async todas las guardas de ruta.
import 'server-only';

import { desc, eq } from 'drizzle-orm';

import { anexarIntentoDenegado } from '../lib/auditoria/servicio';
import { intentosAutorizacion } from './esquema/autorizacion';
import { withTenantTx, type ContextoTenant } from './tenant';

export interface IntentoNuevo {
  usuario_id: string;
  rol: string;
  sede_id?: string | null;
  recurso: string;
  recurso_id?: string | null;
  accion: string;
}

export async function insertarIntentoDenegado(contexto: ContextoTenant, entrada: IntentoNuevo) {
  const fila = await withTenantTx(contexto, async (tx) => {
    const [creada] = await tx
      .insert(intentosAutorizacion)
      .values({
        tenant_id: contexto.tenant_id,
        usuario_id: entrada.usuario_id,
        rol: entrada.rol,
        sede_id: entrada.sede_id ?? null,
        recurso: entrada.recurso,
        recurso_id: entrada.recurso_id ?? null,
        accion: entrada.accion,
        resultado: 'denegado',
      })
      .returning();
    return creada;
  });
  if (fila) {
    await anexarIntentoDenegado({
      tenant_id: contexto.tenant_id,
      usuario_id: entrada.usuario_id,
      rol: entrada.rol,
      sede_id: entrada.sede_id ?? null,
      recurso: entrada.recurso,
      recurso_id: entrada.recurso_id ?? null,
      accion: entrada.accion,
    });
  }
  return fila;
}

export async function listarIntentosDenegados(contexto: ContextoTenant) {
  return withTenantTx(contexto, async (tx) => {
    return tx
      .select()
      .from(intentosAutorizacion)
      .where(eq(intentosAutorizacion.tenant_id, contexto.tenant_id))
      .orderBy(desc(intentosAutorizacion.creado_en));
  });
}
