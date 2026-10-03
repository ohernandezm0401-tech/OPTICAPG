// ADM-02 (T17) — Reglas de usuarios, rol por sede y perfil profesional.
// La verificación del registro es manual. TODO(NV-23): no se asume API oficial.
// La vigencia de la invitación es una ventana operativa, no un plazo legal.
import { createHash, randomBytes } from 'node:crypto';

import { ROLES_SEDE } from '../db/esquema/nucleo';
import { tarjetaDeclaradaVigente } from './firma';

export const ROLES_ASIGNABLES = ROLES_SEDE;

/** Roles de plataforma. Un admin del tenant no puede otorgarlos. */
export const ROLES_SUPERIORES = ['owner', 'owner_plataforma', 'soporte_plataforma'] as const;

const RANGO: Record<string, number> = {
  owner: 100,
  owner_plataforma: 100,
  soporte_plataforma: 90,
  admin: 50,
  auditor: 40,
  oftalmologo: 30,
  optometra: 30,
  auxiliar_clinico: 20,
  tecnico_lab: 20,
  asesor: 10,
};

export const VIGENCIA_INVITACION_MS = 72 * 60 * 60 * 1000;

export const TIPOS_PROFESIONAL = ['optometra', 'oftalmologo'] as const;
export const ESTADOS_PERFIL = ['pendiente', 'verificado', 'no_vigente'] as const;

export type EstadoPerfil = (typeof ESTADOS_PERFIL)[number];

export function rangoDeRol(rol: string): number {
  return RANGO[rol] ?? 0;
}

export function puedeAsignarRol(
  rolActor: string,
  rolObjetivo: string,
): { ok: true } | { ok: false; motivo: 'superior' | 'desconocido' } {
  if ((ROLES_SUPERIORES as readonly string[]).includes(rolObjetivo)) {
    return { ok: false, motivo: 'superior' };
  }
  if (!(ROLES_ASIGNABLES as readonly string[]).includes(rolObjetivo)) {
    return { ok: false, motivo: 'desconocido' };
  }
  if (rangoDeRol(rolObjetivo) > rangoDeRol(rolActor)) {
    return { ok: false, motivo: 'superior' };
  }
  return { ok: true };
}

export function puedeDejarSinAdmin(adminsActivosDistintos: number): boolean {
  return adminsActivosDistintos > 0;
}

export function generarTokenInvitacion(): string {
  return randomBytes(32).toString('base64url');
}

export function hashTokenInvitacion(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function invitacionUtilizable(usadaEn: Date | null, expiraEn: Date, ahora: Date): boolean {
  if (usadaEn) return false;
  if (Number.isNaN(expiraEn.getTime()) || Number.isNaN(ahora.getTime())) return false;
  return expiraEn.getTime() > ahora.getTime();
}

export function estadoDePerfil(entrada: {
  registro: string | null;
  vigenteHasta: string | null;
  verificadoEn: Date | null;
  ahora: Date;
}): EstadoPerfil {
  if (!entrada.verificadoEn) return 'pendiente';
  if (!tarjetaDeclaradaVigente(entrada.registro, entrada.vigenteHasta, entrada.ahora)) return 'no_vigente';
  return 'verificado';
}

export function correoValido(correo: string): boolean {
  const limpio = correo.trim().toLowerCase();
  if (limpio.length < 6 || limpio.length > 160) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio);
}
