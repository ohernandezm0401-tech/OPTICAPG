// ASE-01 (T13) — Contexto de la recepción cuando la sesión de demostración
// todavía usa los identificadores de la capa demo (no UUID). Apunta al
// tenant sintético de la semilla. No corre en producción.
import { obtenerPool } from './index';

export const TENANT_DEMO = 'a1111111-1111-4111-8111-111111111111';
export const SEDE_DEMO = 'b1111111-1111-4111-8111-111111111111';

const USUARIOS_DEMO = {
  admin: 'c1111111-1111-4111-8111-111111111111',
  asesor: 'c2222222-2222-4222-8222-222222222222',
  optometra: 'c3333333-3333-4333-8333-333333333333',
} as const;

export function usuarioDemo(rol: string): string | null {
  if (rol === 'admin' || rol === 'asesor' || rol === 'optometra') return USUARIOS_DEMO[rol];
  if (rol === 'auxiliar') return USUARIOS_DEMO.asesor;
  return null;
}

export async function asegurarNucleoDemo(): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `insert into tenants (id, razon_social, nit, estado)
     values ($1, 'Óptica Sintética Demo Uno S.A.S. (demo)', '900.000.001-1', 'activo')
     on conflict (id) do nothing`,
    [TENANT_DEMO],
  );
  await pool.query(
    `insert into sedes (id, tenant_id, nombre, ciudad, direccion, tipo, estado)
     values ($1, $2, 'Sede Norte Sintética (demo)', 'Bogotá D.C.', 'Calle 127 # 14-54 (dirección ficticia)', 'optica_con_consultorio', 'activa')
     on conflict (id) do nothing`,
    [SEDE_DEMO, TENANT_DEMO],
  );
  const correos: Record<string, string> = {
    [USUARIOS_DEMO.admin]: 'admin.sintetico@example.invalid',
    [USUARIOS_DEMO.asesor]: 'asesor.sintetico@example.invalid',
    [USUARIOS_DEMO.optometra]: 'optometra.sintetico@example.invalid',
  };
  for (const [id, email] of Object.entries(correos)) {
    await pool.query(
      `insert into usuarios (id, tenant_id, email, estado) values ($1, $2, $3, 'activo')
       on conflict (id) do nothing`,
      [id, TENANT_DEMO, email],
    );
  }
  const membresias = [
    ['d1111111-1111-4111-8111-111111111111', USUARIOS_DEMO.admin, 'admin'],
    ['d2222222-2222-4222-8222-222222222222', USUARIOS_DEMO.asesor, 'asesor'],
    ['d3333333-3333-4333-8333-333333333333', USUARIOS_DEMO.optometra, 'optometra'],
  ];
  for (const [id, usuario, rol] of membresias) {
    await pool.query(
      `insert into membresias (id, tenant_id, usuario_id, sede_id, rol)
       values ($1, $2, $3, $4, $5)
       on conflict (usuario_id, sede_id, rol) do nothing`,
      [id, TENANT_DEMO, usuario, SEDE_DEMO, rol],
    );
  }
}
