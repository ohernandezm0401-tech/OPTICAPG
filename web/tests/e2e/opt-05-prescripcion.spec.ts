// OPT-05 (T23) — Prescripción en pantalla y PDF. AC-OPT-05-1, AC-OPT-05-5 y AC-OPT-05-6.
// Datos sintéticos. ASE-07 no tiene pantalla: el estado dispensable sale del dominio.
import { randomBytes } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { Client } from 'pg';

import { hashDocumento } from '../../dominio/documento-hash';
import { textoVisiblePdf } from '../../dominio/firma';
import { hashearContrasena } from '../../lib/auth/contrasena';
import { codigoTotp } from '../../lib/auth/mfa/totp';
import { cifrarParaTenant } from '../../lib/cifrado/almacen.mjs';
import { claveMaestraActiva, leerRegistroKek } from '../../lib/cifrado/kek.mjs';

const DOCUMENTO = '900123023';

function urlBd(): string {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_TEST;
  if (!url) throw new Error('Falta DATABASE_URL para la E2E de prescripciones.');
  return url;
}

async function sembrar(rol: 'optometra' | 'asesor') {
  const clave = `Aa1!${randomBytes(12).toString('hex')}`;
  const sufijo = `${Date.now().toString().slice(-6)}${randomBytes(2).toString('hex')}`;
  const correo = `${rol}.rx.${sufijo}@example.invalid`;
  const nit = `901.123.${sufijo.slice(0, 6)}`;
  const hashClave = await hashearContrasena(clave);
  const cliente = new Client({ connectionString: urlBd() });
  await cliente.connect();
  let pacienteId = '';
  try {
    const tenant = await cliente.query(
      `insert into tenants (razon_social, nit, estado) values ($1, $2, 'activo') returning id`,
      ['Óptica E2E T23 Sintética S.A.S.', nit],
    );
    const tenantId = tenant.rows[0].id as string;
    const sede = await cliente.query(
      `insert into sedes (tenant_id, nombre, ciudad, direccion) values ($1, 'Sede E2E T23', 'Bogotá', 'Calle 23') returning id`,
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
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, $4)`,
      [tenantId, usuarioId, sedeId, rol],
    );
    if (rol === 'optometra') {
      await cliente.query(
        `insert into perfiles_profesionales (
           tenant_id, usuario_id, nombre_completo, registro_profesional, vigente_hasta, estado, tipo
         ) values ($1, $2, 'Optómetra E2E Sintética', 'RP-E2E-23', '2099-12-31', 'verificado', 'optometra')`,
        [tenantId, usuarioId],
      );
      const registro = leerRegistroKek();
      const sobre = await cifrarParaTenant(cliente, registro, tenantId, Buffer.from(DOCUMENTO, 'utf8'));
      const paciente = await cliente.query(
        `insert into pacientes (
           tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
           sexo, estado_civil, ocupacion, direccion, telefono, acompanante, responsable, aseguradora,
           tipo_vinculacion, sede_alta_id
         ) values (
           $1, 23, 'CC', $2, $3, 'Elena', 'Sintetica', '1991-02-02',
           'F', 'No aplica', 'No aplica', 'Calle 23', '3000000023', 'No aplica', 'No aplica', 'No aplica',
           'particular', $4
         ) returning id`,
        [tenantId, sobre.texto, hashDocumento('CC', DOCUMENTO, claveMaestraActiva(registro)), sedeId],
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
    }
  } finally {
    await cliente.end();
  }
  return { clave, correo, pacienteId };
}

async function ingresar(page: Page, correo: string, clave: string, rol: 'optometra' | 'asesor') {
  await page.goto('/login');
  await page.getByLabel('Correo Electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Ingresar al Sistema' }).click();
  if (rol === 'optometra') {
    await expect(page.getByTestId('secreto-totp')).toBeVisible();
    const secreto = (await page.getByTestId('secreto-totp').innerText()).trim();
    await page.getByLabel('Código de verificación').fill(codigoTotp(secreto, new Date()));
    await page.getByRole('button', { name: 'Verificar' }).click();
  }
  await expect(page).toHaveURL(new RegExp(`/dashboard/${rol}`));
}

test('AC-OPT-05-1 y AC-OPT-05-6 E: sin vigencia no firma; el PDF trae la HC y la vencida no es dispensable', async ({
  page,
}) => {
  const cuenta = await sembrar('optometra');
  await ingresar(page, cuenta.correo, cuenta.clave, 'optometra');
  await page.goto('/dashboard/optometra/historia-clinica');
  await page.getByRole('textbox', { name: 'Paciente', exact: true }).fill(cuenta.pacienteId);
  await page.getByLabel('Motivo de consulta').fill('Control sintetico de prescripcion');
  await page.getByLabel('Esfera ojo derecho').fill('-1.25');
  await page.getByLabel('Eje ojo derecho').fill('180');
  await page.getByLabel('DIP binocular (mm)').fill('62');
  await page.getByLabel('Código CIE-10 principal').fill('H52.1');
  await page.getByLabel('Conducta').fill('Borrador sintetico');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByTestId('atencion-id')).toBeVisible();
  await page.getByRole('button', { name: 'Firmar atención' }).click();
  await page.getByRole('button', { name: 'Confirmar firma' }).click();
  await expect(page.getByTestId('folio-atencion')).toContainText(/Folio [1-9]/);
  const marca = await page.getByTestId('atencion-id').innerText();
  const atencionId = marca.match(/[0-9a-f-]{36}/i)?.[0] ?? '';
  expect(atencionId).not.toBe('');

  await page.goto(`/dashboard/optometra/formulas?atencion=${atencionId}`);
  await expect(page.getByRole('heading', { name: 'Prescripción' })).toBeVisible();
  await page.getByRole('button', { name: 'Cargar atención' }).click();
  await expect(page.getByLabel('Vigencia')).toHaveValue('');
  await expect(page.getByLabel('Número de historia clínica')).toHaveValue('23');
  await page.getByRole('button', { name: 'Firmar prescripción' }).click();
  await expect(page.getByTestId('prescripcion-error')).toContainText('vigencia_hasta');

  await page.getByLabel('Teléfono').fill('3000000023');
  await page.getByLabel('Correo').fill('sede.t23@example.invalid');
  await page.getByLabel('Documento del paciente').fill(DOCUMENTO);
  await page.getByLabel('Dispositivo prescrito').fill('lentes oftalmicos sinteticos');
  await page.getByLabel('Agudeza visual').fill('20/20');
  await page.getByLabel('Forma de uso').fill('No aplica');
  await page.getByLabel('Distancia pupilar').fill('62');
  await page.getByLabel('Filtro').fill('No aplica');
  await page.getByLabel('Duración del tratamiento').fill('No aplica');
  await page.getByLabel('Cantidad en números').fill('2');
  await page.getByLabel('Cantidad en letras').fill('dos');
  await page.getByLabel('Indicaciones').fill('Uso sintetico');
  await page.getByLabel('Vigencia').fill('2020-01-01');
  await page.getByRole('button', { name: 'Firmar prescripción' }).click();
  await expect(page.getByTestId('prescripcion-numero')).toContainText(/RX-\d{4}-\d{6}/, { timeout: 20000 });
  await expect(page.getByTestId('prescripcion-dispensable')).toContainText('no (vencida)');

  const descarga = page.waitForEvent('download');
  await page.getByTestId('prescripcion-pdf').click();
  const archivo = await descarga;
  const ruta = await archivo.path();
  if (!ruta) throw new Error('No se descargó el PDF.');
  const { readFileSync } = await import('node:fs');
  const pdf = readFileSync(ruta);
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  const texto = textoVisiblePdf(pdf);
  expect(texto).toContain('Numero HC: 23');
  expect(texto).toContain('Vigencia: 2020-01-01');
  expect(texto).toContain('Registro profesional: RP-E2E-23');
  expect(texto).toContain('Cantidad: 2 (dos)');
});

test('AC-OPT-05-5 E: el asesor no crea ni modifica la prescripción', async ({ page }) => {
  const cuenta = await sembrar('asesor');
  await ingresar(page, cuenta.correo, cuenta.clave, 'asesor');
  const alta = await page.request.post('/api/prescripciones', { data: { tipo: 'lentes_oftalmicos' } });
  expect(alta.status()).toBe(403);
  const cambio = await page.request.patch('/api/prescripciones/00000000-0000-4000-8000-000000000023', {
    data: { indicaciones: 'cambio' },
  });
  expect(cambio.status()).toBe(403);
});
