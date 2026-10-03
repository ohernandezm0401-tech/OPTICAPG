// SEG-06 (T13) — Regla reutilizable para el motor de mensajería.
// SEG-16 todavía no existe: esta función es el punto que ese motor debe
// llamar. Rechaza un mensaje comercial cuyo destinatario es el menor.
// El envío al representante y su autorización de contacto quedan para SEG-05/SEG-16.
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
