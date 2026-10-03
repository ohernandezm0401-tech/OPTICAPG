// SEG-01 (T08) — Código QR (ISO/IEC 18004) en SVG, sin dependencias.
// Solo modo byte y corrección L, versiones 1 a 10: alcanza para un URI
// otpauth. No enlaza librerías GPL/LGPL.

const TOTAL = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
const ECC_POR_BLOQUE = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
const BLOQUES = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];
const RESTO = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
const ALINEACION: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rs(datos: Uint8Array, eccLen: number): Uint8Array {
  const gen = new Uint8Array(eccLen + 1);
  gen[0] = 1;
  for (let i = 0; i < eccLen; i += 1) {
    for (let j = i; j >= 0; j -= 1) {
      gen[j + 1] ^= mul(gen[j], EXP[i]);
    }
  }
  const resto = new Uint8Array(eccLen);
  for (const byte of datos) {
    const factor = byte ^ resto[0];
    resto.copyWithin(0, 1);
    resto[eccLen - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < eccLen; i += 1) resto[i] ^= mul(gen[i + 1], factor);
    }
  }
  return resto;
}

function bitsDe(valor: number, n: number, salida: number[]) {
  for (let i = n - 1; i >= 0; i -= 1) salida.push((valor >>> i) & 1);
}

function datosByte(texto: string, version: number): number[] | null {
  const bytes = new TextEncoder().encode(texto);
  const bits: number[] = [];
  bitsDe(0b0100, 4, bits);
  bitsDe(bytes.length, version < 10 ? 8 : 16, bits);
  for (const byte of bytes) bitsDe(byte, 8, bits);
  const numBloques = BLOQUES[version];
  const capacidad = TOTAL[version] - ECC_POR_BLOQUE[version] * numBloques;
  const capacidadBits = capacidad * 8;
  const terminator = Math.min(4, capacidadBits - bits.length);
  if (terminator < 0) return null;
  bitsDe(0, terminator, bits);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let b = 0; b < 8; b += 1) v = (v << 1) | bits[i + b];
    codewords.push(v);
  }
  const relleno = [0xec, 0x11];
  let p = 0;
  while (codewords.length < capacidad) {
    codewords.push(relleno[p % 2]);
    p += 1;
  }
  if (codewords.length !== capacidad) return null;
  return codewords;
}

function intercalar(datos: number[], version: number): Uint8Array {
  const eccLen = ECC_POR_BLOQUE[version];
  const numBloques = BLOQUES[version];
  const corto = Math.floor(datos.length / numBloques);
  const largos = datos.length % numBloques;
  const bloques: Uint8Array[] = [];
  const eccs: Uint8Array[] = [];
  let offset = 0;
  for (let i = 0; i < numBloques; i += 1) {
    const largo = corto + (i >= numBloques - largos ? 1 : 0);
    const bloque = Uint8Array.from(datos.slice(offset, offset + largo));
    offset += largo;
    bloques.push(bloque);
    eccs.push(rs(bloque, eccLen));
  }
  const salida: number[] = [];
  const maxDatos = Math.max(...bloques.map((b) => b.length));
  for (let i = 0; i < maxDatos; i += 1) {
    for (const bloque of bloques) if (i < bloque.length) salida.push(bloque[i]);
  }
  for (let i = 0; i < eccLen; i += 1) {
    for (const ecc of eccs) salida.push(ecc[i]);
  }
  for (let i = 0; i < RESTO[version]; i += 1) salida.push(0);
  return Uint8Array.from(salida);
}

function aBits(bytes: Uint8Array, resto: number): number[] {
  const bits: number[] = [];
  const utiles = bytes.length - (resto > 0 ? 1 : 0);
  for (let i = 0; i < utiles; i += 1) bitsDe(bytes[i], 8, bits);
  if (resto > 0) bitsDe(bytes[bytes.length - 1], resto, bits);
  return bits;
}

function formato(mascara: number): number {
  const data = (0b01 << 3) | mascara;
  let rem = data << 10;
  for (let i = 4; i >= 0; i -= 1) {
    if ((rem >>> (i + 10)) & 1) rem ^= 0x537 << i;
  }
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function versionInfo(version: number): number {
  let rem = version << 12;
  for (let i = 5; i >= 0; i -= 1) {
    if ((rem >>> (i + 12)) & 1) rem ^= 0x1f25 << i;
  }
  return (version << 12) | (rem & 0xfff);
}

type Grilla = { oscuro: boolean[][]; reservado: boolean[][] };

function crear(n: number): Grilla {
  return {
    oscuro: Array.from({ length: n }, () => Array(n).fill(false)),
    reservado: Array.from({ length: n }, () => Array(n).fill(false)),
  };
}

function marcar(g: Grilla, x: number, y: number, oscuro: boolean) {
  if (y < 0 || x < 0 || y >= g.oscuro.length || x >= g.oscuro.length) return;
  g.oscuro[y][x] = oscuro;
  g.reservado[y][x] = true;
}

function finder(g: Grilla, x0: number, y0: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const dentro = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const borde = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const centro = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      marcar(g, x0 + dx, y0 + dy, dentro && (borde || centro));
    }
  }
}

function alineacion(g: Grilla, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      marcar(g, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function patrones(g: Grilla, version: number) {
  const n = g.oscuro.length;
  finder(g, 0, 0);
  finder(g, n - 7, 0);
  finder(g, 0, n - 7);
  for (let i = 0; i < n; i += 1) {
    if (!g.reservado[6][i]) marcar(g, i, 6, i % 2 === 0);
    if (!g.reservado[i][6]) marcar(g, 6, i, i % 2 === 0);
  }
  const pos = ALINEACION[version];
  const chocaFinder = (x: number, y: number) =>
    (x < 9 && y < 9) || (x > n - 10 && y < 9) || (x < 9 && y > n - 10);
  for (const y of pos) {
    for (const x of pos) {
      if (chocaFinder(x, y)) continue;
      alineacion(g, x, y);
    }
  }
  marcar(g, 8, 4 * version + 9, true);
  for (let i = 0; i < 9; i += 1) {
    if (!g.reservado[8][i]) marcar(g, i, 8, false);
    if (!g.reservado[i][8]) marcar(g, 8, i, false);
  }
  for (let i = 0; i < 8; i += 1) {
    if (!g.reservado[8][n - 1 - i]) marcar(g, n - 1 - i, 8, false);
    if (!g.reservado[n - 1 - i][8]) marcar(g, 8, n - 1 - i, false);
  }
  if (version >= 7) {
    for (let i = 0; i < 18; i += 1) {
      const x = i % 3;
      const y = Math.floor(i / 3);
      marcar(g, n - 11 + x, y, false);
      marcar(g, y, n - 11 + x, false);
    }
  }
}

function escribirFormato(g: Grilla, mascara: number) {
  const n = g.oscuro.length;
  const bits = formato(mascara);
  // i = 0 es el bit menos significativo. La coordenada 14 cae en (0, 8).
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  // 15 bits: posiciones estándar alrededor de los finders.
  const coordsA: Array<[number, number]> = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const coordsB: Array<[number, number]> = [
    [n - 1, 8],
    [n - 2, 8],
    [n - 3, 8],
    [n - 4, 8],
    [n - 5, 8],
    [n - 6, 8],
    [n - 7, 8],
    [n - 8, 8],
    [8, n - 7],
    [8, n - 6],
    [8, n - 5],
    [8, n - 4],
    [8, n - 3],
    [8, n - 2],
    [8, n - 1],
  ];
  for (let i = 0; i < 15; i += 1) {
    g.oscuro[coordsA[i][1]][coordsA[i][0]] = bit(i);
    g.oscuro[coordsB[i][1]][coordsB[i][0]] = bit(i);
  }
}

function escribirVersion(g: Grilla, version: number) {
  if (version < 7) return;
  const n = g.oscuro.length;
  const bits = versionInfo(version);
  for (let i = 0; i < 18; i += 1) {
    const oscuro = ((bits >>> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = i % 3;
    g.oscuro[a][n - 11 + b] = oscuro;
    g.oscuro[n - 11 + b][a] = oscuro;
  }
}

function colocarDatos(g: Grilla, bits: number[]) {
  const n = g.oscuro.length;
  let i = 0;
  let fila = n - 1;
  let paso = -1;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    while (true) {
      for (let k = 0; k < 2; k += 1) {
        const x = col - k;
        if (!g.reservado[fila][x]) {
          g.oscuro[fila][x] = i < bits.length ? bits[i] === 1 : false;
          i += 1;
        }
      }
      fila += paso;
      if (fila < 0 || fila >= n) {
        fila -= paso;
        paso = -paso;
        break;
      }
    }
  }
}

function aplicarMascara(g: Grilla, mascara: number) {
  const n = g.oscuro.length;
  const regla = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number, c: number) => r % 2 === 0,
    (r: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ][mascara];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!g.reservado[y][x] && regla(y, x)) g.oscuro[y][x] = !g.oscuro[y][x];
    }
  }
}

function penalizacion(g: Grilla): number {
  const n = g.oscuro.length;
  let p = 0;
  const fila = (y: number) => g.oscuro[y];
  for (let y = 0; y < n; y += 1) {
    let run = 1;
    for (let x = 1; x < n; x += 1) {
      if (fila(y)[x] === fila(y)[x - 1]) {
        run += 1;
        if (run === 5) p += 3;
        else if (run > 5) p += 1;
      } else run = 1;
    }
  }
  for (let x = 0; x < n; x += 1) {
    let run = 1;
    for (let y = 1; y < n; y += 1) {
      if (g.oscuro[y][x] === g.oscuro[y - 1][x]) {
        run += 1;
        if (run === 5) p += 3;
        else if (run > 5) p += 1;
      } else run = 1;
    }
  }
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const v = g.oscuro[y][x];
      if (v === g.oscuro[y][x + 1] && v === g.oscuro[y + 1][x] && v === g.oscuro[y + 1][x + 1]) p += 3;
    }
  }
  const oscuros = g.oscuro.flat().filter(Boolean).length;
  const porcentaje = (oscuros * 100) / (n * n);
  p += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;
  return p;
}

function construir(texto: string, version: number, mascara: number): Grilla {
  const datos = datosByte(texto, version);
  if (!datos) throw new Error('el texto no cabe en el QR');
  const bytes = intercalar(datos, version);
  const bits = aBits(bytes, RESTO[version]);
  const n = 21 + (version - 1) * 4;
  const g = crear(n);
  patrones(g, version);
  colocarDatos(g, bits);
  aplicarMascara(g, mascara);
  escribirFormato(g, mascara);
  escribirVersion(g, version);
  return g;
}

export function matrizQr(texto: string): boolean[][] {
  let version = 1;
  while (version <= 10 && datosByte(texto, version) === null) version += 1;
  if (version > 10) throw new Error('el URI TOTP no cabe en el QR');
  let mejor = 0;
  let mejorP = Number.POSITIVE_INFINITY;
  let mejorG = construir(texto, version, 0);
  for (let mascara = 0; mascara < 8; mascara += 1) {
    const g = mascara === 0 ? mejorG : construir(texto, version, mascara);
    const p = penalizacion(g);
    if (p < mejorP) {
      mejorP = p;
      mejor = mascara;
      mejorG = g;
    }
  }
  void mejor;
  return mejorG.oscuro;
}

export function svgQr(texto: string): string {
  const matriz = matrizQr(texto);
  const n = matriz.length;
  const quiet = 4;
  const lado = n + quiet * 2;
  const rects: string[] = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (!matriz[y][x]) continue;
      rects.push(`<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" aria-label="Código QR de verificación">${rects.join('')}</svg>`;
}
