// SEG-05 (T15) — Autorización contra PostgreSQL real.
// AC-SEG-05-1 a AC-SEG-05-5 (I). Solo datos sintéticos.
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  ErrorAutorizacionDatos,
  evaluarApertura,
  evaluarContacto,
  exportarEvidencia,
  publicarVersionTexto,
  registrarDecisiones,
  revocarContacto,
  type ContextoAutorizacion,
} from '../../db/autorizaciones';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { guardarPaciente, type ContextoPaciente } from '../../db/pacientes';
import { PLANTILLA_TRATAMIENTO_CLINICO, hashTextoLegal } from '../../dominio/autorizacion-datos';
import { MARCA_NO_APLICA, type PacienteEntrada } from '../../dominio/pacientes';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const AHORA = new Date('2026-10-03T15:00:00.000Z');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const TENANT = 'a1500000-0000-4000-8000-000000000015';
const OTRO = 'a1500000-0000-4000-8000-000000000099';
const SEDE = 'a1500000-0000-4000-8000-0000000000a1';
const SEDE_OTRA = 'a1500000-0000-4000-8000-0000000000b1';
const ASESOR = 'a1500000-0000-4000-8000-0000000000c1';
const ADMIN = 'a1500000-0000-4000-8000-0000000000c2';
const OTRO_USUARIO = 'a1500000-0000-4000-8000-0000000000c3';

function ctx(rol: string, usuario = ASESOR, tenant = TENANT, sede = SEDE): ContextoAutorizacion {
  return { tenant_id: tenant, usuario_id: usuario, sede_id: sede, sedes: [sede], rol };
}

function paciente(num: string): PacienteEntrada {
  return {
    nombres: 'Ana Sintetica',
    apellidos: 'Perez Demo',
    tipo_doc: 'CC',
    num_doc: num,
    fecha_nacimiento: '1990-05-05',
    sexo: MARCA_NO_APLICA,
    estado_civil: MARCA_NO_APLICA,
    ocupacion: MARCA_NO_APLICA,
    direccion: MARCA_NO_APLICA,
    telefono: MARCA_NO_APLICA,
    acompanante: MARCA_NO_APLICA,
    responsable: MARCA_NO_APLICA,
    aseguradora: MARCA_NO_APLICA,
    tipo_vinculacion: 'no_aplica',
  };
}

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Optica Sintetica T15', '900.000.115-1', 'activo'),
        ($2, 'Optica Sintetica T15 B', '900.000.115-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T15', 'Bogota'),
        ($2, $4, 'Sede T15 B', 'Medellin')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $4, 'asesor.t15@example.invalid', 'activo'),
        ($2, $4, 'admin.t15@example.invalid', 'activo'),
        ($3, $5, 'asesor.t15b@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ASESOR, ADMIN, OTRO_USUARIO, TENANT, OTRO],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

describe('autorizaciones en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't15',
      claves: new Map([['t15', randomBytes(32)]]),
    });
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrar();
  }, 30000);

  afterAll(async () => {
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-SEG-05-1 y AC-SEG-05-2: el registro no exige contacto y la atención exige captura', async () => {
    const guardado = await guardarPaciente(ctx('asesor') as ContextoPaciente, paciente('900115001'), { ahora: AHORA });
    expect(guardado.duplicado).toBe(false);
    const sinCaptura = await evaluarApertura(ctx('asesor'), guardado.id, false);
    expect(sinCaptura).toEqual({ permitida: false, motivo: 'sin_captura' });
    const urgencia = await evaluarApertura(ctx('asesor'), guardado.id, true);
    expect(urgencia.motivo).toBe('urgencia');
    await registrarDecisiones(
      ctx('asesor'),
      {
        pacienteId: guardado.id,
        medio: 'presencial',
        ip: '192.0.2.15',
        agente: 'vitest',
        tratamiento: 'negada',
        contacto: false,
        opcionales: [],
      },
      AHORA,
    );
    const negada = await evaluarApertura(ctx('asesor'), guardado.id, false);
    expect(negada).toEqual({ permitida: true, motivo: 'negada_registrada' });
    const contacto = await evaluarContacto(ctx('asesor'), guardado.id, 'paciente', AHORA);
    expect(contacto.motivo).toBe('sin_autorizacion');
  });

  it('AC-SEG-05-3, 4 y 5: evidencia, versión intacta, revocatoria y firma', async () => {
    const guardado = await guardarPaciente(ctx('asesor') as ContextoPaciente, paciente('900115002'), { ahora: AHORA });
    const registro = await registrarDecisiones(
      ctx('asesor'),
      {
        pacienteId: guardado.id,
        medio: 'electronico',
        ip: '192.0.2.16',
        agente: 'vitest',
        tratamiento: 'otorgada',
        contacto: true,
        opcionales: [],
        trazoPng: PNG,
        trazoPuntos: [{ points: [{ x: 4, y: 8, time: 12 }] }],
        acuerdoFirma: true,
      },
      AHORA,
    );
    const evidencia = await exportarEvidencia(ctx('asesor'), registro.ids[0]);
    expect(evidencia.texto_exacto).toBe(PLANTILLA_TRATAMIENTO_CLINICO);
    expect(evidencia.hash).toBe(hashTextoLegal(PLANTILLA_TRATAMIENTO_CLINICO));
    expect(evidencia.hora_utc).toBe(AHORA.toISOString());
    expect(evidencia.medio).toBe('electronico');
    expect(evidencia.firma_id).toBeTruthy();

    await expect(
      publicarVersionTexto(ctx('asesor'), { codigo: 'tratamiento_clinico', contenido: `${PLANTILLA_TRATAMIENTO_CLINICO}\nCambio.` }),
    ).rejects.toBeInstanceOf(ErrorAutorizacionDatos);

    const publicada = await publicarVersionTexto(
      ctx('admin', ADMIN),
      { codigo: 'tratamiento_clinico', contenido: `${PLANTILLA_TRATAMIENTO_CLINICO}\nCambio del responsable.` },
      AHORA,
    );
    expect(publicada.version).toBe(2);
    const despues = await exportarEvidencia(ctx('admin', ADMIN), registro.ids[0]);
    expect(despues.texto_exacto).toBe(evidencia.texto_exacto);
    expect(despues.hash).toBe(evidencia.hash);

    expect((await evaluarContacto(ctx('asesor'), guardado.id, 'paciente', AHORA)).permitida).toBe(true);
    await revocarContacto(ctx('asesor'), guardado.id, AHORA);
    expect(await evaluarContacto(ctx('asesor'), guardado.id, 'paciente', AHORA)).toEqual({
      permitida: false,
      motivo: 'revocada',
    });

    await expect(exportarEvidencia(ctx('asesor', OTRO_USUARIO, OTRO, SEDE_OTRA), registro.ids[0])).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });
});
