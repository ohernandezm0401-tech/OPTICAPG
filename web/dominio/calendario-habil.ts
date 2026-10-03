// PLT-11 (T06) — Días hábiles para plazos (Habeas Data, aviso a la SIC).
// Un día hábil no es sábado, domingo ni festivo cargado para el tenant.
// El sábado sí puede ser día de mensaje comercial (Ley 2300); eso lo decide
// `programarMensajeComercial`, no esta función.
// TODO(Q-32): los festivos no se inventan aquí; llegan en el conjunto que
// arma la carga del CSV humano.
import { desplazarDias, diaSemana, parsearFechaIso } from './fechas';

const TOPE_AVANCE = 20000;

export function esDiaHabil(fecha: string, festivos: ReadonlySet<string>): boolean {
  parsearFechaIso(fecha);
  const semana = diaSemana(fecha);
  if (semana === 0 || semana === 6) return false;
  return !festivos.has(fecha);
}

/**
 * Suma `n` días hábiles a `fecha`. El día de partida no cuenta: el conteo
 * empieza el día civil siguiente y omite sábados, domingos y festivos del
 * tenant. `n = 0` devuelve la misma fecha.
 */
export function sumarDiasHabiles(fecha: string, n: number, festivos: ReadonlySet<string>): string {
  parsearFechaIso(fecha);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('n debe ser un entero mayor o igual a cero');
  }
  if (n === 0) return fecha;
  if (n > TOPE_AVANCE) {
    throw new Error('n supera el tope operativo del calendario hábil');
  }

  let cursor = fecha;
  let restantes = n;
  let pasos = 0;
  while (restantes > 0) {
    cursor = desplazarDias(cursor, 1);
    if (esDiaHabil(cursor, festivos)) restantes -= 1;
    pasos += 1;
    if (pasos > n * 7 + 400) {
      throw new Error('no se pudo avanzar el calendario hábil');
    }
  }
  return cursor;
}
