// SEG-03 (T10) — Cadena SHA-256 por tenant. Solo `node:crypto` (biblioteca
// estándar de Node.js; sin dependencia npm). El verificador y el servicio
// comparten este archivo para que el payload canónico no diverja.
import { createHash } from 'node:crypto';

const SEPARADOR = '\u001f';

/** @param {unknown} valor */
function texto(valor) {
  if (valor == null) return '';
  return String(valor);
}

/** @param {unknown} valor */
export function tsCanonico(valor) {
  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) {
    throw new Error('la marca de tiempo de auditoría no es válida');
  }
  return fecha.toISOString();
}

/** @param {Record<string, unknown>} evento */
export function payloadCanonico(evento) {
  return [
    texto(evento.tenant_id),
    tsCanonico(evento.ts),
    texto(evento.actor_id),
    texto(evento.rol),
    texto(evento.sede_id),
    texto(evento.recurso),
    texto(evento.recurso_id),
    texto(evento.accion),
    texto(evento.resultado),
    texto(evento.ip),
    texto(evento.agente),
    texto(evento.request_id),
  ].join(SEPARADOR);
}

/** @param {Buffer | Uint8Array | null | undefined} previo @param {Record<string, unknown>} evento */
export function calcularHash(previo, evento) {
  const hash = createHash('sha256');
  hash.update(previo && previo.length ? Buffer.from(previo) : Buffer.alloc(0));
  hash.update(payloadCanonico(evento), 'utf8');
  return hash.digest();
}

/** @param {Buffer | Uint8Array | null | undefined} a @param {Buffer | Uint8Array | null | undefined} b */
function iguales(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const izq = Buffer.from(a);
  const der = Buffer.from(b);
  return izq.length === der.length && izq.equals(der);
}

/**
 * @param {Array<{ id: unknown, hash_previo: Buffer | null, hash: Buffer, evento: Record<string, unknown> }>} filas
 * Ordenadas por id ascendente, de un solo tenant.
 */
export function verificarCadena(filas) {
  /** @type {Buffer | null} */
  let previo = null;
  for (let indice = 0; indice < filas.length; indice += 1) {
    const fila = filas[indice];
    const hashPrevio = fila.hash_previo && fila.hash_previo.length ? Buffer.from(fila.hash_previo) : null;
    if (!iguales(hashPrevio, previo)) {
      return { ok: false, posicion: indice + 1, id: String(fila.id), motivo: 'hash_previo' };
    }
    const calculado = calcularHash(previo, fila.evento);
    if (!iguales(calculado, fila.hash)) {
      return { ok: false, posicion: indice + 1, id: String(fila.id), motivo: 'hash' };
    }
    previo = calculado;
  }
  return { ok: true, eventos: filas.length };
}

/** @param {Record<string, unknown>} fila */
export function eventoDesdeFila(fila) {
  return {
    tenant_id: fila.tenant_id,
    ts: fila.ts,
    actor_id: fila.actor_id,
    rol: fila.rol,
    sede_id: fila.sede_id,
    recurso: fila.recurso,
    recurso_id: fila.recurso_id,
    accion: fila.accion,
    resultado: fila.resultado,
    ip: fila.ip,
    agente: fila.agente,
    request_id: fila.request_id,
  };
}

/** @param {unknown} valor */
function celdaCsv(valor) {
  const textoCelda = valor == null ? '' : String(valor);
  if (/[",\n\r]/.test(textoCelda) || /^[=+\-@]/.test(textoCelda)) {
    return `"${textoCelda.replace(/"/g, '""')}"`;
  }
  return textoCelda;
}

/** @param {Buffer | Uint8Array | null | undefined} valor */
export function aHex(valor) {
  if (valor == null || valor.length === 0) return '';
  return Buffer.from(valor).toString('hex');
}

/** @param {Array<Record<string, unknown>>} filas */
export function aCsv(filas) {
  const encabezado = [
    'id',
    'ts_utc',
    'actor_id',
    'rol',
    'sede_id',
    'recurso',
    'recurso_id',
    'accion',
    'resultado',
    'ip',
    'agente',
    'request_id',
    'hash_previo',
    'hash',
  ];
  const lineas = [encabezado.join(',')];
  for (const fila of filas) {
    const ts = fila.ts == null ? '' : tsCanonico(fila.ts);
    lineas.push(
      [
        fila.id,
        ts,
        fila.actor_id,
        fila.rol,
        fila.sede_id,
        fila.recurso,
        fila.recurso_id,
        fila.accion,
        fila.resultado,
        fila.ip,
        fila.agente,
        fila.request_id,
        aHex(/** @type {Buffer | null} */ (fila.hash_previo)),
        aHex(/** @type {Buffer | null} */ (fila.hash)),
      ]
        .map(celdaCsv)
        .join(','),
    );
  }
  return `${lineas.join('\n')}\n`;
}
