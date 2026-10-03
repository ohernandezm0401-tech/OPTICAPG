// OPT-06 (T25) — Copia gratuita en la ficha. AC-OPT-06-2 y AC-OPT-06-3.
// Datos sintéticos. El código vuelve en la respuesta solo porque APP_ENV es desarrollo.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashDocumento } from '../../dominio/documento-hash';
import { hashSha256, textoVisiblePdf } from '../../dominio/firma';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';
import { cifrarParaTenant } from '../../lib/cifrado/almacen.mjs';
import { claveMaestraActiva, leerRegistroKek } from '../../lib/cifrado/kek.mjs';

const DOCUMENTO = '900125025';
const MOTIVO = 'Control sintetico de copia';

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de la copia.');
  return url;
}

async function sembrar(page: Page) {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correo = `opto.copia.${sufijo}@example.invalid`;
  const nit = `901.025.${sufijo.slice(0, 6)}`;
  const hashClave = await hashearContrasena(clave);
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T25 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T25', 'Bogotá') returning id`,
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
       ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-25', '2099-12-31', 'verificado', 'optometra')`,
      [tenantId, usuarioId],
    );
    const registro = leerRegistroKek();
    const sobre = await cifrarParaTenant(cliente, registro, tenantId, Buffer.from(DOCUMENTO, 'utf8'));
    const paciente = await cliente.query(
      `insert into pacientes (
         tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, email, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, 25, 'CC', $2, $3, 'Elena', 'Sintética', '1991-02-02',
         'F', 'No aplica', 'No aplica', 'Calle 25', '3000000025', $4, 'No aplica', 'No aplica', 'No aplica',
         'particular', $5
       ) returning id`,
      [tenantId, sobre.texto, hashDocumento('CC', DOCUMENTO, claveMaestraActiva(registro)), `paciente.copia.${sufijo}@example.invalid`, sedeId],
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
  return pacienteId;
}

test('AC-OPT-06-2 y AC-OPT-06-3: la copia gratuita queda con hash y el tercero es rechazado', async ({ page }) => {
  const pacienteId = await sembrar(page);
  await page.goto('/dashboard/optometra/historia-clinica');
  await page.getByRole('textbox', { name: 'Paciente', exact: true }).fill(pacienteId);
  await page.getByLabel('Motivo de consulta').fill(MOTIVO);
  await page.getByLabel('Esfera ojo derecho').fill('-1.25');
  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByLabel('DIP binocular (mm)').fill('62');
  await page.getByLabel('Código CIE-10 principal').fill('H52.1');
  await page.getByLabel('Conducta').fill('Control en borrador sintetico');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByTestId('atencion-id')).toBeVisible();
  await page.getByRole('button', { name: 'Firmar atención' }).click();
  await page.getByRole('button', { name: 'Confirmar firma' }).click();
  await expect(page.getByTestId('folio-atencion')).toContainText(/Folio [1-9]/);

  await page.getByLabel('Paciente de la copia').fill(pacienteId);
  await page.getByLabel('Documento de identidad').fill(DOCUMENTO);
  await page.getByLabel('Quién solicita').selectOption('tercero');
  await page.getByRole('button', { name: 'Solicitar copia' }).click();
  await expect(page.getByTestId('error-copia-hc')).toContainText(/terceros/);

  await page.getByLabel('Quién solicita').selectOption('titular');
  const espera = page.waitForResponse(
    (respuesta) => respuesta.url().endsWith('/api/entregas-hc') && respuesta.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Solicitar copia' }).click();
  const cuerpo = (await (await espera).json()) as { codigo_desarrollo?: string; costo_cop?: number; error?: string };
  expect(cuerpo.costo_cop).toBe(0);
  expect(cuerpo.codigo_desarrollo).toMatch(/^\d{6}$/);
  await page.getByLabel('Código de un solo uso').fill(cuerpo.codigo_desarrollo ?? '');
  await page.getByRole('button', { name: 'Entregar copia' }).click();
  await expect(page.getByTestId('costo-copia-hc')).toHaveText('Costo: 0 COP');
  const hash = (await page.getByTestId('hash-copia-hc').innerText()).trim();
  expect(hash).toMatch(/^[a-f0-9]{64}$/);

  const enlace = await page.getByTestId('copia-hc-pdf').getAttribute('href');
  const descarga = await page.request.get(enlace ?? '');
  expect(descarga.ok()).toBe(true);
  expect(descarga.headers()['x-entrega-hash']).toBe(hash);
  expect(descarga.headers()['x-entrega-costo-cop']).toBe('0');
  const pdf = Buffer.from(await descarga.body());
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(hashSha256(pdf)).toBe(hash);
  const texto = textoVisiblePdf(pdf);
  expect(texto).toContain(MOTIVO);
  expect(texto).toContain('Sello:');
  expect(texto).toContain('RP-E2E-25');
  expect(texto).toContain('Costo 0 COP');
  expect(texto).toContain('BORRADOR');
});
