// OPT-02 (T21) — Adenda en la ficha firmada. AC-OPT-02-1 y AC-OPT-02-2.
// Datos sintéticos. La copia PDF al paciente queda para OPT-06 (T25).
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';

const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de adendas.');
  return url;
}

async function sembrarOptometra(page: Page) {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correo = `opto.adenda.${sufijo}@example.invalid`;
  const nit = `901.000.${sufijo.slice(0, 6)}`;
  const hashClave = await hashearContrasena(clave);
  const hashDoc = randomBytes(32).toString('hex');
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T21 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad) values ($1, 'Sede E2E T21', 'Bogotá') returning id`,
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
       ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-21', '2099-12-31', 'verificado', 'optometra')`,
      [tenantId, usuarioId],
    );
    const paciente = await cliente.query(
      `insert into pacientes (
         tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
         sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
         tipo_vinculacion, sede_alta_id
       ) values (
         $1, 21, 'CC', 'sobre-e2e-t21', $2, 'Elena', 'Sintética', '1991-02-02',
         'F', 'No aplica', 'No aplica', 'Calle 21', '3000000021', 'No aplica', 'No aplica', 'No aplica',
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
  return pacienteId;
}

test('AC-OPT-02-1 y AC-OPT-02-2: la adenda corrige la esfera y el historial muestra quién, cuándo y por qué', async ({
  page,
}) => {
  const pacienteId = await sembrarOptometra(page);
  await page.goto('/dashboard/optometra/historia-clinica');
  await expect(page.getByRole('heading', { name: 'Atención de optometría' })).toBeVisible();
  await page.getByLabel('Paciente', { exact: true }).fill(pacienteId);
  await page.getByLabel('Motivo de consulta').fill('Control sintetico de adenda');
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
  await expect(page.getByLabel('Esfera ojo derecho')).toBeDisabled();
  await expect(page.getByLabel('Esfera ojo derecho')).toHaveValue('-1.25');

  const panel = page.getByRole('region', { name: 'Adendas' });
  await expect(panel.getByRole('button', { name: 'Agregar adenda' })).toBeVisible();
  await panel.getByLabel('Nuevo valor').fill('-2.00');
  await panel.getByRole('button', { name: 'Agregar adenda' }).click();
  await expect(panel.getByRole('alert')).toContainText(/motivo/i);

  await panel.getByLabel('Motivo de la adenda').fill('Correccion sintetica de la esfera');
  await panel.getByRole('button', { name: 'Agregar adenda' }).click();
  await expect(panel.getByRole('status')).toContainText(/no se modificó/i);
  await expect(page.getByLabel('Esfera ojo derecho')).toHaveValue('-1.25');
  await expect(page.getByTestId('refraccion-original')).toContainText('-1.25');
  await expect(page.getByTestId('marca-esfera_od')).toHaveText('corregido por adenda #1');
  const linea = page.getByTestId('linea-tiempo');
  await expect(linea).toContainText('Optómetra E2E Sintética');
  await expect(linea).toContainText('Quién:');
  await expect(linea).toContainText('Cuándo:');
  await expect(linea).toContainText('America/Bogotá');
  await expect(linea).toContainText('Por qué: Correccion sintetica de la esfera');
  await expect(linea).toContainText('-2');
  await expect(page.getByLabel('Esfera ojo derecho')).toBeDisabled();

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
