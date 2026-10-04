// ADM-02 (T17) — Usuarios, rol por sede (`membresias`) y perfil profesional.
// Reutiliza `usuarios` (T07) y `perfiles_profesionales` (T14). Desactivar no
// borra filas ni firmas: cierra las sesiones abiertas.
// TODO(NV-23): la verificación del registro es manual.
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import {
  VIGENCIA_INVITACION_MS,
  estadoDePerfil,
  generarTokenInvitacion,
  hashTokenInvitacion,
  invitacionUtilizable,
  puedeAsignarRol,
  puedeDejarSinAdmin,
  correoValido,
  type EstadoPerfil,
} from '../dominio/usuarios-adm';
import { esPng } from '../dominio/firma';
import { evaluarMfaParaFirma } from '../lib/auth/mfa/reciente';
import { evaluarPoliticaContrasena } from '../lib/auth/politica-contrasena';
import { hashearContrasena } from '../lib/auth/contrasena';
import { registrarEvento } from '../lib/auditoria/servicio';
import { puede, type ActorAuthz } from '../lib/authz/ability';
import { cifrarTextoTenant } from '../lib/cifrado/servicio';
import { obtenerCorreoPort, type CorreoPort } from '../lib/correo/puerto';
import { obtenerPool } from './index';
import type { ContextoTenant } from './tenant';

export class ErrorUsuario extends Error {
  readonly codigo: 'validacion' | 'permiso' | 'escalada' | 'mfa' | 'ultimo_admin' | 'invitacion';

  constructor(codigo: ErrorUsuario['codigo'], mensaje: string) {
    super(mensaje);
    this.name = 'ErrorUsuario';
    this.codigo = codigo;
  }
}

export interface ContextoUsuario extends ContextoTenant {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
  sesion_id?: string | null;
}

export interface VistaUsuario {
  id: string;
  email: string;
  estado: string;
  roles: { sede_id: string; rol: string }[];
  perfil: {
    nombre_completo: string;
    documento: string | null;
    tipo: string | null;
    registro_profesional: string;
    entidad: string | null;
    vigente_hasta: string | null;
    estado: EstadoPerfil;
    tiene_firma: boolean;
  } | null;
}

export interface VistaFirmaHistorica {
  id: string;
  firmante_id: string | null;
  registro_profesional: string | null;
  firmado_en: string;
  estado_usuario: string;
}

const DOC = /^[A-Za-z0-9-]{1,32}$/;

function actorDe(contexto: ContextoUsuario): ActorAuthz {
  return {
    id: contexto.usuario_id,
    rol: contexto.rol,
    tenantId: contexto.tenant_id,
    sedeActiva: contexto.sede_id,
    sedesAutorizadas: contexto.sedes,
    tarjetaProfesionalVigente: true,
  };
}

function exigir(contexto: ContextoUsuario, accion: 'crear' | 'leer' | 'actualizar'): void {
  const sujeto = { tipo: 'R18' as const, tenantId: contexto.tenant_id, sedeId: contexto.sede_id };
  if (!puede(actorDe(contexto), accion, sujeto)) {
    throw new ErrorUsuario('permiso', 'No tiene permiso para administrar usuarios.');
  }
}

async function conApp<T>(contexto: ContextoUsuario, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [contexto.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [contexto.usuario_id]);
    await cliente.query(`select set_config('app.sede_id', $1, true)`, [contexto.sede_id]);
    await cliente.query(`select set_config('app.sedes', $1, true)`, [contexto.sedes.join(',')]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [contexto.rol]);
    await cliente.query(`select set_config('app.role', $1, true)`, [contexto.rol]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se conserva el error original.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

async function anotar(
  contexto: ContextoUsuario,
  accion: 'crear' | 'cambio_rol' | 'actualizar',
  recursoId: string,
  resultado: 'ok' | 'denegado',
): Promise<void> {
  await registrarEvento(
    {
      tenant_id: contexto.tenant_id,
      usuario_id: contexto.usuario_id,
      sede_id: contexto.sede_id,
      sedes: contexto.sedes,
      rol: contexto.rol,
    },
    {
      actor_id: contexto.usuario_id,
      rol: contexto.rol,
      sede_id: contexto.sede_id,
      recurso: 'R18',
      recurso_id: recursoId,
      accion,
      resultado,
    },
  );
}

async function exigirMfa(contexto: ContextoUsuario, ahora: Date): Promise<void> {
  if (!contexto.sesion_id) {
    throw new ErrorUsuario('mfa', 'El cambio exige un segundo factor reciente.');
  }
  const sesion = await conApp(contexto, async (cliente) => {
    const filas = await cliente.query<{ usuario_id: string; mfa_verificada_en: Date | null; revocada_en: Date | null }>(
      `select usuario_id, mfa_verificada_en, revocada_en from sesiones where id = $1`,
      [contexto.sesion_id],
    );
    return filas.rows[0] ?? null;
  });
  const reciente =
    sesion &&
    sesion.usuario_id === contexto.usuario_id &&
    !sesion.revocada_en &&
    evaluarMfaParaFirma(sesion.mfa_verificada_en ? new Date(sesion.mfa_verificada_en) : null, ahora).ok;
  if (!reciente) {
    throw new ErrorUsuario('mfa', 'El cambio exige un segundo factor reciente.');
  }
}

function exigirRol(contexto: ContextoUsuario, rol: string): void {
  const decision = puedeAsignarRol(contexto.rol, rol);
  if (!decision.ok) {
    throw new ErrorUsuario(
      decision.motivo === 'superior' ? 'escalada' : 'validacion',
      decision.motivo === 'superior'
        ? 'No puede asignar un rol superior al suyo.'
        : 'El rol no existe.',
    );
  }
}

async function adminsSiSeQuita(contexto: ContextoUsuario, usuarioId: string, sedeId: string | null): Promise<number> {
  return conApp(contexto, async (cliente) => {
    const filas = await cliente.query<{ n: number }>(
      `select count(distinct u.id)::int as n
         from usuarios u
         join membresias m on m.usuario_id = u.id and m.tenant_id = u.tenant_id
        where u.estado = 'activo'
          and m.rol = 'admin'
          and not (
            u.id = $1
            and ($2::uuid is null or m.sede_id = $2::uuid)
          )`,
      [usuarioId, sedeId],
    );
    return filas.rows[0]?.n ?? 0;
  });
}

function origenPublico(): string {
  const url = process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return url.replace(/\/$/, '');
}

export async function listarUsuarios(contexto: ContextoUsuario): Promise<VistaUsuario[]> {
  exigir(contexto, 'leer');
  const filas = await conApp(contexto, async (cliente) => {
    const usuarios = await cliente.query<{ id: string; email: string; estado: string }>(
      `select distinct u.id, u.email, u.estado
         from usuarios u
         join membresias m on m.usuario_id = u.id
        where m.sede_id = any($1::uuid[])
        order by u.email`,
      [contexto.sedes],
    );
    const membresias = await cliente.query<{ usuario_id: string; sede_id: string; rol: string }>(
      `select usuario_id, sede_id, rol from membresias where sede_id = any($1::uuid[])`,
      [contexto.sedes],
    );
    const perfiles = await cliente.query<{
      usuario_id: string;
      nombre_completo: string;
      documento: string | null;
      tipo: string | null;
      registro_profesional: string;
      entidad: string | null;
      vigente_hasta: string | null;
      estado: EstadoPerfil;
      verificado_en: Date | null;
      tiene_firma: boolean;
    }>(
      `select usuario_id, nombre_completo, documento, tipo, registro_profesional, entidad,
              vigente_hasta::text as vigente_hasta, estado, verificado_en,
              firma_png_cifrada is not null as tiene_firma
         from perfiles_profesionales`,
    );
    return { usuarios: usuarios.rows, membresias: membresias.rows, perfiles: perfiles.rows };
  });
  return filas.usuarios.map((usuario) => {
    const perfil = filas.perfiles.find((item) => item.usuario_id === usuario.id) ?? null;
    return {
      id: usuario.id,
      email: usuario.email,
      estado: usuario.estado,
      roles: filas.membresias
        .filter((item) => item.usuario_id === usuario.id)
        .map((item) => ({ sede_id: item.sede_id, rol: item.rol })),
      perfil: perfil
        ? {
            nombre_completo: perfil.nombre_completo,
            documento: perfil.documento,
            tipo: perfil.tipo,
            registro_profesional: perfil.registro_profesional,
            entidad: perfil.entidad,
            vigente_hasta: perfil.vigente_hasta,
            estado: perfil.estado,
            tiene_firma: perfil.tiene_firma,
          }
        : null,
    };
  });
}

export async function invitarUsuario(
  contexto: ContextoUsuario,
  entrada: { email: string; sedeId: string; rol: string },
  ahora = new Date(),
  correo: CorreoPort = obtenerCorreoPort(),
): Promise<{ usuario_id: string; enlace: string }> {
  exigir(contexto, 'crear');
  await exigirMfa(contexto, ahora);
  const email = entrada.email.trim().toLowerCase();
  if (!correoValido(email)) throw new ErrorUsuario('validacion', 'El correo no es válido.');
  if (!contexto.sedes.includes(entrada.sedeId)) {
    throw new ErrorUsuario('permiso', 'La sede no está autorizada.');
  }
  try {
    exigirRol(contexto, entrada.rol);
  } catch (error) {
    await anotar(contexto, 'crear', 'rol', 'denegado');
    throw error;
  }
  const token = generarTokenInvitacion();
  const hash = hashTokenInvitacion(token);
  const expira = new Date(ahora.getTime() + VIGENCIA_INVITACION_MS);
  const usuarioId = randomUUID();
  const creado = await conApp(contexto, async (cliente) => {
    const existe = await cliente.query(`select id from usuarios where email = $1`, [email]);
    if (existe.rows.length > 0) return null;
    await cliente.query(
      `insert into usuarios (id, tenant_id, email, estado) values ($1, $2, $3, 'invitado')`,
      [usuarioId, contexto.tenant_id, email],
    );
    await cliente.query(
      `insert into membresias (tenant_id, usuario_id, sede_id, rol) values ($1, $2, $3, $4)`,
      [contexto.tenant_id, usuarioId, entrada.sedeId, entrada.rol],
    );
    await cliente.query(
      `insert into invitaciones_usuario (tenant_id, usuario_id, token_hash, expira_en)
       values ($1, $2, $3, $4)`,
      [contexto.tenant_id, usuarioId, hash, expira.toISOString()],
    );
    return usuarioId;
  });
  if (!creado) throw new ErrorUsuario('validacion', 'Ya existe un usuario con ese correo.');
  const enlace = `${origenPublico()}/invitacion/${token}`;
  await correo.enviarInvitacion({ destinatario: email, enlace });
  await anotar(contexto, 'crear', creado, 'ok');
  return { usuario_id: creado, enlace };
}

export async function cambiarRol(
  contexto: ContextoUsuario,
  entrada: { usuarioId: string; sedeId: string; rolAnterior: string; rolNuevo: string },
  ahora = new Date(),
): Promise<void> {
  exigir(contexto, 'actualizar');
  await exigirMfa(contexto, ahora);
  if (!contexto.sedes.includes(entrada.sedeId)) {
    throw new ErrorUsuario('permiso', 'La sede no está autorizada.');
  }
  try {
    exigirRol(contexto, entrada.rolNuevo);
  } catch (error) {
    await anotar(contexto, 'cambio_rol', entrada.usuarioId, 'denegado');
    throw error;
  }
  if (entrada.rolAnterior === 'admin' && entrada.rolNuevo !== 'admin') {
    const quedan = await adminsSiSeQuita(contexto, entrada.usuarioId, entrada.sedeId);
    if (!puedeDejarSinAdmin(quedan)) {
      throw new ErrorUsuario('ultimo_admin', 'No puede quitar al último administrador.');
    }
  }
  const actualizado = await conApp(contexto, async (cliente) => {
    const filas = await cliente.query(
      `update membresias set rol = $4
        where usuario_id = $1 and sede_id = $2 and rol = $3
        returning id`,
      [entrada.usuarioId, entrada.sedeId, entrada.rolAnterior, entrada.rolNuevo],
    );
    if ((filas.rowCount ?? 0) < 1) return 0;
    await cliente.query(
      `update sesiones set revocada_en = $2 where usuario_id = $1 and revocada_en is null`,
      [entrada.usuarioId, ahora.toISOString()],
    );
    return filas.rowCount ?? 0;
  });
  if (actualizado < 1) throw new ErrorUsuario('validacion', 'No se encontró esa membresía.');
  await anotar(contexto, 'cambio_rol', entrada.usuarioId, 'ok');
}

export async function desactivarUsuario(contexto: ContextoUsuario, usuarioId: string, ahora = new Date()): Promise<void> {
  exigir(contexto, 'actualizar');
  await exigirMfa(contexto, ahora);
  if (usuarioId === contexto.usuario_id) {
    const quedan = await adminsSiSeQuita(contexto, usuarioId, null);
    const esAdmin = await conApp(contexto, async (cliente) => {
      const filas = await cliente.query(
        `select 1 from membresias where usuario_id = $1 and rol = 'admin' limit 1`,
        [usuarioId],
      );
      return filas.rows.length > 0;
    });
    if (esAdmin && !puedeDejarSinAdmin(quedan)) {
      throw new ErrorUsuario('ultimo_admin', 'El último administrador no puede desactivarse.');
    }
  } else {
    const quedan = await adminsSiSeQuita(contexto, usuarioId, null);
    const esAdmin = await conApp(contexto, async (cliente) => {
      const filas = await cliente.query(
        `select 1 from membresias where usuario_id = $1 and rol = 'admin' limit 1`,
        [usuarioId],
      );
      return filas.rows.length > 0;
    });
    if (esAdmin && !puedeDejarSinAdmin(quedan)) {
      throw new ErrorUsuario('ultimo_admin', 'No puede desactivar al último administrador.');
    }
  }
  const filas = await conApp(contexto, async (cliente) => {
    const usuario = await cliente.query(
      `update usuarios set estado = 'desactivado', actualizado_en = now()
        where id = $1 and estado <> 'desactivado'
        returning id`,
      [usuarioId],
    );
    if ((usuario.rowCount ?? 0) < 1) return 0;
    await cliente.query(
      `update sesiones set revocada_en = $2 where usuario_id = $1 and revocada_en is null`,
      [usuarioId, ahora.toISOString()],
    );
    return usuario.rowCount ?? 0;
  });
  if (filas < 1) throw new ErrorUsuario('validacion', 'No se encontró el usuario activo.');
  await anotar(contexto, 'actualizar', usuarioId, 'ok');
}

export async function guardarPerfilManual(
  contexto: ContextoUsuario,
  entrada: {
    usuarioId: string;
    nombreCompleto: string;
    documento: string;
    tipo: string;
    registroProfesional: string;
    entidad: string;
    vigenteHasta: string;
    firmaPng: Uint8Array | null;
    verificadoManual: boolean;
  },
  ahora = new Date(),
): Promise<{ id: string; estado: EstadoPerfil }> {
  exigir(contexto, 'actualizar');
  await exigirMfa(contexto, ahora);
  const nombre = entrada.nombreCompleto.trim();
  const documento = entrada.documento.trim();
  const registro = entrada.registroProfesional.trim();
  const entidad = entrada.entidad.trim();
  if (!nombre || nombre.length > 160) throw new ErrorUsuario('validacion', 'El nombre es obligatorio.');
  if (!DOC.test(documento)) throw new ErrorUsuario('validacion', 'El documento no es válido.');
  if (entrada.tipo !== 'optometra' && entrada.tipo !== 'oftalmologo') {
    throw new ErrorUsuario('validacion', 'El tipo de profesional no es válido.');
  }
  if (!registro || registro.length > 80) throw new ErrorUsuario('validacion', 'La tarjeta profesional es obligatoria.');
  if (!entidad || entidad.length > 160) throw new ErrorUsuario('validacion', 'La entidad es obligatoria.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada.vigenteHasta)) {
    throw new ErrorUsuario('validacion', 'La vigencia declarada usa la forma AAAA-MM-DD.');
  }
  if (entrada.firmaPng && !esPng(entrada.firmaPng)) {
    throw new ErrorUsuario('validacion', 'La firma digitalizada debe ser un PNG.');
  }
  const estado = estadoDePerfil({
    registro,
    vigenteHasta: entrada.vigenteHasta,
    verificadoEn: entrada.verificadoManual ? ahora : null,
    ahora,
  });
  const firma = entrada.firmaPng ? (await cifrarTextoTenant(contexto.tenant_id, Buffer.from(entrada.firmaPng))).texto : null;
  const id = await conApp(contexto, async (cliente) => {
    const filas = await cliente.query<{ id: string }>(
      `insert into perfiles_profesionales
         (tenant_id, usuario_id, nombre_completo, documento, tipo, registro_profesional, entidad,
          vigente_hasta, firma_png_cifrada, estado, verificado_por, verificado_en)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (tenant_id, usuario_id)
       do update set nombre_completo = excluded.nombre_completo,
                     documento = excluded.documento,
                     tipo = excluded.tipo,
                     registro_profesional = excluded.registro_profesional,
                     entidad = excluded.entidad,
                     vigente_hasta = excluded.vigente_hasta,
                     firma_png_cifrada = coalesce(excluded.firma_png_cifrada, perfiles_profesionales.firma_png_cifrada),
                     estado = excluded.estado,
                     verificado_por = excluded.verificado_por,
                     verificado_en = excluded.verificado_en,
                     actualizado_en = now()
       returning id`,
      [
        contexto.tenant_id,
        entrada.usuarioId,
        nombre,
        documento,
        entrada.tipo,
        registro,
        entidad,
        entrada.vigenteHasta,
        firma,
        estado,
        entrada.verificadoManual ? contexto.usuario_id : null,
        entrada.verificadoManual ? ahora.toISOString() : null,
      ],
    );
    return filas.rows[0]?.id ?? null;
  });
  if (!id) throw new ErrorUsuario('validacion', 'No se pudo guardar el perfil profesional.');
  await anotar(contexto, 'actualizar', entrada.usuarioId, 'ok');
  return { id, estado };
}

export async function listarFirmasHistoricas(
  contexto: ContextoUsuario,
  usuarioId: string,
): Promise<VistaFirmaHistorica[]> {
  exigir(contexto, 'leer');
  return conApp(contexto, async (cliente) => {
    const filas = await cliente.query<{
      id: string;
      firmante_id: string | null;
      registro_profesional: string | null;
      firmado_en: Date;
      estado_usuario: string;
    }>(
      `select f.id, f.firmante_id, f.registro_profesional, f.firmado_en, u.estado as estado_usuario
         from firmas f
         join usuarios u on u.id = f.firmante_id
        where f.firmante_id = $1
        order by f.firmado_en`,
      [usuarioId],
    );
    return filas.rows.map((fila) => ({
      id: fila.id,
      firmante_id: fila.firmante_id,
      registro_profesional: fila.registro_profesional,
      firmado_en: new Date(fila.firmado_en).toISOString(),
      estado_usuario: fila.estado_usuario,
    }));
  });
}

export async function aceptarInvitacion(
  token: string,
  contrasena: string,
  ahora = new Date(),
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const limpio = token.trim();
  if (!limpio) return { ok: false, mensaje: 'El enlace no es válido o ya se usó.' };
  const politica = evaluarPoliticaContrasena(contrasena);
  if (!politica.ok) return politica;
  const hash = hashTokenInvitacion(limpio);
  const encontrada = await obtenerPool().query<{
    id: string;
    tenant_id: string;
    usuario_id: string;
    expira_en: Date;
    usada_en: Date | null;
  }>(`select id, tenant_id, usuario_id, expira_en, usada_en from buscar_invitacion_por_hash($1)`, [hash]);
  const invitacion = encontrada.rows[0];
  if (!invitacion || !invitacionUtilizable(invitacion.usada_en, new Date(invitacion.expira_en), ahora)) {
    return { ok: false, mensaje: 'El enlace no es válido o ya se usó.' };
  }
  const hashClave = await hashearContrasena(contrasena);
  const contexto: ContextoUsuario = {
    tenant_id: invitacion.tenant_id,
    usuario_id: invitacion.usuario_id,
    sede_id: '00000000-0000-4000-8000-000000000000',
    sedes: [],
    rol: 'asesor',
  };
  const aplicada = await conApp(
    {
      ...contexto,
      sede_id: invitacion.tenant_id,
      sedes: [invitacion.tenant_id],
    },
    async (cliente) => {
      const marca = await cliente.query(
        `update invitaciones_usuario set usada_en = $2 where id = $1 and usada_en is null returning id`,
        [invitacion.id, ahora.toISOString()],
      );
      if ((marca.rowCount ?? 0) < 1) return false;
      await cliente.query(
        `update usuarios set hash_password = $2, estado = 'activo', actualizado_en = now() where id = $1`,
        [invitacion.usuario_id, hashClave],
      );
      return true;
    },
  );
  if (!aplicada) return { ok: false, mensaje: 'El enlace no es válido o ya se usó.' };
  return { ok: true };
}
