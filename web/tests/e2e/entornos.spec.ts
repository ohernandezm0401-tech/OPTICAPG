// PLT-10 (T05) — Retiro de credenciales de demostración (E).
//
// AC-PLT-10-2: el build de producción de /login no expone contraseñas ni el
// aviso de desarrollo (las cuentas locales las genera `npm run seed:dev`
// fuera del repo). Además, tras el retiro, las rutas protegidas siguen
// exigiendo sesión.
import { expect, test } from '@playwright/test';

test('el login de producción no expone contraseñas de demostración', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  await expect(page.getByText('Solo desarrollo')).toHaveCount(0);
  await expect(page.getByText('Cuentas sintéticas locales')).toHaveCount(0);
});

test('sin sesión, el tablero redirige al login', async ({ page }) => {
  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/login/);
});
