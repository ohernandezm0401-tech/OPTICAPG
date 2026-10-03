// PLT-11 (T06) — Carga de festivos desde un CSV que aporta un humano.
// TODO(Q-32): valor por defecto aplicado — el agente no incluye festivos
// inventados ni consulta una fuente oficial no verificada. Este módulo solo
// interpreta filas; no tiene calendario embebido.
import { parsearFechaIso } from './fechas';

export type FestivoCsv = {
  anio: number;
  fecha: string;
  nombre: string;
  fuente: string;
};

const ENCABEZADO = ['anio', 'fecha', 'nombre', 'fuente'] as const;

function partirLinea(linea: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (entreComillas) {
      if (caracter === '"') {
        if (linea[i + 1] === '"') {
          actual += '"';
          i += 1;
        } else {
          entreComillas = false;
        }
      } else {
        actual += caracter;
      }
      continue;
    }
    if (caracter === '"') {
      entreComillas = true;
      continue;
    }
    if (caracter === ',') {
      campos.push(actual.trim());
      actual = '';
      continue;
    }
    actual += caracter;
  }
  if (entreComillas) {
    throw new Error('el CSV tiene comillas sin cerrar');
  }
  campos.push(actual.trim());
  return campos;
}

/**
 * Interpreta el CSV de festivos. Encabezado obligatorio
 * `anio,fecha,nombre,fuente`. Cero filas de datos es válido (aún no hay
 * calendario). No agrega filas que no estén en el texto.
 */
export function parsearCsvFestivos(texto: string): FestivoCsv[] {
  const limpio = texto.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lineas = limpio
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
  if (lineas.length === 0) {
    throw new Error('el CSV no tiene encabezado anio,fecha,nombre,fuente');
  }

  const encabezado = partirLinea(lineas[0]!.toLowerCase());
  if (encabezado.length !== ENCABEZADO.length || encabezado.some((campo, i) => campo !== ENCABEZADO[i])) {
    throw new Error('el encabezado del CSV debe ser anio,fecha,nombre,fuente');
  }

  const vistos = new Set<string>();
  const festivos: FestivoCsv[] = [];
  for (let indice = 1; indice < lineas.length; indice += 1) {
    const campos = partirLinea(lineas[indice]!);
    if (campos.length !== ENCABEZADO.length) {
      throw new Error(`la fila ${indice + 1} no tiene las 4 columnas exigidas`);
    }
    const [anioTexto, fecha, nombre, fuente] = campos as [string, string, string, string];
    if (!/^\d{4}$/.test(anioTexto)) {
      throw new Error(`la fila ${indice + 1} tiene un año inválido`);
    }
    const anio = Number(anioTexto);
    const partes = parsearFechaIso(fecha);
    if (partes.anio !== anio) {
      throw new Error(`la fila ${indice + 1} tiene un año que no coincide con la fecha`);
    }
    if (nombre.length === 0 || nombre.length > 200) {
      throw new Error(`la fila ${indice + 1} necesita un nombre de festivo`);
    }
    if (fuente.length === 0 || fuente.length > 300) {
      throw new Error(`la fila ${indice + 1} necesita la fuente que aportó el humano`);
    }
    if (vistos.has(fecha)) {
      throw new Error(`la fecha ${fecha} está repetida en el CSV`);
    }
    vistos.add(fecha);
    festivos.push({ anio, fecha, nombre, fuente });
  }
  return festivos;
}
