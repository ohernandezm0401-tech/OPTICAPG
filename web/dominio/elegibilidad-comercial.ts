// SEG-06 (T13) — Regla reutilizable para el motor de mensajería.
// SEG-16 todavía no existe: esta función es el punto que ese motor debe
// llamar. Rechaza un mensaje comercial cuyo destinatario es el menor.
// La autorización de contacto la decide `puedeContactarComercialmente` (SEG-05).
// SEG-16 debe llamarla antes de enviar. Esta función solo rechaza al menor.
import { esMenorDeEdad } from './pacientes';

export type DecisionElegibilidadComercial =
  | { aceptada: true }
  | { aceptada: false; motivo: 'menor_de_edad' };

export function evaluarElegibilidadMensajeComercial(entrada: {
  fechaNacimiento: string;
  hoy: string;
  destinatario: 'paciente' | 'representante';
}): DecisionElegibilidadComercial {
  if (entrada.destinatario === 'paciente' && esMenorDeEdad(entrada.fechaNacimiento, entrada.hoy)) {
    return { aceptada: false, motivo: 'menor_de_edad' };
  }
  return { aceptada: true };
}
