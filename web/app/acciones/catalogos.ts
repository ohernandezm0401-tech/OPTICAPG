// OPT-10 (T18) — Búsqueda de catálogos y glosario editable por el admin.
'use server';

import { z } from 'zod';

import { asegurarNucleoDemo, SEDE_DEMO, TENANT_DEMO, usuarioDemo } from '@/db/pacientes-demo';
import {
  buscarCatalogo,
  eliminarAbreviatura,
  ErrorCatalogo,
  guardarAbreviatura,
  listarGlosario,
  revisarTextoClinico,
  sembrarAbreviaturasIniciales,
  type FilaCatalogo,
  type FilaGlosario,
  type TipoCatalogo,
} from '@/db/catalogos';
import type { ContextoTenant } from '@/db/tenant';
import { auth } from '@/lib/auth';
import { esProduccion } from '@/lib/entorno';
import { ErrorAutorizacion } from '@/lib/authz/exigir';

const UUID = z.uuid();

function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.safeParse(valor).success;
}

function puedeEditar(rol: string | null | undefined): boolean {
  return rol === 'admin';
}

async function contextoDemo(rol: string): Promise<ContextoTenant> {
  const usuarioId = usuarioDemo(rol);
  if (!usuarioId) throw new ErrorAutorizacion('Debe iniciar sesión.');
  await asegurarNucleoDemo();
  return {
    tenant_id: TENANT_DEMO,
    usuario_id: usuarioId,
    sede_id: SEDE_DEMO,
    sedes: [SEDE_DEMO],
    rol,
  };
}

async function contexto(): Promise<ContextoTenant> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.role) throw new ErrorAutorizacion('Debe iniciar sesión.');
  if (esUuid(usuario.empresaId) && esUuid(usuario.id)) {
    const sedes = (usuario.sedesAccess ?? []).filter(esUuid);
    return {
      tenant_id: usuario.empresaId,
      usuario_id: usuario.id,
      sede_id: esUuid(usuario.sedeId) ? usuario.sedeId : sedes[0],
      sedes: sedes.length > 0 ? sedes : esUuid(usuario.sedeId) ? [usuario.sedeId] : [],
      rol: usuario.role,
    };
  }
  if (esProduccion() || usuario.devLocal !== true) {
    throw new ErrorAutorizacion('La sesión no tiene un tenant válido.');
  }
  return contextoDemo(usuario.role);
}

export interface ResultadoBusqueda {
  ok: boolean;
  mensaje?: string;
  filas: FilaCatalogo[];
}

export async function accionBuscarCatalogo(entrada: {
  tipo: TipoCatalogo;
  consulta: string;
}): Promise<ResultadoBusqueda> {
  try {
    await contexto();
    if (entrada.tipo !== 'cie10' && entrada.tipo !== 'cups') {
      return { ok: false, mensaje: 'El tipo de catálogo no es válido.', filas: [] };
    }
    const filas = await buscarCatalogo(entrada.tipo, entrada.consulta ?? '');
    return { ok: true, filas };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) return { ok: false, mensaje: error.message, filas: [] };
    throw error;
  }
}

export interface ResultadoGlosario {
  ok: boolean;
  mensaje?: string;
  filas: FilaGlosario[];
  puedeEditar: boolean;
}

export async function accionListarGlosario(): Promise<ResultadoGlosario> {
  try {
    const ctx = await contexto();
    const filas = await listarGlosario(ctx);
    return { ok: true, filas, puedeEditar: puedeEditar(ctx.rol) };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return { ok: false, mensaje: error.message, filas: [], puedeEditar: false };
    }
    throw error;
  }
}

async function exigirEditor(): Promise<ContextoTenant> {
  const ctx = await contexto();
  if (!puedeEditar(ctx.rol)) {
    throw new ErrorAutorizacion('Solo el administrador de la óptica edita el glosario.');
  }
  return ctx;
}

export async function accionGuardarAbreviatura(entrada: {
  abreviatura: string;
  expansion: string;
}): Promise<ResultadoGlosario> {
  try {
    const ctx = await exigirEditor();
    await guardarAbreviatura(ctx, entrada);
    const filas = await listarGlosario(ctx);
    return { ok: true, filas, puedeEditar: true };
  } catch (error) {
    if (error instanceof ErrorCatalogo || error instanceof ErrorAutorizacion) {
      return { ok: false, mensaje: error.message, filas: [], puedeEditar: true };
    }
    throw error;
  }
}

export async function accionSembrarGlosario(): Promise<ResultadoGlosario> {
  try {
    const ctx = await exigirEditor();
    const filas = await sembrarAbreviaturasIniciales(ctx);
    return { ok: true, filas, puedeEditar: true };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return { ok: false, mensaje: error.message, filas: [], puedeEditar: false };
    }
    throw error;
  }
}

export async function accionEliminarAbreviatura(id: string): Promise<ResultadoGlosario> {
  try {
    const ctx = await exigirEditor();
    if (!UUID.safeParse(id).success) {
      return { ok: false, mensaje: 'La abreviatura no es válida.', filas: [], puedeEditar: true };
    }
    await eliminarAbreviatura(ctx, id);
    const filas = await listarGlosario(ctx);
    return { ok: true, filas, puedeEditar: true };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return { ok: false, mensaje: error.message, filas: [], puedeEditar: false };
    }
    throw error;
  }
}

export interface ResultadoAdvertencia {
  ok: boolean;
  mensaje?: string;
  texto: string;
  bloquea: boolean;
  advertencias: { abreviatura: string; mensaje: string }[];
}

export async function accionRevisarAbreviaturas(texto: string): Promise<ResultadoAdvertencia> {
  try {
    const ctx = await contexto();
    const revision = await revisarTextoClinico(ctx, texto ?? '');
    return { ok: true, texto: revision.texto, bloquea: revision.bloquea, advertencias: revision.advertencias };
  } catch (error) {
    if (error instanceof ErrorAutorizacion) {
      return { ok: false, mensaje: error.message, texto: texto ?? '', bloquea: false, advertencias: [] };
    }
    throw error;
  }
}
