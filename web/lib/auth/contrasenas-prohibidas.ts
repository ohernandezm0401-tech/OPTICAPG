// SEG-01 (T07) — Lista local de contraseñas comunes (regla 2 de SEG-01).
// Son entradas públicas de denegación, no secretos de ninguna cuenta.
// La comparación es en minúsculas, después de recortar espacios.

export const CONTRASENAS_PROHIBIDAS: readonly string[] = [
  'password1234',
  'contrasena123',
  '123456789012',
  'qwertyuiopas',
  'admin1234567',
  'optisaas12345',
  'colombia1234',
  'changeme1234',
  'letmein12345',
  'bienvenido12',
  'clave1234567',
  'usuario12345',
  'password12345',
  'administrador',
];

const conjunto = new Set(CONTRASENAS_PROHIBIDAS);

export function contrasenaProhibida(contrasena: string): boolean {
  return conjunto.has(contrasena.trim().toLowerCase());
}
