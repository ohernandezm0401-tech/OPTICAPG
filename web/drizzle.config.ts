// PLT-02 (T03) — Configuración de Drizzle Kit para las migraciones versionadas.
// El esquema núcleo vive en `db/esquema/nucleo.ts`; `npm run db:generate`
// produce el SQL en `db/migrations` y `npm run db:migrate` lo aplica con
// `DATABASE_URL` (producción/desarrollo) o `DATABASE_URL_TEST` (pruebas).
// TODO(Q-06): hosting y residencia por defecto: PostgreSQL estándar + Drizzle
// (sin SDK propietario), destino en Colombia o país adecuado.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/esquema/nucleo.ts',
  out: './db/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      process.env.DATABASE_URL_TEST ??
      'postgresql://postgres:postgres@localhost:5433/optisaas_pruebas',
  },
});
