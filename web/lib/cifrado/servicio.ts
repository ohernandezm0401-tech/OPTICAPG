// SEG-12 (T11) — Borde de servidor del cifrado. La KEK sale del entorno
// en cada llamada (no se cachea en el repositorio).
import 'server-only';

import { obtenerPool } from '../../db';

import {
  cifrarCampoClinico as cifrarCampo,
  cifrarParaTenant,
  descifrarCampoClinico as descifrarCampo,
  descifrarParaTenant,
  guardarAnexo as guardarAnexoSql,
  guardarSecretoAdaptador as guardarSecretoSql,
  leerAnexo as leerAnexoSql,
  listarAdaptadoresPublicos,
  respuestaPublicaAdaptadores,
  rotarClaveDatos,
  rotarClaveMaestra,
} from './almacen.mjs';
import { leerRegistroKek } from './kek.mjs';

export { respuestaPublicaAdaptadores };

function registro() {
  return leerRegistroKek();
}

export async function cifrarTextoTenant(tenantId: string, plano: Buffer) {
  return cifrarParaTenant(obtenerPool(), registro(), tenantId, plano);
}

export async function descifrarTextoTenant(tenantId: string, sobre: string) {
  const plano = await descifrarParaTenant(obtenerPool(), registro(), tenantId, sobre);
  return plano.toString('utf8');
}

export async function cifrarCampoClinico(tenantId: string, campo: string, texto: string) {
  return cifrarCampo(obtenerPool(), registro(), tenantId, campo, texto);
}

export async function descifrarCampoClinico(tenantId: string, campo: string, sobre: string) {
  return descifrarCampo(obtenerPool(), registro(), tenantId, campo, sobre);
}

export async function guardarAnexo(entrada: {
  tenantId: string;
  nombre: string;
  mime?: string | null;
  contenido: Buffer;
}) {
  return guardarAnexoSql(obtenerPool(), registro(), entrada);
}

export async function leerAnexo(tenantId: string, anexoId: string) {
  return leerAnexoSql(obtenerPool(), registro(), tenantId, anexoId);
}

export async function guardarSecretoAdaptador(entrada: {
  tenantId: string;
  adaptador: string;
  nombre: string;
  secreto: string;
}) {
  return guardarSecretoSql(obtenerPool(), registro(), entrada);
}

export async function listarAdaptadores(tenantId: string) {
  return listarAdaptadoresPublicos(obtenerPool(), tenantId);
}

export async function rotarKek(nueva: { id: string; clave: Buffer; tamanoLote?: number }) {
  return rotarClaveMaestra(obtenerPool(), registro(), nueva);
}

export async function rotarDek(tenantId: string, tamanoLote?: number) {
  return rotarClaveDatos(obtenerPool(), registro(), tenantId, { tamanoLote });
}
