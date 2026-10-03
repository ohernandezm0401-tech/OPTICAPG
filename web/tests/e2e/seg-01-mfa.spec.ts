// SEG-01 (T08) — Enrolamiento MFA en el navegador (E).
// AC-SEG-01-1: un optometra sin segundo factor se queda en el login hasta
// confirmar el TOTP. La llave de acceso es opcional.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';

// WebAuthn no acepta una IP como relying party. El servidor E2E también
// escucha en localhost (mismo puerto que playwright.config).
test.use({ baseURL: `http://localhost:${process.env.PUERTO_E2E ?? 3100}` });

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de MFA.');
  return url;
}

async function sembrar(rol: 'optometra' | 'admin', clave: string, correo: string) {
  const hash = await hashearContrasena(clave);
  const nit = `900.000.${Date.now().toString().slice(-6)}.${randomBytes(1).toString('hex')}`;
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica MFA E2E Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede MFA E2E', 'Bogotá') returning id`,
      [tenantId],
    );
    const usuario = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado)
       values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correo, hash],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, $4)`,
      [tenantId, usuario.rows[0].id, sede.rows[0].id, rol],
    );
  } finally {
    await cliente.end();
  }
}

async function pedirClave(page: Page, correo: string, clave: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
}

test('AC-SEG-01-1 E: el optometra no entra hasta enrolar el segundo factor', async ({ page }) => {
  const clave = `Dd4!${randomBytes(12).toString('hex')}`;
  const correo = `mfa.${Date.now()}.${randomBytes(3).toString('hex')}@example.invalid`;
  await sembrar('optometra', clave, correo);
  await pedirClave(page, correo, clave);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByTestId('secreto-totp')).toBeVisible();
  await expect(page.getByTestId('codigos-recuperacion')).toBeVisible();
  await expect(page).not.toHaveURL(/\/dashboard/);
  const secreto = (await page.getByTestId('secreto-totp').innerText()).trim();
  expect(secreto.length).toBeGreaterThan(8);
  await page.getByLabel('Código de verificación').fill(codigoTotp(secreto, new Date()));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page).toHaveURL(/\/dashboard\/optometra/);
});

test('E: una llave de acceso opcional también completa el alta', async ({ page }) => {
  const cliente = await page.context().newCDPSession(page);
  await cliente.send('WebAuthn.enable');
  await cliente.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  const clave = `Ee5!${randomBytes(12).toString('hex')}`;
  const correo = `passkey.${Date.now()}.${randomBytes(3).toString('hex')}@example.invalid`;
  await sembrar('admin', clave, correo);
  await pedirClave(page, correo, clave);
  const boton = page.getByRole('button', { name: 'Registrar llave de acceso' });
  await expect(boton).toBeEnabled();
  await boton.click();
  await expect(page).toHaveURL(/\/dashboard\/admin/);
});
