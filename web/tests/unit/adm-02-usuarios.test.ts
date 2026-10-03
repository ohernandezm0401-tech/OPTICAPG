// ADM-02 (T17) — Reglas de rol, invitación y código HTTP de la firma (U, S).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { ROLES_SEDE } from '../../db/esquema/nucleo';
import { codigoHttpFirma } from '../../dominio/firma';
import {
  ROLES_ASIGNABLES,
  VIGENCIA_INVITACION_MS,
  estadoDePerfil,
  hashTokenInvitacion,
  invitacionUtilizable,
  puedeAsignarRol,
  puedeDejarSinAdmin,
} from '../../dominio/usuarios-adm';
import { crearCorreoDesarrollo, enlacesRegistradosDesarrollo, limpiarCorreoDesarrollo } from '../../lib/correo/puerto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AHORA = new Date('2026-10-03T15:00:00.000Z');

describe('AC-ADM-02-1: sin registro profesional la API responde 403', () => {
  it('la tarjeta ausente se traduce a 403 y no a 400', () => {
    expect(codigoHttpFirma('tarjeta', 'Firmar exige tarjeta profesional vigente.')).toBe(403);
    expect(codigoHttpFirma('permiso', 'Debe iniciar sesión.')).toBe(401);
  });
});

describe('AC-ADM-02-2: un admin no asigna owner ni un rol superior', () => {
  it('rechaza owner y owner de plataforma', () => {
    expect(puedeAsignarRol('admin', 'owner')).toEqual({ ok: false, motivo: 'superior' });
    expect(puedeAsignarRol('admin', 'owner_plataforma')).toEqual({ ok: false, motivo: 'superior' });
    expect(puedeAsignarRol('admin', 'soporte_plataforma')).toEqual({ ok: false, motivo: 'superior' });
  });

  it('puede asignar roles del tenant que no lo superan', () => {
    expect(puedeAsignarRol('admin', 'admin').ok).toBe(true);
    expect(puedeAsignarRol('admin', 'optometra').ok).toBe(true);
    expect(puedeAsignarRol('asesor', 'admin')).toEqual({ ok: false, motivo: 'superior' });
  });

  it('el selector no ofrece owner', () => {
    expect(ROLES_ASIGNABLES).toEqual(ROLES_SEDE);
    expect(ROLES_ASIGNABLES).not.toContain('owner');
    expect(ROLES_ASIGNABLES).not.toContain('owner_plataforma');
  });
});

describe('invitación de un solo uso y correo de desarrollo', () => {
  it('el hash no es el token y el enlace usado no sirve', () => {
    const token = 'token-sintetico-de-un-solo-uso';
    const hash = hashTokenInvitacion(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    const expira = new Date(AHORA.getTime() + VIGENCIA_INVITACION_MS);
    expect(invitacionUtilizable(null, expira, AHORA)).toBe(true);
    expect(invitacionUtilizable(AHORA, expira, AHORA)).toBe(false);
    expect(invitacionUtilizable(null, AHORA, new Date(AHORA.getTime() + 1000))).toBe(false);
  });

  it('el adaptador de desarrollo registra el enlace y no lo envía', async () => {
    limpiarCorreoDesarrollo();
    const correo = crearCorreoDesarrollo();
    await correo.enviarInvitacion({
      destinatario: 'invitado.sintetico@example.invalid',
      enlace: 'http://localhost:3000/invitacion/abc',
    });
    expect(enlacesRegistradosDesarrollo()).toEqual([
      expect.objectContaining({
        destinatario: 'invitado.sintetico@example.invalid',
        enlace: 'http://localhost:3000/invitacion/abc',
      }),
    ]);
  });

  it('el último administrador no puede quedar en cero', () => {
    expect(puedeDejarSinAdmin(0)).toBe(false);
    expect(puedeDejarSinAdmin(1)).toBe(true);
  });

  it('sin verificación manual el perfil queda pendiente', () => {
    expect(
      estadoDePerfil({
        registro: 'RP-SINTETICO',
        vigenteHasta: '2026-12-31',
        verificadoEn: null,
        ahora: AHORA,
      }),
    ).toBe('pendiente');
    expect(
      estadoDePerfil({
        registro: 'RP-SINTETICO',
        vigenteHasta: '2026-12-31',
        verificadoEn: AHORA,
        ahora: AHORA,
      }),
    ).toBe('verificado');
  });
});

describe('RLS de la invitación', () => {
  it('la tabla nueva nace con RLS ENABLE+FORCE y política', () => {
    const sql = readFileSync(path.join(RAIZ, 'db', 'migrations', '0016_adm02_usuarios.sql'), 'utf8');
    expect(sql).toContain('ALTER TABLE invitaciones_usuario ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE invitaciones_usuario FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY invitaciones_usuario_tenant_app');
    expect(sql).not.toContain('BYPASSRLS');
    expect(sql).toContain('ALTER TABLE perfiles_profesionales');
    expect(sql).not.toContain('CREATE TABLE usuarios_sedes');
  });
});
