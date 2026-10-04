// SEG-12 (T11) — Cifrado envelope contra PostgreSQL real.
// AC-SEG-12-1 (I, S): el anexo sin la clave falla; con la clave el hash coincide.
// AC-SEG-12-2 (I): rotar la KEK no cambia el plano ni el cifrado del anexo.
// AC-SEG-12-3 (I, S): el listado de adaptadores no devuelve el secreto.
// También: rotación de DEK por lotes, recifrado del TOTP legado y RLS.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  cifrarCampoClinico,
  descifrarCampoClinico,
  guardarAnexo,
  guardarSecretoAdaptador,
  leerAnexo,
  listarAdaptadoresPublicos,
  recifrarSecretosMfaLegados,
  rotarClaveDatos,
  rotarClaveMaestra,
} from '../../lib/cifrado/almacen.mjs';
import { ErrorCifrado } from '../../lib/cifrado/aes.mjs';
import { fijarRegistroKekParaPruebas } from '../../lib/cifrado/kek.mjs';
import { cerrarPool, obtenerDb, obtenerPool } from '../../db/index';

const MIGRACIONES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'db', 'migrations');
const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SECRETO_ADAPTADOR = 'token-sintetico-adaptador-no-exponer';
const PLANO = Buffer.from('retinografía sintética de prueba', 'utf8');

function hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function registroCon(id: string, clave: Buffer, anteriores: Array<[string, Buffer]> = []) {
  return { activaId: id, claves: new Map<string, Buffer>([[id, clave], ...anteriores]) };
}

let kek1: Buffer;
let registro: { activaId: string; claves: Map<string, Buffer> };
let TENANT: string;
let USUARIO: string;

beforeAll(async () => {
  kek1 = randomBytes(32);
  registro = registroCon('k1', kek1);
  TENANT = randomUUID();
  USUARIO = randomUUID();
  fijarRegistroKekParaPruebas(registro);
  await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  const nit = `900.000.${Date.now().toString().slice(-7)}-${randomBytes(1)[0] % 10}`;
  await obtenerPool().query(
    `insert into tenants (id, razon_social, nit, estado)
     values ($1, 'Óptica Cifrado Sintética S.A.S.', $2, 'activo')`,
    [TENANT, nit],
  );
  await obtenerPool().query(
    `insert into usuarios (id, tenant_id, email, estado)
     values ($1, $2, $3, 'activo')`,
    [USUARIO, TENANT, `t11.${USUARIO}@example.invalid`],
  );
});

afterAll(async () => {
  fijarRegistroKekParaPruebas(null);
  await cerrarPool();
});

describe('AC-SEG-12-1 I/S: anexo cifrado', () => {
  it('falla sin la clave y con clave correcta devuelve el mismo hash', async () => {
    const guardado = await guardarAnexo(obtenerPool(), registro, {
      tenantId: TENANT,
      nombre: 'retino-sintetica.bin',
      mime: 'application/octet-stream',
      contenido: PLANO,
    });
    const leido = await leerAnexo(obtenerPool(), registro, TENANT, guardado.id);
    expect(leido?.hash).toBe(hash(PLANO));
    expect(leido?.contenido.equals(PLANO)).toBe(true);

    const ajena = registroCon('ajena', randomBytes(32));
    await expect(leerAnexo(obtenerPool(), ajena, TENANT, guardado.id)).rejects.toThrow(ErrorCifrado);

    await expect(
      obtenerPool().query(
        `update anexos
            set contenido_cifrado = set_byte(contenido_cifrado, octet_length(contenido_cifrado) - 1,
              get_byte(contenido_cifrado, octet_length(contenido_cifrado) - 1) # 1)
          where id = $1`,
        [guardado.id],
      ),
    ).rejects.toThrow(/UPDATE prohibido/);
    await expect(obtenerPool().query('delete from anexos where id = $1', [guardado.id])).rejects.toThrow(
      /DELETE prohibido/,
    );
    const intacto = await leerAnexo(obtenerPool(), registro, TENANT, guardado.id);
    expect(intacto?.hash).toBe(hash(PLANO));
    expect(intacto?.contenido.equals(PLANO)).toBe(true);
  });
});

describe('AC-SEG-12-2 I: rotación de KEK', () => {
  it('reenvuelve la DEK y el anexo descifra igual, con el mismo cifrado', async () => {
    const contenido = Buffer.from('anexo para rotar la kek', 'utf8');
    const guardado = await guardarAnexo(obtenerPool(), registro, {
      tenantId: TENANT,
      nombre: 'rotar-kek.bin',
      mime: 'application/octet-stream',
      contenido,
    });
    const antes = await obtenerPool().query<{ contenido_cifrado: Buffer; dek: string }>(
      `select a.contenido_cifrado, c.dek_cifrada as dek
         from anexos a
         join claves_datos c on c.tenant_id = a.tenant_id and c.activa
        where a.id = $1`,
      [guardado.id],
    );
    const kek2 = randomBytes(32);
    const rotacion = await rotarClaveMaestra(obtenerPool(), registro, {
      id: `k2-${randomUUID()}`,
      clave: kek2,
      tamanoLote: 1,
      tenantId: TENANT,
    });
    const soloNueva = registroCon(rotacion.kekId, kek2);
    const leido = await leerAnexo(obtenerPool(), soloNueva, TENANT, guardado.id);
    expect(leido?.hash).toBe(hash(contenido));
    const despues = await obtenerPool().query<{ contenido_cifrado: Buffer; dek: string; kek_id: string }>(
      `select a.contenido_cifrado, c.dek_cifrada as dek, c.kek_id
         from anexos a
         join claves_datos c on c.tenant_id = a.tenant_id and c.version = a.clave_version
        where a.id = $1`,
      [guardado.id],
    );
    expect(Buffer.from(despues.rows[0].contenido_cifrado).equals(Buffer.from(antes.rows[0].contenido_cifrado))).toBe(
      true,
    );
    expect(despues.rows[0].dek).not.toBe(antes.rows[0].dek);
    expect(despues.rows[0].kek_id).toBe(rotacion.kekId);
    expect(rotacion.reenvueltas).toBeGreaterThan(0);
    registro = soloNueva;
    fijarRegistroKekParaPruebas(registro);
  });
});

describe('AC-SEG-12-3 I/S: secretos de adaptadores', () => {
  it('el listado y la ruta no devuelven el secreto ni el sobre', async () => {
    await guardarSecretoAdaptador(obtenerPool(), registro, {
      tenantId: TENANT,
      adaptador: 'facturacion',
      nombre: 'api',
      secreto: SECRETO_ADAPTADOR,
    });
    const publico = await listarAdaptadoresPublicos(obtenerPool(), TENANT);
    const json = JSON.stringify(publico);
    const fila = await obtenerPool().query<{ valor_cifrado: string }>(
      `select valor_cifrado from secretos_adaptador where tenant_id = $1 and nombre = 'api'`,
      [TENANT],
    );
    expect(json).not.toContain(SECRETO_ADAPTADOR);
    expect(json).not.toContain(fila.rows[0].valor_cifrado);
    expect(fila.rows[0].valor_cifrado).not.toContain(SECRETO_ADAPTADOR);
    expect(fila.rows[0].valor_cifrado.startsWith('opt1:')).toBe(true);

    const ruta = readFileSync(path.join(RAIZ_WEB, 'app', 'api', 'adaptadores', 'route.ts'), 'utf8');
    expect(ruta).toContain('respuestaPublicaAdaptadores');
    expect(ruta).not.toContain('valor_cifrado');
  });
});

describe('rotación de DEK, texto clínico, MFA legado y RLS', () => {
  it('I: rotar la DEK por lotes conserva el plano y retira la clave anterior', async () => {
    const primero = await guardarAnexo(obtenerPool(), registro, {
      tenantId: TENANT,
      nombre: 'lote-1.bin',
      mime: 'application/octet-stream',
      contenido: Buffer.from('lote uno', 'utf8'),
    });
    const segundo = await guardarAnexo(obtenerPool(), registro, {
      tenantId: TENANT,
      nombre: 'lote-2.bin',
      mime: 'application/octet-stream',
      contenido: Buffer.from('lote dos', 'utf8'),
    });
    const cifradoAntes = await obtenerPool().query<{ contenido_cifrado: Buffer }>(
      `select contenido_cifrado from anexos where id = $1`,
      [primero.id],
    );
    const rotacion = await rotarClaveDatos(obtenerPool(), registro, TENANT, { tamanoLote: 1 });
    expect(rotacion.recifrados).toBeGreaterThanOrEqual(2);
    const uno = await leerAnexo(obtenerPool(), registro, TENANT, primero.id);
    const dos = await leerAnexo(obtenerPool(), registro, TENANT, segundo.id);
    expect(uno?.contenido.toString('utf8')).toBe('lote uno');
    expect(dos?.contenido.toString('utf8')).toBe('lote dos');
    const cifradoDespues = await obtenerPool().query<{ contenido_cifrado: Buffer }>(
      `select contenido_cifrado from anexos where id = $1`,
      [primero.id],
    );
    expect(
      Buffer.from(cifradoDespues.rows[0].contenido_cifrado).equals(Buffer.from(cifradoAntes.rows[0].contenido_cifrado)),
    ).toBe(false);
    const estados = await obtenerPool().query<{ version: number; estado: string }>(
      `select version, estado from claves_datos where tenant_id = $1 order by version`,
      [TENANT],
    );
    expect(estados.rows.some((fila) => fila.estado === 'retirada')).toBe(true);
    expect(estados.rows.filter((fila) => fila.estado === 'activa')).toHaveLength(1);
  });

  it('I: el texto clínico de la lista cierra el ciclo y un campo ajeno se rechaza', async () => {
    const texto = 'anamnesis sintética sin paciente real';
    const sobre = await cifrarCampoClinico(obtenerPool(), registro, TENANT, 'atenciones.contenido', texto);
    expect(sobre.texto.startsWith('opt1:')).toBe(true);
    expect(sobre.texto).not.toContain(texto);
    const plano = await descifrarCampoClinico(
      obtenerPool(),
      registro,
      TENANT,
      'atenciones.contenido',
      sobre.texto,
    );
    expect(plano).toBe(texto);
    await expect(
      cifrarCampoClinico(obtenerPool(), registro, TENANT, 'pacientes.nombres', 'Ana'),
    ).rejects.toThrow(/lista/);
  });

  it('I: un secreto TOTP en claro se recifra y deja de coincidir con el plano', async () => {
    const secreto = 'JBSWY3DPEHPK3PXP';
    const id = randomUUID();
    await obtenerPool().query(
      `insert into factores_totp (id, tenant_id, usuario_id, secreto_protegido, confirmado_en)
       values ($1, $2, $3, $4, now())`,
      [id, TENANT, USUARIO, secreto],
    );
    const resultado = await recifrarSecretosMfaLegados(obtenerPool(), registro, { tamanoLote: 1 });
    expect(resultado.total).toBeGreaterThanOrEqual(1);
    const fila = await obtenerPool().query<{ secreto_protegido: string }>(
      `select secreto_protegido from factores_totp where id = $1`,
      [id],
    );
    expect(fila.rows[0].secreto_protegido).not.toBe(secreto);
    expect(fila.rows[0].secreto_protegido.startsWith('opt1:')).toBe(true);
    const otra = await recifrarSecretosMfaLegados(obtenerPool(), registro);
    expect(otra.total).toBe(0);
  });

  it('S: optisaas_app sin contexto no ve anexos ni secretos', async () => {
    const cliente = await obtenerPool().connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SET LOCAL ROLE optisaas_app');
      const anexos = await cliente.query('select id from anexos');
      const secretos = await cliente.query('select id from secretos_adaptador');
      const claves = await cliente.query('select id from claves_datos');
      expect(anexos.rowCount).toBe(0);
      expect(secretos.rowCount).toBe(0);
      expect(claves.rowCount).toBe(0);
      await cliente.query('ROLLBACK');
    } finally {
      cliente.release();
    }
  });
});
