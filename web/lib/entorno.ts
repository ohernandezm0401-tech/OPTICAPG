// PLT-10 (T05) — Entornos y guardas de arranque (módulo puro).
//
// `APP_ENV` se valida con Zod al arrancar (ver `instrumentation.ts`). En
// `produccion` la app no arranca si detecta el secreto de ejemplo, el modo de
// demostración, la bandera de datos sintéticos, el adaptador de facturación
// simulado o rastros de credenciales/semillas de desarrollo.
//
// Este módulo es deliberadamente puro (sin `node:*`): lo importan `lib/auth.ts`
// (que también se empaqueta para el middleware en el runtime Edge) y las
// pruebas unitarias. El acceso a disco vive en `instrumentation.ts`, que corre
// en Node y le inyecta `existeArchivo` a `validarArranque()`.
import { z } from 'zod';

// Valores admitidos. `demo` es un alias histórico de `desarrollo` solo para
// uso local (compatibilidad con `APP_MODE=demo` de T03); nunca en producción.
export const ENTORNOS_VALIDOS = ['desarrollo', 'pruebas', 'demo', 'produccion'] as const;

export const EsquemaAppEnv = z.enum(ENTORNOS_VALIDOS, {
  message: `APP_ENV debe ser uno de: ${ENTORNOS_VALIDOS.join('|')}`,
});

export type AppEnv = z.infer<typeof EsquemaAppEnv>;

// Entorno mínimo necesario para validar (compatible con `process.env` y con
// objetos parciales en pruebas).
export type VariablesEntorno = Record<string, string | undefined>;

// Valor de ejemplo de `web/.env.example`. Nunca válido en producción.
export const SECRETO_EJEMPLO = 'cambia-este-secreto-solo-en-local';

// Longitud mínima del secreto de sesión en producción (32 bytes en base64
// ocupan 44 caracteres; se exigen 32 como mínimo absoluto).
const LONGITUD_MINIMA_SECRETO = 32;

export type ExisteArchivo = (ruta: string) => boolean;

export function obtenerAppEnv(variables: VariablesEntorno = process.env): AppEnv {
  const crudo = variables.APP_ENV?.trim();
  if (!crudo) {
    // Sin variable: en producción se asume producción (postura segura); en
    // cualquier otro caso, desarrollo local.
    return variables.NODE_ENV === 'production' ? 'produccion' : 'desarrollo';
  }
  return EsquemaAppEnv.parse(crudo);
}

export function esProduccion(variables: VariablesEntorno = process.env): boolean {
  return obtenerAppEnv(variables) === 'produccion';
}

function secretoSesion(variables: VariablesEntorno): string {
  return (variables.AUTH_SECRET ?? variables.NEXTAUTH_SECRET ?? '').trim();
}

function modoDemostracionActivo(variables: VariablesEntorno): boolean {
  return variables.APP_MODE === 'demo' || variables.NEXT_PUBLIC_APP_MODE === 'demo';
}

function banderaSinteticosActiva(variables: VariablesEntorno): boolean {
  return variables.DATOS_SINTETICOS === 'true' || variables.SEED_DEMO === 'true';
}

function adaptadorSimuladoActivo(variables: VariablesEntorno): boolean {
  return variables.FACTURACION_ADAPTADOR === 'simulado';
}

// Lista los motivos que impiden arrancar en producción. Vacía = puede
// arrancar. `nombresRastros` son los nombres de archivo de desarrollo que no
// pueden existir en producción (los resuelve quien accede a disco, ver
// `instrumentation.ts`); `existeArchivo` permite inyectar un sistema de
// archivos falso en pruebas.
export function listarProblemasProduccion(
  variables: VariablesEntorno = process.env,
  nombresRastros: string[] = [],
  existeArchivo?: ExisteArchivo,
): string[] {
  const problemas: string[] = [];
  const secreto = secretoSesion(variables);

  if (!secreto) {
    problemas.push(
      'falta AUTH_SECRET (genere uno con: openssl rand -base64 32; ver docs/ENTORNOS.md).',
    );
  } else if (secreto === SECRETO_EJEMPLO || secreto.length < LONGITUD_MINIMA_SECRETO) {
    problemas.push(
      'AUTH_SECRET usa el valor de ejemplo o es demasiado corto (genere uno con: openssl rand -base64 32).',
    );
  }

  if (modoDemostracionActivo(variables)) {
    problemas.push(
      'el modo de demostración está activo (APP_MODE=demo); en producción debe estar ausente.',
    );
  }

  if (banderaSinteticosActiva(variables)) {
    problemas.push(
      'la bandera de datos sintéticos está activa (DATOS_SINTETICOS=true); en producción debe estar ausente.',
    );
  }

  if (adaptadorSimuladoActivo(variables)) {
    problemas.push(
      'el adaptador de facturación está en modo simulado; en producción exige un adaptador real (ver docs/ENTORNOS.md).',
    );
  }

  if (existeArchivo) {
    const rastros = nombresRastros.filter((nombre) => {
      try {
        return existeArchivo(nombre);
      } catch {
        return false;
      }
    });
    if (rastros.length > 0) {
      problemas.push(
        `se detectaron credenciales o semillas de desarrollo (${rastros.join(', ')}); ` +
          'retírelas antes de arrancar en producción.',
      );
    }
  }

  return problemas;
}

// Valida el entorno actual y aborta con un mensaje claro si producción no
// cumple las guardas. Devuelve el entorno validado.
export function validarArranque(
  variables: VariablesEntorno = process.env,
  nombresRastros: string[] = [],
  existeArchivo?: ExisteArchivo,
): AppEnv {
  const entorno = obtenerAppEnv(variables);
  if (entorno !== 'produccion') return entorno;
  const problemas = listarProblemasProduccion(variables, nombresRastros, existeArchivo);
  if (problemas.length > 0) {
    throw new Error(
      `La aplicación no arranca con APP_ENV=produccion:\n` +
        problemas.map((p) => ` - ${p}`).join('\n'),
    );
  }
  return entorno;
}
