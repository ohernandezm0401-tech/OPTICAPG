// SEG-02 (T09) — Acceso a secciones del panel. Lo decide la matriz, no el middleware.
import type { ActorAuthz } from './ability';
import { buildAbility } from './ability';
import { rolMatriz } from './matrix';

export function decidirAccesoPanel(actor: ActorAuthz, ruta: string): { permitido: boolean } {
  if (ruta === '/dashboard') return { permitido: true };
  const habilidad = buildAbility(actor);
  const sede = actor.sedeActiva;
  if (ruta.startsWith('/dashboard/owner')) {
    return { permitido: habilidad.can('leer', { tipo: 'R24', plataforma: true, tenantId: actor.tenantId }) };
  }
  if (ruta.startsWith('/dashboard/admin')) {
    return {
      permitido: habilidad.can('crear', { tipo: 'R14', tenantId: actor.tenantId, sedeId: sede }),
    };
  }
  if (ruta.startsWith('/dashboard/asesor')) {
    return {
      permitido: habilidad.can('crear', { tipo: 'R9', tenantId: actor.tenantId, sedeId: sede }),
    };
  }
  if (ruta.startsWith('/dashboard/optometra')) {
    return {
      permitido: habilidad.can('leer', {
        tipo: 'R3',
        tenantId: actor.tenantId,
        sedeId: sede,
        pacientesEnSede: true,
        autorId: actor.id,
      }),
    };
  }
  if (ruta.startsWith('/dashboard/')) return { permitido: false };
  return { permitido: true };
}

export function rutaInicio(rol: string): string {
  const canonico = rolMatriz(rol);
  if (canonico === 'owner_plataforma' || canonico === 'soporte_plataforma') return '/dashboard/owner';
  if (canonico === 'admin') return '/dashboard/admin';
  if (canonico === 'asesor') return '/dashboard/asesor';
  if (canonico === 'optometra' || canonico === 'director_cientifico') return '/dashboard/optometra';
  return '/dashboard';
}
