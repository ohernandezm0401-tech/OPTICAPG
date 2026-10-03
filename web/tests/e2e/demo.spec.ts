// PLT-02 (T03) — Modo demo accesible solo con `APP_MODE=demo` (E).
// AC-PLT-02-4: el servidor E2E arranca con `APP_MODE=demo` (ver
// `playwright.config.ts`), de modo que las credenciales ficticias permiten
// ingresar; sin la variable, `lib/auth.ts` las rechaza (cubierto en
// `tests/unit/plt-02-guardas.test.ts`).
import { expect, test } from '@playwright/test';

test('modo demo permite ingresar con credenciales ficticias', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill('admin@visiontotal.com');
  await page.getByLabel('Contraseña').fill('admin123');
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin/);
});
