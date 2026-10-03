// PLT-11 (T06) — Pruebas de propiedades (P). Generador determinista (LCG);
// no afirma festivos oficiales ni una tarifa legal.
import { describe, expect, it } from 'vitest';

import { esDiaHabil, sumarDiasHabiles } from '../../dominio/calendario-habil';
import { desplazarDias, diaSemana } from '../../dominio/fechas';
import { capturarInstantaneaImpuesto, impuestoLineaCerradaCop } from '../../dominio/impuestos';
import { programarMensajeComercial } from '../../dominio/mensajes-comerciales';

function lcg(semilla: number) {
  let estado = semilla >>> 0;
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0;
    return estado;
  };
}

function fechaDesdeDesplazamiento(dias: number): string {
  return desplazarDias('2020-01-01', dias);
}

function contarHabilesHasta(inicio: string, fin: string, festivos: ReadonlySet<string>): number {
  let total = 0;
  let cursor = inicio;
  while (cursor < fin) {
    cursor = desplazarDias(cursor, 1);
    if (esDiaHabil(cursor, festivos)) total += 1;
  }
  return total;
}

describe('P: sumarDiasHabiles', () => {
  it('el resultado es hábil y el conteo exclusivo-inicio coincide con n', () => {
    const aleatorio = lcg(20261003);
    for (let caso = 0; caso < 80; caso += 1) {
      const inicio = fechaDesdeDesplazamiento(aleatorio() % 4000);
      const n = (aleatorio() % 40) + 1;
      const festivos = new Set<string>();
      const cuantos = aleatorio() % 8;
      for (let i = 0; i < cuantos; i += 1) {
        const absoluto = desplazarDias(inicio, (aleatorio() % 30) + 1);
        if (diaSemana(absoluto) !== 0 && diaSemana(absoluto) !== 6) festivos.add(absoluto);
      }
      const resultado = sumarDiasHabiles(inicio, n, festivos);
      expect(resultado > inicio, `${inicio} + ${n}`).toBe(true);
      expect(esDiaHabil(resultado, festivos), resultado).toBe(true);
      expect(contarHabilesHasta(inicio, resultado, festivos)).toBe(n);
      expect(sumarDiasHabiles(inicio, 0, festivos)).toBe(inicio);
    }
  });
});

describe('P: programarMensajeComercial', () => {
  it('todo domingo o fecha del conjunto se rechaza; un hábil fuera del conjunto se acepta', () => {
    const aleatorio = lcg(32);
    for (let caso = 0; caso < 60; caso += 1) {
      const fecha = fechaDesdeDesplazamiento(aleatorio() % 5000);
      const festivos = new Set<string>([fechaDesdeDesplazamiento((aleatorio() % 5000) + 1)]);
      if (diaSemana(fecha) === 0) {
        expect(programarMensajeComercial(fecha, festivos).aceptada).toBe(false);
      } else if (festivos.has(fecha)) {
        expect(programarMensajeComercial(fecha, festivos)).toEqual({ aceptada: false, motivo: 'festivo' });
      }
      const otra = fechaDesdeDesplazamiento((aleatorio() % 5000) + 10);
      if (diaSemana(otra) !== 0 && !festivos.has(otra)) {
        expect(programarMensajeComercial(otra, festivos)).toEqual({ aceptada: true });
      }
    }
  });
});

describe('P: snapshot de impuesto', () => {
  it('cambiar la tarifa después de capturar no altera el COP de la línea cerrada', () => {
    const aleatorio = lcg(31);
    for (let caso = 0; caso < 50; caso += 1) {
      const base = aleatorio() % 5_000_000;
      const puntos = aleatorio() % 10001;
      const puntosNuevos = aleatorio() % 10001;
      const tarifa = {
        id: '33333333-3333-4333-8333-333333333333',
        nombre: 'categoría sintética',
        porcentaje_bp: puntos,
        excluido: aleatorio() % 5 === 0,
        exento: aleatorio() % 7 === 0,
        vigente_desde: new Date('2026-03-01T00:00:00.000Z'),
      };
      const instantanea = capturarInstantaneaImpuesto(tarifa);
      const cerrado = impuestoLineaCerradaCop(base, instantanea);
      const esperado =
        tarifa.excluido || tarifa.exento ? 0 : Math.round((base * puntos) / 10000);
      expect(cerrado).toBe(esperado);
      const cambiada = capturarInstantaneaImpuesto({
        ...tarifa,
        porcentaje_bp: puntosNuevos,
        id: '44444444-4444-4444-8444-444444444444',
      });
      expect(impuestoLineaCerradaCop(base, instantanea)).toBe(cerrado);
      expect(instantanea.porcentaje_bp).toBe(puntos);
      if (puntos !== puntosNuevos) expect(cambiada.porcentaje_bp).not.toBe(instantanea.porcentaje_bp);
    }
  });
});
