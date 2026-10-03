// SEG-02 (T09) — Adaptador de las rutas clínicas que todavía no existen.
// OPT-01 creará `GET /api/atenciones/:id` y OPT-05 `GET|PATCH /api/prescripciones/:id`.
// Esas rutas deben delegar aquí. Los registros son sintéticos.
import type { ActorAuthz } from './ability';
import { buildAbility } from './ability';
import { dtoPrescripcionParaDispensacion, type PrescripcionCompleta } from './dto';
import { registrarIntentoDenegado } from './intentos';

export interface RegistroClinicoSintetico {
  id: string;
  tenant_id: string;
  sede_id: string;
  autor_id: string;
  numero_verificacion: string;
  diagnostico: string;
  anamnesis: string;
  atencion_id: string;
  valores_opticos: Record<string, string>;
  vigencia: string;
  borrador: boolean;
}

export type RutaClinica = '/api/atenciones/:id' | '/api/prescripciones/:id';

export interface PeticionClinica {
  metodo: 'GET' | 'PATCH' | 'PUT';
  ruta: RutaClinica;
  actor: ActorAuthz;
  recurso_id: string;
  registro: RegistroClinicoSintetico | null;
}

export interface RespuestaClinica {
  status: number;
  cuerpo: Record<string, unknown>;
}

function denegar(actor: ActorAuthz, recurso: string, accion: string, recursoId: string): RespuestaClinica {
  registrarIntentoDenegado({
    usuario_id: actor.id,
    rol: actor.rol,
    tenant_id: actor.tenantId,
    sede_id: actor.sedeActiva || null,
    recurso,
    recurso_id: recursoId,
    accion,
  });
  return { status: 403, cuerpo: { error: 'No tiene permiso para esta acción.' } };
}

export function atenderRutaClinica(peticion: PeticionClinica): RespuestaClinica {
  const { actor, registro, ruta, metodo, recurso_id: recursoId } = peticion;
  if (!registro || registro.id !== recursoId) {
    return denegar(actor, ruta === '/api/atenciones/:id' ? 'R3' : 'R5', metodo === 'GET' ? 'leer' : 'actualizar', recursoId);
  }
  const habilidad = buildAbility(actor);
  const pacienteEnSede = registro.sede_id === actor.sedeActiva && actor.sedesAutorizadas.includes(registro.sede_id);

  if (ruta === '/api/atenciones/:id') {
    if (metodo !== 'GET') return denegar(actor, 'R3', 'actualizar', recursoId);
    const permitido = habilidad.can('leer', {
      tipo: 'R3',
      tenantId: registro.tenant_id,
      sedeId: registro.sede_id,
      autorId: registro.autor_id,
      pacientesEnSede: pacienteEnSede,
      borrador: registro.borrador,
    });
    if (!permitido) return denegar(actor, 'R3', 'leer', recursoId);
    return {
      status: 200,
      cuerpo: {
        id: registro.id,
        diagnostico: registro.diagnostico,
        anamnesis: registro.anamnesis,
      },
    };
  }

  const sujetoR5 = {
    tipo: 'R5' as const,
    tenantId: registro.tenant_id,
    sedeId: registro.sede_id,
    autorId: registro.autor_id,
  };
  if (metodo === 'GET') {
    if (!habilidad.can('leer', sujetoR5)) return denegar(actor, 'R5', 'leer', recursoId);
    const completa: PrescripcionCompleta = {
      id: registro.id,
      numero_verificacion: registro.numero_verificacion,
      atencion_id: registro.atencion_id,
      diagnostico: registro.diagnostico,
      anamnesis: registro.anamnesis,
      valores_opticos: registro.valores_opticos,
      vigencia: registro.vigencia,
    };
    const veHc = habilidad.can('leer', {
      tipo: 'R3' as const,
      tenantId: registro.tenant_id,
      sedeId: registro.sede_id,
      autorId: registro.autor_id,
      pacientesEnSede: pacienteEnSede,
      borrador: registro.borrador,
    });
    if (!veHc) return { status: 200, cuerpo: { ...dtoPrescripcionParaDispensacion(completa) } };
    return { status: 200, cuerpo: { ...completa } };
  }

  if (!habilidad.can('actualizar', sujetoR5)) return denegar(actor, 'R5', 'actualizar', recursoId);
  return { status: 200, cuerpo: { id: registro.id } };
}
