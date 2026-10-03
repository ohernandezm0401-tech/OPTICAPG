// ADM-01 (T16) — Alta y consulta de sedes. La guarda de escritura es R18.
'use server';

import { z } from 'zod';

import { asegurarNucleoDemo, SEDE_DEMO, TENANT_DEMO, usuarioDemo } from '@/db/pacientes-demo';
import {
  bannerCertificadoVencido,
  ErrorSede,
  guardarSede,
  idsSedesDelUsuario,
  listarSedesHabilitacion,
  listarUsuariosSede,
  type ContextoSede,
  type EntradaSede,
  type VistaSede,
} from '@/db/sedes-habilitacion';
import { auth } from '@/lib/auth';
import { esProduccion } from '@/lib/entorno';
import { ErrorAutorizacion } from '@/lib/authz/exigir';

const UUID = z.uuid();

function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.safeParse(valor).success;
}

async function contextoDemo(rol: string): Promise<ContextoSede> {
  const usuarioId = usuarioDemo(rol);
  if (!usuarioId) throw new ErrorAutorizacion('Este rol no administra sedes.');
  await asegurarNucleoDemo();
  const sedes = await idsSedesDelUsuario(TENANT_DEMO, usuarioId);
  const lista = sedes.length > 0 ? sedes : [SEDE_DEMO];
  return {
    tenant_id: TENANT_DEMO,
    usuario_id: usuarioId,
    sede_id: lista[0],
    sedes: lista,
    rol: rol === 'auxiliar' ? 'auxiliar_clinico' : rol,
  };
}

async function contexto(): Promise<ContextoSede> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.role) throw new ErrorAutorizacion('Debe iniciar sesión.');
  const rol = usuario.role;
  if (esUuid(usuario.empresaId) && esUuid(usuario.id) && esUuid(usuario.sedeId)) {
    const sedes = (usuario.sedesAccess ?? []).filter(esUuid);
    const lista = sedes.length > 0 ? sedes : [usuario.sedeId];
    return {
      tenant_id: usuario.empresaId,
      usuario_id: usuario.id,
      sede_id: usuario.sedeId,
      sedes: lista,
      rol,
    };
  }
  if (esProduccion() || usuario.devLocal !== true) {
    throw new ErrorAutorizacion('La sesión no tiene un tenant válido.');
  }
  return contextoDemo(rol);
}

export interface ResultadoGuardarSede {
  ok: boolean;
  mensaje?: string;
  codigo?: string;
  sede?: VistaSede;
}

function fallo(error: unknown): ResultadoGuardarSede {
  if (error instanceof ErrorSede || error instanceof ErrorAutorizacion) {
    return { ok: false, mensaje: error.message, codigo: error instanceof ErrorSede ? error.codigo : 'permiso' };
  }
  if (error instanceof z.ZodError) {
    return { ok: false, mensaje: error.issues[0]?.message ?? 'Datos inválidos', codigo: 'validacion' };
  }
  throw error;
}

export async function accionListarSedes(): Promise<{ sedes: VistaSede[]; usuarios: { id: string; email: string }[] }> {
  const ctx = await contexto();
  const [sedes, usuarios] = await Promise.all([listarSedesHabilitacion(ctx), listarUsuariosSede(ctx)]);
  return { sedes, usuarios };
}

export async function accionGuardarSede(entrada: EntradaSede): Promise<ResultadoGuardarSede> {
  try {
    const ctx = await contexto();
    const sede = await guardarSede(ctx, entrada);
    return { ok: true, sede };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionLeerBanner(): Promise<{ nombre: string; sede_id: string } | null> {
  try {
    const sesion = await auth();
    const usuario = sesion?.user;
    if (!usuario?.role) return null;
    if (esUuid(usuario.empresaId) && esUuid(usuario.id) && esUuid(usuario.sedeId)) {
      const sedes = (usuario.sedesAccess ?? []).filter(esUuid);
      const lista = sedes.length > 0 ? sedes : [usuario.sedeId];
      return await bannerCertificadoVencido({
        tenant_id: usuario.empresaId,
        usuario_id: usuario.id,
        sede_id: usuario.sedeId,
        sedes: lista,
        rol: usuario.role,
      });
    }
    if (esProduccion() || usuario.devLocal !== true) return null;
    const usuarioId = usuarioDemo(usuario.role);
    if (!usuarioId) return null;
    const sedes = await idsSedesDelUsuario(TENANT_DEMO, usuarioId);
    if (sedes.length === 0) return null;
    return await bannerCertificadoVencido({
      tenant_id: TENANT_DEMO,
      usuario_id: usuarioId,
      sede_id: sedes[0],
      sedes,
      rol: usuario.role,
    });
  } catch {
    return null;
  }
}
