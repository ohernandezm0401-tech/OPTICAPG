// ADM-02 (T17) — Puerto de correo. No hay envío real: el adaptador de
// desarrollo registra el enlace de invitación y no lo entrega a ningún
// servicio externo. No es un plazo ni una tarifa.

export interface MensajeInvitacion {
  destinatario: string;
  enlace: string;
}

export interface CorreoPort {
  enviarInvitacion(mensaje: MensajeInvitacion): Promise<void>;
}

export interface InvitacionRegistrada extends MensajeInvitacion {
  registrado_en: string;
}

const registro: InvitacionRegistrada[] = [];

export function crearCorreoDesarrollo(): CorreoPort {
  return {
    async enviarInvitacion(mensaje) {
      registro.push({ ...mensaje, registrado_en: new Date().toISOString() });
      console.info(
        `[correo-desarrollo] invitación registrada sin envío para ${mensaje.destinatario}: ${mensaje.enlace}`,
      );
    },
  };
}

export function enlacesRegistradosDesarrollo(): readonly InvitacionRegistrada[] {
  return registro;
}

export function limpiarCorreoDesarrollo(): void {
  registro.length = 0;
}

let puerto: CorreoPort = crearCorreoDesarrollo();

export function obtenerCorreoPort(): CorreoPort {
  return puerto;
}

export function fijarCorreoPortParaPruebas(siguiente: CorreoPort | null): void {
  puerto = siguiente ?? crearCorreoDesarrollo();
}
