// SEG-01 (T07) — Reglas de contraseña, bloqueo y sesión sobre PostgreSQL.
// La conexión es la del servidor (igual que el núcleo). La búsqueda por
// correo y el registro de eventos pasan por funciones SECURITY DEFINER para
// que `optisaas_app` pueda iniciar sesión sin un rol con BYPASSRLS y sin
// desactivar RLS. No se registra ni se devuelve la contraseña en claro.
import 'server-only';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { obtenerPool } from '../../db';
import { historialContrasenas } from '../../db/esquema/autenticacion';
import { sesiones, usuarios } from '../../db/esquema/nucleo';
import { withTenantTx } from '../../db/tenant';
import {
  INTENTOS_PARA_BLOQUEO,
  leerLimiteIntentosIp,
  minutosDeBloqueo,
  minutosInactividad,
} from './bloqueo';
import { hashearContrasena, verificarContrasena } from './contrasena';
import { evaluarPoliticaContrasena } from './politica-contrasena';
import {
  MENSAJE_CREDENCIALES_INVALIDAS,
  type AuthPort,
  type EntradaContrasena,
  type EntradaInicioSesion,
  type ResultadoContrasena,
  type ResultadoInicioSesion,
  type SesionEmitida,
} from './puerto';

const MENSAJE_REUTILIZADA = 'No puedes reutilizar una de tus últimas 5 contraseñas.';
const VENTANA_IP_MINUTOS = 15;
const HISTORIAL_MAXIMO = 5;

interface FilaUsuario {
  id: string;
  tenant_id: string;
  email: string;
  hash_password: string | null;
  estado: string;
  intentos_fallidos: number;
  nivel_bloqueo: number;
  bloqueado_hasta: Date | null;
}

interface FilaMembresia {
  sede_id: string;
  rol: string;
  tenant_id: string;
}

let hashFicticio: Promise<string> | null = null;

function obtenerHashFicticio(): Promise<string> {
  if (!hashFicticio) {
    const aleatorio = globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID();
    hashFicticio = hashearContrasena(aleatorio);
  }
  return hashFicticio;
}

function fallo(continuarConCuentasLocales = false): ResultadoInicioSesion {
  return {
    ok: false,
    mensaje: MENSAJE_CREDENCIALES_INVALIDAS,
    continuarConCuentasLocales,
  };
}

function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

async function registrarEvento(entrada: {
  tenantId: string | null;
  usuarioId: string | null;
  tipo: string;
  correo: string;
  direccionIp: string | null;
  ahora: Date;
}): Promise<void> {
  await obtenerPool().query(
    `select registrar_evento_autenticacion($1::uuid, $2::uuid, $3, $4, $5, $6::timestamptz)`,
    [
      entrada.tenantId,
      entrada.usuarioId,
      entrada.tipo,
      entrada.correo,
      entrada.direccionIp,
      entrada.ahora.toISOString(),
    ],
  );
}

async function buscarUsuarios(correo: string): Promise<FilaUsuario[]> {
  const resultado = await obtenerPool().query<FilaUsuario>(
    `select id, tenant_id, email, hash_password, estado, intentos_fallidos, nivel_bloqueo, bloqueado_hasta
       from buscar_usuarios_por_correo($1)`,
    [correo],
  );
  return resultado.rows.map((fila) => ({
    ...fila,
    intentos_fallidos: Number(fila.intentos_fallidos),
    nivel_bloqueo: Number(fila.nivel_bloqueo),
    bloqueado_hasta: fila.bloqueado_hasta ? new Date(fila.bloqueado_hasta) : null,
  }));
}

async function membresiasDe(usuarioId: string): Promise<FilaMembresia[]> {
  const resultado = await obtenerPool().query<FilaMembresia>(
    `select sede_id, rol, tenant_id from membresias_para_inicio($1::uuid)`,
    [usuarioId],
  );
  return resultado.rows;
}

async function parametroInactividad(tenantId: string): Promise<number | null> {
  const resultado = await obtenerPool().query<{ valor: unknown }>(
    `select parametro_vigente($1::uuid, $2) as valor`,
    [tenantId, 'sesion_inactividad_minutos'],
  );
  const valor = resultado.rows[0]?.valor;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '' && Number.isFinite(Number(valor))) {
    return Number(valor);
  }
  return null;
}

async function intentosRecientesPorIp(ip: string, ahora: Date): Promise<number> {
  const desde = new Date(ahora.getTime() - VENTANA_IP_MINUTOS * 60_000);
  const resultado = await obtenerPool().query<{ n: number }>(
    `select count(*)::int as n
       from eventos_autenticacion
      where direccion_ip = $1
        and creado_en >= $2
        and tipo in ('inicio_fallido', 'cuenta_bloqueada', 'limite_ip')`,
    [ip, desde.toISOString()],
  );
  return Number(resultado.rows[0]?.n ?? 0);
}

async function guardarUsuario(
  usuario: FilaUsuario,
  cambios: Partial<{
    intentos_fallidos: number;
    nivel_bloqueo: number;
    bloqueado_hasta: Date | null;
    estado: string;
    ultimo_login: Date | null;
  }>,
  ahora: Date,
): Promise<void> {
  await withTenantTx({ tenant_id: usuario.tenant_id, usuario_id: usuario.id }, async (tx) => {
    await tx
      .update(usuarios)
      .set({ ...cambios, actualizado_en: ahora })
      .where(eq(usuarios.id, usuario.id));
  });
}

async function abrirSesionServidor(entrada: {
  tenantId: string;
  usuarioId: string;
  inactividadMinutos: number;
  direccionIp: string | null;
  agente: string | null;
  ahora: Date;
}): Promise<SesionEmitida['id']> {
  const expira = new Date(entrada.ahora.getTime() + entrada.inactividadMinutos * 60_000);
  return withTenantTx({ tenant_id: entrada.tenantId, usuario_id: entrada.usuarioId }, async (tx) => {
    const [creada] = await tx
      .insert(sesiones)
      .values({
        tenant_id: entrada.tenantId,
        usuario_id: entrada.usuarioId,
        expira_en: expira,
        ultima_actividad_en: entrada.ahora,
        inactividad_minutos: entrada.inactividadMinutos,
        direccion_ip: entrada.direccionIp,
        agente: entrada.agente,
        creada_en: entrada.ahora,
      })
      .returning({ id: sesiones.id });
    return creada.id;
  });
}

export async function iniciarSesion(entrada: EntradaInicioSesion): Promise<ResultadoInicioSesion> {
  const ahora = entrada.ahora ?? new Date();
  const correo = normalizarCorreo(entrada.correo ?? '');
  const contrasena = entrada.contrasena ?? '';
  const direccionIp = entrada.direccionIp?.trim() || null;
  if (!correo || !contrasena) return fallo(false);

  const limiteIp = leerLimiteIntentosIp();
  if (limiteIp && direccionIp) {
    const recientes = await intentosRecientesPorIp(direccionIp, ahora);
    if (recientes >= limiteIp) {
      await registrarEvento({
        tenantId: null,
        usuarioId: null,
        tipo: 'limite_ip',
        correo,
        direccionIp,
        ahora,
      });
      return fallo(false);
    }
  }

  const coincidencias = await buscarUsuarios(correo);
  if (coincidencias.length !== 1) {
    await verificarContrasena(await obtenerHashFicticio(), contrasena);
    await registrarEvento({
      tenantId: null,
      usuarioId: null,
      tipo: 'inicio_fallido',
      correo,
      direccionIp,
      ahora,
    });
    return fallo(true);
  }

  const usuario = coincidencias[0];
  const hash = usuario.hash_password;
  const coincide = hash
    ? await verificarContrasena(hash, contrasena)
    : await verificarContrasena(await obtenerHashFicticio(), contrasena).then(() => false);

  const bloqueadoHasta = usuario.bloqueado_hasta;
  const sigueBloqueado =
    usuario.estado === 'bloqueado' &&
    (bloqueadoHasta == null || bloqueadoHasta.getTime() > ahora.getTime());

  if (sigueBloqueado || usuario.estado === 'invitado' || !hash) {
    await registrarEvento({
      tenantId: usuario.tenant_id,
      usuarioId: usuario.id,
      tipo: 'inicio_fallido',
      correo,
      direccionIp,
      ahora,
    });
    return fallo(false);
  }

  if (!coincide) {
    const intentos = usuario.intentos_fallidos + 1;
    if (intentos >= INTENTOS_PARA_BLOQUEO) {
      const nivel = usuario.nivel_bloqueo + 1;
      const hasta = new Date(ahora.getTime() + minutosDeBloqueo(nivel) * 60_000);
      await guardarUsuario(
        usuario,
        {
          intentos_fallidos: 0,
          nivel_bloqueo: nivel,
          bloqueado_hasta: hasta,
          estado: 'bloqueado',
        },
        ahora,
      );
      await registrarEvento({
        tenantId: usuario.tenant_id,
        usuarioId: usuario.id,
        tipo: 'cuenta_bloqueada',
        correo,
        direccionIp,
        ahora,
      });
    } else {
      await guardarUsuario(usuario, { intentos_fallidos: intentos }, ahora);
      await registrarEvento({
        tenantId: usuario.tenant_id,
        usuarioId: usuario.id,
        tipo: 'inicio_fallido',
        correo,
        direccionIp,
        ahora,
      });
    }
    return fallo(false);
  }

  const membresias = await membresiasDe(usuario.id);
  const roles = membresias.map((fila) => fila.rol);
  const sedes = [...new Set(membresias.map((fila) => fila.sede_id))];
  const inactividad = minutosInactividad(roles, await parametroInactividad(usuario.tenant_id));
  const sesionId = await abrirSesionServidor({
    tenantId: usuario.tenant_id,
    usuarioId: usuario.id,
    inactividadMinutos: inactividad,
    direccionIp,
    agente: entrada.agente?.slice(0, 300) ?? null,
    ahora,
  });
  await guardarUsuario(
    usuario,
    {
      intentos_fallidos: 0,
      nivel_bloqueo: 0,
      bloqueado_hasta: null,
      estado: 'activo',
      ultimo_login: ahora,
    },
    ahora,
  );
  await registrarEvento({
    tenantId: usuario.tenant_id,
    usuarioId: usuario.id,
    tipo: 'inicio_ok',
    correo,
    direccionIp,
    ahora,
  });

  const expira = new Date(ahora.getTime() + inactividad * 60_000);
  return {
    ok: true,
    mensaje: '',
    continuarConCuentasLocales: false,
    sesion: {
      id: sesionId,
      usuarioId: usuario.id,
      tenantId: usuario.tenant_id,
      sedeId: sedes[0] ?? '',
      rol: roles[0] ?? '',
      sedes,
      correo: usuario.email,
      expiraEn: expira.toISOString(),
    },
  };
}

interface FilaSesion {
  id: string;
  tenant_id: string;
  usuario_id: string;
  expira_en: Date;
  revocada_en: Date | null;
  ultima_actividad_en: Date;
  inactividad_minutos: number;
  direccion_ip: string | null;
  agente: string | null;
}

async function leerSesion(sesionId: string): Promise<FilaSesion | null> {
  const resultado = await obtenerPool().query<FilaSesion>(
    `select id, tenant_id, usuario_id, expira_en, revocada_en, ultima_actividad_en,
            inactividad_minutos, direccion_ip, agente
       from sesiones
      where id = $1`,
    [sesionId],
  );
  const fila = resultado.rows[0];
  if (!fila) return null;
  return {
    ...fila,
    expira_en: new Date(fila.expira_en),
    revocada_en: fila.revocada_en ? new Date(fila.revocada_en) : null,
    ultima_actividad_en: new Date(fila.ultima_actividad_en),
    inactividad_minutos: Number(fila.inactividad_minutos),
  };
}

function sesionCaducada(fila: FilaSesion, ahora: Date): boolean {
  if (fila.revocada_en) return true;
  if (fila.expira_en.getTime() <= ahora.getTime()) return true;
  const limite = fila.ultima_actividad_en.getTime() + fila.inactividad_minutos * 60_000;
  return limite <= ahora.getTime();
}

export async function sesionVigente(sesionId: string, ahora: Date = new Date()): Promise<boolean> {
  const fila = await leerSesion(sesionId);
  if (!fila || sesionCaducada(fila, ahora)) return false;
  const expira = new Date(ahora.getTime() + fila.inactividad_minutos * 60_000);
  const actualizada = await withTenantTx({ tenant_id: fila.tenant_id, usuario_id: fila.usuario_id }, async (tx) => {
    const filas = await tx
      .update(sesiones)
      .set({ ultima_actividad_en: ahora, expira_en: expira })
      .where(and(eq(sesiones.id, sesionId), isNull(sesiones.revocada_en)))
      .returning({ id: sesiones.id });
    return filas.length > 0;
  });
  return actualizada;
}

export async function revocarSesion(sesionId: string, ahora: Date = new Date()): Promise<boolean> {
  const fila = await leerSesion(sesionId);
  if (!fila || fila.revocada_en) return false;
  await withTenantTx({ tenant_id: fila.tenant_id, usuario_id: fila.usuario_id }, async (tx) => {
    await tx
      .update(sesiones)
      .set({ revocada_en: ahora })
      .where(and(eq(sesiones.id, sesionId), isNull(sesiones.revocada_en)));
  });
  await registrarEvento({
    tenantId: fila.tenant_id,
    usuarioId: fila.usuario_id,
    tipo: 'sesion_revocada',
    correo: '',
    direccionIp: fila.direccion_ip,
    ahora,
  });
  return true;
}

export async function revocarTodas(usuarioId: string, ahora: Date = new Date()): Promise<number> {
  const dueno = await obtenerPool().query<{ tenant_id: string; email: string }>(
    `select tenant_id, email from usuarios where id = $1`,
    [usuarioId],
  );
  const usuario = dueno.rows[0];
  if (!usuario) return 0;
  const cerradas = await withTenantTx({ tenant_id: usuario.tenant_id, usuario_id: usuarioId }, async (tx) => {
    const filas = await tx
      .update(sesiones)
      .set({ revocada_en: ahora })
      .where(and(eq(sesiones.usuario_id, usuarioId), isNull(sesiones.revocada_en)))
      .returning({ id: sesiones.id });
    return filas.length;
  });
  if (cerradas > 0) {
    await registrarEvento({
      tenantId: usuario.tenant_id,
      usuarioId,
      tipo: 'cierre_todas',
      correo: usuario.email,
      direccionIp: null,
      ahora,
    });
  }
  return cerradas;
}

export async function rotarSesion(
  sesionId: string,
  meta?: { direccionIp?: string | null; agente?: string | null },
  ahora: Date = new Date(),
): Promise<string | null> {
  const fila = await leerSesion(sesionId);
  if (!fila || sesionCaducada(fila, ahora)) return null;
  const nueva = await abrirSesionServidor({
    tenantId: fila.tenant_id,
    usuarioId: fila.usuario_id,
    inactividadMinutos: fila.inactividad_minutos,
    direccionIp: meta?.direccionIp ?? fila.direccion_ip,
    agente: meta?.agente ?? fila.agente,
    ahora,
  });
  await withTenantTx({ tenant_id: fila.tenant_id, usuario_id: fila.usuario_id }, async (tx) => {
    await tx
      .update(sesiones)
      .set({ revocada_en: ahora })
      .where(and(eq(sesiones.id, sesionId), isNull(sesiones.revocada_en)));
  });
  await registrarEvento({
    tenantId: fila.tenant_id,
    usuarioId: fila.usuario_id,
    tipo: 'sesion_rotada',
    correo: '',
    direccionIp: meta?.direccionIp ?? fila.direccion_ip,
    ahora,
  });
  return nueva;
}

async function hashesRecientes(usuarioId: string, tenantId: string): Promise<string[]> {
  return withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
    const [usuario] = await tx
      .select({ hash_password: usuarios.hash_password })
      .from(usuarios)
      .where(eq(usuarios.id, usuarioId))
      .limit(1);
    const historial = await tx
      .select({ hash_password: historialContrasenas.hash_password })
      .from(historialContrasenas)
      .where(eq(historialContrasenas.usuario_id, usuarioId))
      .orderBy(desc(historialContrasenas.creado_en))
      .limit(HISTORIAL_MAXIMO);
    const hashes = historial.map((fila) => fila.hash_password);
    if (usuario?.hash_password) hashes.unshift(usuario.hash_password);
    return hashes.slice(0, HISTORIAL_MAXIMO);
  });
}

export async function establecerContrasena(entrada: EntradaContrasena): Promise<ResultadoContrasena> {
  const ahora = entrada.ahora ?? new Date();
  const politica = evaluarPoliticaContrasena(entrada.contrasena);
  if (!politica.ok) return politica;

  const hashes = await hashesRecientes(entrada.usuarioId, entrada.tenantId);
  for (const previo of hashes) {
    if (await verificarContrasena(previo, entrada.contrasena)) {
      return { ok: false, mensaje: MENSAJE_REUTILIZADA };
    }
  }

  const nuevoHash = await hashearContrasena(entrada.contrasena);
  const correo = await withTenantTx(
    { tenant_id: entrada.tenantId, usuario_id: entrada.usuarioId },
    async (tx) => {
      const [usuario] = await tx
        .select({ hash_password: usuarios.hash_password, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, entrada.usuarioId))
        .limit(1);
      if (!usuario) return null;
      if (usuario.hash_password) {
        await tx.insert(historialContrasenas).values({
          tenant_id: entrada.tenantId,
          usuario_id: entrada.usuarioId,
          hash_password: usuario.hash_password,
          creado_en: ahora,
        });
      }
      await tx
        .update(usuarios)
        .set({ hash_password: nuevoHash, actualizado_en: ahora })
        .where(eq(usuarios.id, entrada.usuarioId));
      await tx.execute(sql`
        delete from historial_contrasenas
         where usuario_id = ${entrada.usuarioId}::uuid
           and id not in (
             select id from historial_contrasenas
              where usuario_id = ${entrada.usuarioId}::uuid
              order by creado_en desc
              limit ${HISTORIAL_MAXIMO}
           )
      `);
      return usuario.email;
    },
  );
  if (!correo) return { ok: false, mensaje: 'No se pudo actualizar la contraseña.' };
  await registrarEvento({
    tenantId: entrada.tenantId,
    usuarioId: entrada.usuarioId,
    tipo: 'contrasena_actualizada',
    correo,
    direccionIp: null,
    ahora,
  });
  return { ok: true };
}

export const servicioAuth: Pick<
  AuthPort,
  | 'iniciarSesion'
  | 'sesionVigente'
  | 'revocarSesion'
  | 'revocarTodas'
  | 'rotarSesion'
  | 'establecerContrasena'
> = {
  iniciarSesion,
  sesionVigente,
  revocarSesion,
  revocarTodas,
  rotarSesion,
  establecerContrasena,
};
