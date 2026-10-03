// OPT-10 (T18) — Formato del CSV local, búsqueda y advertencia de abreviaturas.
// TODO(Q-23): la licencia de CIE-10 y CUPS no está verificada. Este módulo no
// trae descripciones oficiales: solo interpreta el archivo que el cliente
// descarga y carga con `npm run catalogos:cargar`.
// Valor por defecto de Q-23: no se redistribuyen los catálogos en el repo.

export const ENCABEZADO_CATALOGO = ['tipo', 'codigo', 'descripcion', 'version', 'vigente_desde'];

export const LIMITE_BUSQUEDA = 20;

/** Abreviaturas ópticas iniciales, editables por tenant. No son un catálogo oficial. */
export const ABREVIATURAS_INICIALES = [
  { abreviatura: 'AV', expansion: 'agudeza visual' },
  { abreviatura: 'OD', expansion: 'ojo derecho' },
  { abreviatura: 'OI', expansion: 'ojo izquierdo' },
  { abreviatura: 'DIP', expansion: 'distancia interpupilar' },
  { abreviatura: 'ADD', expansion: 'adición' },
];

const CODIGO = /^[A-Z0-9][A-Z0-9.\-]{0,31}$/;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ErrorCatalogo extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'ErrorCatalogo';
  }
}

/**
 * @param {string} linea
 */
function partirLinea(linea) {
  const campos = [];
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
    throw new ErrorCatalogo('el CSV tiene comillas sin cerrar');
  }
  campos.push(actual.trim());
  return campos;
}

/**
 * @param {string} valor
 */
function normalizarTipo(valor) {
  const tipo = valor.trim().toLowerCase().replace(/_/g, '-');
  if (tipo === 'cie10' || tipo === 'cie-10') return 'cie10';
  if (tipo === 'cups') return 'cups';
  throw new ErrorCatalogo(`tipo no admitido: ${valor || '(vacío)'}. Use cie10 o cups`);
}

/**
 * @param {string} valor
 * @param {number} fila
 */
function validarFecha(valor, fila) {
  const coincidencia = FECHA.exec(valor);
  if (!coincidencia) {
    throw new ErrorCatalogo(`la fila ${fila} tiene vigente_desde inválido (use AAAA-MM-DD)`);
  }
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    throw new ErrorCatalogo(`la fila ${fila} tiene una fecha de vigencia que no existe`);
  }
  return valor;
}

/**
 * Interpreta el CSV de carga local.
 * Encabezado obligatorio: tipo,codigo,descripcion,version,vigente_desde.
 * Las líneas que empiezan por # se ignoran (marcas de archivo sintético).
 * @param {string} texto
 */
export function parsearCsvCatalogo(texto) {
  const limpio = String(texto ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lineas = limpio
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0 && !linea.startsWith('#'));
  if (lineas.length === 0) {
    throw new ErrorCatalogo(
      `el CSV no tiene encabezado ${ENCABEZADO_CATALOGO.join(',')}`,
    );
  }
  const encabezado = partirLinea(lineas[0].toLowerCase());
  if (
    encabezado.length !== ENCABEZADO_CATALOGO.length ||
    encabezado.some((campo, indice) => campo !== ENCABEZADO_CATALOGO[indice])
  ) {
    throw new ErrorCatalogo(
      `el encabezado del CSV debe ser ${ENCABEZADO_CATALOGO.join(',')}`,
    );
  }
  if (lineas.length < 2) {
    throw new ErrorCatalogo('el CSV no tiene filas de catálogo');
  }

  const vistos = new Set();
  /** @type {{ tipo: 'cie10' | 'cups', codigo: string, descripcion: string, version: string, vigente_desde: string }[]} */
  const filas = [];
  for (let indice = 1; indice < lineas.length; indice += 1) {
    const numero = indice + 1;
    const campos = partirLinea(lineas[indice]);
    if (campos.length !== ENCABEZADO_CATALOGO.length) {
      throw new ErrorCatalogo(`la fila ${numero} no tiene las 5 columnas exigidas`);
    }
    const tipo = normalizarTipo(campos[0]);
    const codigo = campos[1].toUpperCase();
    const descripcion = campos[2];
    const version = campos[3];
    const vigenteDesde = validarFecha(campos[4], numero);
    if (!CODIGO.test(codigo)) {
      throw new ErrorCatalogo(`la fila ${numero} tiene un código con formato no admitido`);
    }
    if (!descripcion || descripcion.length > 500) {
      throw new ErrorCatalogo(`la fila ${numero} debe tener una descripción de 1 a 500 caracteres`);
    }
    if (!version || version.length > 40) {
      throw new ErrorCatalogo(`la fila ${numero} debe tener una versión de 1 a 40 caracteres`);
    }
    const clave = `${tipo}|${codigo}|${version}`;
    if (vistos.has(clave)) {
      throw new ErrorCatalogo(`la fila ${numero} repite ${tipo} ${codigo} versión ${version}`);
    }
    vistos.add(clave);
    filas.push({
      tipo,
      codigo,
      descripcion,
      version,
      vigente_desde: vigenteDesde,
    });
  }
  return filas;
}

/**
 * @param {string} consulta
 */
function normalizarConsulta(consulta) {
  return String(consulta ?? '').trim().toLocaleLowerCase('es-CO');
}

/**
 * Búsqueda en memoria por código o descripción. El código exacto va primero.
 * @param {{ tipo: string, codigo: string, descripcion: string }[]} filas
 * @param {string} consulta
 * @param {'cie10' | 'cups' | null | undefined} tipo
 */
export function buscarEnCatalogo(filas, consulta, tipo) {
  const q = normalizarConsulta(consulta);
  if (!q) return [];
  /** @type {{ peso: number, fila: (typeof filas)[number] }[]} */
  const puntuados = [];
  for (const fila of filas) {
    if (tipo && fila.tipo !== tipo) continue;
    const codigo = fila.codigo.toLocaleLowerCase('es-CO');
    const descripcion = fila.descripcion.toLocaleLowerCase('es-CO');
    let peso = null;
    if (codigo === q) peso = 0;
    else if (codigo.startsWith(q)) peso = 1;
    else if (codigo.includes(q) || descripcion.includes(q)) peso = 2;
    if (peso !== null) puntuados.push({ peso, fila });
  }
  puntuados.sort(
    (a, b) => a.peso - b.peso || a.fila.codigo.localeCompare(b.fila.codigo, 'es'),
  );
  return puntuados.slice(0, LIMITE_BUSQUEDA).map((item) => item.fila);
}

const ABREVIATURA = /^[A-ZÁÉÍÓÚÜÑ]{2,6}$/;

/**
 * @param {string} valor
 */
export function normalizarAbreviatura(valor) {
  const abreviatura = String(valor ?? '')
    .trim()
    .toLocaleUpperCase('es-CO');
  if (!ABREVIATURA.test(abreviatura)) {
    throw new ErrorCatalogo('la abreviatura debe tener de 2 a 6 letras mayúsculas');
  }
  return abreviatura;
}

/**
 * @param {string} valor
 */
export function normalizarExpansion(valor) {
  const expansion = String(valor ?? '').trim();
  if (!expansion || expansion.length > 120) {
    throw new ErrorCatalogo('la expansión debe tener de 1 a 120 caracteres');
  }
  return expansion;
}

const TOKEN_ABREVIATURA =
  /(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])([A-ZÁÉÍÓÚÜÑ]{2,6})(?=$|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g;

/**
 * Advierte abreviaturas en mayúsculas que no están en el glosario.
 * No bloquea: `bloquea` es siempre false y el texto se devuelve igual.
 * @param {string} texto
 * @param {{ abreviatura: string }[] | string[]} glosario
 */
export function revisarAbreviaturas(texto, glosario) {
  const fuente = String(texto ?? '');
  const permitidas = new Set(
    (glosario ?? []).map((item) => {
      const valor = typeof item === 'string' ? item : item.abreviatura;
      return String(valor ?? '')
        .trim()
        .toLocaleUpperCase('es-CO');
    }),
  );
  const vistas = new Set();
  /** @type {{ abreviatura: string, mensaje: string }[]} */
  const advertencias = [];
  TOKEN_ABREVIATURA.lastIndex = 0;
  let coincidencia = TOKEN_ABREVIATURA.exec(fuente);
  while (coincidencia) {
    const abreviatura = coincidencia[2];
    if (!vistas.has(abreviatura)) {
      vistas.add(abreviatura);
      if (!permitidas.has(abreviatura)) {
        advertencias.push({
          abreviatura,
          mensaje: `La abreviatura «${abreviatura}» no está en el glosario. Es una advertencia: el texto se conserva.`,
        });
      }
    }
    coincidencia = TOKEN_ABREVIATURA.exec(fuente);
  }
  return { texto: fuente, bloquea: false, advertencias };
}
