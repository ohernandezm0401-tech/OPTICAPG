// SEG-02 (T09) — Actor de autorización a partir de la sesión (sin consultar la BD).
import type { ActorAuthz } from './ability';

export interface SesionAuthz {
  id?: string | null;
  role?: string | null;
  empresaId?: string | null;
  sedeId?: string | null;
  sedesAccess?: string[] | null;
  tarjetaProfesionalVigente?: boolean | null;
}

export function actorDesdeSesion(sesion: SesionAuthz): ActorAuthz {
  const sedeActiva = sesion.sedeId ?? '';
  const sedes =
    sesion.sedesAccess && sesion.sedesAccess.length > 0
      ? sesion.sedesAccess
      : sedeActiva
        ? [sedeActiva]
        : [];
  const rol = sesion.role ?? '';
  const profesional = rol === 'optometra' || rol === 'oftalmologo' || rol === 'director_cientifico';
  return {
    id: sesion.id ?? '',
    rol,
    tenantId: sesion.empresaId ?? '',
    sedeActiva,
    sedesAutorizadas: sedes,
    // Sin dato en la sesión no se asume tarjeta vigente (SEG-02 regla 2).
    tarjetaProfesionalVigente: profesional ? sesion.tarjetaProfesionalVigente === true : true,
  };
}
