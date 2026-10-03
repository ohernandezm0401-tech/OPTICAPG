// SEG-07 (T26) — Habeas Data en pantalla. AC-SEG-07-1 a AC-SEG-07-4. E.
// Datos sintéticos. Sin festivos cargados: el aviso de Q-32 debe verse.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { calcularVenceEn } from '../../dominio/habeas-data';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de habeas data.');
  return url;
}

async function ingresar(page: Page, correo: string, clave: string) {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  await expect(page.getByTestId('secreto-totp')).toBeVisible();
  const secreto = (await page.getByTestId('secreto-totp').innerText()).trim();
  await page.getByLabel('Código de verificación').fill(codigoTotp(secreto, new Date()));
  await page.getByRole('button', { name: 'Verificar' }).click();
}

test('AC-SEG-07: semáforo, alerta de 48 h, adenda y respuesta archivada', async ({ page }) => {
  test.setTimeout(120000);
  const claveOpto = `Aa1!${randomBytes(12).toString('hex')}`;
  const claveAdmin = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correoOpto = `opto.hd.${sufijo}@example.invalid`;
  const correoAdmin = `admin.hd.${sufijo}@example.invalid`;
  const nit = `901.026.${sufijo.slice(0, 6)}`;
  const hashOpto = await hashearContrasena(claveOpto);
  const hashAdmin = await hashearContrasena(claveAdmin);
  const hashDoc = randomBytes(32).toString('hex');
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T26 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T26', 'Bogotá') returning id`,
      [tenantId],
    );
    const sedeId = sede.rows[0].id as string;
    const opto = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado) values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correoOpto, hashOpto],
    );
    const admin = await cliente.query(
      `insert into usuarios (tenant_id, email, hash_password, estado) values ($1, $2, $3, 'activo') returning id`,
      [tenantId, correoAdmin, hashAdmin],
    );
    const optoId = opto.rows[0].id as string;
    const adminId = admin.rows[0].id as string;
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values
        ($1, $2, $4, 'optometra'),
        ($1, $3, $4, 'admin')`,
      [tenantId, optoId, adminId, sedeId],
    );
    await cliente.query(
      `insert into perfiles_profesionales (
         tenant_id, usuario_id, nombre_completo, registro_profesional, vigente_hasta, estado, tipo
       ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-26', '2099-12-31', 'verificado', 'optometra')`,
      [tenantId, optoId],
    );
    const paciente = await cliente.query(
      `insert into pacientes (
         tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, 26, 'CC', 'sobre-e2e-t26', $2, 'Elena', 'Sintética', '1991-02-02',
         'F', 'No aplica', 'No aplica', 'Calle 26', '3000000026', 'No aplica', 'No aplica', 'No aplica',
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
    await cliente.query(
      `insert into solicitudes_titular (
         tenant_id, sede_id, paciente_id, radicado, tipo, canal, descripcion,
         radicada_en, vence_en, plazo_dias_habiles, festivos_cargados, aviso_festivos, estado
       ) values (
         $1, $2, $3, 'HD-2026-900001', 'reclamo', 'presencial', 'Reclamo sembrado sin marcar',
         '2026-09-01T15:00:00.000Z', '2026-12-15', 15, false,
         'No hay festivos cargados para este tenant. El cálculo del plazo excluye solo sábados y domingos. TODO(Q-32): los festivos los aporta un humano; no hay lista por defecto.',
         'radicada'
       )`,
      [tenantId, sedeId, pacienteId],
    );
  } finally {
    await cliente.end();
  }

  await ingresar(page, correoOpto, claveOpto);
  await expect(page).toHaveURL(/\/dashboard\/optometra/);
  await page.goto('/dashboard/optometra/historia-clinica');
  await page.getByRole('textbox', { name: 'Paciente', exact: true }).fill(pacienteId);
  await page.getByLabel('Motivo de consulta').fill('Control sintetico de habeas data');
  await page.getByLabel('Esfera ojo derecho').fill('-1.25');
  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByLabel('DIP binocular (mm)').fill('62');
  await page.getByLabel('Código CIE-10 principal').fill('H52.1');
  await page.getByLabel('Conducta').fill('Control en borrador sintetico');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByTestId('atencion-id')).toBeVisible();
  const atencionId = ((await page.getByTestId('atencion-id').innerText()).match(/[0-9a-f-]{36}/i) ?? [])[0] ?? '';
  expect(atencionId).toMatch(/[0-9a-f-]{36}/i);
  await page.getByRole('button', { name: 'Firmar atención' }).click();
  await page.getByRole('button', { name: 'Confirmar firma' }).click();
  await expect(page.getByTestId('folio-atencion')).toBeVisible();

  await page.goto('/dashboard/optometra/habeas-data');
  await expect(page.getByRole('heading', { name: 'Habeas Data y PQR' })).toBeVisible();
  await expect(page.getByTestId('aviso-festivos')).toContainText('solo sábados y domingos');
  await page.getByLabel('Tipo').selectOption({ label: 'Rectificación' });
  await page.getByLabel('Paciente').fill(pacienteId);
  await page.getByLabel('Atención').fill(atencionId);
  await page.getByLabel('Nuevo valor').fill('-2.00');
  await page.getByLabel('Motivo de la adenda').fill('Correccion sintetica pedida por el titular');
  await page.getByLabel('Descripción').fill('Rectificacion clinica sintetica');
  await page.getByRole('button', { name: 'Radicar solicitud' }).click();
  const rectificacion = page.locator('article').filter({ hasText: 'rectificacion' }).last();
  await expect(rectificacion.getByTestId('adenda-generada')).toBeVisible();
  await expect(rectificacion.getByTestId('valor-original')).toContainText('-1.25');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL(/\/login/);
  await ingresar(page, correoAdmin, claveAdmin);
  await expect(page).toHaveURL(/\/dashboard\/admin/);
  await page.goto('/dashboard/admin/habeas-data');
  await expect(page.getByTestId('aviso-festivos')).toBeVisible();
  await expect(page.getByTestId('plazos-legales')).toContainText('15 días hábiles');
  await expect(page.getByTestId('plazos-legales')).toContainText('Ley 1581');

  const esperado = calcularVenceEn(new Date(), 15, new Set());
  await page.getByLabel('Tipo').selectOption({ label: 'Reclamo' });
  await page.getByLabel('Paciente').fill(pacienteId);
  await page.getByLabel('Descripción').fill('Reclamo sintetico de pantalla');
  await page.getByRole('button', { name: 'Radicar solicitud' }).click();
  const reclamo = page.locator('article').filter({ hasText: `Vence el ${esperado}` }).last();
  await expect(reclamo.getByTestId('vence-en')).toContainText(esperado);
  await expect(reclamo.getByTestId('semaforo')).toContainText('En plazo');

  const pendiente = page.getByTestId('solicitud-HD-2026-900001');
  await expect(pendiente.getByTestId('alerta-marca')).toBeVisible();
  await pendiente.getByRole('button', { name: 'Marcar reclamo en trámite' }).click();
  await expect(pendiente.getByTestId('leyenda-reclamo')).toHaveText('reclamo en trámite');
  await expect(pendiente.getByTestId('alerta-marca')).toHaveCount(0);

  await pendiente.getByLabel('Respuesta').fill('Respuesta sintetica archivada');
  await pendiente.getByRole('button', { name: 'Archivar respuesta' }).click();
  await expect(pendiente.getByTestId('bitacora-respuesta')).toContainText(correoAdmin);
  await expect(pendiente.getByTestId('bitacora-respuesta')).toContainText('America/Bogotá');
  await expect(pendiente.getByTestId('bitacora-respuesta')).toContainText('Respuesta sintetica archivada');
});
