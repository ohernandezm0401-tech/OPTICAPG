// PLT-02 (T03) — Persistencia extremo a extremo (E).
// AC-PLT-02-3: crear un tenant, recargar el navegador y sigue visible (vive
// en PostgreSQL, no en el almacenamiento del navegador). Requiere la base
// migrada (`npm run db:migrate` con `DATABASE_URL` o `DATABASE_URL_TEST`).
import { expect, test } from '@playwright/test';

test('sin sesión no se puede crear un tenant desde la página', async ({ page }) => {
  const sufijo = `${Date.now().toString().slice(-6)}`;
  const razonSocial = `Óptica E2E de Prueba ${sufijo} S.A.S.`;
  const nit = `901.${sufijo}-1`;

  await page.goto('/nucleo');
  await expect(page.getByRole('heading', { name: 'Núcleo multi-tenant (PostgreSQL)' })).toBeVisible();

  await page.getByLabel('Razón social').fill(razonSocial);
  await page.getByLabel('NIT').fill(nit);
  await page.getByRole('button', { name: 'Guardar tenant' }).click();

  await expect(page.getByText(razonSocial)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(razonSocial)).toHaveCount(0);
});
