// PLT-09 — Configuración de Vitest para las pruebas unitarias (T02).
// Alcance: lógica pura (sin BD ni navegador). Las pruebas de integración
// viven en `vitest.int.config.ts` y las E2E en `playwright.config.ts`.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
