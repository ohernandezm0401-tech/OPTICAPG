// OPT-01 / OPT-24 (T19) — Flujo con teclado y accesibilidad.
// La cuenta de demostración no tiene UUID de tenant: la pantalla valida
// y el API responde sin abrir una fila ajena. Solo datos sintéticos.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

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

test('AC-OPT-01 E y A: el optómetra recorre la ficha con teclado', async ({ page }) => {
  await ingresar(page, 'dra.vega@visiontotal.com');
  await page.goto('/dashboard/optometra/historia-clinica');
  await expect(page.getByRole('heading', { name: 'Atención de optometría' })).toBeVisible();
  await expect(page.getByTestId('modalidad-atencion')).toHaveText('Presencial');
  await expect(page.getByText(/teleconsulta|telemedicina/i)).toHaveCount(0);

  await page.addScriptTag({ path: axePath });
  const graves = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (nodo: Element) => Promise<{ violations: { id: string; impact?: string }[] }>;
      };
    }).axe;
    const nodo = document.getElementById('ficha-atencion');
    if (!nodo) return ['sin-ficha'];
    const resultado = await axe.run(nodo);
    return resultado.violations
      .filter((item) => item.impact === 'critical' || item.impact === 'serious')
      .map((item) => item.id);
  });
  expect(graves).toEqual([]);

  await page.getByLabel('Paciente').pressSequentially('a1900000-0000-4000-8000-000000000099');
  await page.keyboard.press('Tab');
  await page.getByLabel('Motivo de consulta').fill('Control sintético de agudeza');
  await page.getByLabel('Eje ojo derecho').fill('200');
  await page.getByLabel('Código CIE-10 principal').fill('H52.1');
  await page.getByLabel('Conducta').fill('Control en borrador');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#ficha-atencion').getByRole('alert')).toContainText(/límite de captura|entero/i);

  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.locator('#ficha-atencion').getByRole('alert')).toContainText(/demostración|permiso|no es válido/i);
});

test('AC-OPT-01-2 y AC-OPT-01-5: la ficha firmada no se edita y asesor y admin reciben 403', async ({ page }) => {
  await page.route('**/api/atenciones/a1900000-0000-4000-8000-00000000f19a', async (ruta) => {
    if (ruta.request().method() === 'PATCH') {
      await ruta.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'El registro firmado no se puede modificar.' }),
      });
      return;
    }
    await ruta.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'a1900000-0000-4000-8000-00000000f19a',
        estado: 'firmado',
        modalidad: 'presencial',
        folio: 1,
        firmado_en: '2026-10-03T15:00:00.000Z',
        hora_bogota: '03/10/2026, 10:00:00',
        motivo: 'Control sintético',
        examen: { esfera_od: -1.25, eje_od: 180, dip: 62 },
        diagnostico: { codigo_cie10: 'H52.1', descripcion: 'SINTETICO' },
        plan: { conducta: 'Control' },
      }),
    });
  });

  await ingresar(page, 'dra.vega@visiontotal.com');
  await page.goto('/dashboard/optometra/historia-clinica?id=a1900000-0000-4000-8000-00000000f19a');
  await expect(page.getByLabel('Esfera ojo derecho')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Firmar atención' })).toBeDisabled();
  await page.unroute('**/api/atenciones/a1900000-0000-4000-8000-00000000f19a');

  await page.context().clearCookies();
  await ingresar(page, 'carlos@visiontotal.com');
  const asesor = await page.request.get('/api/atenciones/a1900000-0000-4000-8000-00000000f19a');
  expect(asesor.status()).toBe(403);
  await page.goto('/dashboard/optometra/historia-clinica');
  await expect(page.getByRole('heading', { name: 'No tiene permiso para ver esta sección' })).toBeVisible();

  await page.context().clearCookies();
  await ingresar(page, 'admin@visiontotal.com');
  const admin = await page.request.get('/api/atenciones/a1900000-0000-4000-8000-00000000f19a');
  expect(admin.status()).toBe(403);
  await expect(page.getByRole('link', { name: /teleconsulta/i })).toHaveCount(0);
});
