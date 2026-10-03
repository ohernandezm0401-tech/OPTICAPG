// OPT-04 (T22) — Consentimiento en la ficha. AC-OPT-04-1 (E, A).
// Datos sintéticos. La adaptación de lentes de contacto no tiene módulo propio.
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashDocumento } from '../../dominio/documento-hash';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';
import { cifrarParaTenant } from '../../lib/cifrado/almacen.mjs';
import { claveMaestraActiva, leerRegistroKek } from '../../lib/cifrado/kek.mjs';

const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de consentimientos.');
  return url;
}

async function sembrarOptometra(page: Page) {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correo = `opto.cons.${sufijo}@example.invalid`;
  const nit = `901.122.${sufijo.slice(0, 6)}`;
  const hashClave = await hashearContrasena(clave);
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T22 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T22', 'Bogotá') returning id`,
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
       ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-22', '2099-12-31', 'verificado', 'optometra')`,
      [tenantId, usuarioId],
    );
    const registro = leerRegistroKek();
    const sobre = await cifrarParaTenant(cliente, registro, tenantId, Buffer.from('900122001', 'utf8'));
    const paciente = await cliente.query(
      `insert into pacientes (
         tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, 22, 'CC', $2, $3, 'Elena', 'Sintetica', '1991-02-02',
         'F', 'No aplica', 'No aplica', 'Calle 22', '3000000022', 'No aplica', 'No aplica', 'No aplica',
         'particular', $4
       ) returning id`,
      [tenantId, sobre.texto, hashDocumento('CC', '900122001', claveMaestraActiva(registro)), sedeId],
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

test('AC-OPT-04-1 E y A: la ficha no inicia la adaptación sin consentimiento firmado', async ({ page }) => {
  const pacienteId = await sembrarOptometra(page);
  await page.goto('/dashboard/optometra/historia-clinica');
  await expect(page.getByRole('heading', { name: 'Atención de optometría' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Paciente', exact: true }).fill(pacienteId);
  await page.getByLabel('Motivo de consulta').fill('Control sintetico de consentimiento');
  await page.getByLabel('Esfera ojo derecho').fill('-1.25');
  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByLabel('DIP binocular (mm)').fill('62');
  await page.getByLabel('Código CIE-10 principal').fill('H52.1');
  await page.getByLabel('Conducta').fill('Borrador sintetico');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByTestId('atencion-id')).toBeVisible();

  const panel = page.getByRole('region', { name: 'Consentimiento informado' });
  await expect(panel.getByText('BORRADOR – requiere revisión jurídica').first()).toBeVisible();
  await expect(panel.getByTestId('consentimiento-version')).toContainText('Versión vigente: 1');
  await panel.getByRole('button', { name: 'Iniciar: Adaptación de lentes de contacto' }).click();
  await expect(panel.getByRole('alert')).toContainText(/No se puede iniciar/i);

  await panel.getByLabel('Acepto el acuerdo de firma electrónica').check();
  const lienzo = panel.getByLabel('Trazo de la firma del paciente');
  await lienzo.scrollIntoViewIfNeeded();
  const caja = await lienzo.boundingBox();
  if (!caja) throw new Error('No apareció el lienzo de la firma.');
  await page.mouse.move(caja.x + 24, caja.y + 40);
  await page.mouse.down();
  await page.mouse.move(caja.x + 180, caja.y + 90, { steps: 12 });
  await page.mouse.up();
  await panel.getByRole('button', { name: 'Registrar consentimiento firmado' }).click();
  await expect(panel.getByRole('status')).toContainText(/anexo a la atención/i, { timeout: 20000 });
  await expect(panel.getByTestId('consentimiento-estado')).toContainText(/firmado/i);
  await expect(panel.getByTestId('consentimiento-estado')).toContainText(/anexo [a-f0-9]{16}/);

  await panel.getByRole('button', { name: 'Iniciar: Adaptación de lentes de contacto' }).click();
  await expect(panel.getByRole('status')).toContainText(/Se puede iniciar/i);

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
});
