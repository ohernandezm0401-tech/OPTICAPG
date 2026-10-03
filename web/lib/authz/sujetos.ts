// SEG-02 (T09) — Sujetos de prueba alineados con los alcances de `matrix.ts`.
import type { ActorAuthz, SujetoRecurso } from './ability';
import type { Accion, Alcance, Escenario, Recurso, RolMatriz } from './matrix';
import { MATRIZ } from './matrix';

export const IDS_FIXTURE = {
  tenant: '11111111-1111-4111-8111-111111111111',
  otroTenant: '22222222-2222-4222-8222-222222222222',
  sedeActiva: '33333333-3333-4333-8333-333333333333',
  sedeAutorizada: '44444444-4444-4444-8444-444444444444',
  sedeAjena: '55555555-5555-4555-8555-555555555555',
  actor: '66666666-6666-4666-8666-666666666666',
  otroAutor: '77777777-7777-4777-8777-777777777777',
} as const;

export function actorFijo(rol: string, extra?: Partial<ActorAuthz>): ActorAuthz {
  return {
    id: IDS_FIXTURE.actor,
    rol,
    tenantId: IDS_FIXTURE.tenant,
    sedeActiva: IDS_FIXTURE.sedeActiva,
    sedesAutorizadas: [IDS_FIXTURE.sedeActiva, IDS_FIXTURE.sedeAutorizada],
    tarjetaProfesionalVigente: true,
    breakGlass: null,
    permisosExtra: [],
    ...extra,
  };
}

export function sujetoDeCaso(
  rol: RolMatriz,
  recurso: Recurso,
  accion: Accion,
  escenario: Escenario,
  actor: ActorAuthz = actorFijo(rol),
): SujetoRecurso {
  const alcance = MATRIZ[rol][recurso].acciones[accion];
  const otro = escenario === 'otro_tenant';
  const sedeId =
    escenario === 'otra_autorizada'
      ? IDS_FIXTURE.sedeAutorizada
      : escenario === 'ajena'
        ? IDS_FIXTURE.sedeAjena
        : actor.sedeActiva;
  const base: SujetoRecurso = {
    tipo: recurso,
    tenantId: otro ? IDS_FIXTURE.otroTenant : actor.tenantId,
    sedeId,
    autorId: actor.id,
  };
  if (otro || !alcance) return base;
  return conAlcance(base, alcance);
}

function conAlcance(base: SujetoRecurso, alcance: Alcance): SujetoRecurso {
  switch (alcance) {
    case 'pacientes_sede':
      return { ...base, pacientesEnSede: true };
    case 'propios_borrador':
      return { ...base, borrador: true };
    case 'borrador_sede':
      return { ...base, borrador: true };
    case 'perfil_propio':
      return { ...base, perfilPropio: true };
    case 'metadatos':
      return { ...base, metadatos: true };
    case 'agregados':
      return { ...base, agregados: true };
    case 'plataforma':
      return { ...base, plataforma: true };
    case 'plan_propio':
      return { ...base, planPropio: true };
    default:
      return base;
  }
}
