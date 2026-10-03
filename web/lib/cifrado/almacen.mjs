// SEG-12 (T11) — DEK por tenant envuelta con la KEK, anexos, texto clínico
// y secretos de adaptadores. La rotación de KEK solo reenvuelve DEK.
// La rotación de DEK re-cifra por lotes. La conexión de la app usa
// `set_config` local (RLS). La rotación de KEK de todos los tenants es una
// operación de plataforma: corre con el dueño de las tablas (la misma
// conexión de migración), no con un rol BYPASSRLS.
import { createHash, randomBytes } from 'node:crypto';

import {
  aTexto,
  cifrarBytes,
  descifrarBytes,
  desdeTexto,
  ErrorCifrado,
  esSobreTexto,
} from './aes.mjs';
import { esCampoTextoClinico } from './campos.mjs';
import { claveMaestraActiva, claveMaestraPorId } from './kek.mjs';

const LOTE = 50;

/** @param {string} tenantId */
function aadDatos(tenantId) {
  return Buffer.from(`datos:${tenantId}`, 'utf8');
}

/** @param {string} kekId */
function aadDek(kekId) {
  return Buffer.from(`dek:${kekId}`, 'utf8');
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient | import('pg').Client} fuente
 * @param {string} tenantId
 * @param {(cliente: import('pg').PoolClient | import('pg').Client) => Promise<T>} fn
 * @template T
 */
async function transaccionTenant(fuente, tenantId, fn) {
  const esPiscina = typeof fuente.idleCount === 'number';
  const cliente = esPiscina ? await fuente.connect() : fuente;
  try {
    await cliente.query('BEGIN');
    await cliente.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error original.
    }
    throw error;
  } finally {
    if (esPiscina) cliente.release();
  }
}

function sha256Hex(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {Buffer} dek
 * @param {number} version
 * @param {string} kekId
 */
function envolverDek(registro, dek, version, kekId) {
  return aTexto(cifrarBytes(claveMaestraPorId(registro, kekId), dek, version, aadDek(kekId)));
}

/**
 * @param {{ claves: Map<string, Buffer> }} registro
 * @param {{ dek_cifrada: string, kek_id: string, version: number }} fila
 */
function desenvolverDek(registro, fila) {
  const { plano, version } = descifrarBytes(
    claveMaestraPorId(registro, fila.kek_id),
    desdeTexto(fila.dek_cifrada),
    aadDek(fila.kek_id),
  );
  if (plano.length !== 32) throw new ErrorCifrado('la clave de datos no es válida');
  return { clave: plano, version: Number(fila.version ?? version) };
}

/**
 * @param {import('pg').PoolClient | import('pg').Client} cliente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {number | null} version exacta, o null para la activa
 */
async function leerDek(cliente, registro, tenantId, version) {
  const consulta =
    version == null
      ? `select version, dek_cifrada, kek_id from claves_datos
          where tenant_id = $1 and activa
          limit 1`
      : `select version, dek_cifrada, kek_id from claves_datos
          where tenant_id = $1 and version = $2
          limit 1`;
  const params = version == null ? [tenantId] : [tenantId, version];
  const filas = await cliente.query(consulta, params);
  const fila = filas.rows[0];
  if (!fila) return null;
  return desenvolverDek(registro, fila);
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 */
export async function asegurarDekActiva(fuente, registro, tenantId) {
  return transaccionTenant(fuente, tenantId, async (cliente) => {
    const existente = await leerDek(cliente, registro, tenantId, null);
    if (existente) return existente;
    const maximo = await cliente.query(
      `select coalesce(max(version), 0)::int as version from claves_datos where tenant_id = $1`,
      [tenantId],
    );
    const version = Number(maximo.rows[0].version) + 1;
    const clave = randomBytes(32);
    const dekCifrada = envolverDek(registro, clave, version, registro.activaId);
    await cliente.query('SAVEPOINT crear_dek');
    try {
      await cliente.query(
        `insert into claves_datos (tenant_id, version, dek_cifrada, kek_id, estado, activa)
         values ($1, $2, $3, $4, 'activa', true)`,
        [tenantId, version, dekCifrada, registro.activaId],
      );
      await cliente.query('RELEASE SAVEPOINT crear_dek');
    } catch (error) {
      await cliente.query('ROLLBACK TO SAVEPOINT crear_dek');
      const otra = await leerDek(cliente, registro, tenantId, null);
      if (otra) return otra;
      throw error;
    }
    return { clave, version };
  });
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {Buffer} plano
 */
export async function cifrarParaTenant(fuente, registro, tenantId, plano) {
  const dek = await asegurarDekActiva(fuente, registro, tenantId);
  const sobre = cifrarBytes(dek.clave, plano, dek.version, aadDatos(tenantId));
  return { texto: aTexto(sobre), bytes: sobre, version: dek.version, hash: sha256Hex(plano) };
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {Buffer | string} sobre
 */
export async function descifrarParaTenant(fuente, registro, tenantId, sobre) {
  const bytes = typeof sobre === 'string' ? desdeTexto(sobre) : Buffer.from(sobre);
  const version = bytes.readUInt32BE(5);
  const dek = await transaccionTenant(fuente, tenantId, (cliente) =>
    leerDek(cliente, registro, tenantId, version),
  );
  if (!dek) throw new ErrorCifrado('no hay clave de datos para el sobre');
  return descifrarBytes(dek.clave, bytes, aadDatos(tenantId)).plano;
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {string} campo
 * @param {string} texto
 */
export async function cifrarCampoClinico(fuente, registro, tenantId, campo, texto) {
  if (!esCampoTextoClinico(campo)) {
    throw new ErrorCifrado('el campo no está en la lista de texto clínico cifrado');
  }
  return cifrarParaTenant(fuente, registro, tenantId, Buffer.from(texto, 'utf8'));
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {string} campo
 * @param {string} sobre
 */
export async function descifrarCampoClinico(fuente, registro, tenantId, campo, sobre) {
  if (!esCampoTextoClinico(campo)) {
    throw new ErrorCifrado('el campo no está en la lista de texto clínico cifrado');
  }
  const plano = await descifrarParaTenant(fuente, registro, tenantId, sobre);
  return plano.toString('utf8');
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {{ tenantId: string, nombre: string, mime?: string | null, contenido: Buffer }} entrada
 */
export async function guardarAnexo(fuente, registro, entrada) {
  const cifrado = await cifrarParaTenant(fuente, registro, entrada.tenantId, entrada.contenido);
  const id = await transaccionTenant(fuente, entrada.tenantId, async (cliente) => {
    const insertado = await cliente.query(
      `insert into anexos (tenant_id, nombre, mime, tamano, hash_sha256, contenido_cifrado, clave_version)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id`,
      [
        entrada.tenantId,
        entrada.nombre,
        entrada.mime ?? null,
        entrada.contenido.length,
        cifrado.hash,
        cifrado.bytes,
        cifrado.version,
      ],
    );
    return insertado.rows[0].id;
  });
  return { id, hash: cifrado.hash, version: cifrado.version };
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {string} anexoId
 */
export async function leerAnexo(fuente, registro, tenantId, anexoId) {
  const fila = await transaccionTenant(fuente, tenantId, async (cliente) => {
    const consulta = await cliente.query(
      `select nombre, mime, hash_sha256, contenido_cifrado
         from anexos where id = $1 and tenant_id = $2`,
      [anexoId, tenantId],
    );
    return consulta.rows[0] ?? null;
  });
  if (!fila) return null;
  const contenido = await descifrarParaTenant(fuente, registro, tenantId, fila.contenido_cifrado);
  return {
    nombre: fila.nombre,
    mime: fila.mime,
    hash: sha256Hex(contenido),
    hashGuardado: fila.hash_sha256,
    contenido,
  };
}

const ADAPTADORES = new Set(['facturacion', 'rda']);

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {{ tenantId: string, adaptador: string, nombre: string, secreto: string }} entrada
 */
export async function guardarSecretoAdaptador(fuente, registro, entrada) {
  if (!ADAPTADORES.has(entrada.adaptador)) throw new ErrorCifrado('adaptador no admitido');
  const nombre = entrada.nombre.trim();
  if (!nombre || nombre.length > 80) throw new ErrorCifrado('el nombre del secreto no es válido');
  if (!entrada.secreto) throw new ErrorCifrado('el secreto está vacío');
  const cifrado = await cifrarParaTenant(
    fuente,
    registro,
    entrada.tenantId,
    Buffer.from(entrada.secreto, 'utf8'),
  );
  const id = await transaccionTenant(fuente, entrada.tenantId, async (cliente) => {
    const upsert = await cliente.query(
      `insert into secretos_adaptador (tenant_id, adaptador, nombre, valor_cifrado, clave_version)
       values ($1, $2, $3, $4, $5)
       on conflict (tenant_id, adaptador, nombre)
       do update set valor_cifrado = excluded.valor_cifrado,
                     clave_version = excluded.clave_version,
                     actualizado_en = now()
       returning id`,
      [entrada.tenantId, entrada.adaptador, nombre, cifrado.texto, cifrado.version],
    );
    return upsert.rows[0].id;
  });
  return { id, adaptador: entrada.adaptador, nombre, configurado: true };
}

/**
 * Columnas públicas. No selecciona `valor_cifrado`.
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {string} tenantId
 */
export async function listarAdaptadoresPublicos(fuente, tenantId) {
  const filas = await transaccionTenant(fuente, tenantId, async (cliente) => {
    const consulta = await cliente.query(
      `select id, adaptador, nombre from secretos_adaptador
        where tenant_id = $1
        order by adaptador, nombre`,
      [tenantId],
    );
    return consulta.rows;
  });
  return respuestaPublicaAdaptadores(filas);
}

/**
 * Descarta cualquier campo de secreto que llegue de más.
 * @param {Array<Record<string, unknown>>} filas
 */
export function respuestaPublicaAdaptadores(filas) {
  return {
    adaptadores: filas.map((fila) => ({
      id: String(fila.id),
      adaptador: String(fila.adaptador),
      nombre: String(fila.nombre),
      configurado: true,
    })),
  };
}

/**
 * Reenvoltura de DEK. No toca el cifrado de los datos.
 * Corre con el dueño de las tablas (ve todas las filas). `optisaas_app`
 * no puede listar claves de otros tenants.
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro registro que todavía puede desenvolver
 * @param {{ id: string, clave: Buffer, tamanoLote?: number, tenantId?: string | null }} nueva
 */
export async function rotarClaveMaestra(fuente, registro, nueva) {
  if (!Buffer.isBuffer(nueva.clave) || nueva.clave.length !== 32) {
    throw new ErrorCifrado('la clave maestra debe ser de 32 bytes');
  }
  const lote = nueva.tamanoLote ?? LOTE;
  const siguiente = {
    activaId: nueva.id,
    claves: new Map(registro.claves),
  };
  siguiente.claves.set(nueva.id, nueva.clave);
  let reenvueltas = 0;
  for (;;) {
    const pagina = await fuente.query(
      `select id, version, dek_cifrada, kek_id
         from claves_datos
        where kek_id <> $1
          and ($3::uuid is null or tenant_id = $3::uuid)
        order by id
        limit $2`,
      [nueva.id, lote, nueva.tenantId ?? null],
    );
    if (pagina.rows.length === 0) break;
    for (const fila of pagina.rows) {
      const dek = desenvolverDek(registro, fila);
      const envuelta = envolverDek(siguiente, dek.clave, Number(fila.version), nueva.id);
      await fuente.query(`update claves_datos set dek_cifrada = $2, kek_id = $3 where id = $1`, [
        fila.id,
        envuelta,
        nueva.id,
      ]);
      reenvueltas += 1;
    }
  }
  return { reenvueltas, kekId: nueva.id, registro: siguiente };
}

async function recifrarAnexos(fuente, registro, tenantId, versionOrigen, versionDestino, lote) {
  let total = 0;
  for (;;) {
    const pagina = await transaccionTenant(fuente, tenantId, async (cliente) => {
      const consulta = await cliente.query(
        `select id, contenido_cifrado from anexos
          where tenant_id = $1 and clave_version = $2
          order by id
          limit $3`,
        [tenantId, versionOrigen, lote],
      );
      return consulta.rows;
    });
    if (pagina.length === 0) break;
    const destino = await transaccionTenant(fuente, tenantId, (cliente) =>
      leerDek(cliente, registro, tenantId, versionDestino),
    );
    const origen = await transaccionTenant(fuente, tenantId, (cliente) =>
      leerDek(cliente, registro, tenantId, versionOrigen),
    );
    if (!destino || !origen) throw new ErrorCifrado('no hay clave de datos para el lote');
    for (const fila of pagina) {
      const plano = descifrarBytes(origen.clave, fila.contenido_cifrado, aadDatos(tenantId)).plano;
      const sobre = cifrarBytes(destino.clave, plano, versionDestino, aadDatos(tenantId));
      await transaccionTenant(fuente, tenantId, async (cliente) => {
        await cliente.query(
          `update anexos set contenido_cifrado = $2, clave_version = $3
            where id = $1 and tenant_id = $4 and clave_version = $5`,
          [fila.id, sobre, versionDestino, tenantId, versionOrigen],
        );
      });
      total += 1;
    }
  }
  return total;
}

async function recifrarTextos(fuente, registro, tenantId, tabla, columna, versionOrigen, versionDestino, lote) {
  let total = 0;
  for (;;) {
    const pagina = await transaccionTenant(fuente, tenantId, async (cliente) => {
      const consulta = await cliente.query(
        `select id, ${columna} as valor from ${tabla}
          where tenant_id = $1 and clave_version = $2 and ${columna} is not null
          order by id
          limit $3`,
        [tenantId, versionOrigen, lote],
      );
      return consulta.rows;
    });
    if (pagina.length === 0) break;
    const destino = await transaccionTenant(fuente, tenantId, (cliente) =>
      leerDek(cliente, registro, tenantId, versionDestino),
    );
    const origen = await transaccionTenant(fuente, tenantId, (cliente) =>
      leerDek(cliente, registro, tenantId, versionOrigen),
    );
    if (!destino || !origen) throw new ErrorCifrado('no hay clave de datos para el lote');
    for (const fila of pagina) {
      const plano = descifrarBytes(origen.clave, desdeTexto(fila.valor), aadDatos(tenantId)).plano;
      const texto = aTexto(cifrarBytes(destino.clave, plano, versionDestino, aadDatos(tenantId)));
      await transaccionTenant(fuente, tenantId, async (cliente) => {
        await cliente.query(
          `update ${tabla} set ${columna} = $2, clave_version = $3
            where id = $1 and tenant_id = $4 and clave_version = $5`,
          [fila.id, texto, versionDestino, tenantId, versionOrigen],
        );
      });
      total += 1;
    }
  }
  return total;
}

/**
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {string} tenantId
 * @param {{ tamanoLote?: number }} [opciones]
 */
export async function rotarClaveDatos(fuente, registro, tenantId, opciones = {}) {
  const lote = opciones.tamanoLote ?? LOTE;
  await completarRotacionPendiente(fuente, registro, tenantId, lote);
  const versiones = await transaccionTenant(fuente, tenantId, async (cliente) => {
    const actual = await cliente.query(
      `select id, version from claves_datos where tenant_id = $1 and activa for update`,
      [tenantId],
    );
    if (!actual.rows[0]) throw new ErrorCifrado('no hay clave de datos activa');
    const anterior = actual.rows[0];
    await cliente.query(`update claves_datos set estado = 'rotada', activa = false where id = $1`, [
      anterior.id,
    ]);
    const version = Number(anterior.version) + 1;
    const clave = randomBytes(32);
    const dekCifrada = envolverDek(registro, clave, version, registro.activaId);
    await cliente.query(
      `insert into claves_datos (tenant_id, version, dek_cifrada, kek_id, estado, activa)
       values ($1, $2, $3, $4, 'activa', true)`,
      [tenantId, version, dekCifrada, registro.activaId],
    );
    return { anterior: Number(anterior.version), nueva: version };
  });
  const recifrados = await migrarVersion(fuente, registro, tenantId, versiones.anterior, versiones.nueva, lote);
  await transaccionTenant(fuente, tenantId, async (cliente) => {
    await cliente.query(
      `update claves_datos set estado = 'retirada', activa = false
        where tenant_id = $1 and version = $2 and estado = 'rotada'`,
      [tenantId, versiones.anterior],
    );
  });
  return { recifrados, versionAnterior: versiones.anterior, versionNueva: versiones.nueva };
}

async function migrarVersion(fuente, registro, tenantId, origen, destino, lote) {
  let total = 0;
  total += await recifrarAnexos(fuente, registro, tenantId, origen, destino, lote);
  total += await recifrarTextos(
    fuente,
    registro,
    tenantId,
    'secretos_adaptador',
    'valor_cifrado',
    origen,
    destino,
    lote,
  );
  total += await recifrarTextos(
    fuente,
    registro,
    tenantId,
    'factores_totp',
    'secreto_protegido',
    origen,
    destino,
    lote,
  );
  total += await recifrarTextos(
    fuente,
    registro,
    tenantId,
    'desafios_mfa',
    'secreto_pendiente',
    origen,
    destino,
    lote,
  );
  return total;
}

async function completarRotacionPendiente(fuente, registro, tenantId, lote) {
  const rotadas = await transaccionTenant(fuente, tenantId, async (cliente) => {
    const consulta = await cliente.query(
      `select version from claves_datos
        where tenant_id = $1 and estado = 'rotada'
        order by version`,
      [tenantId],
    );
    const activa = await cliente.query(
      `select version from claves_datos where tenant_id = $1 and activa limit 1`,
      [tenantId],
    );
    return { versiones: consulta.rows.map((fila) => Number(fila.version)), activa: activa.rows[0] };
  });
  if (!rotadas.activa) return;
  const destino = Number(rotadas.activa.version);
  for (const origen of rotadas.versiones) {
    await migrarVersion(fuente, registro, tenantId, origen, destino, lote);
    await transaccionTenant(fuente, tenantId, async (cliente) => {
      await cliente.query(
        `update claves_datos set estado = 'retirada', activa = false
          where tenant_id = $1 and version = $2 and estado = 'rotada'`,
        [tenantId, origen],
      );
    });
  }
}

/**
 * Pasa a sobre los secretos TOTP que la tarea T08 guardó en claro.
 * Solo desarrollo y pruebas: en producción no hay filas legadas de este
 * corte y el script se niega a correr.
 * @param {import('pg').Pool | import('pg').Client} fuente
 * @param {{ claves: Map<string, Buffer>, activaId: string }} registro
 * @param {{ tamanoLote?: number }} [opciones]
 */
export async function recifrarSecretosMfaLegados(fuente, registro, opciones = {}) {
  const lote = opciones.tamanoLote ?? LOTE;
  let total = 0;
  total += await recifrarColumnaLegada(fuente, registro, 'factores_totp', 'secreto_protegido', lote);
  total += await recifrarColumnaLegada(fuente, registro, 'desafios_mfa', 'secreto_pendiente', lote);
  return { total };
}

async function recifrarColumnaLegada(fuente, registro, tabla, columna, lote) {
  let total = 0;
  for (;;) {
    const pagina = await fuente.query(
      `select id, tenant_id::text as tenant_id, ${columna} as valor
         from ${tabla}
        where ${columna} is not null and ${columna} not like 'opt1:%'
        order by id
        limit $1`,
      [lote],
    );
    if (pagina.rows.length === 0) break;
    for (const fila of pagina.rows) {
      const cifrado = await cifrarParaTenant(fuente, registro, fila.tenant_id, Buffer.from(fila.valor, 'utf8'));
      await transaccionTenant(fuente, fila.tenant_id, async (cliente) => {
        await cliente.query(
          `update ${tabla} set ${columna} = $2, clave_version = $3
            where id = $1 and ${columna} = $4`,
          [fila.id, cifrado.texto, cifrado.version, fila.valor],
        );
      });
      total += 1;
    }
  }
  return total;
}

export { esSobreTexto, claveMaestraActiva };
