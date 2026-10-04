// PLT-02 (T03) — Server Actions del núcleo. Borde servidor: validan con Zod
// (vía `db/nucleo.ts`) y revalidan la página. Nunca se importan desde
// componentes cliente salvo como acciones de formulario.
'use server';

import { revalidatePath } from 'next/cache';

import { crearSede, crearTenant } from '@/db/nucleo';
import { auth } from '@/lib/auth';
import { exigirPuede } from '@/lib/authz/exigir';
import { actorDesdeSesion } from '@/lib/authz/sesion';

class ErrorNucleo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNucleo';
  }
}

async function actorDeLaSesion() {
  const sesion = await auth();
  if (!sesion?.user?.role || !sesion.user.id) {
    throw new ErrorNucleo('Se requiere una sesión para esta acción.');
  }
  return actorDesdeSesion({
    id: sesion.user.id,
    role: sesion.user.role,
    empresaId: sesion.user.empresaId,
    sedeId: sesion.user.sedeId,
    sedesAccess: sesion.user.sedesAccess,
  });
}

export async function accionCrearTenant(formulario: FormData): Promise<void> {
  const actor = await actorDeLaSesion();
  exigirPuede(actor, 'crear', { tipo: 'R24', plataforma: true });
  const razon_social = String(formulario.get('razon_social') ?? '');
  const nit = String(formulario.get('nit') ?? '');
  await crearTenant({ razon_social, nit });
  revalidatePath('/nucleo');
}

export async function accionCrearSede(formulario: FormData): Promise<void> {
  const actor = await actorDeLaSesion();
  exigirPuede(actor, 'crear', { tipo: 'R18', tenantId: actor.tenantId, sedeId: actor.sedeActiva });
  const nombre = String(formulario.get('nombre') ?? '');
  const ciudad = String(formulario.get('ciudad') ?? '');
  await crearSede({ tenant_id: actor.tenantId, nombre, ciudad });
  revalidatePath('/nucleo');
}
