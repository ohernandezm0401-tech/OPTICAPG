// SEG-05 (T15) — Captura en el navegador (E, A).
// Cuenta sintética de demostración. Solo datos ficticios.
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

async function marcarNoAplica(page: Page) {
  const botones = page.getByRole('button', { name: 'Marcar «No aplica»' });
  const total = await botones.count();
  for (let i = 0; i < total; i += 1) {
    await botones.nth(i).click();
  }
}

async function violacionesGraves(page: Page, nodoId: string): Promise<string[]> {
  await page.addScriptTag({ path: axePath });
  return page.evaluate(async (id) => {
    const axe = (window as unknown as {
      axe: {
        run: (nodo: Element) => Promise<{ violations: { id: string; impact?: string; nodes: { target: string[] }[] }[] }>;
      };
    }).axe;
    const nodo = document.getElementById(id);
    if (!nodo) return ['sin-nodo'];
    const resultado = await axe.run(nodo);
    return resultado.violations
      .filter((item) => item.impact === 'critical' || item.impact === 'serious')
      .map((item) => `${item.id}:${item.nodes.map((nodoItem) => nodoItem.target.join(' ')).join('|')}`);
  }, nodoId);
}

test.describe.configure({ mode: 'serial' });

test('AC-SEG-05 E y A: captura, contacto desmarcado y evidencia', async ({ page }) => {
  await ingresar(page, 'carlos@visiontotal.com');
  await page.goto('/dashboard/asesor/pacientes');
  await page.getByRole('button', { name: 'Nuevo paciente' }).click();
  await expect(page.getByRole('checkbox', { name: 'Contacto comercial' })).not.toBeChecked();
  await expect(page.getByText('Borrador sujeto a revisión jurídica').first()).toBeVisible();
  const graves = await violacionesGraves(page, 'ficha-paciente');
  expect(graves).toEqual([]);

  const documento = `915${Date.now().toString().slice(-7)}`;
  await page.getByLabel('Nombres').fill('Lucia Sintetica');
  await page.getByLabel('Apellidos').fill('Rojas Demo');
  await page.getByRole('textbox', { name: 'Número de documento', exact: true }).fill(documento);
  await page.getByLabel('Fecha de nacimiento').fill('1991-04-04');
  await marcarNoAplica(page);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();

  await page.getByRole('button', { name: 'Comprobar apertura de atención' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No se puede abrir' })).toBeVisible();
  await page.getByLabel('Urgencia marcada').check();
  await page.getByRole('button', { name: 'Comprobar apertura de atención' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Se puede abrir' })).toBeVisible();
  await page.getByLabel('Urgencia marcada').uncheck();

  await page.getByLabel('Autorización negada').check();
  await page.getByRole('button', { name: 'Registrar autorización' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'quedó registrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar apertura de atención' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'negada_registrada' })).toBeVisible();

  await page.getByLabel('Autorización otorgada').check();
  await page.getByRole('button', { name: 'Registrar autorización' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'quedó registrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Exportar evidencia' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Hash:' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Medio: presencial' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'no está obligado' })).toBeVisible();

  await page.getByLabel('Contacto comercial').check();
  await page.getByRole('button', { name: 'Registrar autorización' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'quedó registrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar envío comercial' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'permitido' })).toBeVisible();
  await page.getByRole('button', { name: 'Revocar contacto comercial' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'revocada' })).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar envío comercial' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'detenido' })).toBeVisible();
});

test('A: la política de tratamiento es editable y el aviso no inventa datos', async ({ page }) => {
  await ingresar(page, 'admin@visiontotal.com');
  await page.goto('/dashboard/admin/politica-tratamiento');
  await expect(page.getByRole('heading', { name: 'Política de tratamiento' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Aviso de privacidad' })).toContainText('sin dato configurado');
  const graves = await violacionesGraves(page, 'politica-tratamiento');
  expect(graves).toEqual([]);
  await page.getByLabel('Razón social').fill('Optica Sintetica T15');
  await page.getByRole('button', { name: 'Guardar política' }).click();
  await expect(page.getByRole('region', { name: 'Aviso de privacidad' })).toContainText('Optica Sintetica T15');
  const area = page.getByLabel(/Texto de autorización de tratamiento/);
  await expect(area).toHaveValue(/Borrador sujeto a revisión jurídica/);
  const actual = await area.inputValue();
  await area.fill(`${actual}\nAjuste del responsable.`);
  await page.getByRole('button', { name: 'Publicar nueva versión' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nueva versión' })).toBeVisible();
});
