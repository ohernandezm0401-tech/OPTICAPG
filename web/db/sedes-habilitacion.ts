// ADM-01 (T16) — Persistencia de sedes, certificado y tope del director.
// La tabla `sedes` es la de T03; aquí se leen y escriben las columnas nuevas.
// El rol de la piscina de desarrollo es superusuario (exento de RLS): cada
// operación fija el mismo contexto que `withTenantTx` y luego
// `SET LOCAL ROLE optisaas_app`. No hay rol con BYPASSRLS.
// TODO(Q-01), TODO(Q-19), TODO(Q-20).
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';

import {
  armarVistaSede,
  certificadoExigido,
  esTipoEstablecimiento,
  evaluarTopeDirector,
  type CertificadoSede,
  type TipoCertificado,
  type TipoEstablecimiento,
  type VistaSede,
} from '../dominio/sedes';
import { registrarEvento } from '../lib/auditoria/servicio';
import type { ActorAuthz } from '../lib/authz/ability';
import { puede } from '../lib/authz/ability';
import { obtenerPool } from './index';
import type { ContextoTenant } from './tenant';

const UUID = z.uuid();
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'la fecha debe ser AAAA-MM-DD');

export class ErrorSede extends Error {
  readonly codigo: 'validacion' | 'permiso' | 'director_limite' | 'no_encontrada';

  constructor(
    codigo: ErrorSede['codigo'],
    mensaje: string,
    readonly faltantes: string[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorSede';
    this.codigo = codigo;
  }
}

export interface ContextoSede extends ContextoTenant {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
}

export interface EntradaSede {
  id?: string | null;
  nombre: string;
  ciudad: string;
  direccion?: string | null;
  tipo_establecimiento: string;
  reps_codigo?: string | null;
  director_cientifico_id?: string | null;
  responsable_tecnovigilancia_id?: string | null;
  certificado_tipo?: string | null;
  certificado_numero?: string | null;
  certificado_vence?: string | null;
  certificado_entidad?: string | null;
  certificado_expedido?: string | null;
  override_director?: boolean;
}

const EsquemaEntrada = z.object({
  id: UUID.nullish(),
  nombre: z.string().trim().min(3, 'el nombre es obligatorio').max(200),
  ciudad: z.string().trim().min(2, 'la ciudad es obligatoria').max(120),
  direccion: z.string().trim().max(250).nullish(),
  tipo_establecimiento: z.string().trim(),
  reps_codigo: z.string().trim().max(80).nullish(),
  director_cientifico_id: z.string().trim().nullish(),
  responsable_tecnovigilancia_id: z.string().trim().nullish(),
  certificado_tipo: z.string().trim().nullish(),
  certificado_numero: z.string().trim().max(80).nullish(),
  certificado_vence: z.string().trim().nullish(),
  certificado_entidad: z.string().trim().max(200).nullish(),
  certificado_expedido: z.string().trim().nullish(),
  override_director: z.boolean().optional(),
});

interface FilaSede {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string | null;
  tipo: string;
  reps_codigo: string | null;
  director_cientifico_id: string | null;
  responsable_tecnovigilancia_id: string | null;
  certificado_numero: string | null;
  certificado_vence: string | null;
}

interface FilaCertificado {
  tipo: string;
  numero: string;
  entidad: string | null;
  expedido: string | null;
  vence: string;
}

function leerListaUuid(valor: string | null | undefined): string[] {
  if (!valor || valor === '{}') return [];
  return valor
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((item) => item.replace(/"/g, '').trim())
    .filter(Boolean);
}

function vacio(valor: string | null | undefined): string | null {
  if (valor == null) return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

function uuidOpcional(valor: string | null | undefined, etiqueta: string): string | null {
  const limpio = vacio(valor);
  if (!limpio) return null;
  const parsed = UUID.safeParse(limpio);
  if (!parsed.success) throw new ErrorSede('validacion', `${etiqueta} no es un identificador válido`);
  return parsed.data;
}

function actorDe(contexto: ContextoSede): ActorAuthz {
  return {
    id: contexto.usuario_id,
    rol: contexto.rol,
    tenantId: contexto.tenant_id,
    sedeActiva: contexto.sede_id,
    sedesAutorizadas: contexto.sedes,
    tarjetaProfesionalVigente: true,
  };
}

function exigir(contexto: ContextoSede, accion: 'crear' | 'leer' | 'actualizar'): void {
  const actor = actorDe(contexto);
  const sujeto = { tipo: 'R18' as const, tenantId: contexto.tenant_id, sedeId: contexto.sede_id };
  if (puede(actor, accion, sujeto)) return;
  // La ficha ADM-01 da lectura al auditor. La matriz §4.4 deja R18 en «—»
  // para ese rol; la lectura no abre la escritura.
  if (accion === 'leer' && contexto.rol === 'auditor') return;
  throw new ErrorSede('permiso', 'No tiene permiso para administrar sedes.');
}

async function conApp<T>(contexto: ContextoSede, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
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

async function ampliarSedes(cliente: PoolClient, contexto: ContextoSede, sedeId: string): Promise<void> {
  if (contexto.sedes.includes(sedeId)) return;
  contexto.sedes = [...contexto.sedes, sedeId];
  await cliente.query(`select set_config('app.sedes', $1, true)`, [contexto.sedes.join(',')]);
  await cliente.query(`select set_config('app.sede_id', $1, true)`, [sedeId]);
}

function certificadoDe(fila: FilaCertificado | undefined): CertificadoSede | null {
  if (!fila) return null;
  if (fila.tipo !== 'dispensacion' && fila.tipo !== 'adecuacion' && fila.tipo !== 'produccion') return null;
  return {
    tipo: fila.tipo,
    numero: fila.numero,
    vence: fila.vence,
    entidad: fila.entidad,
    expedido: fila.expedido,
  };
}

function elegirCertificado(tipo: TipoEstablecimiento, filas: FilaCertificado[]): CertificadoSede | null {
  const exigido = certificadoExigido(tipo);
  const coincidente = exigido ? filas.find((fila) => fila.tipo === exigido) : filas[0];
  return certificadoDe(coincidente);
}

async function leerCertificados(cliente: PoolClient, sedeId: string): Promise<FilaCertificado[]> {
  const resultado = await cliente.query<FilaCertificado>(
    `select tipo, numero, entidad,
            to_char(expedido, 'YYYY-MM-DD') as expedido,
            to_char(vence, 'YYYY-MM-DD') as vence
       from certificados_sede
      where sede_id = $1`,
    [sedeId],
  );
  return resultado.rows;
}

async function leerFila(cliente: PoolClient, sedeId: string): Promise<FilaSede | null> {
  const resultado = await cliente.query<FilaSede>(
    `select id, nombre, ciudad, direccion, tipo, reps_codigo,
            director_cientifico_id, responsable_tecnovigilancia_id,
            certificado_numero,
            to_char(certificado_vence, 'YYYY-MM-DD') as certificado_vence
       from sedes
      where id = $1`,
    [sedeId],
  );
  return resultado.rows[0] ?? null;
}

async function aVista(cliente: PoolClient, fila: FilaSede, ahora: Date): Promise<VistaSede> {
  if (!esTipoEstablecimiento(fila.tipo)) {
    throw new ErrorSede('validacion', 'el tipo de establecimiento no es válido');
  }
  const certificados = await leerCertificados(cliente, fila.id);
  return armarVistaSede(
    {
      id: fila.id,
      nombre: fila.nombre,
      ciudad: fila.ciudad,
      direccion: fila.direccion,
      tipo_establecimiento: fila.tipo,
      reps_codigo: fila.reps_codigo,
      director_cientifico_id: fila.director_cientifico_id,
      responsable_tecnovigilancia_id: fila.responsable_tecnovigilancia_id,
      certificado: elegirCertificado(fila.tipo, certificados),
    },
    ahora,
  );
}

async function usuarioDelTenant(cliente: PoolClient, usuarioId: string, etiqueta: string): Promise<void> {
  const resultado = await cliente.query(`select id from usuarios where id = $1`, [usuarioId]);
  if (resultado.rows.length === 0) {
    throw new ErrorSede('validacion', `${etiqueta} no pertenece a esta óptica`);
  }
}

function certificadoEntrada(
  tipoSede: TipoEstablecimiento,
  entrada: z.infer<typeof EsquemaEntrada>,
): CertificadoSede | null {
  const numero = vacio(entrada.certificado_numero);
  const vence = vacio(entrada.certificado_vence);
  const tipoDato = vacio(entrada.certificado_tipo);
  const entidad = vacio(entrada.certificado_entidad);
  const expedido = vacio(entrada.certificado_expedido);
  if (!numero && !vence && !tipoDato && !entidad && !expedido) return null;
  if (!numero || !vence) {
    throw new ErrorSede('validacion', 'el certificado necesita número y fecha de vencimiento');
  }
  const venceOk = FECHA.safeParse(vence);
  if (!venceOk.success) throw new ErrorSede('validacion', 'la fecha de vencimiento debe ser AAAA-MM-DD');
  if (expedido) {
    const expedidoOk = FECHA.safeParse(expedido);
    if (!expedidoOk.success) throw new ErrorSede('validacion', 'la fecha de expedición debe ser AAAA-MM-DD');
  }
  const exigido = certificadoExigido(tipoSede);
  const tipo = tipoDato ?? exigido;
  if (tipo !== 'dispensacion' && tipo !== 'adecuacion' && tipo !== 'produccion') {
    throw new ErrorSede('validacion', 'el tipo de certificado no es válido');
  }
  return { tipo, numero, vence, entidad, expedido };
}

export async function listarSedesHabilitacion(contexto: ContextoSede, ahora = new Date()): Promise<VistaSede[]> {
  exigir(contexto, 'leer');
  return conApp(contexto, async (cliente) => {
    const resultado = await cliente.query<FilaSede>(
      `select id, nombre, ciudad, direccion, tipo, reps_codigo,
              director_cientifico_id, responsable_tecnovigilancia_id,
              certificado_numero,
              to_char(certificado_vence, 'YYYY-MM-DD') as certificado_vence
         from sedes
        order by nombre`,
    );
    const vistas: VistaSede[] = [];
    for (const fila of resultado.rows) vistas.push(await aVista(cliente, fila, ahora));
    return vistas;
  });
}

export async function listarUsuariosSede(contexto: ContextoSede): Promise<{ id: string; email: string }[]> {
  exigir(contexto, 'leer');
  return conApp(contexto, async (cliente) => {
    const resultado = await cliente.query<{ id: string; email: string }>(
      `select id, email from usuarios order by email`,
    );
    return resultado.rows;
  });
}

export async function idsSedesDelUsuario(tenantId: string, usuarioId: string): Promise<string[]> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [usuarioId]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await cliente.query<{ sedes_autorizadas_usuario: string | null }>(
      `select sedes_autorizadas_usuario() as sedes_autorizadas_usuario`,
    );
    await cliente.query('COMMIT');
    return leerListaUuid(resultado.rows[0]?.sedes_autorizadas_usuario);
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

export async function guardarSede(
  contexto: ContextoSede,
  entradaCruda: EntradaSede,
  ahora = new Date(),
): Promise<VistaSede> {
  const entrada = EsquemaEntrada.parse(entradaCruda);
  if (!esTipoEstablecimiento(entrada.tipo_establecimiento)) {
    throw new ErrorSede('validacion', 'el tipo de establecimiento no es válido');
  }
  const tipo = entrada.tipo_establecimiento;
  const directorId = uuidOpcional(entrada.director_cientifico_id, 'el director científico');
  const tecnovigilanciaId = uuidOpcional(
    entrada.responsable_tecnovigilancia_id,
    'el responsable de tecnovigilancia',
  );
  const certificado = certificadoEntrada(tipo, entrada);
  const reps = vacio(entrada.reps_codigo);
  const direccion = vacio(entrada.direccion);
  const esNueva = !entrada.id;
  exigir(contexto, esNueva ? 'crear' : 'actualizar');

  let overrideAplicado = false;
  const vista = await conApp(contexto, async (cliente) => {
    if (directorId) await usuarioDelTenant(cliente, directorId, 'el director científico');
    if (tecnovigilanciaId) await usuarioDelTenant(cliente, tecnovigilanciaId, 'el responsable de tecnovigilancia');

    if (directorId) {
      const conteo = await cliente.query<{ contar_sedes_de_director: number }>(
        `select contar_sedes_de_director($1::uuid, $2::uuid)`,
        [directorId, entrada.id ?? null],
      );
      const tope = evaluarTopeDirector(Number(conteo.rows[0]?.contar_sedes_de_director ?? 0));
      if (tope.bloquea) {
        if (!entrada.override_director) throw new ErrorSede('director_limite', tope.mensaje);
        if (contexto.rol !== 'admin') {
          throw new ErrorSede('permiso', 'Solo el administrador puede autorizar un cuarto establecimiento.');
        }
        overrideAplicado = true;
      }
    }

    let sedeId = entrada.id ?? null;
    if (!sedeId) {
      sedeId = randomUUID();
      await cliente.query(
        `insert into sedes (
           id, tenant_id, nombre, ciudad, direccion, tipo, reps_codigo,
           director_cientifico_id, responsable_tecnovigilancia_id, estado
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'activa')`,
        [sedeId, contexto.tenant_id, entrada.nombre, entrada.ciudad, direccion, tipo, reps, directorId, tecnovigilanciaId],
      );
      await ampliarSedes(cliente, contexto, sedeId);
      await cliente.query(
        `insert into membresias (tenant_id, usuario_id, sede_id, rol)
         values ($1, $2, $3, 'admin')
         on conflict (usuario_id, sede_id, rol) do nothing`,
        [contexto.tenant_id, contexto.usuario_id, sedeId],
      );
    } else {
      const actualizada = await cliente.query(
        `update sedes
            set nombre = $2,
                ciudad = $3,
                direccion = $4,
                tipo = $5,
                reps_codigo = $6,
                director_cientifico_id = $7,
                responsable_tecnovigilancia_id = $8,
                actualizado_en = now()
          where id = $1`,
        [sedeId, entrada.nombre, entrada.ciudad, direccion, tipo, reps, directorId, tecnovigilanciaId],
      );
      if (actualizada.rowCount !== 1) throw new ErrorSede('no_encontrada', 'La sede no está en sus sedes autorizadas.');
    }

    if (certificado) {
      await cliente.query(
        `insert into certificados_sede (tenant_id, sede_id, tipo, numero, entidad, expedido, vence)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (sede_id, tipo) do update
           set numero = excluded.numero,
               entidad = excluded.entidad,
               expedido = excluded.expedido,
               vence = excluded.vence,
               actualizado_en = now()`,
        [
          contexto.tenant_id,
          sedeId,
          certificado.tipo,
          certificado.numero,
          certificado.entidad ?? null,
          certificado.expedido ?? null,
          certificado.vence,
        ],
      );
    }

    const espejo = certificadoEspejo(tipo, certificado);
    if (espejo) {
      await cliente.query(
        `update sedes
            set certificado_numero = $2,
                certificado_vence = $3,
                actualizado_en = now()
          where id = $1`,
        [sedeId, espejo.numero, espejo.vence],
      );
    }

    const fila = await leerFila(cliente, sedeId);
    if (!fila) throw new ErrorSede('no_encontrada', 'La sede no quedó visible para esta sesión.');
    return aVista(cliente, fila, ahora);
  });

  if (overrideAplicado) {
    await registrarEvento(
      {
        tenant_id: contexto.tenant_id,
        usuario_id: contexto.usuario_id,
        sede_id: vista.id,
        sedes: contexto.sedes.includes(vista.id) ? contexto.sedes : [...contexto.sedes, vista.id],
        rol: 'admin',
      },
      {
        actor_id: contexto.usuario_id,
        rol: 'admin',
        sede_id: vista.id,
        recurso: 'R18',
        recurso_id: vista.id,
        accion: 'configuracion',
        resultado: 'ok',
      },
    );
  }

  return vista;
}

function certificadoEspejo(
  tipo: TipoEstablecimiento,
  certificado: CertificadoSede | null,
): CertificadoSede | null {
  if (!certificado) return null;
  const exigido = certificadoExigido(tipo);
  if (exigido && certificado.tipo !== exigido) return null;
  return certificado;
}

export async function bannerCertificadoVencido(
  contexto: ContextoSede,
  ahora = new Date(),
): Promise<{ nombre: string; sede_id: string } | null> {
  if (contexto.sedes.length === 0) return null;
  return conApp(contexto, async (cliente) => {
    const resultado = await cliente.query<FilaSede>(
      `select id, nombre, ciudad, direccion, tipo, reps_codigo,
              director_cientifico_id, responsable_tecnovigilancia_id,
              certificado_numero,
              to_char(certificado_vence, 'YYYY-MM-DD') as certificado_vence
         from sedes
        order by nombre`,
    );
    for (const fila of resultado.rows) {
      const vista = await aVista(cliente, fila, ahora);
      if (vista.alerta?.roja) return { nombre: vista.nombre, sede_id: vista.id };
    }
    return null;
  });
}

export type { TipoCertificado, VistaSede };
