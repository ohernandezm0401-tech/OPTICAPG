// SEG-04 (T12) — Marco de inmutabilidad contra PostgreSQL real.
// La tabla clínica no existe: `registros_prueba_seg04` se crea aquí y se
// elimina al final. T19 debe llamar `aplicar_marco_inmutabilidad`.
// AC-SEG-04-1 (I), AC-SEG-04-2 (I), AC-SEG-04-3 (I, S),
// P (ninguna secuencia modifica un firmado) y S (rol de aplicación).
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';
import { consultarRegistroConAdendas, verificarHashContenido } from '../../lib/inmutabilidad/servicio';

const ejecutar = promisify(execFile);
const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const TENANT = 'c1212121-1212-4121-8121-121212121212';
const OTRO = 'd1212121-1212-4121-8121-121212121212';
const ACTOR = 'c2323232-2323-4232-8232-232323232323';
const FILA = 'c3434343-3434-4343-8343-343434343434';
const FILA_HASH = 'c4545454-4545-4454-8454-454545454545';
const FILA_PROP = 'c5656565-5656-4565-8565-565656565656';
const TABLA = 'registros_prueba_seg04';

async function sembrar() {
  await obtenerPool().query(
    `insert into tenants (id, razon_social, nit, estado) values
      ($1, 'Óptica Sintética T12', '900.000.112-1', 'activo'),
      ($2, 'Óptica Sintética T12 B', '900.000.112-2', 'activo')
     on conflict (id) do nothing`,
    [TENANT, OTRO],
  );
  await obtenerPool().query(
    `insert into usuarios (id, tenant_id, email, estado) values
      ($1, $2, 't12.actor@example.invalid', 'activo')
     on conflict (id) do nothing`,
    [ACTOR, TENANT],
  );
}

async function limpiarAdendasPrueba() {
  // Solo la limpieza de la prueba, como superusuario. El rol de aplicación
  // no puede desactivar el trigger ni borrar una adenda firmada.
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('ALTER TABLE adendas DISABLE TRIGGER inmutabilidad_fila');
    await cliente.query('DELETE FROM adendas WHERE entidad = $1', [TABLA]);
  } finally {
    await cliente.query('ALTER TABLE adendas ENABLE TRIGGER inmutabilidad_fila');
    cliente.release();
  }
}

async function prepararTabla() {
  await limpiarAdendasPrueba();
  await obtenerPool().query(`drop table if exists ${TABLA}`);
  await obtenerPool().query(
    `create table ${TABLA} (
      id uuid primary key,
      tenant_id uuid not null references tenants(id),
      estado text not null default 'borrador',
      contenido text not null,
      firmado_por uuid references usuarios(id),
      firmado_en timestamptz,
      hash_contenido text
    )`,
  );
  await obtenerPool().query(`select aplicar_marco_inmutabilidad($1::regclass)`, [TABLA]);
  await obtenerPool().query(`alter table ${TABLA} enable row level security`);
  await obtenerPool().query(`alter table ${TABLA} force row level security`);
  await obtenerPool().query(
    `create policy ${TABLA}_tenant_app on ${TABLA} for all to optisaas_app
       using (tenant_id::text = current_setting('app.tenant_id', true))
       with check (tenant_id::text = current_setting('app.tenant_id', true))`,
  );
  await obtenerPool().query(`grant select, insert, update, delete on ${TABLA} to optisaas_app`);
}

async function ejecutarSql(rol: string | null, sql: string, params: unknown[] = []): Promise<string> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [TENANT]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ACTOR]);
    await cliente.query(`select set_config('app.sede_id', '', true)`);
    await cliente.query(`select set_config('app.sedes', '', true)`);
    await cliente.query(`select set_config('app.rol', 'optometra', true)`);
    await cliente.query(`select set_config('app.role', 'optometra', true)`);
    if (rol) await cliente.query(`SET LOCAL ROLE ${rol}`);
    await cliente.query(sql, params);
    await cliente.query('COMMIT');
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

async function foto(id: string) {
  const fila = await obtenerPool().query<{
    contenido: string;
    estado: string;
    firmado_por: string | null;
    firmado_en: string | null;
    hash_contenido: string | null;
  }>(
    `select contenido, estado, firmado_por::text, firmado_en::text, hash_contenido
       from ${TABLA} where id = $1`,
    [id],
  );
  return fila.rows[0];
}

async function firmar(id: string, contenido: string) {
  const alta = await ejecutarSql(
    'optisaas_app',
    `insert into ${TABLA} (id, tenant_id, estado, contenido) values ($1, $2, 'borrador', $3)`,
    [id, TENANT, contenido],
  );
  expect(alta).toBe('');
  const edicion = await ejecutarSql(
    'optisaas_app',
    `update ${TABLA} set contenido = $2 where id = $1`,
    [id, `${contenido} editado`],
  );
  expect(edicion).toBe('');
  const firma = await ejecutarSql(
    'optisaas_app',
    `update ${TABLA}
        set estado = 'firmado', firmado_por = $2, firmado_en = '2000-01-01T00:00:00Z',
            hash_contenido = repeat('ab', 32)
      where id = $1`,
    [id, ACTOR],
  );
  expect(firma).toBe('');
}

beforeAll(async () => {
  await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  await sembrar();
  await prepararTabla();
});

afterAll(async () => {
  await limpiarAdendasPrueba();
  await obtenerPool().query(`drop table if exists ${TABLA}`);
  await cerrarPool();
});

describe('AC-SEG-04-1: UPDATE y DELETE de un firmado fallan', () => {
  it('I/S: el rol de aplicación y el dueño no modifican ni borran la fila firmada', async () => {
    await firmar(FILA, 'valor sintetico inicial');
    const antes = await foto(FILA);
    expect(antes.estado).toBe('firmado');
    expect(antes.contenido).toBe('valor sintetico inicial editado');
    expect(antes.firmado_en?.startsWith('2000-')).toBe(false);
    expect(antes.hash_contenido).toMatch(/^[a-f0-9]{64}$/);
    expect(antes.hash_contenido).not.toBe('ab'.repeat(32));

    for (const rol of ['optisaas_app', null]) {
      const update = await ejecutarSql(rol, `update ${TABLA} set contenido = 'alterado' where id = $1`, [FILA]);
      const borrar = await ejecutarSql(rol, `delete from ${TABLA} where id = $1`, [FILA]);
      const estado = await ejecutarSql(rol, `update ${TABLA} set estado = 'borrador' where id = $1`, [FILA]);
      expect(update, `UPDATE como ${rol ?? 'dueño'}`).toMatch(/registro firmado inmutable: UPDATE prohibido/);
      expect(borrar, `DELETE como ${rol ?? 'dueño'}`).toMatch(/registro firmado inmutable: DELETE prohibido/);
      expect(estado).toMatch(/registro firmado inmutable: UPDATE prohibido/);
    }
    const truncar = await ejecutarSql(null, `truncate ${TABLA}`);
    expect(truncar).toMatch(/TRUNCATE prohibido/);
    expect(await foto(FILA)).toEqual(antes);
  });
});

describe('AC-SEG-04-2: la adenda no toca el original', () => {
  it('I: vincula adenda_de y la consulta muestra ambos con autor y hora', async () => {
    const antes = await foto(FILA);
    const alta = await ejecutarSql(
      'optisaas_app',
      `insert into adendas (
         tenant_id, entidad, entidad_id, adenda_de, motivo, contenido, estado, firmado_por
       ) values ($1, $2, $3, $3, $4, $5, 'firmada', $6)`,
      [TENANT, TABLA, FILA, 'correccion sintetica', 'valor corregido sintetico', ACTOR],
    );
    expect(alta).toBe('');
    expect(await foto(FILA)).toEqual(antes);

    const ajena = await ejecutarSql(
      'optisaas_app',
      `insert into adendas (
         tenant_id, entidad, entidad_id, adenda_de, motivo, contenido, estado, firmado_por
       ) values ($1, $2, $3, $3, 'no', 'no', 'firmada', $4)`,
      [OTRO, TABLA, FILA, ACTOR],
    );
    expect(ajena).toMatch(/solo se adenda un registro firmado|firmado_por no pertenece al tenant|row-level security|new row violates/);

    const vista = await consultarRegistroConAdendas(TABLA, FILA);
    expect(vista).toHaveLength(2);
    expect(vista[0]).toMatchObject({
      tipo: 'original',
      registro_id: FILA,
      adenda_de: null,
      autor: ACTOR,
      estado_visible: 'adendado',
      contenido: antes.contenido,
    });
    expect(vista[0].hora).toBeTruthy();
    expect(vista[0].hora_bogota).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(vista[1]).toMatchObject({
      tipo: 'adenda',
      adenda_de: FILA,
      autor: ACTOR,
      estado_visible: 'firmada',
      motivo: 'correccion sintetica',
      contenido: 'valor corregido sintetico',
    });
    expect(vista[1].hora).toBeTruthy();
    expect(vista[1].hora_bogota).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const cambioAdenda = await ejecutarSql(
      'optisaas_app',
      `update adendas set motivo = 'otro' where entidad_id = $1`,
      [FILA],
    );
    expect(cambioAdenda).toMatch(/registro firmado inmutable: UPDATE prohibido/);
  });
});

describe('AC-SEG-04-3: el hash recalculado coincide y delata una alteración', () => {
  it('I/S: verificar pasa; un superusuario que cambia la fila rompe el hash', async () => {
    await firmar(FILA_HASH, 'contenido para hash');
    const sano = await verificarHashContenido(TABLA, FILA_HASH);
    expect(sano.motivo).toBe('ok');
    expect(sano.coincide).toBe(true);
    expect(sano.calculado).toBe(sano.almacenado);

    const cliente = await obtenerPool().connect();
    try {
      await cliente.query(`alter table ${TABLA} disable trigger inmutabilidad_fila`);
      await cliente.query(`update ${TABLA} set contenido = 'contenido tocado' where id = $1`, [FILA_HASH]);
      const roto = await verificarHashContenido(TABLA, FILA_HASH);
      expect(roto.coincide).toBe(false);
      expect(roto.motivo).toBe('hash_distinto');
      expect(roto.calculado).not.toBe(roto.almacenado);

      const { stderr, code } = await ejecutar(
        'npm',
        ['run', 'inmutabilidad:verificar', '--', `--tabla=${TABLA}`, `--id=${FILA_HASH}`],
        { cwd: RAIZ_WEB, env: process.env },
      ).then(
        (salida) => ({ stderr: `${salida.stdout}\n${salida.stderr}`, code: 0 }),
        (error: { stderr?: string; stdout?: string; code?: number }) => ({
          stderr: `${error.stdout ?? ''}\n${error.stderr ?? ''}`,
          code: error.code ?? 1,
        }),
      );
      expect(code).not.toBe(0);
      expect(stderr).toContain(`tabla=${TABLA}`);
      expect(stderr).toContain(`id=${FILA_HASH}`);
      expect(stderr).toContain('motivo=hash_distinto');

      await cliente.query(`update ${TABLA} set contenido = 'contenido para hash editado' where id = $1`, [FILA_HASH]);
    } finally {
      await cliente.query(`alter table ${TABLA} enable trigger inmutabilidad_fila`);
      cliente.release();
    }

    const restaurado = await verificarHashContenido(TABLA, FILA_HASH);
    expect(restaurado.coincide).toBe(true);
    const script = await ejecutar(
      'npm',
      ['run', 'inmutabilidad:verificar', '--', `--tabla=${TABLA}`, `--id=${FILA_HASH}`],
      { cwd: RAIZ_WEB, env: process.env },
    );
    expect(script.stdout).toContain(`OK tabla=${TABLA} id=${FILA_HASH}`);
  });
});

describe('P: ninguna secuencia de operaciones modifica un firmado', () => {
  it('I/P: cuarenta operaciones del rol de aplicación dejan la fila igual', async () => {
    await firmar(FILA_PROP, 'base de la propiedad');
    const congelada = await foto(FILA_PROP);
    const ops = [
      `update ${TABLA} set contenido = contenido || 'x' where id = $1`,
      `update ${TABLA} set estado = 'borrador' where id = $1`,
      `update ${TABLA} set estado = 'adendado' where id = $1`,
      `update ${TABLA} set hash_contenido = repeat('cd', 32) where id = $1`,
      `update ${TABLA} set firmado_en = now() where id = $1`,
      `delete from ${TABLA} where id = $1`,
    ];
    let estado = 12;
    for (let i = 0; i < 40; i += 1) {
      estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
      const sql = ops[estado % ops.length];
      const error = await ejecutarSql('optisaas_app', sql, [FILA_PROP]);
      expect(error).toMatch(/registro firmado inmutable/);
      if (i % 11 === 0) {
        const adenda = await ejecutarSql(
          'optisaas_app',
          `insert into adendas (
             tenant_id, entidad, entidad_id, adenda_de, motivo, contenido, estado, firmado_por
           ) values ($1, $2, $3, $3, $4, $5, 'firmada', $6)`,
          [TENANT, TABLA, FILA_PROP, `motivo ${i}`, `adenda ${i}`, ACTOR],
        );
        expect(adenda).toBe('');
      }
    }
    const truncar = await ejecutarSql('optisaas_app', `truncate ${TABLA}`);
    expect(truncar).toMatch(/permission denied|TRUNCATE prohibido/);
    expect(await foto(FILA_PROP)).toEqual(congelada);
    const vista = await consultarRegistroConAdendas(TABLA, FILA_PROP);
    expect(vista[0].contenido).toBe(congelada.contenido);
    expect(vista[0].estado_visible).toBe('adendado');
  });
});
