// ADM-01 (T16) — Sedes en el navegador (E). Solo datos sintéticos.
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

function fechaBogota(dias: number): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const anio = Number(partes.find((parte) => parte.type === 'year')?.value);
  const mes = Number(partes.find((parte) => parte.type === 'month')?.value);
  const dia = Number(partes.find((parte) => parte.type === 'day')?.value);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  const mesR = String(resultado.getUTCMonth() + 1).padStart(2, '0');
  const diaR = String(resultado.getUTCDate()).padStart(2, '0');
  return `${resultado.getUTCFullYear()}-${mesR}-${diaR}`;
}

async function ingresar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill('admin@visiontotal.com');
  await page.getByLabel('Contraseña').fill(claveDemo('admin@visiontotal.com'));
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\//);
  await page.goto('/dashboard/admin/sedes');
  await expect(page.getByRole('heading', { name: 'Sedes y certificados' })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('AC-ADM-01-1 E: sede sin certificado ni director queda incompleta', async ({ page }) => {
  await ingresar(page);
  await page.getByLabel('Nombre').fill(`Sede incompleta ${Date.now()}`);
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByLabel('Tipo de establecimiento').selectOption('optica_sin_consultorio');
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  const resultado = page.locator('#resultado-sede');
  await expect(resultado.getByText('incompleta', { exact: true })).toBeVisible();
  await expect(resultado.getByText('certificado de dispensación')).toBeVisible();
  await expect(resultado.getByText('director científico')).toBeVisible();
});

test('AC-ADM-01-2 E: alerta de 30 días y alerta roja sin bloquear la atención', async ({ page }) => {
  await ingresar(page);
  await page.getByLabel('Nombre').fill(`Sede por vencer ${Date.now()}`);
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByLabel('Número de certificado').fill('DISP-E2E-30');
  await page.getByLabel('Vencimiento del certificado').fill(fechaBogota(29));
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.locator('#resultado-sede').getByText('Alerta de 30 días')).toBeVisible();

  await page.getByLabel('Nombre').fill(`Sede vencida ${Date.now()}`);
  await page.getByLabel('Ciudad').fill('Bogotá');
  await page.getByLabel('Número de certificado').fill('DISP-E2E-VEN');
  await page.getByLabel('Vencimiento del certificado').fill('2020-01-01');
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  const alerta = page.locator('#resultado-sede').getByRole('alert');
  await expect(alerta).toContainText('Alerta roja');
  await expect(alerta).toHaveAttribute('data-bloquea-atencion', 'false');
  await alerta.getByRole('link', { name: 'Continuar atención clínica' }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin\/agenda/);
  await expect(page.getByText('No tiene permiso')).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Certificado vencido' })).toBeVisible();
  await expect(page.getByText('La atención clínica no se bloquea.')).toBeVisible();
});

test('AC-ADM-01-3 E: el cuarto establecimiento exige la autorización del administrador', async ({ page }) => {
  await ingresar(page);
  await expect(page.getByLabel('Director científico').locator('option', { hasText: 'optometra.sintetico' })).toHaveCount(1);
  const director = page.getByLabel('Director científico');
  let advertencia = false;
  for (let i = 1; i <= 4; i += 1) {
    const nombre = `Director extra ${Date.now()}-${i}`;
    await page.getByLabel('Nombre').fill(nombre);
    await page.getByLabel('Ciudad').fill('Bogotá');
    await page.getByLabel('Tipo de establecimiento').selectOption('optica_sin_consultorio');
    await director.selectOption({ label: 'optometra.sintetico@example.invalid' });
    await page.getByRole('button', { name: 'Guardar sede' }).click();
    const aviso = page.getByRole('alert').filter({ hasText: 'establecimientos' });
    const guardada = page.locator('#resultado-sede').getByRole('heading', { name: nombre });
    await expect(aviso.or(guardada)).toBeVisible();
    if (await aviso.isVisible()) {
      advertencia = true;
      break;
    }
  }
  expect(advertencia).toBe(true);
  await page.getByLabel('Autorizar como administrador el establecimiento adicional').check();
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.locator('#resultado-sede')).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'establecimientos' })).toHaveCount(0);
});

test('AC-ADM-01-4 E: laboratorio oftálmico no ofrece POS al público', async ({ page }) => {
  await ingresar(page);
  await page.getByLabel('Tipo de establecimiento').selectOption('laboratorio_oftalmico');
  await expect(page.locator('#modulos-sede')).toHaveText('No ofrece POS al público.');
  await page.getByLabel('Nombre').fill(`Laboratorio ${Date.now()}`);
  await page.getByLabel('Ciudad').fill('Cali');
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.locator('#resultado-sede')).toContainText('No ofrece POS al público.');
});
