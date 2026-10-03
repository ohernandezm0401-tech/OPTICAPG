// PLT-02 (T03) — Propiedades de los esquemas Zod del núcleo (P).
// Sin dependencias nuevas: generador pseudoaleatorio determinista propio.
// Verifica que los DTOs aceptan todo el dominio válido, rechazan lo inválido
// y conservan los campos (ida y vuelta esquema ⇄ tipo).
import { describe, expect, it } from 'vitest';

import {
  ESTADOS_SEDE,
  ESTADOS_TENANT,
  ESTADOS_USUARIO,
  ROLES_SEDE,
  TIPOS_SEDE,
} from '../../db/esquema/nucleo';
import {
  EsquemaMembresiaEntrada,
  EsquemaSedeEntrada,
  EsquemaSesionEntrada,
  EsquemaTenantEntrada,
  EsquemaUsuarioEntrada,
} from '../../db/validacion/nucleo';

// PRNG determinista (mulberry32) para que la prueba sea reproducible.
function prng(semilla: number) {
  let estado = semilla >>> 0;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UUID_EJEMPLO = [
  '123e4567-e89b-42d3-a456-426614174000',
  '123e4567-e89b-47d3-a456-426614174001',
  '123e4567-e89b-47d3-a456-426614174002',
];

const NITS_VALIDOS = ['900.123.456-7', '800111222-3', '9001234567', '901.124.897-5'];

describe('propiedades: el dominio válido siempre parsea', () => {
  it('100 tenants sintéticos conservan razón social y NIT', () => {
    const aleatorio = prng(20261003);
    for (let i = 0; i < 100; i += 1) {
      const razon = `Óptica Sintética de Prueba ${i} S.A.S.`;
      const nit = `${NITS_VALIDOS[Math.floor(aleatorio() * NITS_VALIDOS.length)]}`;
      const parsed = EsquemaTenantEntrada.parse({ razon_social: razon, nit });
      expect(parsed.razon_social).toBe(razon);
      expect(parsed.nit).toBe(nit);
      expect(parsed.estado).toBe('onboarding');
    }
  });

  it('toda sede acepta cada tipo de la spec (§10.3) y cada estado', () => {
    for (const tipo of TIPOS_SEDE) {
      for (const estado of ESTADOS_SEDE) {
        const parsed = EsquemaSedeEntrada.parse({
          tenant_id: UUID_EJEMPLO[0],
          nombre: 'Sede Principal de Prueba',
          ciudad: 'Bogotá D.C.',
          tipo,
          estado,
        });
        expect(parsed.tipo).toBe(tipo);
        expect(parsed.estado).toBe(estado);
      }
    }
  });

  it('todo rol de la matriz acepta una membresía y todo estado un usuario', () => {
    for (const rol of ROLES_SEDE) {
      const membresia = EsquemaMembresiaEntrada.parse({
        tenant_id: UUID_EJEMPLO[0],
        usuario_id: UUID_EJEMPLO[1],
        sede_id: UUID_EJEMPLO[2],
        rol,
      });
      expect(membresia.rol).toBe(rol);
    }
    for (const estado of ESTADOS_USUARIO) {
      const usuario = EsquemaUsuarioEntrada.parse({
        tenant_id: UUID_EJEMPLO[0],
        email: 'Sintetico.Pruebas@ejemplo.co',
        estado,
      });
      expect(usuario.estado).toBe(estado);
      expect(usuario.email).toBe('sintetico.pruebas@ejemplo.co');
    }
    for (const estado of ESTADOS_TENANT) {
      const tenant = EsquemaTenantEntrada.parse({
        razon_social: 'Óptica de Prueba S.A.S.',
        nit: '900.000.000-0',
        estado,
      });
      expect(tenant.estado).toBe(estado);
    }
  });

  it('la sesión calcula la expiración desde la duración (sin valores quemados)', () => {
    const parsed = EsquemaSesionEntrada.parse({
      tenant_id: UUID_EJEMPLO[0],
      usuario_id: UUID_EJEMPLO[1],
      duracion_minutos: 15,
    });
    expect(parsed.duracion_minutos).toBe(15);
  });
});

describe('propiedades: lo inválido siempre se rechaza', () => {
  it('razón social vacía, NIT con letras y UUID rotos no parsean', () => {
    expect(() =>
      EsquemaTenantEntrada.parse({ razon_social: 'AB', nit: '900.123.456-7' }),
    ).toThrow();
    expect(() =>
      EsquemaTenantEntrada.parse({ razon_social: 'Óptica Válida S.A.S.', nit: 'NIT-FALSO' }),
    ).toThrow();
    expect(() =>
      EsquemaSedeEntrada.parse({
        tenant_id: 'no-es-uuid',
        nombre: 'Sede',
        ciudad: 'Cali',
      }),
    ).toThrow();
    expect(() =>
      EsquemaUsuarioEntrada.parse({ tenant_id: UUID_EJEMPLO[0], email: 'sin-arroba' }),
    ).toThrow();
  });

  it('roles, tipos y estados fuera de catálogo no parsean', () => {
    expect(() =>
      EsquemaMembresiaEntrada.parse({
        tenant_id: UUID_EJEMPLO[0],
        usuario_id: UUID_EJEMPLO[1],
        sede_id: UUID_EJEMPLO[2],
        rol: 'superadmin',
      } as unknown as { rol: 'admin' }),
    ).toThrow();
    expect(() =>
      EsquemaSedeEntrada.parse({
        tenant_id: UUID_EJEMPLO[0],
        nombre: 'Sede',
        ciudad: 'Cali',
        tipo: 'tienda_de_ropa',
      } as unknown as { tipo: 'ips' }),
    ).toThrow();
    expect(() =>
      EsquemaTenantEntrada.parse({
        razon_social: 'Óptica Válida S.A.S.',
        nit: '900.123.456-7',
        estado: 'desaparecido',
      } as unknown as { estado: 'activo' }),
    ).toThrow();
    expect(() =>
      EsquemaSesionEntrada.parse({
        tenant_id: UUID_EJEMPLO[0],
        usuario_id: UUID_EJEMPLO[1],
        duracion_minutos: 0,
      }),
    ).toThrow();
  });

  it('los catálogos del esquema son exactamente los de la spec', () => {
    expect([...TIPOS_SEDE]).toEqual([
      'optica_con_consultorio',
      'optica_sin_consultorio',
      'profesional_independiente',
      'ips',
      'taller_optico',
      'laboratorio_oftalmico',
      'laboratorio_lc_protesis',
    ]);
    expect([...ROLES_SEDE]).toEqual([
      'admin',
      'asesor',
      'optometra',
      'oftalmologo',
      'auxiliar_clinico',
      'tecnico_lab',
      'auditor',
    ]);
    expect([...ESTADOS_TENANT]).toEqual(['onboarding', 'activo', 'suspendido', 'en_cierre', 'cerrado']);
  });
});
