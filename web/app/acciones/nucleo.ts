// PLT-02 (T03) — Server Actions del núcleo. Borde servidor: validan con Zod
// (vía `db/nucleo.ts`) y revalidan la página. Nunca se importan desde
// componentes cliente salvo como acciones de formulario.
'use server';

import { revalidatePath } from 'next/cache';

import { crearSede, crearTenant } from '@/db/nucleo';

export async function accionCrearTenant(formulario: FormData): Promise<void> {
  const razon_social = String(formulario.get('razon_social') ?? '');
  const nit = String(formulario.get('nit') ?? '');
  await crearTenant({ razon_social, nit });
  revalidatePath('/nucleo');
}

export async function accionCrearSede(formulario: FormData): Promise<void> {
  const tenant_id = String(formulario.get('tenant_id') ?? '');
  const nombre = String(formulario.get('nombre') ?? '');
  const ciudad = String(formulario.get('ciudad') ?? '');
  await crearSede({ tenant_id, nombre, ciudad });
  revalidatePath('/nucleo');
}
