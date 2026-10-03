// SEG-04 (T12) — Máquina de estados (P), ausencia de DELETE (S, AC-SEG-04-4)
// y retiro de la ventana de 24 h en la UI.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  ACCION_BORRADO_BORRADOR,
  estadoVisible,
  filaFirmadaInmutable,
  transicionAlmacenada,
} from '../../lib/inmutabilidad/estados';
import {
  METODOS_REGISTRO_FIRMADO,
  RECURSOS_SIN_DELETE,
  atenderRegistroFirmado,
} from '../../lib/inmutabilidad/rutas';

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function archivos(directorio: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(directorio)) {
    const ruta = path.join(directorio, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else salida.push(ruta);
  }
  return salida;
}

function secuencia(semilla: number): string[] {
  let estado = semilla >>> 0;
  const ops = ['editar', 'firmar', 'update', 'delete', 'adenda', 'truncar', 'adendado'];
  const pasos: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    pasos.push(ops[estado % ops.length]);
  }
  return pasos;
}

describe('AC-SEG-04 máquina: borrador → firmado → (adendado)', () => {
  it('P: solo el borrador cambia; ninguna secuencia altera el contenido firmado', () => {
    for (let semilla = 1; semilla <= 50; semilla += 1) {
      let contenido = 'sintetico';
      let estado = 'borrador';
      let adendas = 0;
      let congelado: string | null = null;
      for (const op of secuencia(semilla)) {
        if (filaFirmadaInmutable(estado)) {
          if (op === 'adenda') adendas += 1;
          expect(contenido).toBe(congelado);
          expect(transicionAlmacenada(estado, 'borrador')).toBe(false);
          expect(transicionAlmacenada(estado, 'adendado')).toBe(false);
          continue;
        }
        if (op === 'editar') contenido += 'x';
        if (op === 'firmar' && transicionAlmacenada(estado, 'firmado')) {
          estado = 'firmado';
          congelado = contenido;
        }
      }
      if (congelado !== null) {
        expect(contenido).toBe(congelado);
        expect(estadoVisible('firmado', adendas)).toBe(adendas > 0 ? 'adendado' : 'firmado');
      }
    }
  });

  it('U: el borrador pasa a firmado o firmada y el firmado no vuelve atrás', () => {
    expect(transicionAlmacenada('borrador', 'borrador')).toBe(true);
    expect(transicionAlmacenada('borrador', 'firmado')).toBe(true);
    expect(transicionAlmacenada('borrador', 'firmada')).toBe(true);
    expect(transicionAlmacenada('borrador', 'adendado')).toBe(false);
    expect(transicionAlmacenada('firmado', 'borrador')).toBe(false);
    expect(transicionAlmacenada('firmada', 'firmada')).toBe(false);
    expect(estadoVisible('borrador', 3)).toBe('borrador');
    expect(estadoVisible('firmada', 2)).toBe('firmada');
    expect(ACCION_BORRADO_BORRADOR).toBe('anular');
  });
});

describe('AC-SEG-04-4: no hay DELETE de registros firmados', () => {
  it('S: el adaptador rechaza DELETE y el registro de métodos no lo incluye', () => {
    expect((METODOS_REGISTRO_FIRMADO as readonly string[]).includes('DELETE')).toBe(false);
    expect(atenderRegistroFirmado('DELETE').status).toBe(405);
    expect(atenderRegistroFirmado('delete').cuerpo.error).toMatch(/No existe borrado/);
    expect(atenderRegistroFirmado('GET').status).toBe(200);
    expect(atenderRegistroFirmado('POST').status).toBe(200);
    expect(atenderRegistroFirmado('PATCH').status).toBe(405);
  });

  it('S: ninguna ruta de la app exporta DELETE sobre un recurso firmado', () => {
    const rutas = archivos(path.join(RAIZ_WEB, 'app', 'api')).filter((ruta) => ruta.endsWith('route.ts'));
    for (const ruta of rutas) {
      const texto = readFileSync(ruta, 'utf8');
      const exportaDelete = /export\s+(async\s+)?function\s+DELETE|export\s+const\s+DELETE/.test(texto);
      const relativa = ruta.replaceAll('\\', '/');
      const esFirmado = RECURSOS_SIN_DELETE.some((recurso) => relativa.includes(`/${recurso}`));
      expect(exportaDelete && esFirmado, relativa).toBe(false);
    }
  });
});

describe('ventana de 24 h retirada de la UI', () => {
  it('S: la app no promete una ventana de edición de 24 h', () => {
    const textos = archivos(path.join(RAIZ_WEB, 'app'))
      .concat(archivos(path.join(RAIZ_WEB, 'components')))
      .filter((ruta) => ruta.endsWith('.tsx') || ruta.endsWith('.ts'));
    const prohibido = /24h|24 horas|< 24h/i;
    const hallados = textos.filter((ruta) => prohibido.test(readFileSync(ruta, 'utf8')));
    expect(hallados).toEqual([]);
  });
});
