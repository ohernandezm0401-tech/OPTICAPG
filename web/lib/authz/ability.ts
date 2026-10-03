// SEG-02 (T09) — Habilidades CASL construidas solo desde `matrix.ts`.
// `@casl/ability` MIT. Condiciones: tenant, sede activa o sedes autorizadas.
// TODO(Q-10): ninguna regla de `admin` concede R3.
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

import {
  MATRIZ,
  rolMatriz,
  type Accion,
  type Alcance,
  type Recurso,
  type RolMatriz,
} from './matrix';

export interface BreakGlass {
  activo: boolean;
  justificacion: string;
  /** ISO-8601 en UTC. Sin valor o ya vencido, no hay acceso. */
  vence_en: string;
}

export interface PermisoExtra {
  recurso: Recurso;
  accion: Accion;
  alcance: Alcance;
}

export interface ActorAuthz {
  id: string;
  rol: string;
  tenantId: string;
  sedeActiva: string;
  sedesAutorizadas: string[];
  /** Sin tarjeta vigente no hay firmar ni prescribir (spec SEG-02 regla 2). */
  tarjetaProfesionalVigente: boolean;
  breakGlass?: BreakGlass | null;
  permisosExtra?: PermisoExtra[];
  /** Instantánea para evaluar el vencimiento del break-glass. UTC. */
  ahora?: Date;
}

export interface SujetoRecurso {
  tipo: Recurso;
  tenantId?: string;
  sedeId?: string;
  autorId?: string;
  pacientesEnSede?: boolean;
  borrador?: boolean;
  perfilPropio?: boolean;
  metadatos?: boolean;
  agregados?: boolean;
  plataforma?: boolean;
  planPropio?: boolean;
}

export type HabilidadApp = MongoAbility<[Accion, Recurso | SujetoRecurso]>;

function esFirmarOPrescribir(accion: Accion, recurso: Recurso): boolean {
  if (accion === 'firmar') return true;
  return recurso === 'R5' && accion === 'crear';
}

function breakGlassVigente(actor: ActorAuthz): boolean {
  const pase = actor.breakGlass;
  if (!pase?.activo) return false;
  if (!pase.justificacion.trim()) return false;
  const vence = Date.parse(pase.vence_en);
  if (Number.isNaN(vence)) return false;
  const ahora = actor.ahora ?? new Date();
  return vence > ahora.getTime();
}

function conceder(
  can: AbilityBuilder<HabilidadApp>['can'],
  accion: Accion,
  recurso: Recurso,
  alcance: Alcance,
  actor: ActorAuthz,
): void {
  if (!actor.tarjetaProfesionalVigente && esFirmarOPrescribir(accion, recurso)) return;
  const tenantId = actor.tenantId;
  const sedeActiva = actor.sedeActiva;
  const sedes = actor.sedesAutorizadas;
  const tieneSede =
    Boolean(sedeActiva) && sedes.includes(sedeActiva) && sedes.length > 0;
  if (!tieneSede && alcance !== 'agregados' && alcance !== 'plataforma' && alcance !== 'plan_propio') {
    return;
  }

  switch (alcance) {
    case 'sede_activa':
      can(accion, recurso, { tenantId, sedeId: sedeActiva });
      return;
    case 'sedes_autorizadas':
      can(accion, recurso, { tenantId, sedeId: { $in: sedes } });
      return;
    case 'propios':
      can(accion, recurso, { tenantId, sedeId: sedeActiva, autorId: actor.id });
      return;
    case 'propios_borrador':
      can(accion, recurso, { tenantId, sedeId: sedeActiva, autorId: actor.id, borrador: true });
      return;
    case 'borrador_sede':
      can(accion, recurso, { tenantId, sedeId: sedeActiva, borrador: true });
      return;
    case 'pacientes_sede':
      can(accion, recurso, { tenantId, sedeId: sedeActiva, pacientesEnSede: true });
      return;
    case 'perfil_propio':
      can(accion, recurso, {
        tenantId,
        sedeId: { $in: sedes },
        autorId: actor.id,
        perfilPropio: true,
      });
      return;
    case 'metadatos':
      can(accion, recurso, { tenantId, sedeId: { $in: sedes }, metadatos: true });
      return;
    case 'agregados':
      can(accion, recurso, { agregados: true });
      return;
    case 'plataforma':
      can(accion, recurso, { plataforma: true });
      return;
    case 'plan_propio':
      can(accion, recurso, { tenantId, planPropio: true });
      return;
    default: {
      const _agotado: never = alcance;
      return _agotado;
    }
  }
}

export function buildAbility(actor: ActorAuthz): HabilidadApp {
  const { can, build } = new AbilityBuilder<HabilidadApp>(createMongoAbility);
  const rol = rolMatriz(actor.rol);
  if (!rol) {
    return build({ detectSubjectType: (item) => (typeof item === 'string' ? item : item.tipo) });
  }
  const fila = MATRIZ[rol];
  const glass = breakGlassVigente(actor);
  for (const recurso of Object.keys(fila) as Recurso[]) {
    const celda = fila[recurso];
    for (const accion of Object.keys(celda.acciones) as Accion[]) {
      const alcance = celda.acciones[accion];
      if (alcance) conceder(can, accion, recurso, alcance, actor);
    }
    if (glass && celda.break_glass) {
      for (const accion of Object.keys(celda.break_glass) as Accion[]) {
        const alcance = celda.break_glass[accion];
        if (alcance) conceder(can, accion, recurso, alcance, actor);
      }
    }
  }
  for (const extra of actor.permisosExtra ?? []) {
    conceder(can, extra.accion, extra.recurso, extra.alcance, actor);
  }
  return build({
    detectSubjectType: (item) => (typeof item === 'string' ? item : item.tipo),
  });
}

export function puede(actor: ActorAuthz, accion: Accion, sujeto: SujetoRecurso): boolean {
  return buildAbility(actor).can(accion, sujeto);
}

export type { RolMatriz };
