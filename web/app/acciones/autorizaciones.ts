// SEG-05 (T15) — Acciones de autorización y política. La guarda de sesión es la de T09.
'use server';

import { headers } from 'next/headers';
import { z } from 'zod';

import { asegurarNucleoDemo, SEDE_DEMO, TENANT_DEMO, usuarioDemo } from '@/db/pacientes-demo';
import {
  crearFinalidadOpcional,
  ErrorAutorizacionDatos,
  estadoPaciente,
  evaluarApertura,
  evaluarContacto,
  exportarEvidencia,
  guardarPolitica,
  leerPolitica,
  listarPlantillas,
  publicarVersionTexto,
  registrarDecisiones,
  revocarContacto,
  type ContextoAutorizacion,
} from '@/db/autorizaciones';
import { auth } from '@/lib/auth';
import { esProduccion } from '@/lib/entorno';
import type { ActorAuthz } from '@/lib/authz/ability';
import { exigirPuede, ErrorAutorizacion } from '@/lib/authz/exigir';
import type { PoliticaTratamiento } from '@/dominio/autorizacion-textos';

const UUID = z.uuid();

function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.safeParse(valor).success;
}

async function contexto(): Promise<{ ctx: ContextoAutorizacion; actor: ActorAuthz }> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.role) throw new ErrorAutorizacion('Debe iniciar sesión.');
  const rol = usuario.role;
  if (esUuid(usuario.empresaId) && esUuid(usuario.id) && esUuid(usuario.sedeId)) {
    const sedes = (usuario.sedesAccess ?? []).filter(esUuid);
    const ctx: ContextoAutorizacion = {
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
        tarjetaProfesionalVigente: true,
      },
    };
  }
  if (esProduccion() || usuario.devLocal !== true) {
    throw new ErrorAutorizacion('La sesión no tiene un tenant válido.');
  }
  const usuarioId = usuarioDemo(rol);
  if (!usuarioId) throw new ErrorAutorizacion('Este rol no registra autorizaciones.');
  await asegurarNucleoDemo();
  const ctx: ContextoAutorizacion = {
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

function fallo(error: unknown): { ok: false; errores: string[] } | null {
  if (error instanceof ErrorAutorizacionDatos || error instanceof ErrorAutorizacion) {
    return { ok: false, errores: [error.message] };
  }
  return null;
}

async function red(): Promise<{ ip: string; agente: string }> {
  const cabeceras = await headers();
  const reenviada = cabeceras.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ip = /^[0-9A-Za-z.:[\]]+$/.test(reenviada) ? reenviada : '127.0.0.1';
  return { ip, agente: cabeceras.get('user-agent') ?? 'desconocido' };
}

export async function accionListarPlantillas() {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, plantillas: await listarPlantillas(ctx) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionEstadoAutorizacion(pacienteId: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, estado: await estadoPaciente(ctx, pacienteId) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionRegistrarAutorizacion(entrada: {
  pacienteId: string;
  medio: string;
  tratamiento: 'otorgada' | 'negada' | null;
  contacto: boolean;
  opcionales: string[];
  trazoPngBase64?: string | null;
  trazoPuntos?: unknown;
  acuerdoFirma?: boolean;
}) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'crear', sujeto(actor));
  const { ip, agente } = await red();
  try {
    const trazo = entrada.trazoPngBase64 ? Buffer.from(entrada.trazoPngBase64, 'base64') : null;
    const resultado = await registrarDecisiones(ctx, {
      pacienteId: entrada.pacienteId,
      medio: entrada.medio,
      ip,
      agente,
      tratamiento: entrada.tratamiento,
      contacto: entrada.contacto,
      opcionales: entrada.opcionales,
      trazoPng: trazo,
      trazoPuntos: entrada.trazoPuntos,
      acuerdoFirma: entrada.acuerdoFirma === true,
    });
    return { ok: true as const, resultado };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionRevocarContacto(pacienteId: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'actualizar', sujeto(actor));
  try {
    return { ok: true as const, resultado: await revocarContacto(ctx, pacienteId) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionExportarEvidencia(autorizacionId: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, evidencia: await exportarEvidencia(ctx, autorizacionId) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionPuedeAbrirAtencion(pacienteId: string, urgencia: boolean) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, decision: await evaluarApertura(ctx, pacienteId, urgencia) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionPuedeContactar(pacienteId: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, decision: await evaluarContacto(ctx, pacienteId, 'paciente') };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionLeerPolitica() {
  const { ctx, actor } = await contexto();
  if (actor.rol !== 'admin') {
    return { ok: false as const, errores: ['Solo el administrador edita la política de tratamiento.'] };
  }
  exigirPuede(actor, 'leer', sujeto(actor));
  try {
    return { ok: true as const, politica: await leerPolitica(ctx) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionGuardarPolitica(entrada: PoliticaTratamiento) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'actualizar', sujeto(actor));
  if (actor.rol !== 'admin') {
    return { ok: false as const, errores: ['Solo el administrador edita la política de tratamiento.'] };
  }
  try {
    return { ok: true as const, politica: await guardarPolitica(ctx, entrada) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionPublicarTexto(codigo: string, contenido: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'actualizar', sujeto(actor));
  try {
    return { ok: true as const, texto: await publicarVersionTexto(ctx, { codigo, contenido }) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}

export async function accionCrearFinalidadOpcional(codigo: string, etiqueta: string, contenido: string) {
  const { ctx, actor } = await contexto();
  exigirPuede(actor, 'crear', sujeto(actor));
  try {
    return { ok: true as const, finalidad: await crearFinalidadOpcional(ctx, { codigo, etiqueta, contenido }) };
  } catch (error) {
    const respuesta = fallo(error);
    if (respuesta) return respuesta;
    throw error;
  }
}
