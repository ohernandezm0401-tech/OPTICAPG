// SEG-01 (T08) — Quién debe usar segundo factor.
// Obligatorios: `admin`, `optometra`, `director_cientifico` (T08) y
// `oftalmologo` (regla 3 de SEG-01). `director_cientifico` aún no está en el
// catálogo de `membresias` (Q-19); la regla ya lo trata como obligatorio
// cuando el rol exista. `asesor` es configurable por tenant
// (`mfa_obligatoria_asesor`, por defecto no). Quien ya enroló un factor lo
// usa aunque su rol no lo exija.

export const ROLES_MFA_OBLIGATORIA = [
  'admin',
  'optometra',
  'director_cientifico',
  'oftalmologo',
] as const;

export const CLAVE_MFA_ASESOR = 'mfa_obligatoria_asesor';

export function mfaEsObligatoria(roles: readonly string[], asesorObligatoria: boolean): boolean {
  if (roles.some((rol) => (ROLES_MFA_OBLIGATORIA as readonly string[]).includes(rol))) return true;
  return asesorObligatoria && roles.includes('asesor');
}

export function debePedirSegundoFactor(obligatoria: boolean, tieneFactor: boolean): 'enrolar' | 'verificar' | null {
  if (tieneFactor) return 'verificar';
  if (obligatoria) return 'enrolar';
  return null;
}

export function banderaAsesorActiva(valor: unknown): boolean {
  return valor === true || valor === 1 || valor === 'true';
}
