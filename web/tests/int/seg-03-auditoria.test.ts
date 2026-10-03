// SEG-03 (T10) — Bitácora append-only contra PostgreSQL real.
// AC-SEG-03-1 (I, R), AC-SEG-03-2 (I), AC-SEG-03-3 (I, S), AC-SEG-03-4 (S)
// y la cadena de 10 000 eventos (P). Solo datos sintéticos.
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { insertarIntentoDenegado } from '../../db/autorizacion';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { anexarBitacoraAutenticacion, exportarBitacoraCsv, listarBitacora } from '../../lib/auditoria/servicio';
import { abrirHistoriaClinica } from '../../lib/auditoria/lecturas';

const ejecutar = promisify(execFile);
const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TENANT = 'a1010101-1010-4101-8101-101010101010';
const OTRO = 'b1010101-1010-4101-8101-101010101010';
const SEDE = 'a2020202-2020-4202-8202-202020202020';
const SEDE_AJENA = 'b2020202-2020-4202-8202-202020202020';
const ACTOR = 'a3030303-3030-4303-8303-303030303030';
const OTRO_ACTOR = 'b3030303-3030-4303-8303-303030303030';
const ATENCION = 'a4040404-4040-4404-8404-404040404040';
const TENANT_LARGO = 'c1010101-1010-4101-8101-101010101010';
const TENANT_ROTO = 'd1010101-1010-4101-8101-101010101010';
const DIAGNOSTICO = 'miopía magna sintética';
const FORMULA = '+1.25 -0.50';
const TEXTO = 'paciente refiere ardor';

async function sembrar() {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(
      `insert into tenants (id, razon_social, nit, estado) values
        ($1, 'Óptica Sintética T10', '900.000.110-1', 'activo'),
        ($2, 'Óptica Sintética T10 B', '900.000.110-2', 'activo'),
        ($3, 'Óptica Sintética T10 C', '900.000.110-3', 'activo'),
        ($4, 'Óptica Sintética T10 D', '900.000.110-4', 'activo')
       on conflict (id) do nothing`,
      [TENANT, OTRO, TENANT_LARGO, TENANT_ROTO],
    );
    await cliente.query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values
        ($1, $3, 'Sede sintética T10', 'Bogotá'),
        ($2, $3, 'Sede ajena T10', 'Medellín')
       on conflict (id) do nothing`,
      [SEDE, SEDE_AJENA, TENANT],
    );
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values
        ($1, $3, 't10.actor@example.invalid', 'activo'),
        ($2, $3, 't10.otro@example.invalid', 'activo')
       on conflict (id) do nothing`,
      [ACTOR, OTRO_ACTOR, TENANT],
    );
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

async function falla(rol: string | null, sql: string, params: unknown[] = []): Promise<string> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    if (rol) await cliente.query(`SET LOCAL ROLE ${rol}`);
    await cliente.query(sql, params);
    await cliente.query('ROLLBACK');
    return '';
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error de la sentencia.
    }
    return error instanceof Error ? error.message : String(error);
  } finally {
    cliente.release();
  }
}

beforeAll(async () => {
  await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  await sembrar();
});

afterAll(async () => {
  await cerrarPool();
});

describe('AC-SEG-03-1: UPDATE y DELETE fallan para los roles de la aplicación', () => {
  it('I/R: optisaas_app, optisaas_audit_writer y el dueño no modifican ni borran', async () => {
    const id = await abrirHistoriaClinica(
      { tenant_id: TENANT, usuario_id: ACTOR, sede_id: SEDE, rol: 'optometra' },
      { atencionId: ATENCION, actorId: ACTOR, rol: 'optometra', sedeId: SEDE, ip: '203.0.113.10' },
    );
    for (const rol of ['optisaas_app', 'optisaas_audit_writer']) {
      const update = await falla(rol, `UPDATE auditoria SET resultado = 'error' WHERE id = $1`, [id]);
      const borrar = await falla(rol, `DELETE FROM auditoria WHERE id = $1`, [id]);
      expect(update, `UPDATE como ${rol}`).toMatch(/permission denied|append-only|permiso/i);
      expect(borrar, `DELETE como ${rol}`).toMatch(/permission denied|append-only|permiso/i);
    }
    const updateDueno = await falla(null, `UPDATE auditoria SET resultado = 'error' WHERE id = $1`, [id]);
    const deleteDueno = await falla(null, `DELETE FROM auditoria WHERE id = $1`, [id]);
    expect(updateDueno).toMatch(/append-only/);
    expect(deleteDueno).toMatch(/append-only/);
  });
});

describe('AC-SEG-03-2: cada apertura de HC deja una lectura', () => {
  it('I: dos aperturas generan dos eventos con actor y sede', async () => {
    const antes = await obtenerPool().query<{ n: number }>(
      `select count(*)::int as n from auditoria where recurso = 'R3' and recurso_id = $1 and accion = 'lectura'`,
      [ATENCION],
    );
    await abrirHistoriaClinica(
      { tenant_id: TENANT, usuario_id: ACTOR, sede_id: SEDE, rol: 'optometra' },
      { atencionId: ATENCION, actorId: ACTOR, rol: 'optometra', sedeId: SEDE },
    );
    const filas = await obtenerPool().query<{ actor_id: string; sede_id: string; accion: string }>(
      `select actor_id::text, sede_id::text, accion
         from auditoria
        where recurso = 'R3' and recurso_id = $1 and accion = 'lectura'
        order by id`,
      [ATENCION],
    );
    expect(filas.rows.length).toBe(antes.rows[0].n + 1);
    expect(filas.rows.at(-1)).toMatchObject({ actor_id: ACTOR, sede_id: SEDE, accion: 'lectura' });
    await abrirHistoriaClinica(
      { tenant_id: TENANT, usuario_id: ACTOR, sede_id: SEDE, rol: 'optometra' },
      { atencionId: ATENCION, actorId: ACTOR, rol: 'optometra', sedeId: SEDE },
    );
    const despues = await obtenerPool().query<{ n: number }>(
      `select count(*)::int as n from auditoria where recurso = 'R3' and recurso_id = $1 and accion = 'lectura'`,
      [ATENCION],
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n + 2);
  });
});

describe('AC-SEG-03-3: audit:verify señala la fila rota', () => {
  it('S: alterar una fila como superusuario informa la posición exacta', async () => {
    for (let indice = 0; indice < 5; indice += 1) {
      await abrirHistoriaClinica(
        { tenant_id: TENANT_ROTO, usuario_id: ACTOR, sede_id: SEDE, rol: 'admin' },
        {
          atencionId: `hc-roto-${indice}`,
          actorId: ACTOR,
          rol: 'admin',
          sedeId: SEDE,
        },
      );
    }
    const orden = await obtenerPool().query<{ id: string; resultado: string }>(
      `select id::text as id, resultado from auditoria where tenant_id = $1 order by auditoria.id`,
      [TENANT_ROTO],
    );
    const objetivo = orden.rows[2];
    const posicion = 3;
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('ALTER TABLE auditoria DISABLE TRIGGER auditoria_append_only');
      await cliente.query(`UPDATE auditoria SET resultado = 'error' WHERE id = $1`, [objetivo.id]);
      const { stderr, code } = await ejecutar('npm', ['run', 'audit:verify', '--', `--tenant=${TENANT_ROTO}`], {
        cwd: RAIZ_WEB,
        env: process.env,
      }).then(
        (salida) => ({ stderr: `${salida.stdout}\n${salida.stderr}`, code: 0 }),
        (error: { stderr?: string; stdout?: string; code?: number }) => ({
          stderr: `${error.stdout ?? ''}\n${error.stderr ?? ''}`,
          code: error.code ?? 1,
        }),
      );
      expect(code).not.toBe(0);
      expect(stderr).toContain(`posicion=${posicion}`);
      expect(stderr).toContain(`id=${objetivo.id}`);
      await cliente.query(`UPDATE auditoria SET resultado = $2 WHERE id = $1`, [objetivo.id, objetivo.resultado]);
    } finally {
      await cliente.query('ALTER TABLE auditoria ENABLE TRIGGER auditoria_append_only');
      cliente.release();
    }
    const sano = await ejecutar('npm', ['run', 'auditoria:verificar', '--', `--tenant=${TENANT_ROTO}`], {
      cwd: RAIZ_WEB,
      env: process.env,
    });
    expect(sano.stdout).toContain(`OK tenant=${TENANT_ROTO}`);
  });
});

describe('AC-SEG-03-4: ningún evento guarda contenido clínico', () => {
  it('S: la apertura ignora diagnóstico, fórmula y texto libre', async () => {
    const columnas = await obtenerPool().query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'auditoria'`,
    );
    const nombres = columnas.rows.map((fila) => fila.column_name).join(' ');
    expect(nombres).not.toMatch(/diagnostico|formula|contenido|texto/);

    await abrirHistoriaClinica(
      { tenant_id: TENANT, usuario_id: ACTOR, sede_id: SEDE, rol: 'optometra' },
      {
        atencionId: ATENCION,
        actorId: ACTOR,
        rol: 'optometra',
        sedeId: SEDE,
        contenidoClinico: { diagnostico: DIAGNOSTICO, formula: FORMULA, textoLibre: TEXTO },
      },
    );
    const todo = await obtenerPool().query(
      `select * from auditoria where tenant_id = $1`,
      [TENANT],
    );
    const serializado = JSON.stringify(todo.rows);
    expect(serializado).not.toContain(DIAGNOSTICO);
    expect(serializado).not.toContain(FORMULA);
    expect(serializado).not.toContain(TEXTO);
  });
});

describe('R: RLS de la bitácora', () => {
  it('optisaas_app no lee otro tenant ni la lectura de otro actor si es optómetra', async () => {
    await abrirHistoriaClinica(
      { tenant_id: TENANT, usuario_id: OTRO_ACTOR, sede_id: SEDE, rol: 'optometra' },
      { atencionId: 'hc-otro-actor', actorId: OTRO_ACTOR, rol: 'optometra', sedeId: SEDE },
    );
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [OTRO]);
      await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ACTOR]);
      await cliente.query(`select set_config('app.sede_id', $1, true)`, [SEDE]);
      await cliente.query(`select set_config('app.sedes', $1, true)`, [SEDE]);
      await cliente.query(`select set_config('app.rol', 'admin', true)`);
      const ajenos = await cliente.query(`select id from auditoria`);
      expect(ajenos.rows).toHaveLength(0);

      await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
      await cliente.query(`select set_config('app.rol', 'optometra', true)`);
      await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ACTOR]);
      const propias = await cliente.query<{ actor_id: string }>(`select actor_id::text from auditoria`);
      expect(propias.rows.length).toBeGreaterThan(0);
      expect(propias.rows.every((fila) => fila.actor_id === ACTOR)).toBe(true);

      await cliente.query(`select set_config('app.rol', 'asesor', true)`);
      const asesor = await cliente.query(`select id from auditoria`);
      expect(asesor.rows).toHaveLength(0);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });

  it('la vista del admin exporta CSV con hash y el optómetra no exporta', async () => {
    const contextoAdmin = {
      tenant_id: TENANT,
      usuario_id: ACTOR,
      sede_id: SEDE,
      sedes: [SEDE],
      rol: 'admin',
    };
    const listado = await listarBitacora(contextoAdmin, { accion: 'lectura' });
    expect(listado.length).toBeGreaterThan(0);
    expect(listado[0].hash).toMatch(/^[0-9a-f]{64}$/);
    const csv = await exportarBitacoraCsv(contextoAdmin, { accion: 'lectura' });
    expect(csv.split('\n')[0]).toContain('hash');
    expect(csv).toContain(listado[0].hash);
    expect(csv).not.toContain(DIAGNOSTICO);
    await expect(
      exportarBitacoraCsv({ ...contextoAdmin, rol: 'optometra' }, { accion: 'lectura' }),
    ).rejects.toThrow(/exportar/);
  });
});

describe('eventos de autenticación e intentos denegados', () => {
  it('I: entran en la cadena sin el correo', async () => {
    const correo = 't10.secreto@example.invalid';
    await anexarBitacoraAutenticacion({
      tenantId: TENANT,
      usuarioId: ACTOR,
      tipo: 'inicio_ok',
      direccionIp: '203.0.113.20',
      ahora: new Date(),
    });
    await insertarIntentoDenegado(
      { tenant_id: TENANT, usuario_id: ACTOR, sede_id: SEDE, rol: 'asesor' },
      { usuario_id: ACTOR, rol: 'asesor', sede_id: SEDE, recurso: 'R3', recurso_id: ATENCION, accion: 'leer' },
    );
    const filas = await obtenerPool().query(
      `select recurso, recurso_id, accion, resultado, rol
         from auditoria
        where tenant_id = $1 and recurso in ('autenticacion', 'R3') and accion in ('autenticacion', 'leer')
        order by id desc
        limit 5`,
      [TENANT],
    );
    expect(filas.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recurso: 'autenticacion', recurso_id: 'inicio_ok', accion: 'autenticacion', resultado: 'ok' }),
        expect.objectContaining({ recurso: 'R3', accion: 'leer', resultado: 'denegado', rol: 'asesor' }),
      ]),
    );
    expect(JSON.stringify(filas.rows)).not.toContain(correo);
  });
});

describe('P: cadena de 10 000 eventos en PostgreSQL', () => {
  it('cierra y el verificador la acepta', async () => {
    const tenantLargo = randomUUID();
    const sedeLarga = randomUUID();
    const actorLargo = randomUUID();
    await obtenerPool().query(
      `insert into tenants (id, razon_social, nit, estado) values ($1, 'Óptica cadena T10', $2, 'activo')`,
      [tenantLargo, `900.000.${tenantLargo.slice(0, 8)}`],
    );
    await obtenerPool().query(
      `insert into sedes (id, tenant_id, nombre, ciudad) values ($1, $2, 'Sede cadena', 'Bogotá')`,
      [sedeLarga, tenantLargo],
    );
    await obtenerPool().query(
      `insert into usuarios (id, tenant_id, email, estado) values ($1, $2, $3, 'activo')`,
      [actorLargo, tenantLargo, `t10.cadena.${tenantLargo.slice(0, 8)}@example.invalid`],
    );
    const { registrarEventos } = await import('../../lib/auditoria/servicio');
    const eventos = Array.from({ length: 10_000 }, (_, indice) => ({
      actor_id: actorLargo,
      rol: 'admin',
      sede_id: sedeLarga,
      recurso: 'R3',
      recurso_id: `c${indice}`,
      accion: 'lectura' as const,
      resultado: 'ok' as const,
      ip: '203.0.113.30',
      request_id: `r${indice}`,
    }));
    const ids = await registrarEventos(
      { tenant_id: tenantLargo, usuario_id: actorLargo, sede_id: sedeLarga, rol: 'admin' },
      eventos,
    );
    expect(ids).toHaveLength(10_000);
    const salida = await ejecutar('npm', ['run', 'audit:verify', '--', `--tenant=${tenantLargo}`], {
      cwd: RAIZ_WEB,
      env: process.env,
    });
    expect(salida.stdout).toContain(`OK tenant=${tenantLargo} eventos=10000`);
  }, 120_000);
});
