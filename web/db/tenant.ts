// PLT-01 (T04) — Contexto de tenant por transacción.
// Única vía prevista para consultar con aislamiento: abre una transacción y
// fija `SET LOCAL app.tenant_id`, `app.usuario_id`, `app.sede_id`,
// `app.sedes` (CSV de UUID, spec §PLT-01 regla 2), `app.rol` y el alias
// `app.role` de la spec. Las políticas RLS leen esas variables con
// `current_setting(..., true)`; sin contexto toda consulta devuelve 0 filas.
// La identidad de conexión (rol `optisaas_app` creado en la migración 0001)
// la define el despliegue: en producción la piscina conecta con ese rol
// (TODO T05: `DATABASE_URL_APP` y residencia Q-06); en pruebas se ejerce con
// `SET ROLE optisaas_app`. Solo datos sintéticos.
// TODO(Q-06): hosting y residencia por defecto — PostgreSQL estándar.
import 'server-only';

import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { obtenerDb, type BdNucleo } from './index';

const UUID = z.uuid('debe ser un UUID válido');

export const EsquemaContextoTenant = z.object({
  tenant_id: UUID,
  usuario_id: UUID.nullish(),
  sede_id: UUID.nullish(),
  sedes: z.array(UUID).nullish(),
  rol: z
    .string()
    .trim()
    .min(1, 'el rol es obligatorio')
    .max(60)
    .regex(/^[a-z_]+$/, 'el rol solo admite minúsculas y guion bajo')
    .nullish(),
});

export type ContextoTenant = z.input<typeof EsquemaContextoTenant>;

// Los valores ya pasaron validación Zod estricta (UUID o alfabeto
// restringido), así que interpolarlos como literales entre comillas simples
// es seguro; el doblado de comillas queda como defensa adicional.
function literal(valor: string): string {
  return `'${valor.replace(/'/g, "''")}'`;
}

export async function withTenantTx<T>(
  contextoEntrada: ContextoTenant,
  fn: (tx: BdNucleo) => Promise<T>,
): Promise<T> {
  const contexto = EsquemaContextoTenant.parse(contextoEntrada);
  const sedes = contexto.sedes ?? (contexto.sede_id ? [contexto.sede_id] : []);
  const sedeUnica = contexto.sede_id ?? sedes[0] ?? '';
  const db = obtenerDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = ${literal(contexto.tenant_id)}`));
    await tx.execute(sql.raw(`SET LOCAL app.usuario_id = ${literal(contexto.usuario_id ?? '')}`));
    await tx.execute(sql.raw(`SET LOCAL app.sede_id = ${literal(sedeUnica)}`));
    await tx.execute(sql.raw(`SET LOCAL app.sedes = ${literal(sedes.join(','))}`));
    await tx.execute(sql.raw(`SET LOCAL app.rol = ${literal(contexto.rol ?? '')}`));
    await tx.execute(sql.raw(`SET LOCAL app.role = ${literal(contexto.rol ?? '')}`));
    // El superusuario ignora FORCE RLS. La transacción baja a optisaas_app,
    // que no tiene BYPASSRLS. El usuario de conexión debe poder hacer SET ROLE.
    await tx.execute(sql.raw('SET LOCAL ROLE optisaas_app'));
    return fn(tx as unknown as BdNucleo);
  });
}
