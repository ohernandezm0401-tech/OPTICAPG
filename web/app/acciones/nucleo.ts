// PLT-02 (T03) — Server Actions del núcleo. Borde servidor: validan con Zod
// (vía `db/nucleo.ts`) y revalidan la página. Nunca se importan desde
// componentes cliente salvo como acciones de formulario.
'use server';

import { revalidatePath } from 'next/cache';

import { crearSede, crearTenant } from '@/db/nucleo';
import { auth } from '@/lib/auth';
import type { Accion } from '@/lib/authz/matrix';
import type { SujetoRecurso } from '@/lib/authz/ability';
import { exigirPuede } from '@/lib/authz/exigir';
import { actorDesdeSesion } from '@/lib/authz/sesion';

// La página /nucleo de T03 no tiene sesión (la E2E la usa así). Si hay sesión,
// la matriz decide. Sin sesión se conserva el alta técnica hasta PLT-03.
async function exigirSiHaySesion(accion: Accion, sujeto: SujetoRecurso): Promise<void> {
  const sesion = await auth();
  if (!sesion?.user?.role) return;
  exigirPuede(
    actorDesdeSesion({
      id: sesion.user.id,
      role: sesion.user.role,
      empresaId: sesion.user.empresaId,
      sedeId: sesion.user.sedeId,
      sedesAccess: sesion.user.sedesAccess,
    }),
    accion,
    sujeto,
  );
}

export async function accionCrearTenant(formulario: FormData): Promise<void> {
  await exigirSiHaySesion('crear', { tipo: 'R24', plataforma: true });
  const razon_social = String(formulario.get('razon_social') ?? '');
  const nit = String(formulario.get('nit') ?? '');
  await crearTenant({ razon_social, nit });
  revalidatePath('/nucleo');
}

export async function accionCrearSede(formulario: FormData): Promise<void> {
  const sesion = await auth();
  let tenant_id = String(formulario.get('tenant_id') ?? '');
  if (sesion?.user?.role) {
    const actor = actorDesdeSesion({
      id: sesion.user.id,
      role: sesion.user.role,
      empresaId: sesion.user.empresaId,
      sedeId: sesion.user.sedeId,
      sedesAccess: sesion.user.sedesAccess,
    });
    exigirPuede(actor, 'crear', { tipo: 'R18', tenantId: actor.tenantId, sedeId: actor.sedeActiva });
    tenant_id = actor.tenantId;
  }
  const nombre = String(formulario.get('nombre') ?? '');
  const ciudad = String(formulario.get('ciudad') ?? '');
  await crearSede({ tenant_id, nombre, ciudad });
  revalidatePath('/nucleo');
}
