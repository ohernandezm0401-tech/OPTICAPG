// PLT-02 (T03) — Acciones del núcleo contra PostgreSQL real (sin mocks de
// BD). Toda entrada se valida con Zod antes de persistir. Flujo: UI → Server
// Action (`app/acciones/nucleo.ts`) → validación Zod → Drizzle → DTO.
// El aislamiento por tenant con RLS y `withTenantTx` llega con PLT-01; estas
// funciones exigen siempre `tenant_id` explícito como paso intermedio.
// TODO(Q-06): hosting por defecto — PostgreSQL estándar + Drizzle.
import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { cerrarPool, obtenerDb } from './index';
import { membresias, sedes, sesiones, tenants, usuarios } from './esquema/nucleo';
import {
  EsquemaMembresiaEntrada,
  EsquemaSedeEntrada,
  EsquemaSesionEntrada,
  EsquemaTenantEntrada,
  EsquemaUsuarioEntrada,
  type MembresiaEntrada,
  type SedeEntrada,
  type SesionEntrada,
  type TenantEntrada,
  type UsuarioEntrada,
} from './validacion/nucleo';

export { cerrarPool };

export async function crearTenant(entrada: TenantEntrada) {
  const datos = EsquemaTenantEntrada.parse(entrada);
  const db = obtenerDb();
  const [creado] = await db.insert(tenants).values(datos).returning();
  return creado;
}

export async function listarTenants() {
  const db = obtenerDb();
  return db.select().from(tenants).orderBy(desc(tenants.creado_en));
}

export async function obtenerTenantPorId(id: string) {
  const db = obtenerDb();
  const filas = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return filas[0] ?? null;
}

export async function crearSede(entrada: SedeEntrada) {
  const datos = EsquemaSedeEntrada.parse(entrada);
  const db = obtenerDb();
  const [creada] = await db.insert(sedes).values(datos).returning();
  return creada;
}

export async function listarSedesPorTenant(tenantId: string) {
  const db = obtenerDb();
  return db.select().from(sedes).where(eq(sedes.tenant_id, tenantId)).orderBy(desc(sedes.creado_en));
}

export async function crearUsuario(entrada: UsuarioEntrada) {
  const datos = EsquemaUsuarioEntrada.parse(entrada);
  const db = obtenerDb();
  const [creado] = await db.insert(usuarios).values(datos).returning();
  return creado;
}

export async function listarUsuariosPorTenant(tenantId: string) {
  const db = obtenerDb();
  return db.select().from(usuarios).where(eq(usuarios.tenant_id, tenantId)).orderBy(desc(usuarios.creado_en));
}

export async function asignarMembresia(entrada: MembresiaEntrada) {
  const datos = EsquemaMembresiaEntrada.parse(entrada);
  const db = obtenerDb();
  const [creada] = await db.insert(membresias).values(datos).returning();
  return creada;
}

export async function listarMembresiasPorUsuario(usuarioId: string) {
  const db = obtenerDb();
  return db.select().from(membresias).where(eq(membresias.usuario_id, usuarioId));
}

export async function abrirSesion(entrada: SesionEntrada) {
  const datos = EsquemaSesionEntrada.parse(entrada);
  const db = obtenerDb();
  const expira = new Date(Date.now() + datos.duracion_minutos * 60_000);
  const [creada] = await db
    .insert(sesiones)
    .values({
      tenant_id: datos.tenant_id,
      usuario_id: datos.usuario_id,
      expira_en: expira,
      direccion_ip: datos.direccion_ip ?? null,
      agente: datos.agente ?? null,
    })
    .returning();
  return creada;
}

export async function revocarSesion(sesionId: string) {
  const db = obtenerDb();
  const [revocada] = await db
    .update(sesiones)
    .set({ revocada_en: new Date() })
    .where(and(eq(sesiones.id, sesionId), isNull(sesiones.revocada_en)))
    .returning();
  return revocada ?? null;
}

export async function listarSesionesActivasPorUsuario(usuarioId: string) {
  const db = obtenerDb();
  return db
    .select()
    .from(sesiones)
    .where(and(eq(sesiones.usuario_id, usuarioId), isNull(sesiones.revocada_en)));
}
