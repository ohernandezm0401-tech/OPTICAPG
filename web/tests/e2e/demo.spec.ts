// PLT-02 (T03) + PLT-10 (T05) — Modo demo con cuentas locales (E).
// AC-PLT-02-4: el servidor E2E arranca con `APP_MODE=demo` (ver
// `playwright.config.ts`), de modo que las cuentas sintéticas permiten
// ingresar; sin la variable, `lib/auth.ts` las rechaza (cubierto en
// `tests/unit/plt-02-guardas.test.ts`).
// AC-PLT-10-2: las contraseñas ya no viven en el repo: las genera
// `npm run seed:dev` en `.credenciales-desarrollo.local.json` (no
// versionado). Esta prueba las lee de ahí; si falta, la CI y el desarrollo
// local deben correr `npm run seed:dev` antes de `npm run test:e2e`
// (ver `docs/ENTORNOS.md`).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const CORREO_DEMO = 'admin@visiontotal.com';

function claveDemoLocal(): string {
  const archivo = path.join(
    process.cwd(),
    '.credenciales-desarrollo.local.json',
  );
  if (!existsSync(archivo)) {
    throw new Error(
      'Falta .credenciales-desarrollo.local.json: ejecute `npm run seed:dev` antes de `npm run test:e2e`.',
    );
  }
  const cuentas = JSON.parse(readFileSync(archivo, 'utf8')) as Record<string, string>;
  const clave = cuentas[CORREO_DEMO];
  if (!clave) throw new Error(`El archivo local no trae cuenta para ${CORREO_DEMO}; regenere con --forzar.`);
  return clave;
}

test('modo demo permite ingresar con cuentas locales generadas', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(CORREO_DEMO);
  await page.getByLabel('Contraseña').fill(claveDemoLocal());
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin/);
});
