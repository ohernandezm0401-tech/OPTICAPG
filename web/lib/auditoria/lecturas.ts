// SEG-03 (T10) — Lectura reutilizable de historia clínica.
// OPT-01 abre la atención con este servicio. Descarta cualquier contenido
// clínico que el llamador hubiera adjuntado por error.
import 'server-only';

import type { ContextoTenant } from '../../db/tenant';
import { registrarEvento } from './servicio';

export interface AperturaHistoria {
  atencionId: string;
  actorId: string;
  rol: string;
  sedeId: string;
  ip?: string | null;
  agente?: string | null;
  requestId?: string | null;
  /** Se ignora a propósito: no entra en la bitácora. */
  contenidoClinico?: {
    diagnostico?: string;
    formula?: string;
    textoLibre?: string;
  };
}

export async function abrirHistoriaClinica(contexto: ContextoTenant, apertura: AperturaHistoria): Promise<number> {
  void apertura.contenidoClinico;
  return registrarEvento(
    {
      tenant_id: contexto.tenant_id,
      usuario_id: apertura.actorId,
      sede_id: apertura.sedeId,
      sedes: contexto.sedes,
      rol: apertura.rol,
    },
    {
      actor_id: apertura.actorId,
      rol: apertura.rol,
      sede_id: apertura.sedeId,
      recurso: 'R3',
      recurso_id: apertura.atencionId,
      accion: 'lectura',
      resultado: 'ok',
      ip: apertura.ip ?? null,
      agente: apertura.agente ?? null,
      request_id: apertura.requestId ?? null,
    },
  );
}
