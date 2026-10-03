// PLT-09 — Configuración de Vitest para las pruebas de integración (T02).
// Exigen un PostgreSQL real (sin mocks de BD) disponible en
// `DATABASE_URL_TEST`: local con `docker compose -f ../docker-compose.test.yml
// up -d`; en CI lo provee el servicio `postgres` del workflow.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // PLT-02 (T03): `db/` importa `server-only`, que solo se resuelve bajo el
    // empaquetador de Next.js. En Vitest se sustituye por un módulo vacío
    // (`tests/int/modulo-vacio.ts`); la garantía la aplica `npm run build`.
    alias: {
      'server-only': fileURLToPath(new URL('./tests/int/modulo-vacio.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/int/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
    // PLT-10 (T05): un solo proceso. Cada archivo migra en su `beforeAll` y
    // Drizzle no serializa migraciones concurrentes contra una base fresca
    // (carrera `pg_type_typname_nsp_index`); en serie son idempotentes.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
