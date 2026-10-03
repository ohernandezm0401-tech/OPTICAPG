// SEG-08 (T14) — I y S contra PostgreSQL real.
// AC-SEG-08-1, 2, 3 y 4. Solo datos sintéticos.
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  ErrorFirma,
  crearDocumentoEjemplo,
  emitirOtpPaciente,
  exportarDocumento,
  fijarAlmacenamientoParaPruebas,
  firmarPaciente,
  firmarProfesional,
  guardarPerfilProfesional,
  sellarDocumento,
  verificarDocumento,
  type ContextoFirma,
} from '../../db/firma';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { modificarUnByte, presentarBogota, textoVisiblePdf } from '../../dominio/firma';
import { crearAlmacenDiscoCifrado } from '../../lib/firma/almacen';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const VENCIDA = new Date('2026-10-03T14:00:00.000Z');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const TENANT = 'a1400000-0000-4000-8000-000000000014';
const OTRO = 'a1400000-0000-4000-8000-000000000099';
const SEDE = 'a1400000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a1400000-0000-4000-8000-0000000000b1';
const OPTO = 'a1400000-0000-4000-8000-0000000000c1';
const ADMIN = 'a1400000-0000-4000-8000-0000000000c2';
const ASESOR = 'a1400000-0000-4000-8000-0000000000c3';
const SESION = 'a1400000-0000-4000-8000-0000000000d1';

function ctx(rol: string, usuario: string, sede = SEDE, tenant = TENANT): ContextoFirma {
  return {
    tenant_id: tenant,
    usuario_id: usuario,
    sede_id: sede,
    sedes: [sede],
    rol,
    sesion_id: usuario === OPTO ? SESION : null,
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Optica Sintetica T14', '900.000.114-1', 'activo'),
        ($2, 'Optica Sintetica T14 B', '900.000.114-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T14', 'Bogota'),
        ($2, $4, 'Sede T14 B', 'Medellin')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, 'opto.t14@example.invalid', 'activo'),
        ($2, $4, 'admin.t14@example.invalid', 'activo'),
        ($3, $4, 'asesor.t14@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [OPTO, ADMIN, ASESOR, TENANT],
    );
    await cliente.query(
      `insert into sesiones (id, tenant_id, usuario_id, expira_en, mfa_verificada_en, direccion_ip)
       values ($1, $2, $3, $4, $5, '192.0.2.15')
       on conflict (id) do update set mfa_verificada_en = excluded.mfa_verificada_en`,
      [SESION, TENANT, OPTO, '2026-10-03T18:00:00.000Z', AHORA.toISOString()],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function prepararSellado(sufijo: string) {
  const documento = await crearDocumentoEjemplo(ctx('optometra', OPTO), {
    titulo: `Ejemplo sintetico ${sufijo}`,
    cuerpo: 'Cuerpo sintetico sin datos reales.',
  });
  await firmarProfesional(ctx('optometra', OPTO), documento.id, AHORA);
  const otp = await emitirOtpPaciente(ctx('asesor', ASESOR), documento.id, AHORA);
  await firmarPaciente(
    ctx('asesor', ASESOR),
    {
      documentoId: documento.id,
      trazoPng: PNG,
      trazoPuntos: [{ points: [{ x: 4, y: 8, time: 12 }] }],
      nombre: 'Paciente Sintetico',
      documento: '900000014',
      ip: '192.0.2.15',
      agente: 'vitest',
      otp: otp.codigo,
      acuerdoAceptado: true,
    },
    AHORA,
  );
  return documento.id;
}

describe('firma electrónica en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't14',
      claves: new Map([['t14', Buffer.alloc(32, 14)]]),
    });
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
    await obtenerPool().query(`delete from claves_datos where tenant_id = $1`, [TENANT]);
    await guardarPerfilProfesional(
      ctx('admin', ADMIN),
      {
        usuarioId: OPTO,
        nombreCompleto: 'Camila Vega Sintetica',
        registroProfesional: 'RP-SINTETICO-14',
        vigenteHasta: '2026-12-31',
      },
      AHORA,
    );
  }, 30000);

  afterAll(async () => {
    fijarAlmacenamientoParaPruebas(null);
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-SEG-08-2: sin MFA reciente o sin tarjeta vigente se rechaza', async () => {
    await obtenerPool().query(`update sesiones set mfa_verificada_en = $2 where id = $1`, [
      SESION,
      VENCIDA.toISOString(),
    ]);
    const documento = await crearDocumentoEjemplo(ctx('optometra', OPTO), {
      titulo: 'Ejemplo sin mfa',
      cuerpo: 'Cuerpo sintetico.',
    });
    await expect(firmarProfesional(ctx('optometra', OPTO), documento.id, AHORA)).rejects.toMatchObject({
      codigo: 'mfa',
    });

    await obtenerPool().query(`update sesiones set mfa_verificada_en = $2 where id = $1`, [
      SESION,
      AHORA.toISOString(),
    ]);
    await obtenerPool().query(`update perfiles_profesionales set vigente_hasta = '2026-10-02' where usuario_id = $1`, [
      OPTO,
    ]);
    await expect(firmarProfesional(ctx('optometra', OPTO), documento.id, AHORA)).rejects.toMatchObject({
      codigo: 'tarjeta',
    });
    await expect(firmarProfesional(ctx('asesor', ASESOR), documento.id, AHORA)).rejects.toBeInstanceOf(ErrorFirma);

    await obtenerPool().query(`update perfiles_profesionales set vigente_hasta = '2026-12-31' where usuario_id = $1`, [
      OPTO,
    ]);
  });

  it('AC-SEG-08-1, AC-SEG-08-3 y AC-SEG-08-4: sella, verifica y exporta la evidencia', async () => {
    const id = await prepararSellado('bd');
    const sellado = await sellarDocumento(ctx('optometra', OPTO), id, AHORA);
    const exportado = await exportarDocumento(ctx('optometra', OPTO), id);
    const pdf = Buffer.from(exportado.pdf_base64, 'base64');

    expect(await verificarDocumento(ctx('optometra', OPTO), pdf)).toBe(true);
    expect(await verificarDocumento(ctx('optometra', OPTO), Buffer.from(modificarUnByte(pdf)))).toBe(false);
    expect(await verificarDocumento(ctx('optometra', OPTO, SEDE_OTRA, OTRO), pdf)).toBe(false);

    expect(exportado.evidencia_paciente?.trazo_png_base64).toBe(PNG.toString('base64'));
    expect(exportado.evidencia_paciente?.hora_utc).toBe(AHORA.toISOString());
    expect(exportado.evidencia_paciente?.hora_bogota).toBe(presentarBogota(AHORA));
    expect(exportado.evidencia_paciente?.ip).toBe('192.0.2.15');
    expect(exportado.evidencia_paciente?.otp.verificado).toBe(true);
    expect(exportado.evidencia_paciente?.otp.canal).toBe('pantalla_prueba');
    expect(exportado.sello_tsa_proveedor).toBe('nulo');
    expect(exportado.sello_tsa_token).toBeNull();
    expect(exportado.pdf_a).toBe(false);

    const texto = textoVisiblePdf(pdf);
    expect(texto).toContain('Camila Vega Sintetica');
    expect(texto).toContain('RP-SINTETICO-14');
    expect(texto).toContain(presentarBogota(AHORA));
    expect(texto).toContain('192.0.2.15');

    const cifrado = await obtenerPool().query<{ contenido_cifrado: Buffer; hash_documento: string }>(
      `select a.contenido_cifrado, d.hash_documento
         from documentos_firma d
         join anexos a on a.id::text = d.almacen_id
        where d.id = $1`,
      [id],
    );
    expect(cifrado.rows[0]?.hash_documento).toBe(sellado.hash);
    expect(cifrado.rows[0]?.contenido_cifrado.includes(Buffer.from('%PDF'))).toBe(false);

    await expect(
      obtenerPool().query(`update documentos_firma set cuerpo = 'cambiado' where id = $1`, [id]),
    ).rejects.toThrow(/inmutable|no se edita/);
  });

  it('S: el OTP usado no se reutiliza y el disco cifrado no guarda el PDF en claro', async () => {
    const id = await prepararSellado('disco');
    const dir = await mkdtemp(path.join(tmpdir(), 'optisaas-firma-'));
    process.env.ALMACEN_DISCO_DIR = dir;
    const disco = crearAlmacenDiscoCifrado(dir);
    await sellarDocumento(ctx('optometra', OPTO), id, AHORA, disco);
    const exportado = await exportarDocumento(ctx('asesor', ASESOR), id);
    expect(exportado.evidencia_paciente?.otp.verificado).toBe(true);

    const archivo = await obtenerPool().query<{ almacen_id: string }>(
      `select almacen_id from documentos_firma where id = $1`,
      [id],
    );
    const binario = await readFile(path.join(dir, TENANT, `${archivo.rows[0]?.almacen_id}.bin`));
    expect(binario.includes(Buffer.from('%PDF'))).toBe(false);
    expect(await disco.leer(OTRO, archivo.rows[0]?.almacen_id ?? '')).toBeNull();

    const otro = await crearDocumentoEjemplo(ctx('optometra', OPTO), {
      titulo: 'Ejemplo otp',
      cuerpo: 'Cuerpo sintetico.',
    });
    const otp = await emitirOtpPaciente(ctx('asesor', ASESOR), otro.id, AHORA);
    const firma = {
      documentoId: otro.id,
      trazoPng: PNG,
      trazoPuntos: [{ points: [{ x: 1, y: 1, time: 1 }] }],
      nombre: 'Paciente Sintetico',
      documento: '900000015',
      ip: '192.0.2.15',
      agente: 'vitest',
      acuerdoAceptado: true,
    };
    await firmarPaciente(ctx('asesor', ASESOR), { ...firma, otp: otp.codigo }, AHORA);
    await expect(firmarPaciente(ctx('asesor', ASESOR), { ...firma, otp: otp.codigo }, AHORA)).rejects.toBeInstanceOf(
      ErrorFirma,
    );
    expect(randomUUID()).toMatch(/-/);
  });
});
