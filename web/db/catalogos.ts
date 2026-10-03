// OPT-10 (T18) — Lectura de catálogos globales y glosario por tenant.
// TODO(Q-23): la búsqueda devuelve lo cargado en local, no un listado
// embebido. El rol de aplicación no escribe CIE-10 ni CUPS.
import 'server-only';

import { and, eq } from 'drizzle-orm';

import {
  ABREVIATURAS_INICIALES,
  ErrorCatalogo,
  normalizarAbreviatura,
  normalizarExpansion,
  revisarAbreviaturas,
} from '../dominio/catalogos.mjs';
import { glosarioAbreviaturas } from './esquema/catalogos';
import { obtenerPool } from './index';
import { withTenantTx, type ContextoTenant } from './tenant';

export type TipoCatalogo = 'cie10' | 'cups';

export interface FilaCatalogo {
  codigo: string;
  descripcion: string;
  version: string;
  vigente_desde: string;
}

export interface FilaGlosario {
  id: string;
  abreviatura: string;
  expansion: string;
}

const TABLAS: Record<TipoCatalogo, string> = {
  cie10: 'catalogo_cie10',
  cups: 'catalogo_cups',
};

function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

export async function buscarCatalogo(tipo: TipoCatalogo, consulta: string): Promise<FilaCatalogo[]> {
  const q = consulta.trim();
  if (q.length < 1 || q.length > 80) return [];
  const tabla = TABLAS[tipo];
  const patron = `%${escaparLike(q)}%`;
  const prefijo = `${escaparLike(q)}%`;
  const resultado = await obtenerPool().query<FilaCatalogo>(
    `select codigo, descripcion, version, vigente_desde::text as vigente_desde
       from ${tabla}
      where (vigente_hasta is null or vigente_hasta >= current_date)
        and (codigo ilike $1 escape '\\' or descripcion ilike $1 escape '\\')
      order by case
        when upper(codigo) = upper($2) then 0
        when codigo ilike $3 escape '\\' then 1
        else 2
      end, codigo
      limit 20`,
    [patron, q, prefijo],
  );
  return resultado.rows;
}

export async function listarGlosario(contexto: ContextoTenant): Promise<FilaGlosario[]> {
  return withTenantTx(contexto, async (tx) => {
    const filas = await tx
      .select({
        id: glosarioAbreviaturas.id,
        abreviatura: glosarioAbreviaturas.abreviatura,
        expansion: glosarioAbreviaturas.expansion,
      })
      .from(glosarioAbreviaturas)
      .where(eq(glosarioAbreviaturas.tenant_id, contexto.tenant_id))
      .orderBy(glosarioAbreviaturas.abreviatura);
    return filas;
  });
}

export async function guardarAbreviatura(
  contexto: ContextoTenant,
  entrada: { abreviatura: string; expansion: string },
): Promise<FilaGlosario> {
  const abreviatura = normalizarAbreviatura(entrada.abreviatura);
  const expansion = normalizarExpansion(entrada.expansion);
  return withTenantTx(contexto, async (tx) => {
    const [fila] = await tx
      .insert(glosarioAbreviaturas)
      .values({
        tenant_id: contexto.tenant_id,
        abreviatura,
        expansion,
      })
      .onConflictDoUpdate({
        target: [glosarioAbreviaturas.tenant_id, glosarioAbreviaturas.abreviatura],
        set: { expansion, actualizado_en: new Date() },
      })
      .returning({
        id: glosarioAbreviaturas.id,
        abreviatura: glosarioAbreviaturas.abreviatura,
        expansion: glosarioAbreviaturas.expansion,
      });
    if (!fila) throw new ErrorCatalogo('no se pudo guardar la abreviatura');
    return fila;
  });
}

export async function sembrarAbreviaturasIniciales(contexto: ContextoTenant): Promise<FilaGlosario[]> {
  for (const item of ABREVIATURAS_INICIALES) {
    await guardarAbreviatura(contexto, item);
  }
  return listarGlosario(contexto);
}

export async function eliminarAbreviatura(contexto: ContextoTenant, id: string): Promise<void> {
  await withTenantTx(contexto, async (tx) => {
    await tx
      .delete(glosarioAbreviaturas)
      .where(and(eq(glosarioAbreviaturas.id, id), eq(glosarioAbreviaturas.tenant_id, contexto.tenant_id)));
  });
}

export async function revisarTextoClinico(contexto: ContextoTenant, texto: string) {
  const glosario = await listarGlosario(contexto);
  return revisarAbreviaturas(texto, glosario);
}

export { ErrorCatalogo };
