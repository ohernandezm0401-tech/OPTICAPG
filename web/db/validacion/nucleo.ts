// PLT-02 (T03) — DTOs del núcleo validados con Zod en el borde (entrada y
// salida). Cada acción de `db/nucleo.ts` valida con estos esquemas antes de
// tocar la base de datos. Nada fiscal ni de plazos legales se quema en código:
// sin valores por defecto inventados (regla 4; TODO(Q-nn) donde aplique).
import { z } from 'zod';

import {
  ESTADOS_SEDE,
  ESTADOS_TENANT,
  ESTADOS_USUARIO,
  ROLES_SEDE,
  TIPOS_SEDE,
} from '../esquema/nucleo';

const UUID = z.uuid('debe ser un UUID válido');

// NIT colombiano: dígitos, puntos y guion (p. ej. `900.123.456-7`). Formato
// libre validado por el cliente; el dígito de verificación va aparte.
const NIT = z
  .string('el NIT es obligatorio')
  .trim()
  .min(4, 'el NIT es demasiado corto')
  .max(20, 'el NIT es demasiado largo')
  .regex(/^[0-9.\-]+$/, 'el NIT solo admite dígitos, puntos y guion');

export const EsquemaTenantEntrada = z.object({
  razon_social: z.string('la razón social es obligatoria').trim().min(3).max(200),
  nit: NIT,
  digito_verificacion: z
    .string()
    .trim()
    .regex(/^[0-9]$/, 'el dígito de verificación es un dígito')
    .nullish(),
  estado: z.enum(ESTADOS_TENANT).default('onboarding'),
  plan_id: z.string().trim().max(60).nullish(),
  politica_url: z.url('la URL de la política no es válida').nullish(),
});

export const EsquemaSedeEntrada = z.object({
  tenant_id: UUID,
  nombre: z.string('el nombre es obligatorio').trim().min(3).max(200),
  ciudad: z.string('la ciudad es obligatoria').trim().min(2).max(120),
  direccion: z.string().trim().max(250).nullish(),
  tipo: z.enum(TIPOS_SEDE).default('optica_sin_consultorio'),
  reps_codigo: z.string().trim().max(60).nullish(),
  estado: z.enum(ESTADOS_SEDE).default('activa'),
});

export const EsquemaUsuarioEntrada = z.object({
  tenant_id: UUID,
  email: z.email('el correo no es válido').trim().toLowerCase().max(254),
  hash_password: z.string().max(500).nullish(),
  estado: z.enum(ESTADOS_USUARIO).default('invitado'),
});

export const EsquemaMembresiaEntrada = z.object({
  tenant_id: UUID,
  usuario_id: UUID,
  sede_id: UUID,
  rol: z.enum(ROLES_SEDE),
});

export const EsquemaSesionEntrada = z.object({
  tenant_id: UUID,
  usuario_id: UUID,
  // Duración en minutos desde la apertura. Sin valor legal inventado: lo
  // define quien abre la sesión (SEG-01 la acota en T05).
  duracion_minutos: z.number().int().positive().max(60 * 24),
  direccion_ip: z.string().trim().max(60).nullish(),
  agente: z.string().trim().max(300).nullish(),
});

export type TenantEntrada = z.input<typeof EsquemaTenantEntrada>;
export type SedeEntrada = z.input<typeof EsquemaSedeEntrada>;
export type UsuarioEntrada = z.input<typeof EsquemaUsuarioEntrada>;
export type MembresiaEntrada = z.input<typeof EsquemaMembresiaEntrada>;
export type SesionEntrada = z.input<typeof EsquemaSesionEntrada>;
