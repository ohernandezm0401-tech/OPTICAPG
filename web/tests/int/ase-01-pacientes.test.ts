// ASE-01 / SEG-06 (T13) — Pacientes contra PostgreSQL real.
// AC-ASE-01-1, 2, 3 y 4 (I, R). AC-SEG-06-1 y 2 (I).
// Solo datos sintéticos.
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import {
  abrirPaciente,
  ErrorPaciente,
  fusionarPacientes,
  guardarPaciente,
  type ContextoPaciente,
} from '../../db/pacientes';
import { MARCA_NO_APLICA, type PacienteEntrada } from '../../dominio/pacientes';
import { cifrarParaTenant } from '../../lib/cifrado/almacen.mjs';
import { fijarRegistroKekParaPruebas, leerRegistroKek } from '../../lib/cifrado/kek.mjs';
import { randomBytes } from 'node:crypto';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const HOY = new Date('2026-10-03T15:00:00.000Z');

const TENANT = 'f1111111-1111-4111-8111-111111111111';
const OTRO = 'f2222222-2222-4222-8222-222222222222';
const SEDE = 'f3111111-1111-4111-8111-111111111111';
const SEDE_OTRA = 'f3222222-2222-4222-8222-222222222222';
const ASESOR = 'f4111111-1111-4111-8111-111111111111';
const OPTO = 'f4222222-2222-4222-8222-222222222222';

function ctx(rol: string, usuario: string, sede = SEDE): ContextoPaciente {
  return { tenant_id: TENANT, usuario_id: usuario, sede_id: sede, sedes: [sede], rol };
}

function adulto(parcial: Partial<PacienteEntrada> = {}): PacienteEntrada {
  return {
    nombres: 'Ana Sintética',
    apellidos: 'Pérez Demo',
    tipo_doc: 'CC',
    num_doc: `900${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`,
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
    ...parcial,
  };
}

async function sembrarNucleo() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T13', '900.000.113-1', 'activo'),
        ($2, 'Óptica Sintética T13 B', '900.000.113-2', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede T13', 'Bogotá'),
        ($2, $4, 'Sede T13 B', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_OTRA, TENANT, OTRO],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $3, 'asesor.t13@example.invalid', 'activo'),
        ($2, $3, 'opto.t13@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ASESOR, OPTO, TENANT],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

describe('pacientes en PostgreSQL', () => {
  beforeAll(async () => {
    fijarRegistroKekParaPruebas({
      activaId: 't13',
      claves: new Map([['t13', randomBytes(32)]]),
    });
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
    await sembrarNucleo();
  }, 30000);

  afterAll(async () => {
    fijarRegistroKekParaPruebas(null);
    await cerrarPool();
  });

  it('AC-ASE-01-1: no guarda sin un campo obligatorio', async () => {
    await expect(
      guardarPaciente(ctx('asesor', ASESOR), adulto({ direccion: '' }), { ahora: HOY }),
    ).rejects.toBeInstanceOf(ErrorPaciente);
  });

  it('AC-ASE-01-2: el mismo documento advierte y devuelve el existente', async () => {
    const datos = adulto({ num_doc: '9000002222' });
    const primero = await guardarPaciente(ctx('asesor', ASESOR), datos, { ahora: HOY });
    expect(primero.duplicado).toBe(false);
    const segundo = await guardarPaciente(ctx('asesor', ASESOR), { ...datos, nombres: 'Otro' }, { ahora: HOY });
    expect(segundo.duplicado).toBe(true);
    expect(segundo.existente_id).toBe(primero.id);
  });

  it('AC-ASE-01-3: num_hc es único y no se reutiliza al fusionar', async () => {
    const a = await guardarPaciente(ctx('asesor', ASESOR), adulto({ num_doc: '9000003331' }), { ahora: HOY });
    const b = await guardarPaciente(ctx('asesor', ASESOR), adulto({ num_doc: '9000003332' }), { ahora: HOY });
    expect(b.num_hc).toBeGreaterThan(a.num_hc);
    await fusionarPacientes(ctx('asesor', ASESOR), b.id, a.id);
    const c = await guardarPaciente(ctx('asesor', ASESOR), adulto({ num_doc: '9000003333' }), { ahora: HOY });
    expect(c.num_hc).not.toBe(b.num_hc);
    expect(c.num_hc).not.toBe(a.num_hc);
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
      await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ASESOR]);
      await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
      await cliente.query(`select set_config('app.rol', 'asesor', true)`);
      await cliente.query('SET LOCAL ROLE optisaas_app');
      await expect(cliente.query(`update pacientes set num_hc = $2 where id = $1`, [c.id, b.num_hc])).rejects.toThrow(
        /num_hc/,
      );
    } finally {
      try {
        await cliente.query('ROLLBACK');
      } catch {
        // La transacción ya estaba cerrada.
      }
      cliente.release();
    }
    const ocupado = await obtenerPool().query(`select estado, num_hc from pacientes where id = $1`, [b.id]);
    expect(ocupado.rows[0].estado).toBe('fusionado');
    expect(ocupado.rows[0].num_hc).toBe(b.num_hc);
  });

  it('AC-ASE-01-4 R: el asesor no lee diagnósticos; el optómetra sí', async () => {
    const paciente = await guardarPaciente(ctx('asesor', ASESOR), adulto({ num_doc: '9000004444' }), { ahora: HOY });
    const sobre = await cifrarParaTenant(
      obtenerPool(),
      leerRegistroKek(),
      TENANT,
      Buffer.from('H52.1 sintético de prueba', 'utf8'),
    );
    await obtenerPool().query(
      `insert into paciente_diagnosticos (id, tenant_id, paciente_id, descripcion_cifrada)
       values ($1, $2, $3, $4)`,
      [randomUUID(), TENANT, paciente.id, sobre.texto],
    );

    const como = async (rol: string, usuario: string) => {
      const cliente = await obtenerPool().connect();
      try {
        await cliente.query('BEGIN');
        await cliente.query('SET LOCAL ROLE optisaas_app');
        await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
        await cliente.query(`select set_config('app.usuario_id', $1, true)`, [usuario]);
        await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
        await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
        await cliente.query(`select set_config('app.rol', $1, true)`, [rol]);
        await cliente.query(`select set_config('app.role', $1, true)`, [rol]);
        const filas = await cliente.query(`select id from paciente_diagnosticos where paciente_id = $1`, [paciente.id]);
        await cliente.query('ROLLBACK');
        return filas.rows.length;
      } catch (error) {
        try {
          await cliente.query('ROLLBACK');
        } catch {
          // Se informa el fallo de la política como cero filas.
        }
        throw error;
      } finally {
        cliente.release();
      }
    };

    expect(await como('asesor', ASESOR)).toBe(0);
    expect(await como('optometra', OPTO)).toBe(1);
    const ficha = await abrirPaciente(ctx('asesor', ASESOR), paciente.id, { ahora: HOY });
    expect('diagnosticos' in ficha).toBe(false);
    const clinica = await abrirPaciente(ctx('optometra', OPTO), paciente.id, { ahora: HOY });
    expect(clinica.diagnosticos?.[0]?.descripcion).toBe('H52.1 sintético de prueba');
  });

  it('AC-SEG-06-1 y 2: menor sin representante y mayoría con histórico', async () => {
    await expect(
      guardarPaciente(
        ctx('asesor', ASESOR),
        adulto({ fecha_nacimiento: '2016-10-03', tipo_doc: 'TI', num_doc: '9000005551' }),
        { ahora: HOY },
      ),
    ).rejects.toBeInstanceOf(ErrorPaciente);

    const menor = await guardarPaciente(
      ctx('asesor', ASESOR),
      adulto({
        fecha_nacimiento: '2016-10-03',
        tipo_doc: 'TI',
        num_doc: '9000005552',
        representante: {
          nombre: 'Luisa Sintética',
          tipo_doc: 'CC',
          num_doc: '9000005559',
          parentesco: 'madre',
          contacto: '3000005559',
        },
      }),
      { ahora: HOY },
    );
    expect(menor.duplicado).toBe(false);

    const mayor = await guardarPaciente(
      ctx('asesor', ASESOR),
      {
        ...adulto({ fecha_nacimiento: '2008-10-03', tipo_doc: 'CC', num_doc: '9000005552' }),
        id: menor.id,
      },
      { ahora: HOY },
    );
    expect(mayor.duplicado).toBe(false);
    expect(mayor.aviso_mayoria).toMatch(/18/);
    const vinculos = await obtenerPool().query(
      `select es_quien_firmo, vigente from pacientes_representantes where paciente_id = $1`,
      [menor.id],
    );
    expect(vinculos.rows.length).toBe(1);
    expect(vinculos.rows[0].es_quien_firmo).toBe(true);
    const estado = await obtenerPool().query(`select estado from pacientes where id = $1`, [menor.id]);
    expect(estado.rows[0].estado).toBe('activo');
  });

  it('R: otro tenant no ve el paciente', async () => {
    const propio = await guardarPaciente(ctx('asesor', ASESOR), adulto({ num_doc: '9000006666' }), { ahora: HOY });
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE_OTRA]);
      await cliente.query(`select set_config('app.rol', 'asesor', true)`);
      const filas = await cliente.query(`select id from pacientes where id = $1`, [propio.id]);
      await cliente.query('ROLLBACK');
      expect(filas.rows.length).toBe(0);
    } finally {
      cliente.release();
    }
  });
});
