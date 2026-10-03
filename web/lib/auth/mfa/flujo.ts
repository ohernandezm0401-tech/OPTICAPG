// SEG-01 (T08) — Enrolamiento TOTP, códigos de recuperación, passkeys y
// reautenticación. La firma clínica todavía no existe: `exigirMfaParaFirmarAtencion`
// es la función reutilizable (AC-SEG-01-4).
import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

import { obtenerPool } from '../../../db';
import {
  codigosRecuperacion,
  credencialesWebauthn,
  desafiosMfa,
  factoresTotp,
} from '../../../db/esquema/mfa';
import { sesiones } from '../../../db/esquema/nucleo';
import { withTenantTx } from '../../../db/tenant';
import { INTENTOS_PARA_BLOQUEO, minutosDeBloqueo, minutosInactividad } from '../bloqueo';
import {
  MENSAJE_MFA_INVALIDO,
  type AltaTotp,
  type ContextoPasskey,
  type OpcionesPasskey,
  type ResultadoContrasena,
  type ResultadoInicioSesion,
  type SesionEmitida,
} from '../puerto';
import { NOMBRE_RP } from './webauthn';
import { banderaAsesorActiva, CLAVE_MFA_ASESOR, debePedirSegundoFactor, mfaEsObligatoria } from './politica';
import { proteccionIdentidad } from './proteccion';
import { svgQr } from './qr';
import { evaluarMfaParaFirma } from './reciente';
import {
  CANTIDAD_CODIGOS_RECUPERACION,
  codigoTotp,
  generarCodigosRecuperacion,
  hashearCodigoRecuperacion,
  hashesCoinciden,
  nuevoSecretoTotp,
  uriTotp,
  verificarTotp,
} from './totp';

const MINUTOS_DESAFIO = 10;
const MINUTOS_PASE = 2;

function opcionesWebAuthn(opciones: object): Record<string, unknown> {
  const copia = { ...(opciones as Record<string, unknown>) };
  if (Array.isArray(copia.hints) && copia.hints.length === 0) delete copia.hints;
  return copia;
}

type Desafio = {
  id: string;
  tenant_id: string;
  usuario_id: string;
  proposito: string;
  secreto_pendiente: string | null;
  codigos_hash: string[] | null;
  codigos_entregados: number;
  desafio_webauthn: string | null;
  direccion_ip: string | null;
  expira_en: Date;
  consumido_en: Date | null;
};

function falloMfa(): ResultadoInicioSesion {
  return { ok: false, mensaje: MENSAJE_MFA_INVALIDO, continuarConCuentasLocales: false };
}

async function registrar(entrada: {
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

async function correoDe(usuarioId: string): Promise<string> {
  const resultado = await obtenerPool().query<{ email: string }>('select email from usuarios where id = $1', [
    usuarioId,
  ]);
  return resultado.rows[0]?.email ?? '';
}

async function leerDesafio(ticket: string): Promise<Desafio | null> {
  const resultado = await obtenerPool().query<Desafio>(
    `select id, tenant_id, usuario_id, proposito, secreto_pendiente, codigos_hash,
            codigos_entregados, desafio_webauthn, direccion_ip, expira_en, consumido_en
       from desafios_mfa where id = $1`,
    [ticket],
  );
  const fila = resultado.rows[0];
  if (!fila) return null;
  return {
    ...fila,
    codigos_entregados: Number(fila.codigos_entregados),
    expira_en: new Date(fila.expira_en),
    consumido_en: fila.consumido_en ? new Date(fila.consumido_en) : null,
    codigos_hash: Array.isArray(fila.codigos_hash) ? fila.codigos_hash : null,
  };
}

function desafioUtil(fila: Desafio, ahora: Date): boolean {
  return !fila.consumido_en && fila.expira_en.getTime() > ahora.getTime();
}

async function asesorObligatorio(tenantId: string): Promise<boolean> {
  const resultado = await obtenerPool().query<{ valor: unknown }>(
    `select parametro_vigente($1::uuid, $2) as valor`,
    [tenantId, CLAVE_MFA_ASESOR],
  );
  return banderaAsesorActiva(resultado.rows[0]?.valor);
}

async function tieneFactores(usuarioId: string, tenantId: string): Promise<{ totp: boolean; passkey: boolean }> {
  return withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
    const totp = await tx
      .select({ id: factoresTotp.id })
      .from(factoresTotp)
      .where(eq(factoresTotp.usuario_id, usuarioId))
      .limit(1);
    const passkey = await tx
      .select({ id: credencialesWebauthn.id })
      .from(credencialesWebauthn)
      .where(eq(credencialesWebauthn.usuario_id, usuarioId))
      .limit(1);
    return { totp: totp.length > 0, passkey: passkey.length > 0 };
  });
}

async function crearDesafio(entrada: {
  tenantId: string;
  usuarioId: string;
  proposito: string;
  direccionIp: string | null;
  ahora: Date;
}): Promise<string> {
  const expira = new Date(entrada.ahora.getTime() + MINUTOS_DESAFIO * 60_000);
  return withTenantTx({ tenant_id: entrada.tenantId, usuario_id: entrada.usuarioId }, async (tx) => {
    const [fila] = await tx
      .insert(desafiosMfa)
      .values({
        tenant_id: entrada.tenantId,
        usuario_id: entrada.usuarioId,
        proposito: entrada.proposito,
        direccion_ip: entrada.direccionIp,
        expira_en: expira,
        creado_en: entrada.ahora,
      })
      .returning({ id: desafiosMfa.id });
    return fila.id;
  });
}

export async function decidirMfa(entrada: {
  usuarioId: string;
  tenantId: string;
  correo: string;
  roles: string[];
  direccionIp: string | null;
  ahora: Date;
}): Promise<ResultadoInicioSesion | null> {
  const factores = await tieneFactores(entrada.usuarioId, entrada.tenantId);
  const paso = debePedirSegundoFactor(
    mfaEsObligatoria(entrada.roles, await asesorObligatorio(entrada.tenantId)),
    factores.totp || factores.passkey,
  );
  if (!paso) return null;
  const ticket = await crearDesafio({
    tenantId: entrada.tenantId,
    usuarioId: entrada.usuarioId,
    proposito: paso,
    direccionIp: entrada.direccionIp,
    ahora: entrada.ahora,
  });
  return {
    ok: false,
    mensaje: '',
    continuarConCuentasLocales: false,
    pendiente: paso,
    ticket,
    passkey: factores.passkey,
  };
}

async function anotarFallo(usuarioId: string, tenantId: string, correo: string, ip: string | null, ahora: Date) {
  const actual = await obtenerPool().query<{
    intentos_fallidos: number;
    nivel_bloqueo: number;
    bloqueado_hasta: Date | null;
    estado: string;
  }>(
    `select intentos_fallidos, nivel_bloqueo, bloqueado_hasta, estado from usuarios where id = $1`,
    [usuarioId],
  );
  const fila = actual.rows[0];
  if (!fila) return;
  const bloqueadoHasta = fila.bloqueado_hasta ? new Date(fila.bloqueado_hasta) : null;
  const sigueBloqueado =
    fila.estado === 'bloqueado' && (bloqueadoHasta == null || bloqueadoHasta.getTime() > ahora.getTime());
  if (sigueBloqueado) {
    await registrar({ tenantId, usuarioId, tipo: 'mfa_fallo', correo, direccionIp: ip, ahora });
    return;
  }
  const intentos = Number(fila.intentos_fallidos) + 1;
  if (intentos >= INTENTOS_PARA_BLOQUEO) {
    const nivel = Number(fila.nivel_bloqueo) + 1;
    const hasta = new Date(ahora.getTime() + minutosDeBloqueo(nivel) * 60_000);
    await withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
      await tx
        .update(sesiones)
        .set({ revocada_en: ahora })
        .where(and(eq(sesiones.usuario_id, usuarioId), isNull(sesiones.revocada_en)));
    });
    await obtenerPool().query(
      `update usuarios set intentos_fallidos = 0, nivel_bloqueo = $2, bloqueado_hasta = $3,
              estado = 'bloqueado', actualizado_en = $4 where id = $1`,
      [usuarioId, nivel, hasta.toISOString(), ahora.toISOString()],
    );
    await registrar({ tenantId, usuarioId, tipo: 'cuenta_bloqueada', correo, direccionIp: ip, ahora });
  } else {
    await obtenerPool().query(
      `update usuarios set intentos_fallidos = $2, actualizado_en = $3 where id = $1`,
      [usuarioId, intentos, ahora.toISOString()],
    );
    await registrar({ tenantId, usuarioId, tipo: 'mfa_fallo', correo, direccionIp: ip, ahora });
  }
}

async function usuarioBloqueado(usuarioId: string, ahora: Date): Promise<boolean> {
  const actual = await obtenerPool().query<{ estado: string; bloqueado_hasta: Date | null }>(
    `select estado, bloqueado_hasta from usuarios where id = $1`,
    [usuarioId],
  );
  const fila = actual.rows[0];
  if (!fila) return true;
  const hasta = fila.bloqueado_hasta ? new Date(fila.bloqueado_hasta) : null;
  return fila.estado === 'bloqueado' && (hasta == null || hasta.getTime() > ahora.getTime());
}

export async function prepararEnrolamientoTotp(ticket: string, ahora: Date = new Date()): Promise<AltaTotp> {
  const desafio = await leerDesafio(ticket);
  if (!desafio || desafio.proposito !== 'enrolar' || !desafioUtil(desafio, ahora)) {
    return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  }
  const correo = await correoDe(desafio.usuario_id);
  if (desafio.secreto_pendiente) {
    const secreto = proteccionIdentidad.revelar(desafio.secreto_pendiente);
    return {
      ok: true,
      secreto,
      uri: uriTotp(secreto, correo),
      svg: svgQr(uriTotp(secreto, correo)),
      codigos: [],
    };
  }
  const secreto = nuevoSecretoTotp();
  const codigos = generarCodigosRecuperacion(CANTIDAD_CODIGOS_RECUPERACION);
  const uri = uriTotp(secreto, correo);
  await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    await tx
      .update(desafiosMfa)
      .set({
        secreto_pendiente: proteccionIdentidad.proteger(secreto),
        codigos_hash: codigos.map(hashearCodigoRecuperacion),
        codigos_entregados: 1,
      })
      .where(eq(desafiosMfa.id, desafio.id));
  });
  return { ok: true, secreto, uri, svg: svgQr(uri), codigos };
}

async function abrirTrasMfa(entrada: {
  desafio: Desafio;
  ahora: Date;
  tipoEvento: 'mfa_alta' | 'mfa_ok';
}): Promise<ResultadoInicioSesion> {
  const membresias = await obtenerPool().query<{ sede_id: string; rol: string }>(
    `select sede_id, rol from membresias_para_inicio($1::uuid)`,
    [entrada.desafio.usuario_id],
  );
  const roles = membresias.rows.map((fila) => fila.rol);
  const sedes = [...new Set(membresias.rows.map((fila) => fila.sede_id))];
  const parametro = await obtenerPool().query<{ valor: unknown }>(
    `select parametro_vigente($1::uuid, $2) as valor`,
    [entrada.desafio.tenant_id, 'sesion_inactividad_minutos'],
  );
  const crudo = parametro.rows[0]?.valor;
  const minutos =
    typeof crudo === 'number' ? crudo : typeof crudo === 'string' && crudo.trim() ? Number(crudo) : null;
  const { completarInicio } = await import('../servicio');
  const correo = await correoDe(entrada.desafio.usuario_id);
  const resultado = await completarInicio({
    tenantId: entrada.desafio.tenant_id,
    usuarioId: entrada.desafio.usuario_id,
    correo,
    roles,
    sedes,
    inactividad: minutosInactividad(roles, Number.isFinite(minutos) ? minutos : null),
    direccionIp: entrada.desafio.direccion_ip,
    agente: null,
    ahora: entrada.ahora,
    mfaVerificadaEn: entrada.ahora,
    emitirPase: true,
  });
  await registrar({
    tenantId: entrada.desafio.tenant_id,
    usuarioId: entrada.desafio.usuario_id,
    tipo: entrada.tipoEvento,
    correo,
    direccionIp: entrada.desafio.direccion_ip,
    ahora: entrada.ahora,
  });
  return resultado;
}

async function consumir(desafio: Desafio, ahora: Date): Promise<boolean> {
  const filas = await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    return tx
      .update(desafiosMfa)
      .set({ consumido_en: ahora })
      .where(and(eq(desafiosMfa.id, desafio.id), isNull(desafiosMfa.consumido_en)))
      .returning({ id: desafiosMfa.id });
  });
  return filas.length > 0;
}

async function usarCodigoRecuperacion(usuarioId: string, tenantId: string, codigo: string, ahora: Date): Promise<boolean> {
  return withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
    const vivos = await tx
      .select({ id: codigosRecuperacion.id, hash_codigo: codigosRecuperacion.hash_codigo })
      .from(codigosRecuperacion)
      .where(and(eq(codigosRecuperacion.usuario_id, usuarioId), isNull(codigosRecuperacion.usado_en)));
    const coincidencia = vivos.find((fila) => hashesCoinciden(fila.hash_codigo, codigo));
    if (!coincidencia) return false;
    await tx
      .update(codigosRecuperacion)
      .set({ usado_en: ahora })
      .where(and(eq(codigosRecuperacion.id, coincidencia.id), isNull(codigosRecuperacion.usado_en)));
    return true;
  });
}

export async function confirmarSegundoFactor(entrada: {
  ticket: string;
  codigo: string;
  ahora?: Date;
}): Promise<ResultadoInicioSesion> {
  const ahora = entrada.ahora ?? new Date();
  const desafio = await leerDesafio(entrada.ticket);
  if (!desafio || !desafioUtil(desafio, ahora)) return falloMfa();
  if (await usuarioBloqueado(desafio.usuario_id, ahora)) return falloMfa();
  const correo = await correoDe(desafio.usuario_id);

  if (desafio.proposito === 'enrolar') {
    if (!desafio.secreto_pendiente) return falloMfa();
    const secreto = proteccionIdentidad.revelar(desafio.secreto_pendiente);
    const totp = verificarTotp(secreto, entrada.codigo, ahora, null);
    if (!totp.valido) {
      await anotarFallo(desafio.usuario_id, desafio.tenant_id, correo, desafio.direccion_ip, ahora);
      return falloMfa();
    }
    if (!(await consumir(desafio, ahora))) return falloMfa();
    await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
      await tx.insert(factoresTotp).values({
        tenant_id: desafio.tenant_id,
        usuario_id: desafio.usuario_id,
        secreto_protegido: desafio.secreto_pendiente!,
        ultimo_paso: totp.paso,
        confirmado_en: ahora,
        creado_en: ahora,
      });
      const hashes = desafio.codigos_hash ?? [];
      if (hashes.length > 0) {
        await tx.insert(codigosRecuperacion).values(
          hashes.map((hash) => ({
            tenant_id: desafio.tenant_id,
            usuario_id: desafio.usuario_id,
            hash_codigo: hash,
            creado_en: ahora,
          })),
        );
      }
    });
    return abrirTrasMfa({ desafio, ahora, tipoEvento: 'mfa_alta' });
  }

  if (desafio.proposito !== 'verificar') return falloMfa();
  const factor = await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    const [fila] = await tx
      .select()
      .from(factoresTotp)
      .where(eq(factoresTotp.usuario_id, desafio.usuario_id))
      .limit(1);
    return fila ?? null;
  });
  let aceptado = false;
  if (factor) {
    const totp = verificarTotp(
      proteccionIdentidad.revelar(factor.secreto_protegido),
      entrada.codigo,
      ahora,
      factor.ultimo_paso,
    );
    if (totp.valido) {
      aceptado = true;
      await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
        await tx.update(factoresTotp).set({ ultimo_paso: totp.paso }).where(eq(factoresTotp.id, factor.id));
      });
    }
  }
  if (!aceptado) {
    aceptado = await usarCodigoRecuperacion(desafio.usuario_id, desafio.tenant_id, entrada.codigo, ahora);
  }
  if (!aceptado) {
    await anotarFallo(desafio.usuario_id, desafio.tenant_id, correo, desafio.direccion_ip, ahora);
    return falloMfa();
  }
  if (!(await consumir(desafio, ahora))) return falloMfa();
  return abrirTrasMfa({ desafio, ahora, tipoEvento: 'mfa_ok' });
}

export async function canjearPase(pase: string, ahora: Date = new Date()): Promise<SesionEmitida | null> {
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(pase).digest('hex');
  const desde = new Date(ahora.getTime() - MINUTOS_PASE * 60_000);
  const resultado = await obtenerPool().query<{
    id: string;
    tenant_id: string;
    usuario_id: string;
    expira_en: Date;
  }>(
    `update sesiones set pase_consumido_en = $2
      where pase_hash = $1 and pase_consumido_en is null and revocada_en is null and creada_en >= $3
      returning id, tenant_id, usuario_id, expira_en`,
    [hash, ahora.toISOString(), desde.toISOString()],
  );
  const fila = resultado.rows[0];
  if (!fila) return null;
  const membresias = await obtenerPool().query<{ sede_id: string; rol: string }>(
    `select sede_id, rol from membresias_para_inicio($1::uuid)`,
    [fila.usuario_id],
  );
  const roles = membresias.rows.map((item) => item.rol);
  const sedes = [...new Set(membresias.rows.map((item) => item.sede_id))];
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    tenantId: fila.tenant_id,
    sedeId: sedes[0] ?? '',
    rol: roles[0] ?? '',
    sedes,
    correo: await correoDe(fila.usuario_id),
    expiraEn: new Date(fila.expira_en).toISOString(),
  };
}

async function leerMarcaMfa(sesionId: string): Promise<{
  tenantId: string;
  usuarioId: string;
  verificadaEn: Date | null;
  revocada: boolean;
} | null> {
  const resultado = await obtenerPool().query<{
    tenant_id: string;
    usuario_id: string;
    mfa_verificada_en: Date | null;
    revocada_en: Date | null;
  }>(
    `select tenant_id, usuario_id, mfa_verificada_en, revocada_en from sesiones where id = $1`,
    [sesionId],
  );
  const fila = resultado.rows[0];
  if (!fila) return null;
  return {
    tenantId: fila.tenant_id,
    usuarioId: fila.usuario_id,
    verificadaEn: fila.mfa_verificada_en ? new Date(fila.mfa_verificada_en) : null,
    revocada: Boolean(fila.revocada_en),
  };
}

export async function exigirMfaParaFirmarAtencion(sesionId: string, ahora: Date = new Date()) {
  const fila = await leerMarcaMfa(sesionId);
  if (!fila || fila.revocada) return { ok: false as const, requiereReautenticacion: true as const };
  return evaluarMfaParaFirma(fila.verificadaEn, ahora);
}

async function aceptarCodigoDeUsuario(usuarioId: string, tenantId: string, codigo: string, ahora: Date): Promise<boolean> {
  const factor = await withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
    const [fila] = await tx.select().from(factoresTotp).where(eq(factoresTotp.usuario_id, usuarioId)).limit(1);
    return fila ?? null;
  });
  if (factor) {
    const totp = verificarTotp(
      proteccionIdentidad.revelar(factor.secreto_protegido),
      codigo,
      ahora,
      factor.ultimo_paso,
    );
    if (totp.valido) {
      await withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
        await tx.update(factoresTotp).set({ ultimo_paso: totp.paso }).where(eq(factoresTotp.id, factor.id));
      });
      return true;
    }
  }
  return usarCodigoRecuperacion(usuarioId, tenantId, codigo, ahora);
}

export async function reautenticarMfa(entrada: {
  sesionId: string;
  codigo: string;
  ahora?: Date;
}): Promise<ResultadoContrasena> {
  const ahora = entrada.ahora ?? new Date();
  const fila = await leerMarcaMfa(entrada.sesionId);
  if (!fila || fila.revocada) return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  if (await usuarioBloqueado(fila.usuarioId, ahora)) return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  const correo = await correoDe(fila.usuarioId);
  const aceptado = await aceptarCodigoDeUsuario(fila.usuarioId, fila.tenantId, entrada.codigo, ahora);
  if (!aceptado) {
    await anotarFallo(fila.usuarioId, fila.tenantId, correo, null, ahora);
    return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  }
  await withTenantTx({ tenant_id: fila.tenantId, usuario_id: fila.usuarioId }, async (tx) => {
    await tx.update(sesiones).set({ mfa_verificada_en: ahora }).where(eq(sesiones.id, entrada.sesionId));
  });
  await registrar({
    tenantId: fila.tenantId,
    usuarioId: fila.usuarioId,
    tipo: 'mfa_ok',
    correo,
    direccionIp: null,
    ahora,
  });
  return { ok: true };
}

export async function darDeBajaTotp(entrada: {
  sesionId: string;
  codigo: string;
  ahora?: Date;
}): Promise<ResultadoContrasena> {
  const ahora = entrada.ahora ?? new Date();
  const fila = await leerMarcaMfa(entrada.sesionId);
  if (!fila || fila.revocada) return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  const correo = await correoDe(fila.usuarioId);
  const aceptado = await aceptarCodigoDeUsuario(fila.usuarioId, fila.tenantId, entrada.codigo, ahora);
  if (!aceptado) {
    await anotarFallo(fila.usuarioId, fila.tenantId, correo, null, ahora);
    return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  }
  await withTenantTx({ tenant_id: fila.tenantId, usuario_id: fila.usuarioId }, async (tx) => {
    await tx.delete(factoresTotp).where(eq(factoresTotp.usuario_id, fila.usuarioId));
    await tx.delete(codigosRecuperacion).where(eq(codigosRecuperacion.usuario_id, fila.usuarioId));
  });
  await registrar({
    tenantId: fila.tenantId,
    usuarioId: fila.usuarioId,
    tipo: 'mfa_baja',
    correo,
    direccionIp: null,
    ahora,
  });
  return { ok: true };
}

function aBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function desdeBase64Url(valor: string): Uint8Array {
  return new Uint8Array(Buffer.from(valor, 'base64url'));
}

async function credencialesDe(usuarioId: string, tenantId: string) {
  return withTenantTx({ tenant_id: tenantId, usuario_id: usuarioId }, async (tx) => {
    return tx
      .select()
      .from(credencialesWebauthn)
      .where(eq(credencialesWebauthn.usuario_id, usuarioId));
  });
}

export async function opcionesRegistroPasskey(entrada: {
  ticket?: string;
  sesionId?: string;
  contexto: ContextoPasskey;
  ahora?: Date;
}): Promise<OpcionesPasskey> {
  const ahora = entrada.ahora ?? new Date();
  const dueno = entrada.ticket
    ? await leerDesafio(entrada.ticket)
    : entrada.sesionId
      ? await (async () => {
          const sesion = await leerMarcaMfa(entrada.sesionId!);
          if (!sesion || sesion.revocada) return null;
          const ticket = await crearDesafio({
            tenantId: sesion.tenantId,
            usuarioId: sesion.usuarioId,
            proposito: 'passkey_registro',
            direccionIp: null,
            ahora,
          });
          return leerDesafio(ticket);
        })()
      : null;
  if (!dueno || !desafioUtil(dueno, ahora)) return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  const correo = await correoDe(dueno.usuario_id);
  const existentes = await credencialesDe(dueno.usuario_id, dueno.tenant_id);
  const opciones = await generateRegistrationOptions({
    rpName: NOMBRE_RP,
    rpID: entrada.contexto.rpID,
    userName: correo,
    userID: new TextEncoder().encode(dueno.usuario_id),
    attestationType: 'none',
    excludeCredentials: existentes.map((fila) => ({ id: fila.credencial_id })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    supportedAlgorithmIDs: [-7, -257],
  });
  await withTenantTx({ tenant_id: dueno.tenant_id, usuario_id: dueno.usuario_id }, async (tx) => {
    await tx
      .update(desafiosMfa)
      .set({ desafio_webauthn: opciones.challenge })
      .where(eq(desafiosMfa.id, dueno.id));
  });
  return { ok: true, opciones: opcionesWebAuthn(opciones) };
}

export async function confirmarRegistroPasskey(entrada: {
  ticket?: string;
  sesionId?: string;
  respuesta: unknown;
  contexto: ContextoPasskey;
  ahora?: Date;
}): Promise<ResultadoInicioSesion | ResultadoContrasena> {
  const ahora = entrada.ahora ?? new Date();
  const ticket = entrada.ticket ?? (typeof (entrada.respuesta as { ticket?: string })?.ticket === 'string'
    ? (entrada.respuesta as { ticket: string }).ticket
    : '');
  const desafio = ticket ? await leerDesafio(ticket) : null;
  if (!desafio || !desafio.desafio_webauthn || !desafioUtil(desafio, ahora)) return falloMfa();
  let verificado = false;
  let credencialId = '';
  let clave = '';
  let contador = 0;
  let transportes = '';
  try {
    const respuesta = entrada.respuesta as RegistrationResponseJSON;
    const resultado = await verifyRegistrationResponse({
      response: respuesta,
      expectedChallenge: desafio.desafio_webauthn,
      expectedOrigin: entrada.contexto.origin,
      expectedRPID: entrada.contexto.rpID,
    });
    if (resultado.verified) {
      verificado = true;
      credencialId = resultado.registrationInfo.credential.id;
      clave = aBase64Url(resultado.registrationInfo.credential.publicKey);
      contador = resultado.registrationInfo.credential.counter;
      transportes = (respuesta.response.transports ?? []).join(',');
    }
  } catch {
    verificado = false;
  }
  const correo = await correoDe(desafio.usuario_id);
  if (!verificado) {
    await anotarFallo(desafio.usuario_id, desafio.tenant_id, correo, desafio.direccion_ip, ahora);
    return falloMfa();
  }
  if (!(await consumir(desafio, ahora))) return falloMfa();
  await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    await tx.insert(credencialesWebauthn).values({
      tenant_id: desafio.tenant_id,
      usuario_id: desafio.usuario_id,
      credencial_id: credencialId,
      clave_publica: clave,
      contador,
      transportes,
      creado_en: ahora,
    });
  });
  if (desafio.proposito === 'passkey_registro' && entrada.sesionId) {
    await registrar({
      tenantId: desafio.tenant_id,
      usuarioId: desafio.usuario_id,
      tipo: 'mfa_alta',
      correo,
      direccionIp: desafio.direccion_ip,
      ahora,
    });
    return { ok: true };
  }
  return abrirTrasMfa({ desafio, ahora, tipoEvento: 'mfa_alta' });
}

export async function opcionesAutenticacionPasskey(entrada: {
  ticket: string;
  contexto: ContextoPasskey;
  ahora?: Date;
}): Promise<OpcionesPasskey> {
  const ahora = entrada.ahora ?? new Date();
  const desafio = await leerDesafio(entrada.ticket);
  if (!desafio || desafio.proposito !== 'verificar' || !desafioUtil(desafio, ahora)) {
    return { ok: false, mensaje: MENSAJE_MFA_INVALIDO };
  }
  const existentes = await credencialesDe(desafio.usuario_id, desafio.tenant_id);
  const opciones = await generateAuthenticationOptions({
    rpID: entrada.contexto.rpID,
    allowCredentials: existentes.map((fila) => ({
      id: fila.credencial_id,
      transports: fila.transportes ? fila.transportes.split(',').filter(Boolean) : undefined,
    })),
    userVerification: 'preferred',
  });
  await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    await tx
      .update(desafiosMfa)
      .set({ desafio_webauthn: opciones.challenge, proposito: 'passkey_auth' })
      .where(eq(desafiosMfa.id, desafio.id));
  });
  return { ok: true, opciones: opcionesWebAuthn(opciones) };
}

export async function confirmarAutenticacionPasskey(entrada: {
  ticket: string;
  respuesta: unknown;
  contexto: ContextoPasskey;
  ahora?: Date;
}): Promise<ResultadoInicioSesion> {
  const ahora = entrada.ahora ?? new Date();
  const desafio = await leerDesafio(entrada.ticket);
  if (!desafio || !desafio.desafio_webauthn || !desafioUtil(desafio, ahora)) return falloMfa();
  const respuesta = entrada.respuesta as AuthenticationResponseJSON;
  const existentes = await credencialesDe(desafio.usuario_id, desafio.tenant_id);
  const guardada = existentes.find((fila) => fila.credencial_id === respuesta.id);
  if (!guardada) return falloMfa();
  let verificado = false;
  let nuevoContador = guardada.contador;
  try {
    const resultado = await verifyAuthenticationResponse({
      response: respuesta,
      expectedChallenge: desafio.desafio_webauthn,
      expectedOrigin: entrada.contexto.origin,
      expectedRPID: entrada.contexto.rpID,
      credential: {
        id: guardada.credencial_id,
        publicKey: Uint8Array.from(desdeBase64Url(guardada.clave_publica)),
        counter: guardada.contador,
        transports: guardada.transportes ? guardada.transportes.split(',').filter(Boolean) : undefined,
      },
    });
    verificado = resultado.verified;
    if (resultado.verified) nuevoContador = resultado.authenticationInfo.newCounter;
  } catch {
    verificado = false;
  }
  const correo = await correoDe(desafio.usuario_id);
  if (!verificado) {
    await anotarFallo(desafio.usuario_id, desafio.tenant_id, correo, desafio.direccion_ip, ahora);
    return falloMfa();
  }
  if (!(await consumir(desafio, ahora))) return falloMfa();
  await withTenantTx({ tenant_id: desafio.tenant_id, usuario_id: desafio.usuario_id }, async (tx) => {
    await tx
      .update(credencialesWebauthn)
      .set({ contador: nuevoContador, ultimo_uso_en: ahora })
      .where(eq(credencialesWebauthn.id, guardada.id));
  });
  return abrirTrasMfa({ desafio, ahora, tipoEvento: 'mfa_ok' });
}

export function codigoTotpDePrueba(secreto: string, ahora: Date): string {
  return codigoTotp(secreto, ahora);
}
