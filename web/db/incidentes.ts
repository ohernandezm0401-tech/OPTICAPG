// SEG-11 (T29) — Persistencia de incidentes. La app hace SET ROLE
// `optisaas_incidente` (INHERIT FALSE). No usa un rol con BYPASSRLS.
// El aviso al admin es in-app. La bitácora es la de T10, una fila por óptica.
// TODO(Q-07): aviso_optica_horas sigue nulo.
import 'server-only';

import type { PoolClient } from 'pg';

import {
  calcularPlazoIncidente,
  diasHabilesRestantes,
  exigirSiguienteEstado,
  ESTADOS_INCIDENTE,
  NOTA_Q07_AVISO_OPTICA,
  plantillaAvisoOptica,
  plantillaReporteSic,
  rechazarDatoPersonal,
  REGLA_SIN_DATOS_PERSONALES,
  textoCortoIncidente,
  textoNotificacionInterna,
  ZONA_INCIDENTE,
  type EstadoIncidente,
  type PlazoIncidente,
} from '../dominio/incidentes';
import { fechaCivilEnZona } from '../dominio/fechas';
import { registrarEvento } from '../lib/auditoria/servicio';
import { rolMatriz } from '../lib/authz/matrix';
import { obtenerPool } from './index';

export class ErrorIncidente extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorIncidente';
    this.status = status;
  }
}

export interface ContextoIncidente {
  tenant_id: string;
  usuario_id: string;
  rol: string;
  sede_id?: string | null;
  ip?: string | null;
  agente?: string | null;
}

export interface AltaIncidente {
  detectado_en: Date;
  descripcion: string;
  alcance: string;
  datos_afectados: string;
  severidad: string;
  festivos: readonly string[];
}

interface FilaIncidente {
  id: string;
  detectado_en: Date;
  dia_deteccion: string;
  descripcion: string;
  alcance: string;
  datos_afectados: string;
  severidad: string;
  causa: string | null;
  contencion: string | null;
  cierre_nota: string | null;
  estado: EstadoIncidente;
  notif_responsable_en: Date | null;
  reporte_sic_en: Date | null;
  cerrado_en: Date | null;
  plazo_sic: string;
  plazo_sic_dias: number;
  fuente_plazo: string;
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  festivos_aplicados: string[];
  creado_en: Date;
}

interface FilaAlerta {
  codigo: string;
  dias_habiles_antes: number;
  fecha: string;
}

function esOperacion(rol: string): boolean {
  const canonico = rolMatriz(rol);
  return canonico === 'owner_plataforma' || canonico === 'soporte_plataforma';
}

function esAdmin(rol: string): boolean {
  return rolMatriz(rol) === 'admin';
}

function exigirOperacion(ctx: ContextoIncidente): void {
  if (!esOperacion(ctx.rol)) {
    throw new ErrorIncidente(403, 'Solo la operación de plataforma registra incidentes.');
  }
}

async function conIncidente<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('SET LOCAL ROLE optisaas_incidente');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // La transacción ya estaba cerrada.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

async function conAdmin<T>(ctx: ContextoIncidente, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query(`select set_config('app.tenant_id', $1, true)`, [ctx.tenant_id]);
    await cliente.query(`select set_config('app.usuario_id', $1, true)`, [ctx.usuario_id]);
    await cliente.query(`select set_config('app.rol', $1, true)`, [ctx.rol]);
    await cliente.query(`select set_config('app.role', $1, true)`, [ctx.rol]);
    await cliente.query('SET LOCAL ROLE optisaas_app');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // La transacción ya estaba cerrada.
    }
    throw error;
  } finally {
    cliente.release();
  }
}

async function leerPlazoDias(cliente: PoolClient): Promise<number> {
  const fila = await cliente.query<{ valor: string }>(
    `select valor from parametros_incidente where clave = 'plazo_sic_dias_habiles'`,
  );
  const valor = Number(fila.rows[0]?.valor);
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErrorIncidente(500, 'El parámetro plazo_sic_dias_habiles no está configurado.');
  }
  return valor;
}

function presentar(fila: FilaIncidente, alertas: FilaAlerta[], ahora: Date) {
  const festivos = new Set(fila.festivos_aplicados ?? []);
  const hoy = fechaCivilEnZona(ahora, ZONA_INCIDENTE);
  return {
    ...fila,
    detectado_en: fila.detectado_en.toISOString(),
    notif_responsable_en: fila.notif_responsable_en?.toISOString() ?? null,
    reporte_sic_en: fila.reporte_sic_en?.toISOString() ?? null,
    cerrado_en: fila.cerrado_en?.toISOString() ?? null,
    creado_en: fila.creado_en.toISOString(),
    alertas,
    dias_habiles_restantes: diasHabilesRestantes(hoy, fila.plazo_sic, festivos),
    hoy,
    plantilla_optica: plantillaAvisoOptica({
      incidente_id: fila.id,
      dia_deteccion: fila.dia_deteccion,
      plazo_sic: fila.plazo_sic,
      plazo_sic_dias: fila.plazo_sic_dias,
      fuente_plazo: fila.fuente_plazo,
      alcance: fila.alcance,
      datos_afectados: fila.datos_afectados,
      severidad: fila.severidad,
    }),
    plantilla_sic: plantillaReporteSic({
      incidente_id: fila.id,
      dia_deteccion: fila.dia_deteccion,
      plazo_sic: fila.plazo_sic,
      plazo_sic_dias: fila.plazo_sic_dias,
      fuente_plazo: fila.fuente_plazo,
      alcance: fila.alcance,
      datos_afectados: fila.datos_afectados,
      severidad: fila.severidad,
    }),
  };
}

async function leerFila(cliente: PoolClient, id: string): Promise<FilaIncidente | null> {
  const fila = await cliente.query<FilaIncidente>(
    `select id, detectado_en, dia_deteccion::text, descripcion, alcance, datos_afectados, severidad,
            causa, contencion, cierre_nota, estado, notif_responsable_en, reporte_sic_en, cerrado_en,
            plazo_sic::text, plazo_sic_dias, fuente_plazo, festivos_cargados, aviso_festivos,
            festivos_aplicados, creado_en
       from incidentes where id = $1`,
    [id],
  );
  const encontrada = fila.rows[0];
  if (!encontrada) return null;
  return {
    ...encontrada,
    festivos_aplicados: Array.isArray(encontrada.festivos_aplicados) ? encontrada.festivos_aplicados : [],
    plazo_sic_dias: Number(encontrada.plazo_sic_dias),
  };
}

async function leerAlertas(cliente: PoolClient, id: string): Promise<FilaAlerta[]> {
  const alertas = await cliente.query<FilaAlerta>(
    `select codigo, dias_habiles_antes, fecha::text
       from alertas_incidente where incidente_id = $1 order by fecha`,
    [id],
  );
  return alertas.rows.map((fila) => ({ ...fila, dias_habiles_antes: Number(fila.dias_habiles_antes) }));
}

const SELECT_INCIDENTE = `id, detectado_en, dia_deteccion::text as dia_deteccion, descripcion, alcance,
  datos_afectados, severidad, causa, contencion, cierre_nota, estado, notif_responsable_en,
  reporte_sic_en, cerrado_en, plazo_sic::text as plazo_sic, plazo_sic_dias, fuente_plazo,
  festivos_cargados, aviso_festivos, festivos_aplicados, creado_en`;

export async function crearIncidente(ctx: ContextoIncidente, alta: AltaIncidente) {
  exigirOperacion(ctx);
  const descripcion = rechazarDatoPersonal('descripcion', alta.descripcion);
  const alcance = rechazarDatoPersonal('alcance', alta.alcance);
  const datos = rechazarDatoPersonal('datos_afectados', alta.datos_afectados);
  const severidad = textoCortoIncidente('severidad', alta.severidad);
  if (Number.isNaN(alta.detectado_en.getTime())) {
    throw new ErrorIncidente(400, 'La detección no es una fecha válida.');
  }

  const creado = await conIncidente(async (cliente) => {
    const plazoDias = await leerPlazoDias(cliente);
    let plazo: PlazoIncidente;
    try {
      plazo = calcularPlazoIncidente({
        detectado_en: alta.detectado_en,
        plazo_dias: plazoDias,
        festivos: alta.festivos,
      });
    } catch (error) {
      throw new ErrorIncidente(400, error instanceof Error ? error.message : 'No se pudo calcular el plazo.');
    }
    const insertado = await cliente.query<{ id: string }>(
      `insert into incidentes (
         detectado_en, dia_deteccion, descripcion, alcance, datos_afectados, severidad, estado,
         plazo_sic, plazo_sic_dias, fuente_plazo, festivos_cargados, aviso_festivos, festivos_aplicados, creado_por
       ) values (
         $1, $2, $3, $4, $5, $6, 'detectado', $7, $8, $9, $10, $11, $12::jsonb, $13
       ) returning id`,
      [
        alta.detectado_en.toISOString(),
        plazo.dia_deteccion,
        descripcion,
        alcance,
        datos,
        severidad,
        plazo.plazo_sic,
        plazo.plazo_sic_dias,
        plazo.fuente_plazo,
        plazo.festivos_cargados,
        plazo.aviso_festivos,
        JSON.stringify(plazo.festivos_aplicados),
        ctx.usuario_id,
      ],
    );
    const id = insertado.rows[0]?.id;
    if (!id) throw new ErrorIncidente(500, 'No se pudo crear el incidente.');
    for (const alerta of plazo.alertas) {
      await cliente.query(
        `insert into alertas_incidente (incidente_id, codigo, dias_habiles_antes, fecha)
         values ($1, $2, $3, $4)`,
        [id, alerta.codigo, alerta.dias_habiles_antes, alerta.fecha],
      );
    }
    const fila = await leerFila(cliente, id);
    if (!fila) throw new ErrorIncidente(500, 'No se pudo leer el incidente creado.');
    return presentar(fila, await leerAlertas(cliente, id), new Date());
  });
  return creado;
}

export async function listarIncidentes(ctx: ContextoIncidente) {
  if (esOperacion(ctx.rol)) {
    return conIncidente(async (cliente) => {
      const filas = await cliente.query<FilaIncidente>(
        `select ${SELECT_INCIDENTE} from incidentes order by detectado_en desc`,
      );
      const opticas = await cliente.query<{ id: string; razon_social: string }>(
        `select id, razon_social from listar_opticas_incidente()`,
      );
      const incidentes = [];
      for (const cruda of filas.rows) {
        const fila: FilaIncidente = {
          ...cruda,
          festivos_aplicados: Array.isArray(cruda.festivos_aplicados) ? cruda.festivos_aplicados : [],
          plazo_sic_dias: Number(cruda.plazo_sic_dias),
        };
        const afectados = await cliente.query<{ tenant_id: string }>(
          `select tenant_id from incidentes_tenants where incidente_id = $1`,
          [fila.id],
        );
        incidentes.push({
          ...presentar(fila, await leerAlertas(cliente, fila.id), new Date()),
          tenants_afectados: afectados.rows.map((item) => item.tenant_id),
        });
      }
      return {
        modo: 'plataforma' as const,
        regla_sin_datos_personales: REGLA_SIN_DATOS_PERSONALES,
        nota_q07: NOTA_Q07_AVISO_OPTICA,
        aviso_optica_horas: null,
        rotulo_aviso_optica: 'provisional',
        opticas: opticas.rows,
        incidentes,
      };
    });
  }

  if (!esAdmin(ctx.rol)) {
    throw new ErrorIncidente(403, 'No tiene permiso para ver incidentes.');
  }

  return conAdmin(ctx, async (cliente) => {
    const filas = await cliente.query(
      `select id, incidente_id, notificado_en, aviso_borrador, dia_deteccion::text, plazo_sic::text,
              plazo_sic_dias, fuente_plazo, festivos_cargados, aviso_festivos, alertas, descripcion,
              alcance, datos_afectados, severidad, estado
         from incidentes_tenants
        order by notificado_en desc`,
    );
    const avisos = await cliente.query(
      `select id, incidente_id, titulo, cuerpo, creada_en
         from notificaciones_internas
        where tipo = 'aviso_incidente'
        order by creada_en desc`,
    );
    return {
      modo: 'admin' as const,
      regla_sin_datos_personales: REGLA_SIN_DATOS_PERSONALES,
      nota_q07: NOTA_Q07_AVISO_OPTICA,
      incidentes: filas.rows,
      notificaciones: avisos.rows,
    };
  });
}

export async function marcarTenantsAfectados(
  ctx: ContextoIncidente,
  incidenteId: string,
  tenantIds: readonly string[],
) {
  exigirOperacion(ctx);
  const unicos = [...new Set(tenantIds.map((id) => id.trim()).filter(Boolean))];
  if (unicos.length === 0) throw new ErrorIncidente(400, 'Marque al menos una óptica.');

  const efecto = await conIncidente(async (cliente) => {
    const fila = await leerFila(cliente, incidenteId);
    if (!fila) throw new ErrorIncidente(404, 'No existe ese incidente.');
    if (fila.estado === 'cerrado') throw new ErrorIncidente(400, 'El incidente ya está cerrado.');
    const alertas = await leerAlertas(cliente, incidenteId);
    const nuevos: { tenantId: string; admins: string[] }[] = [];

    for (const tenantId of unicos) {
      const nombre = await cliente.query<{ nombre_tenant_incidente: string | null }>(
        `select nombre_tenant_incidente($1::uuid) as nombre_tenant_incidente`,
        [tenantId],
      );
      const razon = nombre.rows[0]?.nombre_tenant_incidente;
      if (!razon) throw new ErrorIncidente(400, 'Una de las ópticas marcadas no existe.');
      const admins = await cliente.query<{ usuario_id: string }>(
        `select usuario_id from admins_activos_tenant($1::uuid)`,
        [tenantId],
      );
      if (admins.rows.length === 0) {
        throw new ErrorIncidente(400, 'La óptica marcada no tiene un admin activo.');
      }
      const borrador = plantillaAvisoOptica({
        incidente_id: fila.id,
        dia_deteccion: fila.dia_deteccion,
        plazo_sic: fila.plazo_sic,
        plazo_sic_dias: fila.plazo_sic_dias,
        fuente_plazo: fila.fuente_plazo,
        alcance: fila.alcance,
        datos_afectados: fila.datos_afectados,
        severidad: fila.severidad,
        razon_social: razon,
      });
      const cuerpo = textoNotificacionInterna({
        incidente_id: fila.id,
        dia_deteccion: fila.dia_deteccion,
        plazo_sic: fila.plazo_sic,
        plazo_sic_dias: fila.plazo_sic_dias,
        fuente_plazo: fila.fuente_plazo,
        alcance: fila.alcance,
        datos_afectados: fila.datos_afectados,
        severidad: fila.severidad,
        razon_social: razon,
      });
      const enlace = await cliente.query<{ id: string }>(
        `insert into incidentes_tenants (
           incidente_id, tenant_id, notificado_en, aviso_borrador, dia_deteccion, plazo_sic,
           plazo_sic_dias, fuente_plazo, festivos_cargados, aviso_festivos, alertas, descripcion,
           alcance, datos_afectados, severidad, estado
         ) values (
           $1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15
         )
         on conflict (incidente_id, tenant_id) do nothing
         returning id`,
        [
          fila.id,
          tenantId,
          borrador,
          fila.dia_deteccion,
          fila.plazo_sic,
          fila.plazo_sic_dias,
          fila.fuente_plazo,
          fila.festivos_cargados,
          fila.aviso_festivos,
          JSON.stringify(alertas),
          fila.descripcion,
          fila.alcance,
          fila.datos_afectados,
          fila.severidad,
          fila.estado === 'detectado' || fila.estado === 'contenido' ? 'notificado_responsable' : fila.estado,
        ],
      );
      if (!enlace.rows[0]) continue;
      for (const admin of admins.rows) {
        await cliente.query(
          `insert into notificaciones_internas (tenant_id, usuario_id, incidente_id, tipo, titulo, cuerpo)
           values ($1, $2, $3, 'aviso_incidente', $4, $5)`,
          [tenantId, admin.usuario_id, fila.id, 'Incidente de seguridad que afecta a su óptica', cuerpo],
        );
      }
      nuevos.push({ tenantId, admins: admins.rows.map((filaAdmin) => filaAdmin.usuario_id) });
    }

    if (nuevos.length > 0 && (fila.estado === 'detectado' || fila.estado === 'contenido')) {
      await cliente.query(
        `update incidentes
            set estado = 'notificado_responsable',
                notif_responsable_en = coalesce(notif_responsable_en, now())
          where id = $1`,
        [fila.id],
      );
    } else if (nuevos.length > 0) {
      await cliente.query(
        `update incidentes set notif_responsable_en = coalesce(notif_responsable_en, now()) where id = $1`,
        [fila.id],
      );
    }

    return { nuevos, fila };
  });

  for (const nuevo of efecto.nuevos) {
    await registrarEvento(
      {
        tenant_id: nuevo.tenantId,
        usuario_id: ctx.usuario_id,
        rol: rolMatriz(ctx.rol) ?? ctx.rol,
        sede_id: null,
      },
      {
        actor_id: ctx.usuario_id,
        rol: rolMatriz(ctx.rol) ?? ctx.rol,
        sede_id: null,
        recurso: 'incidente',
        recurso_id: incidenteId,
        accion: 'crear',
        resultado: 'ok',
        ip: ctx.ip ?? null,
        agente: ctx.agente ?? null,
      },
    );
  }

  return { notificados: efecto.nuevos.map((item) => item.tenantId) };
}

export async function avanzarEstadoIncidente(
  ctx: ContextoIncidente,
  incidenteId: string,
  destino: string,
  nota: string | null,
  constanciaHumana: boolean,
) {
  exigirOperacion(ctx);
  if (!(ESTADOS_INCIDENTE as readonly string[]).includes(destino)) {
    throw new ErrorIncidente(400, 'El estado no es válido.');
  }
  const estado = destino as EstadoIncidente;
  const texto = nota?.trim() ? rechazarDatoPersonal('nota', nota) : null;
  if (estado === 'contenido' && !texto) {
    throw new ErrorIncidente(400, 'Registre la contención, sin datos de pacientes.');
  }
  if (estado === 'cerrado' && !texto) {
    throw new ErrorIncidente(400, 'Registre una nota de cierre, sin datos de pacientes.');
  }
  if (estado === 'reportado_sic' && !constanciaHumana) {
    throw new ErrorIncidente(400, 'El reporte a la SIC lo hace un humano, fuera del sistema.');
  }

  await conIncidente(async (cliente) => {
    const fila = await leerFila(cliente, incidenteId);
    if (!fila) throw new ErrorIncidente(404, 'No existe ese incidente.');
    try {
      exigirSiguienteEstado(fila.estado, estado);
    } catch (error) {
      throw new ErrorIncidente(400, error instanceof Error ? error.message : 'Transición no válida.');
    }
    if (estado === 'contenido') {
      await cliente.query(`update incidentes set estado = $2, contencion = $3 where id = $1`, [
        incidenteId,
        estado,
        texto,
      ]);
    } else if (estado === 'notificado_responsable') {
      await cliente.query(
        `update incidentes
            set estado = $2, notif_responsable_en = coalesce(notif_responsable_en, now())
          where id = $1`,
        [incidenteId, estado],
      );
    } else if (estado === 'reportado_sic') {
      await cliente.query(
        `update incidentes set estado = $2, reporte_sic_en = now() where id = $1`,
        [incidenteId, estado],
      );
    } else {
      await cliente.query(
        `update incidentes set estado = $2, cierre_nota = $3, cerrado_en = now() where id = $1`,
        [incidenteId, estado, texto],
      );
    }
    await cliente.query(`update incidentes_tenants set estado = $2 where incidente_id = $1`, [
      incidenteId,
      estado,
    ]);
  });
}
