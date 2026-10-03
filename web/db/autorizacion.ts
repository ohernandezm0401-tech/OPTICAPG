// SEG-02 (T09) — Persistencia de intentos denegados dentro de `withTenantTx`.
// La bitácora con hash es T10. Aquí solo queda el intento, sin texto clínico.
import 'server-only';

import { desc, eq } from 'drizzle-orm';

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
  return withTenantTx(contexto, async (tx) => {
    const [fila] = await tx
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
    return fila;
  });
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
