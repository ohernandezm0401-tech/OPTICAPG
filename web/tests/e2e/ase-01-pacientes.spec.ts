// ASE-01 / SEG-06 (T13) — Recepción en el navegador (E, A).
// Usa la cuenta sintética de demostración. Solo datos ficticios.
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

test.describe.configure({ mode: 'serial' });

test('AC-ASE-01 E y A: alta, duplicado y formulario accesible', async ({ page }) => {
  await ingresar(page, 'carlos@visiontotal.com');
  await page.goto('/dashboard/asesor/pacientes');
  await expect(page.getByRole('heading', { name: 'Recepción de pacientes' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo paciente' }).click();
  await page.addScriptTag({ path: axePath });
  const graves = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: {
        run: (nodo: Element) => Promise<{ violations: { id: string; impact?: string; nodes: { target: string[] }[] }[] }>;
      };
    }).axe;
    const nodo = document.getElementById('ficha-paciente');
    if (!nodo) return ['sin-ficha'];
    const resultado = await axe.run(nodo);
    return resultado.violations
      .filter((item) => item.impact === 'critical' || item.impact === 'serious')
      .map((item) => `${item.id}:${item.nodes.map((nodoItem) => nodoItem.target.join(' ')).join('|')}`);
  });
  expect(graves).toEqual([]);

  const documento = `900${Date.now().toString().slice(-7)}`;
  await page.getByLabel('Nombres').fill('Elena Sintética');
  await page.getByLabel('Apellidos').fill('Morales Demo');
  await page.getByRole('textbox', { name: 'Número de documento', exact: true }).fill(documento);
  await page.getByLabel('Fecha de nacimiento').fill('1992-03-03');
  await page.getByLabel('Correo (opcional)').fill('elena.sintetica@example.invalid');
  await marcarNoAplica(page);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('heading', { name: 'Editar paciente' })).toBeVisible();
  // Otro worker puede crear, en el mismo milisegundo, un documento con los
  // mismos cuatro últimos dígitos. La fila se identifica por el paciente.
  await expect(
    page
      .getByRole('row', { name: /Morales Demo, Elena Sintética/ })
      .getByText(`CC ••••${documento.slice(-4)}`, { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo paciente' }).click();
  await page.getByLabel('Nombres').fill('Elena Sintética');
  await page.getByLabel('Apellidos').fill('Otra Demo');
  await page.getByRole('textbox', { name: 'Número de documento', exact: true }).fill(documento);
  await page.getByLabel('Fecha de nacimiento').fill('1992-03-03');
  await marcarNoAplica(page);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Ya existe' })).toBeVisible();
  await page.getByRole('button', { name: 'Abrir el existente' }).click();
  await expect(page.getByLabel('Nombres')).toHaveValue('Elena Sintética');
});

test('AC-SEG-06 E: menor sin representante y aviso al cumplir 18', async ({ page }) => {
  await ingresar(page, 'carlos@visiontotal.com');
  await page.goto('/dashboard/asesor/pacientes');
  await page.getByRole('button', { name: 'Nuevo paciente' }).click();
  const documento = `900${Date.now().toString().slice(-7)}`;
  await page.getByLabel('Nombres').fill('Juan Sintetico');
  await page.getByLabel('Apellidos').fill('Niño Demo');
  await page.getByRole('combobox', { name: 'Tipo de documento', exact: true }).selectOption('TI');
  await page.getByRole('textbox', { name: 'Número de documento', exact: true }).fill(documento);
  await page.getByLabel('Fecha de nacimiento').fill('2016-10-03');
  await marcarNoAplica(page);
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'representante' })).toBeVisible();

  await page.getByLabel('Nombre del representante').fill('Carmen Sintética');
  await page.getByRole('textbox', { name: 'Número de documento del representante' }).fill('9000008888');
  await page.getByLabel('Parentesco').fill('madre');
  await page.getByLabel('Contacto del representante').fill('3000008888');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('quien firmó')).toBeVisible();

  await page.getByLabel('Fecha de nacimiento').fill('2008-10-03');
  await page.getByRole('combobox', { name: 'Tipo de documento', exact: true }).selectOption('CC');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status').filter({ hasText: '18' })).toBeVisible();
  await expect(page.getByText('quien firmó')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Diagnósticos' })).toHaveCount(0);
});
