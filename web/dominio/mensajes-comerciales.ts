// PLT-11 (T06) — Predicado reutilizable del programador de mensajes
// comerciales. El módulo de envío (SEG-16, F3) todavía no existe: aquí solo
// se rechaza una fecha que cae en domingo o en festivo cargado.
// La ventana horaria (L-V 7:00-19:00, sáb 8:00-15:00) queda para SEG-16.
// TODO(Q-32): sin festivos en código; el conjunto lo llena el CSV humano.
import { diaSemana, parsearFechaIso } from './fechas';

export type DecisionMensajeComercial =
  | { aceptada: true }
  | { aceptada: false; motivo: 'domingo' | 'festivo' };

/**
 * Rechaza el día civil si es domingo o está en los festivos del tenant.
 * El sábado no se rechaza aquí.
 */
export function programarMensajeComercial(
  fecha: string,
  festivos: ReadonlySet<string>,
): DecisionMensajeComercial {
  parsearFechaIso(fecha);
  if (diaSemana(fecha) === 0) {
    return { aceptada: false, motivo: 'domingo' };
  }
  if (festivos.has(fecha)) {
    return { aceptada: false, motivo: 'festivo' };
  }
  return { aceptada: true };
}
