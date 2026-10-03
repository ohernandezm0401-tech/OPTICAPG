// SEG-01 (T08) — Protección del secreto TOTP.
// TODO(T11): el cifrado envelope por tenant (SEG-12) aún no existe. Esta
// interfaz es el único sitio que persiste o lee el secreto. Hoy la
// implementación es la identidad: la columna guarda el secreto en claro.
// Riesgo: quien pueda leer `factores_totp.secreto_protegido` (dueño de la
// base o un respaldo sin cifrar) obtiene el secreto TOTP. No se registra
// en eventos ni en respuestas de error.

export interface ProteccionSecretoMfa {
  proteger(secreto: string): string;
  revelar(protegido: string): string;
}

export const proteccionIdentidad: ProteccionSecretoMfa = {
  proteger(secreto) {
    return secreto;
  },
  revelar(protegido) {
    return protegido;
  },
};
