// SEG-01 (T07) — Sesión revocable y no enumeración en el navegador (E).
// AC-SEG-01-3: tras revocar en la base, la siguiente petición (API y tablero)
// ya no acepta la sesión.
// AC-SEG-01-2 (respuesta): un correo inexistente y una clave mala muestran
// el mismo mensaje y la respuesta no trae la contraseña.
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

import { hashearContrasena } from '../../lib/auth/contrasena';

const MENSAJE = 'Credenciales inválidas. Intente nuevamente.';

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('Falta DATABASE_URL para la E2E de sesión (la CI la define antes de test:e2e).');
  }
  return url;
}

test('AC-SEG-01-3: una sesión revocada cae en la petición siguiente', async ({ page }) => {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const correo = `e2e.${Date.now()}.${randomBytes(3).toString('hex')}@example.invalid`;
  const nit = `900.000.${Date.now().toString().slice(-6)}`;
  const hash = await hashearContrasena(clave);
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let usuarioId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E', 'Bogotá') returning id`,
      [tenantId],
    );
    const usuario = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado)
       values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correo, hash],
    );
    usuarioId = usuario.rows[0].id as string;
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, 'admin')`,
      [tenantId, usuarioId, sede.rows[0].id],
    );
  } finally {
    await cliente.end();
  }

  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page).toHaveURL(/\/dashboard\/admin/);

  const vigente = await page.request.get('/api/auth/vigencia');
  expect(vigente.status()).toBe(200);
  expect(await vigente.text()).not.toContain(clave);

  const revoque = new Client({ connectionString: urlBd() });
  await revoque.connect();
  try {
    await revoque.query(`update sesiones set revocada_en = now() where usuario_id = $1 and revocada_en is null`, [
      usuarioId,
    ]);
  } finally {
    await revoque.end();
  }

  const despues = await page.request.get('/api/auth/vigencia');
  expect(despues.status()).toBe(401);
  expect(await despues.text()).not.toContain(clave);

  await page.goto('/dashboard/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('AC-SEG-01-2 E: el login no distingue un usuario inexistente ni devuelve la clave', async ({ page }) => {
  const clave = `Bb2!${randomBytes(12).toString('hex')}`;
  const correoMal = `nadie.${Date.now()}@example.invalid`;
  const correoSi = `conocido.${Date.now()}@example.invalid`;
  const nit = `900.000.${Date.now().toString().slice(-6)}`;
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  try {
    const hash = await hashearContrasena(`Cc3!${randomBytes(8).toString('hex')}zz`);
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica Enum Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede Enum', 'Bogotá') returning id`,
      [tenantId],
    );
    const usuario = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado)
       values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correoSi, hash],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, 'asesor')`,
      [tenantId, usuario.rows[0].id, sede.rows[0].id],
    );
  } finally {
    await cliente.end();
  }

  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correoMal);
  await page.getByLabel('Contraseña').fill(clave);
  const respuestaDesconocido = page.waitForResponse((respuesta) =>
    respuesta.url().includes('/api/auth/callback/credentials'),
  );
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  const cuerpoDesconocido = await (await respuestaDesconocido).text();
  await expect(page.getByText(MENSAJE)).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correoSi);
  await page.getByLabel('Contraseña').fill(clave);
  const respuestaConocido = page.waitForResponse((respuesta) =>
    respuesta.url().includes('/api/auth/callback/credentials'),
  );
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  const cuerpoConocido = await (await respuestaConocido).text();
  await expect(page.getByText(MENSAJE)).toBeVisible();

  expect(cuerpoDesconocido).not.toContain(clave);
  expect(cuerpoConocido).not.toContain(clave);
  expect(cuerpoDesconocido).not.toMatch(/inexistente/i);
  expect(cuerpoConocido).not.toMatch(/inexistente/i);
});
