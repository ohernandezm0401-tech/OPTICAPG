// SEG-02 (T09) — Matriz rol × recurso × acción (spec §4.4). Fuente única:
// `buildAbility` y los casos de prueba se generan desde este archivo.
// TODO(Q-10): `admin` no lee historia clínica (R3). Si también es profesional,
// usa el rol clínico (`optometra` u `oftalmologo`), no un permiso de admin.
// TODO(Q-19): `director_cientifico` es un atributo (spec §4.1), no un rol de
// `membresias`. Aquí es una columna para probar la celda extra (S en R15).

export const ACCIONES = [
  'crear',
  'leer',
  'actualizar',
  'firmar',
  'anular',
  'exportar',
  'solicitar',
] as const;
export type Accion = (typeof ACCIONES)[number];

export const RECURSOS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
  'R14',
  'R15',
  'R16',
  'R17',
  'R18',
  'R19',
  'R20',
  'R21',
  'R22',
  'R23',
  'R24',
] as const;
export type Recurso = (typeof RECURSOS)[number];

export const ROLES_MATRIZ = [
  'owner_plataforma',
  'soporte_plataforma',
  'admin',
  'asesor',
  'optometra',
  'director_cientifico',
  'auxiliar_clinico',
  'tecnico_lab',
  'auditor',
] as const;
export type RolMatriz = (typeof ROLES_MATRIZ)[number];

/** Alcance de una acción concedida. Lo no listado en la celda está denegado. */
export const ALCANCES = [
  'sede_activa',
  'sedes_autorizadas',
  'propios',
  'propios_borrador',
  'borrador_sede',
  'pacientes_sede',
  'perfil_propio',
  'metadatos',
  'agregados',
  'plataforma',
  'plan_propio',
] as const;
export type Alcance = (typeof ALCANCES)[number];

export interface Celda {
  acciones: Partial<Record<Accion, Alcance>>;
  /** Solo con break-glass vigente (justificación y vencimiento). Por defecto, denegado. */
  break_glass?: Partial<Record<Accion, Alcance>>;
  nota?: string;
}

export type Fila = Record<Recurso, Celda>;

const vacia = (): Celda => ({ acciones: {} });

function fila(parcial: Partial<Record<Recurso, Celda>>): Fila {
  const completa = {} as Fila;
  for (const recurso of RECURSOS) completa[recurso] = parcial[recurso] ?? vacia();
  return completa;
}

function celda(
  acciones: Partial<Record<Accion, Alcance>>,
  extra?: Pick<Celda, 'break_glass' | 'nota'>,
): Celda {
  return { acciones, ...extra };
}

const ownerPlataforma = fila({
  R18: celda({ leer: 'metadatos' }, { nota: 'Metadatos del tenant, sin contenido clínico.' }),
  R19: celda({ leer: 'plataforma' }, { nota: 'Bitácora de plataforma, no la del tenant.' }),
  R21: celda({ leer: 'agregados' }, { nota: 'Agregados sin datos personales.' }),
  R24: celda({ crear: 'plataforma', leer: 'plataforma', actualizar: 'plataforma', anular: 'plataforma' }),
});

const soportePlataforma = fila({
  R1: celda(
    {},
    { break_glass: { leer: 'sedes_autorizadas' }, nota: 'Sin break-glass no hay acceso.' },
  ),
  R3: celda(
    {},
    {
      break_glass: { leer: 'sedes_autorizadas' },
      nota: 'Break-glass de lectura. Por defecto denegado.',
    },
  ),
  R18: celda({ leer: 'metadatos' }),
  R24: celda({ leer: 'plataforma' }),
});

const admin = fila({
  R1: celda({ crear: 'sedes_autorizadas', leer: 'sedes_autorizadas', actualizar: 'sedes_autorizadas' }),
  R2: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  // TODO(Q-10): admin no lee HC. El valor por defecto de PREGUNTAS_ABIERTAS.md
  // es negar R3 aunque el admin también ejerza; lo clínico va por el rol profesional.
  R3: celda({}, { nota: 'TODO(Q-10): denegado por defecto.' }),
  R5: celda({ leer: 'sedes_autorizadas' }),
  R7: celda({
    crear: 'sedes_autorizadas',
    leer: 'sedes_autorizadas',
    actualizar: 'sedes_autorizadas',
    anular: 'sedes_autorizadas',
  }),
  R8: celda({ leer: 'sedes_autorizadas', anular: 'sedes_autorizadas' }),
  R9: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  R10: celda({ leer: 'sedes_autorizadas', solicitar: 'sedes_autorizadas' }),
  R11: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas', solicitar: 'sedes_autorizadas' }),
  R12: celda({ leer: 'sedes_autorizadas' }),
  R13: celda({
    crear: 'sedes_autorizadas',
    leer: 'sedes_autorizadas',
    actualizar: 'sedes_autorizadas',
    anular: 'sedes_autorizadas',
  }),
  R14: celda({
    crear: 'sedes_autorizadas',
    leer: 'sedes_autorizadas',
    actualizar: 'sedes_autorizadas',
    anular: 'sedes_autorizadas',
  }),
  R15: celda({ leer: 'sedes_autorizadas', solicitar: 'sedes_autorizadas' }),
  R16: celda({
    crear: 'sedes_autorizadas',
    leer: 'sedes_autorizadas',
    actualizar: 'sedes_autorizadas',
    anular: 'sedes_autorizadas',
  }),
  R17: celda({ crear: 'sedes_autorizadas', leer: 'sedes_autorizadas', actualizar: 'sedes_autorizadas' }),
  R18: celda({ crear: 'sedes_autorizadas', leer: 'sedes_autorizadas', actualizar: 'sedes_autorizadas' }),
  R19: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  R20: celda({
    crear: 'sedes_autorizadas',
    leer: 'sedes_autorizadas',
    actualizar: 'sedes_autorizadas',
    solicitar: 'sedes_autorizadas',
  }),
  R21: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  R22: celda({ solicitar: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  R23: celda({ solicitar: 'sedes_autorizadas' }),
  R24: celda({ leer: 'plan_propio' }),
});

const asesor = fila({
  R1: celda({ crear: 'sede_activa', leer: 'sede_activa', actualizar: 'sede_activa' }),
  R2: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R5: celda({ leer: 'sede_activa' }, { nota: 'Solo lectura. DTO reducido, sin diagnóstico.' }),
  R7: celda({
    crear: 'sede_activa',
    leer: 'sede_activa',
    actualizar: 'sede_activa',
    anular: 'sede_activa',
  }),
  R8: celda({
    crear: 'sede_activa',
    leer: 'sede_activa',
    actualizar: 'sede_activa',
    anular: 'sede_activa',
  }),
  R9: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R10: celda({ crear: 'propios', leer: 'propios' }),
  R11: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R12: celda({ crear: 'sede_activa', leer: 'sede_activa', actualizar: 'sede_activa' }),
  R13: celda({ leer: 'sede_activa' }),
  R15: celda({ crear: 'sede_activa', leer: 'sede_activa', actualizar: 'sede_activa' }),
  R16: celda({ leer: 'sede_activa' }),
  R17: celda({ leer: 'sede_activa' }),
  R18: celda({ leer: 'perfil_propio' }),
  R20: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R21: celda({ leer: 'propios' }),
});

const optometra = fila({
  R1: celda({ leer: 'pacientes_sede', actualizar: 'sede_activa' }),
  R2: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R3: celda({
    crear: 'sede_activa',
    leer: 'pacientes_sede',
    actualizar: 'propios_borrador',
    firmar: 'sede_activa',
    exportar: 'sede_activa',
  }),
  R4: celda({ crear: 'propios', leer: 'sede_activa', firmar: 'propios' }),
  R5: celda({
    crear: 'sede_activa',
    leer: 'sede_activa',
    firmar: 'sede_activa',
    exportar: 'sede_activa',
  }),
  R6: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R7: celda({ leer: 'propios', actualizar: 'propios' }),
  R8: celda({ leer: 'sede_activa' }),
  R12: celda({ leer: 'sede_activa', actualizar: 'sede_activa' }),
  R13: celda({ leer: 'sede_activa' }),
  R15: celda({ leer: 'sede_activa', actualizar: 'sede_activa' }),
  R17: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R18: celda({ leer: 'perfil_propio' }),
  R19: celda({ leer: 'propios' }),
  R20: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R21: celda({ leer: 'propios' }),
  R23: celda({ crear: 'sede_activa', exportar: 'sede_activa' }),
});

const directorCientifico: Fila = structuredClone(optometra);
directorCientifico.R15 = celda(
  { ...optometra.R15.acciones, solicitar: 'sede_activa' },
  { nota: 'TODO(Q-19): atributo director científico; suma S en garantías (R15).' },
);

const auxiliarClinico = fila({
  R1: celda({ crear: 'sede_activa', leer: 'sede_activa', actualizar: 'sede_activa' }),
  R2: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
  R3: celda({ crear: 'borrador_sede', actualizar: 'borrador_sede' }),
  R6: celda({ crear: 'sede_activa' }),
  R7: celda({ leer: 'sede_activa' }),
  R18: celda({ leer: 'perfil_propio' }),
  R20: celda({ crear: 'sede_activa', leer: 'sede_activa' }),
});

const tecnicoLab = fila({
  R5: celda({ leer: 'sede_activa' }, { nota: 'Mínimo necesario para producir. Sin diagnóstico.' }),
  R8: celda({ leer: 'sede_activa' }),
  R12: celda({ leer: 'sede_activa', actualizar: 'sede_activa' }),
  R13: celda({ leer: 'sede_activa', actualizar: 'sede_activa' }),
  R15: celda({ leer: 'sede_activa' }),
  R18: celda({ leer: 'perfil_propio' }),
});

const auditor = fila({
  R2: celda({ leer: 'sedes_autorizadas' }, { nota: 'Sin texto clínico en el DTO.' }),
  R9: celda({ leer: 'sedes_autorizadas' }),
  R10: celda({ leer: 'sedes_autorizadas' }),
  R11: celda({ leer: 'sedes_autorizadas' }),
  R12: celda({ leer: 'sedes_autorizadas' }),
  R13: celda({ leer: 'sedes_autorizadas' }),
  R14: celda({ leer: 'sedes_autorizadas' }),
  R15: celda({ leer: 'sedes_autorizadas' }),
  R16: celda({ leer: 'sedes_autorizadas' }),
  R17: celda({ leer: 'sedes_autorizadas' }),
  R19: celda({ leer: 'sedes_autorizadas', exportar: 'sedes_autorizadas' }),
  R20: celda({ leer: 'sedes_autorizadas' }),
  R21: celda({ leer: 'sedes_autorizadas' }),
});

export const MATRIZ: Record<RolMatriz, Fila> = {
  owner_plataforma: ownerPlataforma,
  soporte_plataforma: soportePlataforma,
  admin,
  asesor,
  optometra,
  director_cientifico: directorCientifico,
  auxiliar_clinico: auxiliarClinico,
  tecnico_lab: tecnicoLab,
  auditor,
};

/** Alias de sesión y de la spec §4.1 hacia la columna de la matriz. */
export const ALIAS_ROL: Record<string, RolMatriz> = {
  owner: 'owner_plataforma',
  owner_plataforma: 'owner_plataforma',
  soporte: 'soporte_plataforma',
  soporte_plataforma: 'soporte_plataforma',
  admin: 'admin',
  asesor: 'asesor',
  optometra: 'optometra',
  // Mismo módulo clínico que optometra (spec §4.1). No es columna propia.
  oftalmologo: 'optometra',
  director_cientifico: 'director_cientifico',
  auxiliar: 'auxiliar_clinico',
  auxiliar_clinico: 'auxiliar_clinico',
  tecnico_lab: 'tecnico_lab',
  auditor: 'auditor',
};

export function rolMatriz(rol: string): RolMatriz | null {
  return ALIAS_ROL[rol] ?? null;
}

/**
 * Recurso con tabla en esta tarea. El resto (clínico, ventas, caja) aún no
 * tiene tabla: la prueba de BD solo corre donde hay fila.
 * R18 se refleja en `permisos_extra` (excepciones de la spec SEG-02).
 */
export const TABLA_POR_RECURSO: Partial<Record<Recurso, 'permisos_extra'>> = {
  R18: 'permisos_extra',
};

export const ESCENARIOS = ['propia', 'otra_autorizada', 'ajena', 'otro_tenant'] as const;
export type Escenario = (typeof ESCENARIOS)[number];

const ALCANCE_SIN_SEDE = new Set<Alcance>(['agregados', 'plataforma', 'plan_propio']);
const ALCANCE_SEDES = new Set<Alcance>(['sedes_autorizadas', 'metadatos', 'perfil_propio']);

/** Interpretación de la celda para el escenario. Lo usan las pruebas generadas. */
export function debePermitir(alcance: Alcance | undefined, escenario: Escenario): boolean {
  if (!alcance) return false;
  if (escenario === 'otro_tenant') return false;
  if (ALCANCE_SIN_SEDE.has(alcance)) return true;
  if (escenario === 'ajena') return false;
  if (escenario === 'otra_autorizada') return ALCANCE_SEDES.has(alcance);
  return true;
}

export interface CasoMatriz {
  id: string;
  rol: RolMatriz;
  recurso: Recurso;
  accion: Accion;
  escenario: Escenario;
  esperado: boolean;
  tabla?: 'permisos_extra';
}

/** Un caso por celda y, además, sede propia, sede autorizada, sede ajena y otro tenant. */
export function casosGenerados(): CasoMatriz[] {
  const casos: CasoMatriz[] = [];
  for (const rol of ROLES_MATRIZ) {
    for (const recurso of RECURSOS) {
      const celdaRol = MATRIZ[rol][recurso];
      for (const accion of ACCIONES) {
        const alcance = celdaRol.acciones[accion];
        for (const escenario of ESCENARIOS) {
          casos.push({
            id: `${rol}:${recurso}:${accion}:${escenario}`,
            rol,
            recurso,
            accion,
            escenario,
            esperado: debePermitir(alcance, escenario),
            tabla: TABLA_POR_RECURSO[recurso],
          });
        }
      }
    }
  }
  return casos;
}

export function celdasDeLaMatriz(): number {
  return ROLES_MATRIZ.length * RECURSOS.length;
}
