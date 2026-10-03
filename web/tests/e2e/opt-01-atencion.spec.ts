// OPT-01 / OPT-24 (T19/T20) — Flujo con teclado, accesibilidad y persistencia.
// La cuenta de demostración no tiene UUID: valida sin abrir una fila ajena.
// El flujo completo usa un optómetra sintético de la base de pruebas.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';

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
  await page.waitForFunction(() => {
    const boton = document.querySelector('#ficha-atencion button[type="submit"]');
    if (!(boton instanceof HTMLElement)) return false;
    return getComputedStyle(boton).backgroundColor === 'rgb(10, 10, 10)';
  });
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

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('Falta DATABASE_URL para la E2E de la atención (la CI la define antes de test:e2e).');
  }
  return url;
}

test('AC-OPT-01-1 y AC-OPT-01-3 E y A: crea, autoguarda y firma con teclado', async ({ page }) => {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correo = `opto.e2e.${sufijo}@example.invalid`;
  const nit = `900.000.${sufijo.slice(0, 6)}`;
  const hashClave = await hashearContrasena(clave);
  const hashDoc = randomBytes(32).toString('hex');
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T20 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T20', 'Bogotá') returning id`,
      [tenantId],
    );
    const sedeId = sede.rows[0].id as string;
    const usuario = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado)
       values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correo, hashClave],
    );
    const usuarioId = usuario.rows[0].id as string;
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, 'optometra')`,
      [tenantId, usuarioId, sedeId],
    );
    await cliente.query(
      `insert into perfiles_profesionales (
         tenant_id, usuario_id, nombre_completo, registro_profesional, vigente_hasta, estado, tipo
       ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-20', '2099-12-31', 'verificado', 'optometra')`,
      [tenantId, usuarioId],
    );
    const paciente = await cliente.query(
      `insert into pacientes (
         tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, 20, 'CC', 'sobre-e2e-t20', $2, 'Elena', 'Sintética', '1991-02-02',
         'F', 'No aplica', 'No aplica', 'Calle 20', '3000000020', 'No aplica', 'No aplica', 'No aplica',
         'particular', $3
       ) returning id`,
      [tenantId, hashDoc, sedeId],
    );
    pacienteId = paciente.rows[0].id as string;
    const texto = await cliente.query(
      `insert into textos_legales (
         tenant_id, tipo, codigo, etiqueta, opcional, version, contenido, hash, vigente_desde
       ) values (
         $1, 'autorizacion_tratamiento', 'tratamiento_clinico', 'Tratamiento', false, 1,
         'BORRADOR – requiere revisión jurídica', $2, now()
       ) returning id`,
      [tenantId, randomBytes(32).toString('hex')],
    );
    await cliente.query(
      `insert into autorizaciones (
         tenant_id, paciente_id, texto_id, finalidad, otorgada, estado, medio, evidencia,
         contenido_exacto, hash_texto, registrada_en
       ) values (
         $1, $2, $3, 'tratamiento_clinico', true, 'otorgada', 'presencial', '{}'::jsonb,
         'BORRADOR – requiere revisión jurídica', $4, now()
       )`,
      [tenantId, pacienteId, texto.rows[0].id, randomBytes(32).toString('hex')],
    );
    await cliente.query(
      `insert into catalogo_cie10 (codigo, descripcion, version, vigente_desde)
       values ('H52.1', 'SINTETICO codigo de prueba H52.1 — no es la descripcion oficial del CIE-10', 'sintetica-prueba-2026', '2026-01-01')
       on conflict (codigo, version) do nothing`,
    );
  } finally {
    await cliente.end();
  }

  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page.getByTestId('secreto-totp')).toBeVisible();
  const secreto = (await page.getByTestId('secreto-totp').innerText()).trim();
  await page.getByLabel('Código de verificación').fill(codigoTotp(secreto, new Date()));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/dashboard\/optometra/);

  await page.goto('/dashboard/optometra/historia-clinica');
  await expect(page.getByRole('heading', { name: 'Atención de optometría' })).toBeVisible();
  await page.waitForFunction(() => {
    const boton = document.querySelector('#ficha-atencion button[type="submit"]');
    if (!(boton instanceof HTMLElement)) return false;
    return getComputedStyle(boton).backgroundColor === 'rgb(10, 10, 10)';
  });
  await page.addScriptTag({ path: axePath });
  const graves = await page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (nodo: Element) => Promise<{ violations: { id: string; impact?: string }[] }> };
    }).axe;
    const nodo = document.getElementById('ficha-atencion');
    if (!nodo) return ['sin-ficha'];
    const resultado = await axe.run(nodo);
    return resultado.violations
      .filter((item) => item.impact === 'critical' || item.impact === 'serious')
      .map((item) => item.id);
  });
  expect(graves).toEqual([]);

  await page.getByLabel('Paciente').focus();
  await page.keyboard.type(pacienteId);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Control sintetico con teclado');
  await page.getByRole('link', { name: 'Refracción' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Eje ojo derecho').focus();
  await page.keyboard.type('200');
  await expect(page.locator('#error-eje_od')).toContainText(/límite de captura/);
  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByLabel('DIP binocular (mm)').fill('62');
  await page.getByRole('link', { name: 'Diagnóstico' }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Código CIE-10 principal').focus();
  await page.keyboard.type('H52.1');
  await page.getByLabel('Conducta').focus();
  await page.keyboard.type('Control en borrador sintetico');
  await expect(page.locator('#ficha-atencion').getByRole('status')).toContainText(/Autoguardado/i, { timeout: 15000 });
  await expect(page.getByTestId('atencion-id')).toBeVisible();

  await page.getByRole('button', { name: 'Firmar atención' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Resumen antes de firmar' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('H52.1');
  await expect(page.getByRole('dialog')).toContainText('180');
  await page.getByRole('button', { name: 'Confirmar firma' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('folio-atencion')).toContainText(/Folio [1-9]/);
  await expect(page.getByTestId('hora-servidor')).toContainText(/Hora del servidor/);
  await expect(page.getByTestId('hora-bogota')).toContainText(/Bogotá/);
  await expect(page.getByTestId('sello-atencion')).toContainText(/RP-E2E-20/);
  await expect(page.getByLabel('Esfera ojo derecho')).toBeDisabled();
  await expect(page.getByLabel('Motivo de consulta')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Firmar atención' })).toBeDisabled();
  await expect(page.getByText('solo lectura')).toBeVisible();
});
