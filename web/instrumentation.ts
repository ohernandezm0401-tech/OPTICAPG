// PLT-10 (T05) — Guarda de arranque por entorno (sin `node:*`).
//
// Next.js ejecuta `register()` al iniciar el servidor (desarrollo y
// producción). Valida `APP_ENV` con Zod y aborta el arranque en producción
// ante el secreto de ejemplo, el modo de demostración, la bandera de datos
// sintéticos o el adaptador simulado. La detección de rastros en disco
// (módulo de desarrollo retirado, semillas locales) vive en `next.config.ts`,
// que corre en Node puro al arrancar (este archivo no admite `node:*`).
export async function register(): Promise<void> {
  const { validarArranque } = await import('./lib/entorno');
  validarArranque(process.env);
}
