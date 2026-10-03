// SEG-04 (T12) — Consulta del original con sus adendas y verificación del hash.
// La hora de presentación sale de la BD en America/Bogota. El almacenamiento
// sigue en timestamptz (UTC).
import 'server-only';

import { obtenerPool } from '../../db/index';

const TABLA = /^[a-z_][a-z0-9_]{0,62}$/;

export interface FilaConsultaInmutable {
  orden: number;
  tipo: string;
  registro_id: string;
  adenda_de: string | null;
  autor: string | null;
  hora: Date | null;
  hora_bogota: string | null;
  estado_visible: string;
  motivo: string | null;
  contenido: string;
}

export interface ResultadoHash {
  coincide: boolean;
  almacenado: string | null;
  calculado: string | null;
  motivo: string;
}

function nombreTabla(tabla: string): string {
  if (!TABLA.test(tabla)) {
    throw new Error('nombre de tabla inválido');
  }
  return tabla;
}

export async function consultarRegistroConAdendas(
  tabla: string,
  id: string,
): Promise<FilaConsultaInmutable[]> {
  const filas = await obtenerPool().query<FilaConsultaInmutable>(
    `select orden, tipo, registro_id::text, adenda_de::text, autor::text, hora,
            hora_bogota, estado_visible, motivo, contenido
       from consulta_registro_con_adendas($1::regclass, $2::uuid)`,
    [nombreTabla(tabla), id],
  );
  return filas.rows;
}

export async function verificarHashContenido(tabla: string, id: string): Promise<ResultadoHash> {
  const filas = await obtenerPool().query<ResultadoHash>(
    `select coincide, almacenado, calculado, motivo
       from verificar_hash_contenido($1::regclass, $2::uuid)`,
    [nombreTabla(tabla), id],
  );
  const fila = filas.rows[0];
  if (!fila) {
    return { coincide: false, almacenado: null, calculado: null, motivo: 'fila_ausente' };
  }
  return fila;
}
