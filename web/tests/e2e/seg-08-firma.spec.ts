// SEG-08 (T14) — E y S en el navegador. La cuenta de demostración no tiene
// MFA reciente: la pantalla debe rechazar la firma. Solo datos sintéticos.
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

async function ingresar(page: Page, correo: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(claveDemo(correo));
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\//);
}

test('AC-SEG-08-2 E: firmar sin MFA reciente se rechaza en pantalla', async ({ page }) => {
  await ingresar(page, 'dra.vega@visiontotal.com');
  await page.goto('/dashboard/optometra/firma');
  await expect(page.getByRole('heading', { name: 'Firma electrónica de ejemplo' })).toBeVisible();
  await expect(page.getByText('BORRADOR – requiere revisión jurídica').first()).toBeVisible();
  await expect(page.getByLabel('Trazo de la firma del paciente')).toBeVisible();

  const lienzo = page.getByLabel('Trazo de la firma del paciente');
  const caja = await lienzo.boundingBox();
  if (!caja) throw new Error('el lienzo de la firma no tiene tamaño');
  await page.mouse.move(caja.x + 20, caja.y + 40);
  await page.mouse.down();
  await page.mouse.move(caja.x + 120, caja.y + 80);
  await page.mouse.up();

  await expect(page.getByRole('button', { name: 'Firmar como profesional' })).toHaveCount(0);
  await expect(page.getByText(/registro profesional vigente|tarjeta profesional/i).first()).toBeVisible();
});

test('S y E: el verificador interno no acepta un PDF desconocido y exige sesión', async ({ page, request }) => {
  const anonimo = await request.post('/api/firma/verificar', {
    multipart: {
      pdf: {
        name: 'ejemplo.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 sintetico'),
      },
    },
  });
  expect(anonimo.status()).toBe(401);

  await ingresar(page, 'dra.vega@visiontotal.com');
  await page.goto('/dashboard/optometra/verificador-firma');
  await expect(page.getByRole('heading', { name: 'Verificador de documentos' })).toBeVisible();
  await page.getByLabel('PDF').setInputFiles({
    name: 'alterado.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 documento sintetico no registrado'),
  });
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('status')).not.toContainText('coincide con el hash registrado');
  await expect(page.getByRole('status')).toHaveAttribute('data-valido', 'false');
});
