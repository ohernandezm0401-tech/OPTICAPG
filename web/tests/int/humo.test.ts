// PLT-09 — Prueba de integración de humo (T02): PostgreSQL real, sin mocks
// de BD. Exige `DATABASE_URL_TEST` (ver `web/.env.example` y
// `docker-compose.test.yml`); si falta, falla con la instrucción para
// levantar la base en lugar de pasar en silencio.
import { describe, expect, it } from 'vitest';
import { Client } from 'pg';

function leerUrlPruebas(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL_TEST. Local: `docker compose -f ../docker-compose.test.yml up -d` y ' +
        'exporta DATABASE_URL_TEST (ver web/.env.example). En CI la define el servicio postgres.',
    );
  }
  return url;
}

describe('humo de integración: PostgreSQL real responde', () => {
  it('select 1 devuelve una fila', async () => {
    const cliente = new Client({ connectionString: leerUrlPruebas() });
    try {
      await cliente.connect();
      const resultado = await cliente.query('select 1 as uno');
      expect(resultado.rows).toEqual([{ uno: 1 }]);
    } finally {
      await cliente.end();
    }
  });
});
