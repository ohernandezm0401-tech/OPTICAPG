// PLT-10 — Esqueleto de pruebas de entornos y datos sintéticos (T02).
// Los criterios AC-PLT-10-1 a 3 (guardas de arranque, retiro de
// owner123/dev-credentials, seed:demo idempotente) NO se implementan aquí;
// pertenecen a la tarea T05. Este archivo solo reserva el sitio donde vivirán.
// TODO(T05): convertir cada `it.todo` en una prueba real y quitar este aviso.
import { describe, it } from 'vitest';

describe('PLT-10 · entornos y datos sintéticos (implementa T05)', () => {
  it.todo('AC-PLT-10-1: APP_ENV=produccion con AUTH_SECRET por defecto aborta el arranque');

  it.todo('AC-PLT-10-2: sin owner123 ni dev-credentials en la rama principal');

  it.todo('AC-PLT-10-3: seed:demo idempotente y sin documentos reales');
});
