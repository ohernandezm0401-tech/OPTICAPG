// PLT-02 (T03) — Sustituto vacío de `server-only` solo para Vitest.
// `server-only` lanza si se resuelve fuera del empaquetador de Next.js; en
// las pruebas de integración se aliasa a este módulo para ensayar el código
// real de `db/` contra PostgreSQL. La garantía (fallar si se importa desde el
// navegador) la sigue aplicando `npm run build`.
export {};
