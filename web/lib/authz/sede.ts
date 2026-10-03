// SEG-02 (T09) — Cambio de sede activa. Solo una sede autorizada (spec §4.2).
import type { ActorAuthz } from './ability';
import { registrarIntentoDenegado } from './intentos';

export interface ResultadoCambioSede {
  ok: boolean;
  status: 200 | 403;
  mensaje: string;
  sedeId?: string;
}

export function cambiarSedeActiva(actor: ActorAuthz, sedeId: string): ResultadoCambioSede {
  const destino = sedeId.trim();
  if (!destino || !actor.sedesAutorizadas.includes(destino)) {
    registrarIntentoDenegado({
      usuario_id: actor.id,
      rol: actor.rol,
      tenant_id: actor.tenantId,
      sede_id: actor.sedeActiva || null,
      recurso: 'R18',
      recurso_id: destino || null,
      accion: 'cambiar_sede',
    });
    return { ok: false, status: 403, mensaje: 'La sede no está autorizada.' };
  }
  return { ok: true, status: 200, mensaje: 'Sede activa actualizada.', sedeId: destino };
}
