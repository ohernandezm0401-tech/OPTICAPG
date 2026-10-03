// SEG-11 (T29) — Pantalla de incidentes. E. Datos sintéticos.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { restarDiasHabiles } from '../../dominio/incidentes';
import { sumarDiasHabiles } from '../../dominio/calendario-habil';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de incidentes.');
  return url;
}

async function ingresar(page: Page, correo: string, clave: string, conMfa: boolean) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  if (!conMfa) return;
  await expect(page.getByTestId('secreto-totp')).toBeVisible();
  const secreto = (await page.getByTestId('secreto-totp').innerText()).trim();
  await page.getByLabel('Código de verificación').fill(codigoTotp(secreto, new Date()));
  await page.getByRole('button', { name: 'Verificar' }).click();
}

test('AC-SEG-11: plazo, alertas y aviso interno al admin', async ({ page }) => {
  test.setTimeout(120000);
  const claveOperador = `Aa1!${randomBytes(12).toString('hex')}`;
  const claveAdmin = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correoOperador = `operador.e2e.${sufijo}@example.invalid`;
  const correoAdmin = `admin.e2e.${sufijo}@example.invalid`;
  const hashOperador = await hashearContrasena(claveOperador);
  const hashAdmin = await hashearContrasena(claveAdmin);
  const razon = `Óptica E2E T29 ${sufijo}`;
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  try {
    const plataforma = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      [`Plataforma E2E T29 ${sufijo}`, `NIT-P-${sufijo}`],
    );
    const optica = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      [razon, `NIT-O-${sufijo}`],
    );
    const plataformaId = plataforma.rows[0].id as string;
    const opticaId = optica.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T29', 'Bogotá') returning id`,
      [opticaId],
    );
    const operador = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado) values ($1, $2, $3, 'activo') returning id`,
      [plataformaId, correoOperador, hashOperador],
    );
    const admin = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado) values ($1, $2, $3, 'activo') returning id`,
      [opticaId, correoAdmin, hashAdmin],
    );
    await cliente.query(
      `insert into operadores_plataforma (usuario_id, rol) values ($1, 'owner_plataforma')`,
      [operador.rows[0].id],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, 'admin')`,
      [opticaId, admin.rows[0].id, sede.rows[0].id],
    );
  } finally {
    await cliente.end();
  }

  await ingresar(page, correoOperador, claveOperador, false);
  await expect(page).toHaveURL(/\/dashboard\/owner/);
  await page.goto('/dashboard/owner/incidentes');
  await expect(page.getByRole('heading', { name: 'Incidentes de seguridad' })).toBeVisible();
  await expect(page.getByTestId('regla-sin-datos-personales')).toContainText('datos personales');
  await expect(page.getByTestId('nota-q07')).toContainText('TODO(Q-07)');

  await page.getByLabel('Descripción').fill('credenciales de acceso de la plataforma de prueba');
  await page.getByLabel('Alcance').fill('una optica de prueba');
  await page.getByLabel('Datos afectados').fill('metadatos de cuenta');
  await page.getByLabel('Severidad operativa').fill('operativa');
  await page.getByRole('button', { name: 'Crear incidente' }).click();

  const tarjeta = page.locator('article').filter({ hasText: 'credenciales de acceso de la plataforma de prueba' });
  await expect(tarjeta.getByTestId('aviso-festivos')).toContainText('solo sábados y domingos');
  const dia = ((await tarjeta.getByTestId('dia-deteccion').innerText()).match(/\d{4}-\d{2}-\d{2}/) ?? [])[0] ?? '';
  const limite = sumarDiasHabiles(dia, 15, new Set());
  await expect(tarjeta.getByTestId('plazo-sic')).toContainText(limite);
  await expect(tarjeta.getByTestId('alerta-T-5')).toContainText(restarDiasHabiles(limite, 5, new Set()));
  await expect(tarjeta.getByTestId('alerta-T-2')).toContainText(restarDiasHabiles(limite, 2, new Set()));
  await expect(tarjeta.getByTestId('alerta-T-0')).toContainText(limite);
  await tarjeta.getByText('Plantilla para la SIC').click();
  await expect(tarjeta.getByTestId('plantilla-sic')).toContainText('BORRADOR – requiere revisión jurídica');

  await tarjeta.getByRole('checkbox', { name: razon }).check();
  await tarjeta.getByRole('button', { name: 'Avisar a las ópticas marcadas' }).click();
  await expect(tarjeta).toContainText('notificado_responsable');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL(/\/login/);
  await ingresar(page, correoAdmin, claveAdmin, true);
  await expect(page).toHaveURL(/\/dashboard\/admin/);
  await page.goto('/dashboard/admin/incidentes');
  await expect(page.getByTestId('notificacion-incidente')).toContainText('BORRADOR – requiere revisión jurídica');
  await expect(page.getByTestId('incidente-optica').getByTestId('plazo-sic')).toContainText(limite);
  await expect(page.getByTestId('incidente-optica').getByTestId('alerta-T-0')).toContainText(limite);
});
