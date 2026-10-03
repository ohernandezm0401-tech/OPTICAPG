// OPT-10 (T18) — Búsqueda y glosario en el navegador. Solo datos sintéticos.
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

test('AC-OPT-10-1 y AC-OPT-10-3: buscar H52.1 y advertir sin bloquear', async ({ page }) => {
  await ingresar(page, 'admin@visiontotal.com', '/dashboard/admin/catalogos');
  await expect(page.getByRole('heading', { name: 'Catálogos clínicos' })).toBeVisible();

  const caja = page.getByRole('combobox', { name: 'Código o descripción' });
  await caja.fill('H52.1');
  const opcion = page.getByRole('option').filter({ hasText: 'H52.1' });
  await expect(opcion).toBeVisible();
  await expect(opcion).toContainText('SINTETICO codigo de prueba H52.1');
  await opcion.getByRole('button').click();
  await expect(page.getByTestId('codigo-elegido')).toContainText('H52.1');
  await expect(page.getByTestId('codigo-elegido')).toContainText('SINTETICO codigo de prueba H52.1');

  await page.getByRole('button', { name: 'Agregar abreviaturas iniciales' }).click();
  await expect(page.getByText('agudeza visual')).toBeVisible();

  await page.getByRole('button', { name: 'Revisar' }).click();
  const aviso = page.getByRole('status');
  await expect(aviso).toContainText('XYZ');
  await expect(aviso).toContainText('no está en el glosario');
  await page.getByRole('button', { name: 'Conservar texto' }).click();
  await expect(aviso).toContainText('Texto conservado');
  await expect(aviso).toContainText('no bloqueante');
});

test('en móvil el administrador sigue pudiendo buscar H52.1', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ingresar(page, 'admin@visiontotal.com', '/dashboard/admin/catalogos');
  await page.getByRole('combobox', { name: 'Código o descripción' }).fill('H52.1');
  await expect(page.getByRole('option').filter({ hasText: 'H52.1' })).toBeVisible();
});

test('el optómetra busca y no edita el glosario', async ({ page }) => {
  await ingresar(page, 'dra.vega@visiontotal.com', '/dashboard/optometra/catalogos');
  await expect(page.getByRole('heading', { name: 'Catálogos clínicos' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agregar abreviaturas iniciales' })).toHaveCount(0);
  await expect(page.getByText('Solo el administrador de la óptica puede editar el glosario.')).toBeVisible();
  await page.getByLabel('Catálogo').selectOption('cups');
  await page.getByRole('combobox', { name: 'Código o descripción' }).fill('000101');
  await expect(page.getByRole('option').filter({ hasText: '000101' })).toBeVisible();
});
