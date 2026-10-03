// PLT-09 — Configuración de Vitest para las pruebas de integración (T02).
// Exigen un PostgreSQL real (sin mocks de BD) disponible en
// `DATABASE_URL_TEST`: local con `docker compose -f ../docker-compose.test.yml
// up -d`; en CI lo provee el servicio `postgres` del workflow.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/int/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
  },
});
