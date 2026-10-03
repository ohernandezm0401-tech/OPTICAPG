// PLT-02 (T03) — Integración del núcleo contra PostgreSQL real, sin mocks
// de BD (I). Cubre cada acción de `db/nucleo.ts`: crear y listar tenants,
// sedes, usuarios, membresías y sesiones, además de unicidades y revocación.
// Exige `DATABASE_URL_TEST` (o `DATABASE_URL`); si falta, falla con la
// instrucción en lugar de pasar en silencio.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import {
  abrirSesion,
  asignarMembresia,
  cerrarPool,
  crearSede,
  crearTenant,
  crearUsuario,
  listarMembresiasPorUsuario,
  listarSedesPorTenant,
  listarSesionesActivasPorUsuario,
  listarTenants,
  listarUsuariosPorTenant,
  obtenerTenantPorId,
  revocarSesion,
} from '../../db/nucleo';
import { obtenerDb } from '../../db/index';

const MIGRACIONES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db',
  'migrations',
);

const nitUnico = () => `900.${Date.now().toString().slice(-7)}-${Math.floor(Math.random() * 10)}`;

describe('núcleo en PostgreSQL real', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
      throw new Error(
        'Falta DATABASE_URL_TEST. Local: `docker compose -f ../docker-compose.test.yml up -d` y ' +
          'exporta DATABASE_URL_TEST (ver web/.env.example). En CI la define el servicio postgres.',
      );
    }
    await migrate(obtenerDb(), { migrationsFolder: MIGRACIONES });
  });

  afterAll(async () => {
    await cerrarPool();
  });

  it('crear y listar tenants (con NIT único y validación Zod)', async () => {
    const nit = nitUnico();
    const creado = await crearTenant({ razon_social: 'Óptica Sintética de Prueba S.A.S.', nit });
    expect(creado.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(creado.estado).toBe('onboarding');
    expect(creado.creado_en).toBeInstanceOf(Date);

    const mismos = await listarTenants();
    expect(mismos.map((t) => t.id)).toContain(creado.id);

    const porId = await obtenerTenantPorId(creado.id);
    expect(porId?.nit).toBe(nit);

    await expect(
      crearTenant({ razon_social: 'Óptica Sintética de Prueba S.A.S.', nit }),
    ).rejects.toThrow();
    await expect(
      crearTenant({ razon_social: 'AB', nit: nitUnico() }),
    ).rejects.toThrow();
  });

  it('crear y listar sedes por tenant', async () => {
    const tenant = await crearTenant({ razon_social: 'Tenant Sedes S.A.S.', nit: nitUnico() });
    const sede = await crearSede({
      tenant_id: tenant.id,
      nombre: 'Sede Norte de Prueba',
      ciudad: 'Medellín',
      tipo: 'optica_con_consultorio',
      reps_codigo: '05001-00001-01',
    });
    expect(sede.tenant_id).toBe(tenant.id);

    const sedes = await listarSedesPorTenant(tenant.id);
    expect(sedes.map((s) => s.id)).toContain(sede.id);
  });

  it('crear usuarios con email único por tenant', async () => {
    const tenant = await crearTenant({ razon_social: 'Tenant Usuarios S.A.S.', nit: nitUnico() });
    const email = `sintetico.${Date.now()}@ejemplo.co`;
    const usuario = await crearUsuario({ tenant_id: tenant.id, email });
    expect(usuario.estado).toBe('invitado');

    const usuarios = await listarUsuariosPorTenant(tenant.id);
    expect(usuarios.map((u) => u.id)).toContain(usuario.id);

    await expect(crearUsuario({ tenant_id: tenant.id, email })).rejects.toThrow();
  });

  it('asignar membresías usuario × sede × rol (únicas)', async () => {
    const tenant = await crearTenant({ razon_social: 'Tenant Membresías S.A.S.', nit: nitUnico() });
    const sede = await crearSede({ tenant_id: tenant.id, nombre: 'Sede Única', ciudad: 'Cali' });
    const usuario = await crearUsuario({
      tenant_id: tenant.id,
      email: `membresia.${Date.now()}@ejemplo.co`,
    });

    const membresia = await asignarMembresia({
      tenant_id: tenant.id,
      usuario_id: usuario.id,
      sede_id: sede.id,
      rol: 'optometra',
    });
    expect(membresia.rol).toBe('optometra');

    const membresias = await listarMembresiasPorUsuario(usuario.id);
    expect(membresias.map((m) => m.id)).toContain(membresia.id);

    await expect(
      asignarMembresia({ tenant_id: tenant.id, usuario_id: usuario.id, sede_id: sede.id, rol: 'optometra' }),
    ).rejects.toThrow();
    await expect(
      asignarMembresia({
        tenant_id: tenant.id,
        usuario_id: usuario.id,
        sede_id: sede.id,
        rol: 'superadmin',
      } as unknown as { rol: 'admin'; tenant_id: string; usuario_id: string; sede_id: string }),
    ).rejects.toThrow();
  });

  it('abrir, listar y revocar sesiones', async () => {
    const tenant = await crearTenant({ razon_social: 'Tenant Sesiones S.A.S.', nit: nitUnico() });
    const usuario = await crearUsuario({
      tenant_id: tenant.id,
      email: `sesion.${Date.now()}@ejemplo.co`,
    });

    const sesion = await abrirSesion({
      tenant_id: tenant.id,
      usuario_id: usuario.id,
      duracion_minutos: 15,
      direccion_ip: '127.0.0.1',
    });
    expect(sesion.expira_en.getTime()).toBeGreaterThan(Date.now());

    const activas = await listarSesionesActivasPorUsuario(usuario.id);
    expect(activas.map((s) => s.id)).toContain(sesion.id);

    const revocada = await revocarSesion(sesion.id);
    expect(revocada?.revocada_en).toBeInstanceOf(Date);

    const despues = await listarSesionesActivasPorUsuario(usuario.id);
    expect(despues.map((s) => s.id)).not.toContain(sesion.id);

    expect(await revocarSesion(sesion.id)).toBeNull();
  });
});
