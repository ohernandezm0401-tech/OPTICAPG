// ADM-02 (T17) — Invitación, rol por sede y perfil profesional.
'use server';

import { z } from 'zod';

import { asegurarNucleoDemo, SEDE_DEMO, TENANT_DEMO, usuarioDemo } from '@/db/pacientes-demo';
import { idsSedesDelUsuario } from '@/db/sedes-habilitacion';
import {
  ErrorUsuario,
  aceptarInvitacion,
  cambiarRol,
  desactivarUsuario,
  guardarPerfilManual,
  invitarUsuario,
  listarFirmasHistoricas,
  listarUsuarios,
  type ContextoUsuario,
  type VistaFirmaHistorica,
  type VistaUsuario,
} from '@/db/usuarios-adm';
import { auth } from '@/lib/auth';
import { esProduccion } from '@/lib/entorno';
import { ErrorAutorizacion } from '@/lib/authz/exigir';

const UUID = z.uuid();

function esUuid(valor: string | null | undefined): valor is string {
  return !!valor && UUID.safeParse(valor).success;
}

async function contextoDemo(rol: string): Promise<ContextoUsuario> {
  const usuarioId = usuarioDemo(rol);
  if (!usuarioId) throw new ErrorAutorizacion('Este rol no administra usuarios.');
  await asegurarNucleoDemo();
  const sedes = await idsSedesDelUsuario(TENANT_DEMO, usuarioId);
  const lista = sedes.length > 0 ? sedes : [SEDE_DEMO];
  return {
    tenant_id: TENANT_DEMO,
    usuario_id: usuarioId,
    sede_id: lista[0],
    sedes: lista,
    rol: rol === 'auxiliar' ? 'auxiliar_clinico' : rol,
    sesion_id: null,
  };
}

async function contexto(): Promise<ContextoUsuario> {
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
      sesion_id: esUuid(usuario.sesionId) ? usuario.sesionId : null,
    };
  }
  if (esProduccion() || usuario.devLocal !== true) {
    throw new ErrorAutorizacion('La sesión no tiene un tenant válido.');
  }
  return contextoDemo(rol);
}

export interface ResultadoUsuario {
  ok: boolean;
  mensaje?: string;
  codigo?: string;
  enlace?: string;
  usuarios?: VistaUsuario[];
  firmas?: VistaFirmaHistorica[];
}

function fallo(error: unknown): ResultadoUsuario {
  if (error instanceof ErrorUsuario || error instanceof ErrorAutorizacion) {
    return { ok: false, mensaje: error.message, codigo: error instanceof ErrorUsuario ? error.codigo : 'permiso' };
  }
  if (error instanceof z.ZodError) {
    return { ok: false, mensaje: error.issues[0]?.message ?? 'Datos inválidos', codigo: 'validacion' };
  }
  throw error;
}

export async function accionListarUsuarios(): Promise<ResultadoUsuario> {
  try {
    const ctx = await contexto();
    return { ok: true, usuarios: await listarUsuarios(ctx) };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionInvitarUsuario(entrada: {
  email: string;
  sedeId: string;
  rol: string;
}): Promise<ResultadoUsuario> {
  try {
    const ctx = await contexto();
    const creado = await invitarUsuario(ctx, entrada);
    return {
      ok: true,
      enlace: creado.enlace,
      mensaje: 'Invitación registrada. Este entorno no envía el correo.',
      usuarios: await listarUsuarios(ctx),
    };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionCambiarRol(entrada: {
  usuarioId: string;
  sedeId: string;
  rolAnterior: string;
  rolNuevo: string;
}): Promise<ResultadoUsuario> {
  try {
    const ctx = await contexto();
    await cambiarRol(ctx, entrada);
    return { ok: true, mensaje: 'Rol actualizado.', usuarios: await listarUsuarios(ctx) };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionDesactivarUsuario(usuarioId: string): Promise<ResultadoUsuario> {
  try {
    const ctx = await contexto();
    await desactivarUsuario(ctx, usuarioId);
    return {
      ok: true,
      mensaje: 'Usuario desactivado. Sus firmas históricas siguen visibles.',
      usuarios: await listarUsuarios(ctx),
      firmas: await listarFirmasHistoricas(ctx, usuarioId),
    };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionGuardarPerfil(entrada: {
  usuarioId: string;
  nombreCompleto: string;
  documento: string;
  tipo: string;
  registroProfesional: string;
  entidad: string;
  vigenteHasta: string;
  firmaPngBase64: string;
  verificadoManual: boolean;
}): Promise<ResultadoUsuario> {
  try {
    const ctx = await contexto();
    const png = entrada.firmaPngBase64 ? Buffer.from(entrada.firmaPngBase64, 'base64') : null;
    await guardarPerfilManual(ctx, { ...entrada, firmaPng: png });
    return { ok: true, mensaje: 'Perfil profesional guardado. Verificación manual.', usuarios: await listarUsuarios(ctx) };
  } catch (error) {
    return fallo(error);
  }
}

export async function accionAceptarInvitacion(token: string, contrasena: string): Promise<ResultadoUsuario> {
  const resultado = await aceptarInvitacion(token, contrasena);
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje, codigo: 'invitacion' };
  return { ok: true, mensaje: 'Cuenta activada. Ya puede iniciar sesión.' };
}
