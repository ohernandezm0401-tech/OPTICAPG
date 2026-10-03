// ADM-02 (T17) — Usuarios en el navegador (E). Solo datos sintéticos.
// La cuenta de demostración no tiene segundo factor: la invitación se rechaza
// en pantalla. El alta real se prueba en tests/int/adm-02-usuarios.test.ts.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

function claveDemo(correo: string): string {
  const archivo = path.join(process.cwd(), '.credenciales-desarrollo.local.json');
  if (!existsSync(archivo)) {
    throw new Error('Falta .credenciales-desarrollo.local.json: ejecute `npm run seed:dev`.');
  }
  const cuentas = JSON.parse(readFileSync(archivo, 'utf8')) as Record<string, string>;
  const clave = cuentas[correo];
  if (!clave) throw new Error(`Sin clave local para ${correo}.`);
  return clave;
}

async function ingresar(page: Page, correo: string, ruta: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(claveDemo(correo));
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\//);
  await page.goto(ruta);
}

test('AC-ADM-02-1 E: el optómetra sin registro no ve el botón firmar', async ({ page }) => {
  await ingresar(page, 'dra.vega@visiontotal.com', '/dashboard/optometra/firma');
  await expect(page.getByRole('heading', { name: 'Firma electrónica de ejemplo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Firmar como profesional' })).toHaveCount(0);
  await expect(page.getByText(/registro profesional vigente/i).first()).toBeVisible();
});

test('AC-ADM-02-2 E: el administrador no puede elegir el rol owner', async ({ page }) => {
  await ingresar(page, 'admin@visiontotal.com', '/dashboard/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios y roles' })).toBeVisible();
  await expect(page.getByText('no envía el correo')).toBeVisible();
  const opciones = page.getByLabel('Rol en la sede').locator('option');
  await expect(opciones.filter({ hasText: 'Administrador' })).toHaveCount(1);
  await expect(opciones.filter({ hasText: /^owner$/i })).toHaveCount(0);
  const valores = await opciones.evaluateAll((nodos) => nodos.map((nodo) => (nodo as HTMLOptionElement).value));
  expect(valores).not.toContain('owner');
  expect(valores).not.toContain('owner_plataforma');
  await page.getByLabel('Correo').fill(`nuevo.${Date.now()}@example.invalid`);
  await page.getByRole('button', { name: 'Invitar usuario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'segundo factor reciente' })).toBeVisible();
});
