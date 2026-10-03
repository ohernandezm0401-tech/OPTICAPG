// SEG-02 (T09) — Guarda reutilizable para rutas y acciones de servidor.
// TODO(T10): esta guarda es síncrona y solo deja el intento en memoria.
// La cadena append-only se escribe en `insertarIntentoDenegado` (persistencia).
import type { Accion } from './matrix';
import type { ActorAuthz, SujetoRecurso } from './ability';
import { buildAbility } from './ability';
import { registrarIntentoDenegado } from './intentos';

export class ErrorAutorizacion extends Error {
  readonly status = 403;

  constructor(mensaje = 'No tiene permiso para esta acción.') {
    super(mensaje);
    this.name = 'ErrorAutorizacion';
  }
}

export function exigirPuede(actor: ActorAuthz, accion: Accion, sujeto: SujetoRecurso): void {
  const habilidad = buildAbility(actor);
  if (habilidad.can(accion, sujeto)) return;
  registrarIntentoDenegado({
    usuario_id: actor.id,
    rol: actor.rol,
    tenant_id: actor.tenantId,
    sede_id: actor.sedeActiva || null,
    recurso: sujeto.tipo,
    recurso_id: null,
    accion,
  });
  throw new ErrorAutorizacion();
}
