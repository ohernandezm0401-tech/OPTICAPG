// SEG-12 (T11) — Cifrado envelope contra PostgreSQL real.
// AC-SEG-12-1 (I, S): el anexo sin la clave correcta falla; con la clave, el hash coincide.
// AC-SEG-12-2 (I): rotar la KEK no cambia el texto descifrado ni el sobre del anexo.
// AC-SEG-12-3 (S): la API no devuelve el secreto del adaptador.
// También: rotación de DEK por lotes y el secreto TOTP que T08 dejó en claro.
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { cerrarPool, obtenerDb, obtenerPool } from '../../db';
import { crearUsuario } from '../../db/nucleo';
import { sha256Hex } from '../../lib/cifrado/aes';
import {
  responderConsultaAdaptadores,
  responderGuardadoAdaptador,
} from '../../lib/cifrado/consulta-adaptadores';
import { conjuntoDesdePares } from '../../lib/cifrado/claves-maestras';
import { crearCifrado, reiniciarCifradoParaPruebas } from '../../lib/cifrado/servicio';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const SECRETO = ['TOKEN', 'SINTETICO', 'ADAPTADOR', 'SEG12', 'NO', 'EXPONER'].join('-');

function claves(version: number, ...pares: Buffer[]) {
  return conjuntoDesdePares(
    version,
    pares.map((clave, indice) => [indice + 1, clave] as [number, Buffer]),
  );
}

async function sembrarTenant(nit: string) {
  const id = randomUUID();
  await obtenerPool().query(
    `insert into tenants (id, razon_social, nit, estado) values ($1, 'Óptica Cifrado Sintética', $2, 'activo')`,
    [id, nit],
  );
  return id;
}

describe('SEG-12 cifrado envelope en PostgreSQL', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error('Falta DATABASE_URL_TEST.');
    }
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    reiniciarCifradoParaPruebas();
    await cerrarPool();
  });

  it('AC-SEG-12-1: sin la clave el anexo falla; con la clave el hash coincide y el tag detecta alteración', async () => {
    const tenantId = await sembrarTenant('900.000.211-1');
    const propia = claves(1, randomBytes(32));
    const cifrado = crearCifrado(propia);
    const bytes = Buffer.from('anexo-sintetico-retinografia', 'utf8');
    const guardado = await cifrado.guardarAnexo(tenantId, 'anexo-1', bytes);
    const leido = await cifrado.leerAnexo(tenantId, guardado.id);
    expect(sha256Hex(leido)).toBe(sha256Hex(bytes));
    expect(sha256Hex(leido)).toBe(guardado.hash);

    const ajena = crearCifrado(claves(1, randomBytes(32)));
    await expect(ajena.leerAnexo(tenantId, guardado.id)).rejects.toThrow(/alterado|clave/);

    const columna = await obtenerPool().query<{ sobre: string }>(
      'select sobre from contenidos_cifrados where id = $1',
      [guardado.id],
    );
    expect(columna.rows[0].sobre).not.toContain('retinografia');
    const alterado = columna.rows[0].sobre.slice(0, -2) + (columna.rows[0].sobre.endsWith('a') ? 'b' : 'a');
    await obtenerPool().query('update contenidos_cifrados set sobre = $2 where id = $1', [guardado.id, alterado]);
    await expect(cifrado.leerAnexo(tenantId, guardado.id)).rejects.toThrow(/alterado|formato|clave/);
  });

  it('AC-SEG-12-2: rotar la KEK no cambia el sobre ni el texto descifrado', async () => {
    const tenantId = await sembrarTenant('900.000.211-2');
    const v1 = randomBytes(32);
    const v2 = randomBytes(32);
    const inicial = crearCifrado(claves(1, v1));
    const bytes = Buffer.from('anexo-sintetico-tras-rotacion', 'utf8');
    const guardado = await inicial.guardarAnexo(tenantId, 'anexo-kek', bytes);
    const antes = await obtenerPool().query<{ sobre: string; dek: string }>(
      `select c.sobre, k.dek_cifrada as dek
         from contenidos_cifrados c
         join claves_datos k on k.tenant_id = c.tenant_id and k.version = c.version_dek
        where c.id = $1`,
      [guardado.id],
    );

    const rotada = crearCifrado(conjuntoDesdePares(2, [[1, v1], [2, v2]]));
    const resultado = await rotada.rotarClaveMaestra(tenantId);
    expect(resultado.reenvueltas).toBe(1);
    const despues = await obtenerPool().query<{ sobre: string; dek: string; version_kek: number }>(
      `select c.sobre, k.dek_cifrada as dek, k.version_kek
         from contenidos_cifrados c
         join claves_datos k on k.tenant_id = c.tenant_id and k.version = c.version_dek
        where c.id = $1`,
      [guardado.id],
    );
    expect(despues.rows[0].sobre).toBe(antes.rows[0].sobre);
    expect(despues.rows[0].dek).not.toBe(antes.rows[0].dek);
    expect(despues.rows[0].version_kek).toBe(2);
    expect(sha256Hex(await rotada.leerAnexo(tenantId, guardado.id))).toBe(sha256Hex(bytes));
    const soloNueva = crearCifrado(conjuntoDesdePares(2, [[2, v2]]));
    expect(sha256Hex(await soloNueva.leerAnexo(tenantId, guardado.id))).toBe(sha256Hex(bytes));
  });

  it('rota la DEK por lotes y deja el texto clínico y el anexo legibles', async () => {
    const tenantId = await sembrarTenant('900.000.211-3');
    const cifrado = crearCifrado(claves(1, randomBytes(32)));
    const textos = ['lote-a', 'lote-b', 'lote-c'].map((nombre) => Buffer.from(`anexo-sintetico-${nombre}`, 'utf8'));
    const ids = [];
    for (const [indice, bytes] of textos.entries()) {
      ids.push((await cifrado.guardarAnexo(tenantId, `ref-${indice}`, bytes)).id);
    }
    await cifrado.guardarTextoClinico(
      tenantId,
      'atenciones.contenido.a',
      'atencion-sintetica',
      'paciente sintético refiere ardor leve',
    );
    const primero = await cifrado.rotarClaveDatos(tenantId, 2);
    expect(primero.version).toBe(2);
    expect(primero.reprocesados).toBe(2);
    expect(primero.pendientes).toBeGreaterThan(0);
    const segundo = await cifrado.rotarClaveDatos(tenantId, 2);
    expect(segundo.pendientes).toBe(0);
    for (const [indice, bytes] of textos.entries()) {
      expect(sha256Hex(await cifrado.leerAnexo(tenantId, ids[indice]))).toBe(sha256Hex(bytes));
    }
    expect(await cifrado.leerTextoClinico(tenantId, 'atenciones.contenido.a', 'atencion-sintetica')).toBe(
      'paciente sintético refiere ardor leve',
    );
    const estados = await obtenerPool().query<{ version: number; estado: string }>(
      'select version, estado from claves_datos where tenant_id = $1 order by version',
      [tenantId],
    );
    expect(estados.rows).toEqual([
      { version: 1, estado: 'retirada' },
      { version: 2, estado: 'activa' },
    ]);
    const sobre = await obtenerPool().query<{ sobre: string }>(
      `select sobre from contenidos_cifrados where tenant_id = $1 and clase = 'texto_clinico'`,
      [tenantId],
    );
    expect(sobre.rows[0].sobre).not.toContain('ardor');
  });

  it('re-cifra un secreto TOTP que estaba en claro y luego lo abre', async () => {
    const tenantId = await sembrarTenant('900.000.211-4');
    const usuario = await crearUsuario({ tenant_id: tenantId, email: `t11.${Date.now()}@example.invalid`, estado: 'activo' });
    const secreto = 'JBSWY3DPEHPK3PXP';
    await obtenerPool().query(
      `insert into factores_totp (tenant_id, usuario_id, secreto_protegido, confirmado_en)
       values ($1, $2, $3, now())`,
      [tenantId, usuario.id, secreto],
    );
    const cifrado = crearCifrado(claves(1, randomBytes(32)));
    const rotacion = await cifrado.rotarClaveDatos(tenantId, 10);
    expect(rotacion.pendientes).toBe(0);
    const columna = await obtenerPool().query<{ secreto_protegido: string }>(
      'select secreto_protegido from factores_totp where usuario_id = $1',
      [usuario.id],
    );
    expect(columna.rows[0].secreto_protegido.startsWith('optisaas1.')).toBe(true);
    expect(columna.rows[0].secreto_protegido).not.toContain(secreto);
    expect(await cifrado.revelarSecretoMfa(tenantId, columna.rows[0].secreto_protegido)).toBe(secreto);
  });

  it('AC-SEG-12-3: ningún cuerpo de la API devuelve el secreto del adaptador', async () => {
    const tenantId = await sembrarTenant('900.000.211-5');
    const conjunto = claves(1, randomBytes(32));
    reiniciarCifradoParaPruebas(conjunto);
    const owner = { user: { id: randomUUID(), role: 'owner', empresaId: tenantId } };
    const guardado = await responderGuardadoAdaptador(owner, {
      tenant_id: tenantId,
      adaptador: 'facturacion',
      nombre: 'token',
      secreto: SECRETO,
    });
    const cuerpoGuardado = await guardado.json();
    expect(guardado.status).toBe(200);
    expect(JSON.stringify(cuerpoGuardado)).not.toContain(SECRETO);
    expect(cuerpoGuardado).toEqual({ ok: true, adaptador: 'facturacion', nombre: 'token', configurado: true });

    const consulta = await responderConsultaAdaptadores(owner, new URLSearchParams({ tenant_id: tenantId }));
    const cuerpo = await consulta.json();
    expect(JSON.stringify(cuerpo)).not.toContain(SECRETO);
    expect(cuerpo.adaptadores).toEqual([{ adaptador: 'facturacion', nombre: 'token', configurado: true }]);
    expect(Object.keys(cuerpo.adaptadores[0]).sort()).toEqual(['adaptador', 'configurado', 'nombre']);

    const ajeno = await responderConsultaAdaptadores(
      { user: { id: randomUUID(), role: 'asesor', empresaId: tenantId } },
      new URLSearchParams({ tenant_id: tenantId }),
    );
    expect(ajeno.status).toBe(403);
    expect(JSON.stringify(await ajeno.json())).not.toContain(SECRETO);
    const anonimo = await responderConsultaAdaptadores(null, new URLSearchParams({ tenant_id: tenantId }));
    expect(anonimo.status).toBe(401);

    const columna = await obtenerPool().query<{ sobre: string }>(
      'select sobre from secretos_adaptador where tenant_id = $1',
      [tenantId],
    );
    expect(columna.rows[0].sobre).not.toContain(SECRETO);

    const otro = randomUUID();
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      await cliente.query(`SET LOCAL app.tenant_id = '${otro}'`);
      const filas = await cliente.query('select adaptador from secretos_adaptador');
      expect(filas.rowCount).toBe(0);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });
});
