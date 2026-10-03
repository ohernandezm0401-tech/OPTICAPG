// PLT-07 (T28) — Respaldo lógico cifrado y prueba de restauración.
// El volcado en claro vive en un archivo 0600 y se borra después de cifrar.
// No se registra el contenido ni la clave. La credencial es la de
// administración de la base (DATABASE_URL_RESPALDO), nunca optisaas_app.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  fsyncSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Client } from 'pg';

import { leerParContinuidad, entornoPermitePruebaRestauracion } from './continuidad.mjs';
import { destinoDesdeEntorno } from './destino.mjs';
import { abrirRespaldo, cifrarRespaldo, leerClaveRespaldo, sha256Hex } from './formato.mjs';

const TABLA_SEGURA = /^[a-z_][a-z0-9_]*$/;
const BASE_TEMPORAL = /^optisaas_restauracion_[0-9a-f]{16}$/;

/**
 * @param {Record<string, string | undefined>} [variables]
 */
export function leerUrlRespaldo(variables = process.env) {
  if (variables.APP_ENV === 'produccion') {
    const dedicada = variables.DATABASE_URL_RESPALDO?.trim();
    if (!dedicada) {
      throw new Error(
        'en produccion el respaldo exige DATABASE_URL_RESPALDO, distinta de la URL de la aplicación',
      );
    }
    return dedicada;
  }
  const url = variables.DATABASE_URL_RESPALDO?.trim() || variables.DATABASE_URL_TEST?.trim() || variables.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('falta DATABASE_URL_RESPALDO (o DATABASE_URL_TEST en pruebas)');
  }
  return url;
}

/**
 * @param {string} url
 */
export function datosConexion(url) {
  let partida;
  try {
    partida = new URL(url);
  } catch {
    throw new Error('la URL de la base de respaldo no es válida');
  }
  const database = decodeURIComponent(partida.pathname.replace(/^\//, ''));
  if (!database) throw new Error('la URL de respaldo no indica la base');
  return {
    host: partida.hostname,
    port: partida.port || '5432',
    user: decodeURIComponent(partida.username),
    password: decodeURIComponent(partida.password),
    database,
  };
}

/**
 * @param {string} url
 * @param {string} base
 */
function urlConBase(url, base) {
  const partida = new URL(url);
  partida.pathname = `/${base}`;
  return partida.toString();
}

/**
 * @param {string} texto
 */
export function sanearSalidaHerramienta(texto) {
  return String(texto)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://…')
    .replace(/password=\S+/gi, 'password=…')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && linea.length < 200)
    .filter((linea) => !/insert into|copy |values \(|backup_key|pgpassword/i.test(linea))
    .slice(0, 6)
    .join(' | ');
}

/**
 * @param {string} bin
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} entorno
 */
function ejecutarHerramienta(bin, args, entorno) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(bin, args, { env: entorno, stdio: ['ignore', 'ignore', 'pipe'] });
    let errorTexto = '';
    hijo.stderr.on('data', (trozo) => {
      if (errorTexto.length < 4000) errorTexto += trozo.toString('utf8');
    });
    hijo.on('error', (error) => {
      const codigo = /** @type {NodeJS.ErrnoException} */ (error).code;
      if (codigo === 'ENOENT') {
        reject(new Error(`no está ${bin} en PATH. Instale el cliente PostgreSQL (licencia PostgreSQL).`));
        return;
      }
      reject(new Error(`no se pudo ejecutar ${bin}`));
    });
    hijo.on('close', (codigo) => {
      if (codigo === 0) resolve(undefined);
      else {
        const detalle = sanearSalidaHerramienta(errorTexto);
        reject(new Error(`${bin} terminó con código ${codigo}${detalle ? `: ${detalle}` : ''}`));
      }
    });
  });
}

/**
 * @param {ReturnType<typeof datosConexion>} datos
 * @param {Record<string, string | undefined>} variables
 */
function entornoClientePg(datos, variables) {
  return {
    PATH: variables.PATH ?? '',
    HOME: variables.HOME ?? '',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    PGHOST: datos.host,
    PGPORT: datos.port,
    PGUSER: datos.user,
    PGPASSWORD: datos.password,
    PGDATABASE: datos.database,
  };
}

/**
 * @param {string} ruta
 */
export function crearArchivoProtegido(ruta) {
  const fd = openSync(ruta, 'wx', 0o600);
  closeSync(fd);
  chmodSync(ruta, 0o600);
}

/**
 * Borra el volcado en claro: lo sobrescribe y luego lo desvincula.
 * @param {string} ruta
 */
export function borrarArchivoSensible(ruta) {
  let fd;
  try {
    const tamano = statSync(ruta).size;
    fd = openSync(ruta, 'r+');
    const bloque = Buffer.alloc(64 * 1024);
    let restante = tamano;
    while (restante > 0) {
      const n = Math.min(bloque.length, restante);
      writeSync(fd, bloque, 0, n);
      restante -= n;
    }
    fsyncSync(fd);
  } catch {
    // Si ya no está, el unlink de abajo cierra el ciclo.
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
  try {
    rmSync(ruta, { force: true });
  } catch {
    // El directorio de trabajo se elimina entero al final.
  }
}

/**
 * @param {import('pg').Client} cliente
 */
async function exigirCredencialRespaldo(cliente) {
  const { rows } = await cliente.query(
    `select current_user as usuario,
            rolsuper as superusuario,
            rolbypassrls as salto_rls
       from pg_roles
      where rolname = current_user`,
  );
  const fila = rows[0];
  if (!fila || fila.usuario === 'optisaas_app') {
    throw new Error('el respaldo no usa el rol de la aplicación optisaas_app');
  }
  if (!fila.superusuario && !fila.salto_rls) {
    throw new Error(
      'DATABASE_URL_RESPALDO debe ser la credencial de administración de la base, distinta de optisaas_app',
    );
  }
}

/**
 * @param {import('pg').Client} cliente
 */
async function conteosTablas(cliente) {
  const tablas = await cliente.query(
    `select tablename as nombre from pg_tables where schemaname = 'public' order by tablename`,
  );
  /** @type {Record<string, number>} */
  const mapa = {};
  for (const fila of tablas.rows) {
    const nombre = String(fila.nombre);
    if (!TABLA_SEGURA.test(nombre)) throw new Error('hay una tabla con un nombre no admitido');
    const cuenta = await cliente.query(`select count(*)::int as n from public.${nombre}`);
    mapa[nombre] = Number(cuenta.rows[0].n);
  }
  return mapa;
}

/**
 * @param {import('pg').Client} cliente
 */
async function hashCadenaAuditoria(cliente) {
  const existe = await cliente.query(`select to_regclass('public.auditoria') as tabla`);
  if (!existe.rows[0]?.tabla) return null;
  const filas = await cliente.query(`select hash from auditoria order by tenant_id, id`);
  const resumen = sha256Hex(Buffer.from(filas.rows.map((fila) => String(fila.hash)).join('\n'), 'utf8'));
  return resumen;
}

/**
 * @param {import('pg').Client} cliente
 */
async function leerContinuidad(cliente) {
  const { rows } = await cliente.query(
    `select clave, valor, rotulo from parametros_continuidad order by clave`,
  );
  return leerParContinuidad(rows);
}

/**
 * @param {Record<string, number>} origen
 * @param {Record<string, number>} restaurados
 */
function diferenciasConteo(origen, restaurados) {
  const claves = new Set([...Object.keys(origen), ...Object.keys(restaurados)]);
  /** @type {string[]} */
  const diferencias = [];
  for (const clave of [...claves].sort()) {
    if (origen[clave] !== restaurados[clave]) diferencias.push(clave);
  }
  return diferencias;
}

/**
 * @param {string} directorioDestino
 */
function directorioTrabajo(directorioDestino) {
  const padre = directorioDestino || tmpdir();
  const dir = mkdtempSync(path.join(padre, '.trabajo-'));
  chmodSync(dir, 0o700);
  return dir;
}

/**
 * @param {{
 *   variables?: Record<string, string | undefined>,
 *   clave?: Buffer,
 *   destino?: { guardar: (nombre: string, contenido: Buffer) => Promise<{ ubicacion: string }>, leer: (ubicacion: string) => Promise<Buffer>, tipo?: string },
 *   url?: string,
 * }} [opciones]
 */
export async function ejecutarRespaldo(opciones = {}) {
  const variables = opciones.variables ?? process.env;
  const clave = opciones.clave ?? leerClaveRespaldo(variables);
  const url = opciones.url ?? leerUrlRespaldo(variables);
  const destino = opciones.destino ?? destinoDesdeEntorno(variables);
  const datos = datosConexion(url);
  const cliente = new Client({ connectionString: url });
  const trabajo = directorioTrabajo(variables.BACKUP_DIR?.trim() || tmpdir());
  const volcado = path.join(trabajo, 'volcado.sql');
  let volcadoListo = false;
  try {
    await cliente.connect();
    await exigirCredencialRespaldo(cliente);
    const continuidad = await leerContinuidad(cliente);
    const inicio = new Date();
    const idProgramado = (
      await cliente.query(
        `insert into respaldos (tipo, inicio, cifrado, estado)
         values ('logico_pg_dump', $1, 'AES-256-GCM', 'programado')
         returning id`,
        [inicio],
      )
    ).rows[0].id;
    // Conteos del instante del volcado (la fila `programado` ya está).
    // El UPDATE posterior no cambia el número de filas.
    const conteos = await conteosTablas(cliente);
    const hashAuditoria = await hashCadenaAuditoria(cliente);

    crearArchivoProtegido(volcado);
    const bin = variables.PG_DUMP || 'pg_dump';
    await ejecutarHerramienta(
      bin,
      ['--format=plain', '--no-owner', '--no-acl', '--encoding=UTF8', `--file=${volcado}`],
      { ...entornoClientePg(datos, variables), PGDATABASE: datos.database },
    );
    volcadoListo = true;
    chmodSync(volcado, 0o600);

    const plano = readFileSync(volcado);
    const hashPlano = sha256Hex(plano);
    const sobre = cifrarRespaldo(clave, plano);
    plano.fill(0);
    borrarArchivoSensible(volcado);
    volcadoListo = false;

    const abierto = abrirRespaldo(clave, sobre);
    const hashAbierto = sha256Hex(abierto);
    abierto.fill(0);
    if (hashAbierto !== hashPlano) {
      await cliente.query(
        `update respaldos set fin = now(), resultado = 'fallo', estado = 'ejecutado' where id = $1`,
        [idProgramado],
      );
      throw new Error('la verificación de integridad del respaldo no coincide');
    }

    const hashCifrado = sha256Hex(sobre);
    const nombre = `respaldo-${inicio.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}-${idProgramado}.enc`;
    const guardado = await destino.guardar(nombre, sobre);
    await cliente.query(
      `update respaldos
          set fin = now(), tamano = $2, hash_sha256 = $3, destino = $4, resultado = 'ok', estado = 'verificado'
        where id = $1`,
      [idProgramado, sobre.length, hashCifrado, guardado.ubicacion],
    );
    return {
      id: String(idProgramado),
      archivo: guardado.ubicacion,
      hash_sha256: hashCifrado,
      tamano: sobre.length,
      cifrado: 'AES-256-GCM',
      estado: 'verificado',
      resultado: 'ok',
      conteos,
      hashAuditoria,
      continuidad,
    };
  } finally {
    if (volcadoListo) borrarArchivoSensible(volcado);
    rmSync(trabajo, { recursive: true, force: true });
    await cliente.end().catch(() => undefined);
  }
}

/**
 * @param {string} nombre
 */
function citarBase(nombre) {
  if (!BASE_TEMPORAL.test(nombre)) throw new Error('nombre de base temporal no válido');
  return `"${nombre}"`;
}

/**
 * @param {{
 *   variables?: Record<string, string | undefined>,
 *   clave?: Buffer,
 *   url?: string,
 *   archivo: string,
 *   idRespaldo: string,
 *   conteosOrigen: Record<string, number>,
 *   hashAuditoriaOrigen: string | null,
 *   continuidad: ReturnType<typeof leerParContinuidad>,
 * }} opciones
 */
export async function probarRestauracion(opciones) {
  const variables = opciones.variables ?? process.env;
  if (!entornoPermitePruebaRestauracion(variables)) {
    throw new Error(
      'la prueba de restauración solo corre con APP_ENV=desarrollo, pruebas o demo, y datos sintéticos',
    );
  }
  const clave = opciones.clave ?? leerClaveRespaldo(variables);
  const url = opciones.url ?? leerUrlRespaldo(variables);
  const datos = datosConexion(url);
  const sobre = readFileSync(opciones.archivo);
  const hashArchivo = sha256Hex(sobre);
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  let plano;
  try {
    await exigirCredencialRespaldo(cliente);
    const registro = await cliente.query(`select hash_sha256 from respaldos where id = $1`, [opciones.idRespaldo]);
    if (!registro.rows[0] || registro.rows[0].hash_sha256 !== hashArchivo) {
      throw new Error('el archivo no coincide con el hash registrado');
    }
    plano = abrirRespaldo(clave, sobre);
  } catch (error) {
    await cliente.end().catch(() => undefined);
    throw error;
  }

  const trabajo = directorioTrabajo(variables.BACKUP_DIR?.trim() || tmpdir());
  const volcado = path.join(trabajo, 'restaurar.sql');
  const base = `optisaas_restauracion_${randomBytes(8).toString('hex')}`;
  const admin = new Client({ connectionString: urlConBase(url, 'postgres') });
  let creada = false;
  /** @type {import('pg').Client | null} */
  let temporal = null;
  try {
    crearArchivoProtegido(volcado);
    const fd = openSync(volcado, 'r+', 0o600);
    try {
      writeSync(fd, plano);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    plano.fill(0);
    chmodSync(volcado, 0o600);

    await admin.connect();
    await admin.query(`create database ${citarBase(base)} template template0 encoding 'UTF8'`);
    creada = true;
    const bin = variables.PSQL || 'psql';
    await ejecutarHerramienta(bin, ['-v', 'ON_ERROR_STOP=1', '--quiet', `--file=${volcado}`], {
      ...entornoClientePg(datos, variables),
      PGDATABASE: base,
    });

    temporal = new Client({ connectionString: urlConBase(url, base) });
    await temporal.connect();
    const conteosRestaurados = await conteosTablas(temporal);
    const hashRestaurado = await hashCadenaAuditoria(temporal);
    const diferencias = diferenciasConteo(opciones.conteosOrigen, conteosRestaurados);
    const hashCoincide = opciones.hashAuditoriaOrigen === hashRestaurado;
    const coinciden = diferencias.length === 0 && hashCoincide;
    const evidencia = {
      coinciden,
      diferencias,
      conteos_origen: opciones.conteosOrigen,
      conteos_restaurados: conteosRestaurados,
      hash_cadena_auditoria_origen: opciones.hashAuditoriaOrigen,
      hash_cadena_auditoria_restaurada: hashRestaurado,
      hash_cadena_coincide: hashCoincide,
      rpo: opciones.continuidad.rpo,
      rto: opciones.continuidad.rto,
      rotulo: opciones.continuidad.rotulo,
      nota: opciones.continuidad.nota,
      base_temporal: base,
    };
    await cliente.query(
      `insert into pruebas_restauracion (respaldo_id, resultado, evidencia)
       values ($1, $2, $3::jsonb)`,
      [opciones.idRespaldo, coinciden ? 'ok' : 'fallo', JSON.stringify(evidencia)],
    );
    return { ...evidencia, base_temporal: base };
  } finally {
    if (plano?.length) plano.fill(0);
    borrarArchivoSensible(volcado);
    rmSync(trabajo, { recursive: true, force: true });
    await temporal?.end().catch(() => undefined);
    if (creada) {
      await admin.query(`drop database if exists ${citarBase(base)} with (force)`).catch(() => undefined);
    }
    await admin.end().catch(() => undefined);
    await cliente.end().catch(() => undefined);
  }
}

/**
 * @param {Record<string, string | undefined>} [variables]
 */
export async function ejecutarPruebaRestauracion(variables = process.env) {
  const hecho = await ejecutarRespaldo({ variables });
  const prueba = await probarRestauracion({
    variables,
    archivo: hecho.archivo,
    idRespaldo: hecho.id,
    conteosOrigen: hecho.conteos,
    hashAuditoriaOrigen: hecho.hashAuditoria,
    continuidad: hecho.continuidad,
  });
  const admin = new Client({ connectionString: urlConBase(leerUrlRespaldo(variables), 'postgres') });
  await admin.connect();
  try {
    const queda = await admin.query(`select 1 from pg_database where datname = $1`, [prueba.base_temporal]);
    return {
      respaldo: hecho,
      prueba,
      base_temporal_eliminada: queda.rowCount === 0,
    };
  } finally {
    await admin.end();
  }
}
