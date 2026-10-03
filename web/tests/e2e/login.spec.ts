// PLT-09 — Prueba E2E de humo (T02): la página /login carga en español con
// su formulario de ingreso.
import { expect, test } from '@playwright/test';

test('la página /login muestra el formulario de ingreso', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  await expect(page.getByLabel('Correo Electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
});
