// PLT-11 (T06) — Persistencia de parámetros, festivos y tarifas.
// Las escrituras pasan por `withTenantTx`. Solo datos sintéticos en pruebas.
// TODO(Q-06): PostgreSQL estándar + Drizzle.
// TODO(Q-07): plazos provisionales sin cantidad.
// TODO(Q-31): no se inserta ninguna tarifa al sembrar.
// TODO(Q-32): festivos únicamente desde el CSV que aporta un humano.
import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';

import { sumarDiasHabiles as sumarDiasHabilesPuro } from '../dominio/calendario-habil';
import { parsearCsvFestivos } from '../dominio/festivos-csv';
import { capturarInstantaneaImpuesto, type ImpuestoSnapshot } from '../dominio/impuestos';
import { programarMensajeComercial as programarMensajePuro } from '../dominio/mensajes-comerciales';
import { CLAVES_PARAMETRO, parametrosIniciales, type ClaveParametro } from '../dominio/parametros-iniciales';
import { POLITICA_RETENCION_INICIAL } from '../dominio/retencion';
import {
  bitacoraParametros,
  festivos,
  instantaneasImpuestoLinea,
  parametrosTenant,
  tarifasImpuesto,
} from './esquema/parametros';
import { politicaRetencion } from './esquema/retencion';
import { withTenantTx } from './tenant';
import {
  EsquemaActualizarParametro,
  EsquemaCambiarTarifa,
  EsquemaTarifaImpuesto,
  type ActualizarParametro,
  type CambiarTarifaEntrada,
  type TarifaImpuestoEntrada,
} from './validacion/parametros';

export async function sembrarParametrosIniciales(tenantId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const abiertos = await tx
      .select()
      .from(parametrosTenant)
      .where(and(eq(parametrosTenant.tenant_id, tenantId), isNull(parametrosTenant.vigente_hasta)));
    const claves = new Set(abiertos.map((fila) => fila.clave));
    const ahora = new Date();

    for (const inicial of parametrosIniciales()) {
      if (claves.has(inicial.clave)) continue;
      await tx.insert(parametrosTenant).values({
        tenant_id: tenantId,
        clave: inicial.clave,
        valor: inicial.valor,
        rotulo: inicial.rotulo,
        vigente_desde: ahora,
      });
      await tx.insert(bitacoraParametros).values({
        tenant_id: tenantId,
        clave: inicial.clave,
        valor_anterior: null,
        valor_nuevo: inicial.valor,
        rotulo: inicial.rotulo,
        registrado_en: ahora,
      });
    }

    await tx
      .insert(politicaRetencion)
      .values(
        POLITICA_RETENCION_INICIAL.map((fila) => ({
          tenant_id: tenantId,
          tipo_documento: fila.tipo_documento,
          anios: fila.anios,
          base_normativa: fila.base_normativa,
          verificado: fila.verificado,
          aplica_contratante_no_prestador: true,
        })),
      )
      .onConflictDoNothing();

    return tx
      .select()
      .from(parametrosTenant)
      .where(and(eq(parametrosTenant.tenant_id, tenantId), isNull(parametrosTenant.vigente_hasta)));
  });
}

export async function listarParametrosVigentes(tenantId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    return tx
      .select()
      .from(parametrosTenant)
      .where(and(eq(parametrosTenant.tenant_id, tenantId), isNull(parametrosTenant.vigente_hasta)));
  });
}

export async function actualizarParametro(entrada: ActualizarParametro) {
  const datos = EsquemaActualizarParametro.parse(entrada);
  return withTenantTx({ tenant_id: datos.tenant_id }, async (tx) => {
    const [abierto] = await tx
      .select()
      .from(parametrosTenant)
      .where(
        and(
          eq(parametrosTenant.tenant_id, datos.tenant_id),
          eq(parametrosTenant.clave, datos.clave),
          isNull(parametrosTenant.vigente_hasta),
        ),
      );
    if (!abierto) {
      throw new Error('no hay un parámetro vigente para esa clave; siembre los iniciales primero');
    }

    const ahora = new Date();
    await tx
      .update(parametrosTenant)
      .set({ vigente_hasta: ahora, actualizado_en: ahora })
      .where(eq(parametrosTenant.id, abierto.id));

    const [nuevo] = await tx
      .insert(parametrosTenant)
      .values({
        tenant_id: datos.tenant_id,
        clave: datos.clave,
        valor: datos.valor,
        rotulo: abierto.rotulo,
        vigente_desde: ahora,
      })
      .returning();

    await tx.insert(bitacoraParametros).values({
      tenant_id: datos.tenant_id,
      clave: datos.clave,
      valor_anterior: abierto.valor,
      valor_nuevo: datos.valor,
      rotulo: abierto.rotulo,
      registrado_en: ahora,
    });

    return nuevo;
  });
}

export async function listarBitacoraParametros(tenantId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    return tx.select().from(bitacoraParametros).where(eq(bitacoraParametros.tenant_id, tenantId));
  });
}

/** Reemplaza, por cada año presente en el CSV, los festivos de ese tenant. */
export async function cargarFestivosDesdeCsv(tenantId: string, csv: string) {
  const filas = parsearCsvFestivos(csv);
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const anios = [...new Set(filas.map((fila) => fila.anio))];
    for (const anio of anios) {
      await tx
        .delete(festivos)
        .where(and(eq(festivos.tenant_id, tenantId), eq(festivos.anio, anio)));
    }
    if (filas.length === 0) return [];
    return tx
      .insert(festivos)
      .values(
        filas.map((fila) => ({
          tenant_id: tenantId,
          anio: fila.anio,
          fecha: fila.fecha,
          nombre: fila.nombre,
          fuente: fila.fuente,
        })),
      )
      .returning();
  });
}

export async function listarFestivos(tenantId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    return tx.select().from(festivos).where(eq(festivos.tenant_id, tenantId));
  });
}

/** `sumarDiasHabiles(fecha, n, tenant)` usando la tabla `festivos` del tenant. */
export async function sumarDiasHabiles(fecha: string, n: number, tenantId: string): Promise<string> {
  const filas = await listarFestivos(tenantId);
  return sumarDiasHabilesPuro(fecha, n, new Set(filas.map((fila) => fila.fecha)));
}

/** Rechaza domingo o festivo cargado. El envío real llega con SEG-16. */
export async function programarMensajeComercial(fecha: string, tenantId: string) {
  const filas = await listarFestivos(tenantId);
  return programarMensajePuro(fecha, new Set(filas.map((fila) => fila.fecha)));
}

export async function crearTarifaImpuesto(entrada: TarifaImpuestoEntrada) {
  const datos = EsquemaTarifaImpuesto.parse(entrada);
  return withTenantTx({ tenant_id: datos.tenant_id }, async (tx) => {
    const [creada] = await tx
      .insert(tarifasImpuesto)
      .values({
        tenant_id: datos.tenant_id,
        nombre: datos.nombre,
        porcentaje_bp: datos.porcentaje_bp,
        excluido: datos.excluido,
        exento: datos.exento,
      })
      .returning();
    return creada;
  });
}

export async function cambiarTarifaImpuesto(entrada: CambiarTarifaEntrada) {
  const datos = EsquemaCambiarTarifa.parse(entrada);
  return withTenantTx({ tenant_id: datos.tenant_id }, async (tx) => {
    const [abierta] = await tx
      .select()
      .from(tarifasImpuesto)
      .where(
        and(
          eq(tarifasImpuesto.id, datos.tarifa_id),
          eq(tarifasImpuesto.tenant_id, datos.tenant_id),
          isNull(tarifasImpuesto.vigente_hasta),
        ),
      );
    if (!abierta) {
      throw new Error('no hay una tarifa vigente con ese identificador');
    }

    const ahora = new Date();
    await tx
      .update(tarifasImpuesto)
      .set({ vigente_hasta: ahora, actualizado_en: ahora })
      .where(eq(tarifasImpuesto.id, abierta.id));

    const [nueva] = await tx
      .insert(tarifasImpuesto)
      .values({
        tenant_id: datos.tenant_id,
        nombre: datos.nombre,
        porcentaje_bp: datos.porcentaje_bp,
        excluido: datos.excluido,
        exento: datos.exento,
        vigente_desde: ahora,
      })
      .returning();
    return nueva;
  });
}

export async function cerrarLineaConImpuesto(tenantId: string, tarifaId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const [tarifa] = await tx
      .select()
      .from(tarifasImpuesto)
      .where(
        and(
          eq(tarifasImpuesto.id, tarifaId),
          eq(tarifasImpuesto.tenant_id, tenantId),
          isNull(tarifasImpuesto.vigente_hasta),
        ),
      );
    if (!tarifa) {
      throw new Error('no hay una tarifa vigente con ese identificador');
    }
    const instantanea: ImpuestoSnapshot = capturarInstantaneaImpuesto({
      id: tarifa.id,
      nombre: tarifa.nombre,
      porcentaje_bp: tarifa.porcentaje_bp,
      excluido: tarifa.excluido,
      exento: tarifa.exento,
      vigente_desde: tarifa.vigente_desde,
    });
    const [linea] = await tx
      .insert(instantaneasImpuestoLinea)
      .values({
        tenant_id: tenantId,
        tarifa_impuesto_id: tarifa.id,
        impuesto_snapshot: instantanea,
      })
      .returning();
    return linea;
  });
}

export async function obtenerInstantaneaLinea(tenantId: string, lineaId: string) {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const [linea] = await tx
      .select()
      .from(instantaneasImpuestoLinea)
      .where(and(eq(instantaneasImpuestoLinea.id, lineaId), eq(instantaneasImpuestoLinea.tenant_id, tenantId)));
    return linea ?? null;
  });
}

export function claveEsConocida(clave: string): clave is ClaveParametro {
  return (CLAVES_PARAMETRO as readonly string[]).includes(clave);
}
