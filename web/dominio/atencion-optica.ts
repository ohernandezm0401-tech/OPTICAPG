// OPT-01 (T19) — Puertas para iniciar y firmar la atención.
// TODO(Q-25): telemedicina excluida; el campo modalidad nace en presencial.
// TODO(Q-26): el auxiliar solo escribe el borrador; firma el optómetra.
import { puedeAbrirAtencion, type EstadoAutorizacion } from './autorizacion-datos';
import { esMenorDeEdad } from './pacientes';

export function puedeFirmarAtencion(rol: string): boolean {
  return rol === 'optometra';
}

export function puedeEscribirBorrador(rol: string): boolean {
  return rol === 'optometra' || rol === 'auxiliar_clinico';
}

export function puedeIniciarAtencionClinica(entrada: {
  urgencia: boolean;
  estadoTratamiento: EstadoAutorizacion | null;
  fechaNacimiento: string;
  hoy: string;
  tieneRepresentanteVigente: boolean;
}): { permitida: boolean; motivo: string } {
  if (esMenorDeEdad(entrada.fechaNacimiento, entrada.hoy) && !entrada.tieneRepresentanteVigente) {
    return { permitida: false, motivo: 'menor_sin_representante' };
  }
  const puerta = puedeAbrirAtencion({
    urgencia: entrada.urgencia,
    estadoTratamiento: entrada.estadoTratamiento,
  });
  return { permitida: puerta.permitida, motivo: puerta.motivo };
}
