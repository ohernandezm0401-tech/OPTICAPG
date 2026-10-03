// ASE-01 / SEG-06 (T13) — Acciones de recepción. La guarda es la de T09.
'use server';

import { z } from 'zod';

import { asegurarNucleoDemo, SEDE_DEMO, TENANT_DEMO, usuarioDemo } from '@/db/pacientes-demo';
import {
  abrirPaciente,
  buscarPacientes,
  ErrorPaciente,
  guardarPaciente,
  type ContextoPaciente,
} from '@/db/pacientes';
import { auth } from '@/lib/auth';
import { esProduccion } from '@/lib/entorno';
import type { ActorAuthz } from '@/lib/authz/ability';
import { exigirPuede, ErrorAutorizacion } from '@/lib/authz/exigir';
import type { PacienteEntrada } from '@/dominio/pacientes';

const UUID = z.uuid();

function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.safeParse(valor).success;
}

async function contexto(): Promise<{ ctx: ContextoPaciente; actor: ActorAuthz }> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.role) throw new ErrorAutorizacion('Debe iniciar sesión.');
  const rol = usuario.role;
  if (esUuid(usuario.empresaId) && esUuid(usuario.id) && esUuid(usuario.sedeId)) {
    const sedes = (usuario.sedesAccess ?? []).filter(esUuid);
    const ctx: ContextoPaciente = {
      tenant_id: usuario.empresaId,
      usuario_id: usuario.id,
      sede_id: usuario.sedeId,
      sedes: sedes.length > 0 ? sedes : [usuario.sedeId],
      rol,
    };
    return {
      ctx,
      actor: {
        id: ctx.usuario_id,
        rol,
        tenantId: ctx.tenant_id,
        sedeActiva: ctx.sede_id,
        sedesAutorizadas: ctx.sedes,
        tarjetaProfesionalVigente: rol === 'optometra' || rol === 'oftalmologo' ? false : true,
      },
    };
  }
  if (esProduccion() || usuario.devLocal !== true) {
    throw new ErrorAutorizacion('La sesión no tiene un tenant válido.');
  }
  const usuarioId = usuarioDemo(rol);
  if (!usuarioId) throw new ErrorAutorizacion('Este rol no registra pacientes.');
  await asegurarNucleoDemo();
  const ctx: ContextoPaciente = {
    tenant_id: TENANT_DEMO,
    usuario_id: usuarioId,
    sede_id: SEDE_DEMO,
    sedes: [SEDE_DEMO],
    rol: rol === 'auxiliar' ? 'auxiliar_clinico' : rol,
  };
  return {
    ctx,
    actor: {
      id: usuarioId,
      rol: ctx.rol,
      tenantId: ctx.tenant_id,
      sedeActiva: ctx.sede_id,
      sedesAutorizadas: ctx.sedes,
      tarjetaProfesionalVigente: true,
    },
  };
}

function sujeto(actor: ActorAuthz) {
  return {
    tipo: 'R1' as const,
    tenantId: actor.tenantId,
    sedeId: actor.sedeActiva,
    pacientesEnSede: true,
  };
}

export async function accionBuscarPacientes(termino: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  return buscarPacientes(ctx, termino ?? '');
}

export async function accionAbrirPaciente(id: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, ficha: await abrirPaciente(ctx, id) };
  } catch (error) {
    if (error instanceof ErrorPaciente) return { ok: false as const, errores: error.errores.length ? error.errores : [error.message] };
    throw error;
  }
}

export async function accionGuardarPaciente(
  entrada: PacienteEntrada & { id?: string; cerrar_vigencia_representante?: boolean },
) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, entrada.id ? 'actualizar' : 'crear', sujeto(actor));
  try {
    const resultado = await guardarPaciente(ctx, entrada);
    return { ok: true as const, resultado };
  } catch (error) {
    if (error instanceof ErrorPaciente) {
      return { ok: false as const, errores: error.errores.length ? error.errores : [error.message] };
    }
    throw error;
  }
}
