// PLT-09 — Configuración de Playwright para las pruebas E2E (T02).
// Corre contra la app construida (`npm run build` y luego `npm run test:e2e`;
// en CI lo hace el workflow después del paso de build). Si ya hay un servidor
// en el puerto, se reutiliza fuera de CI.
import { defineConfig, devices } from '@playwright/test';

const PUERTO_E2E = Number(process.env.PUERTO_E2E ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PUERTO_E2E}`;

// Secreto solo para firmar la cookie de sesión del servidor E2E local.
// NO es un secreto real: las sesiones de este servidor desechable no protegen
// ningún dato (solo pruebas con datos sintéticos). En CI se genera uno
// efímero (`openssl rand -base64 32`); en producción T05 exige uno generado
// (AC-PLT-10-1) y este valor nunca debe usarse allí.
const SECRETO_SOLO_E2E_LOCAL = 'secreto-solo-e2e-local-sin-valor-real';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run start -- --port ${PUERTO_E2E}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ?? SECRETO_SOLO_E2E_LOCAL,
    },
  },
});
