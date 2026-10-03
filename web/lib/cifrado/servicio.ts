// SEG-12 (T11) — Sobre por tenant: DEK aleatoria cifrada con la KEK del
// entorno. La rotación de KEK solo re-envuelve la DEK. La rotación de DEK
// re-cifra los sobres por lotes.
import 'server-only';

import { randomBytes } from 'node:crypto';
import { and, eq, ne, sql } from 'drizzle-orm';

import { withTenantTx } from '../../db/tenant';
import { clavesDatos, contenidosCifrados, secretosAdaptador } from '../../db/esquema/cifrado';
import { desafiosMfa, factoresTotp } from '../../db/esquema/mfa';
import {
  aadDato,
  cifrarConDek,
  descifrarAesGcm,
  desempaquetarSobre,
  envolverDek,
  ErrorCifrado,
  desenvolverDek,
  sha256Hex,
} from './aes';
import {
  CAMPO_ANEXO,
  esCampoTextoClinico,
  vistaPublicaAdaptador,
  type Adaptador,
  type CampoTextoClinico,
  type NombreSecretoAdaptador,
  type VistaAdaptador,
} from './campos';
import { leerClavesMaestras, type ConjuntoClavesMaestras } from './claves-maestras';

const PROPOSITO_ANEXO = 'anexo';
const PROPOSITO_TEXTO = 'texto_clinico';
const PROPOSITO_MFA = 'secreto_mfa';
const PROPOSITO_ADAPTADOR = 'secreto_adaptador';
const LOTE_POR_DEFECTO = 100;

function filasDe<T>(resultado: unknown): T[] {
  if (Array.isArray(resultado)) return resultado as T[];
  if (resultado && typeof resultado === 'object' && 'rows' in resultado) {
    return (resultado as { rows: T[] }).rows;
  }
  return [];
}

type DekAbierta = { version: number; dek: Buffer };

function claveKek(conjunto: ConjuntoClavesMaestras, version: number): Buffer {
  const clave = conjunto.claves.get(version);
  if (!clave) {
    throw new ErrorCifrado('No está la versión de la clave maestra necesaria para abrir la clave de datos.');
  }
  return clave;
}

async function leerDek(tenantId: string, version: number, conjunto: ConjuntoClavesMaestras): Promise<Buffer> {
  return withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const [fila] = await tx
      .select()
      .from(clavesDatos)
      .where(and(eq(clavesDatos.tenant_id, tenantId), eq(clavesDatos.version, version)))
      .limit(1);
    if (!fila) throw new ErrorCifrado('No está la clave de datos de ese tenant.');
    return desenvolverDek(fila.dek_cifrada, claveKek(conjunto, fila.version_kek), tenantId, fila.version);
  });
}

async function asegurarDekActiva(tenantId: string, conjunto: ConjuntoClavesMaestras): Promise<DekAbierta> {
  const existente = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const [fila] = await tx
      .select()
      .from(clavesDatos)
      .where(and(eq(clavesDatos.tenant_id, tenantId), eq(clavesDatos.estado, 'activa')))
      .limit(1);
    return fila ?? null;
  });
  if (existente) {
    return {
      version: existente.version,
      dek: desenvolverDek(
        existente.dek_cifrada,
        claveKek(conjunto, existente.version_kek),
        tenantId,
        existente.version,
      ),
    };
  }

  const dek = randomBytes(32);
  const version = 1;
  const dekCifrada = envolverDek(dek, claveKek(conjunto, conjunto.activa), conjunto.activa, tenantId, version);
  try {
    await withTenantTx({ tenant_id: tenantId }, async (tx) => {
      await tx.insert(clavesDatos).values({
        tenant_id: tenantId,
        version,
        dek_cifrada: dekCifrada,
        version_kek: conjunto.activa,
        estado: 'activa',
        activa: true,
      });
    });
    return { version, dek };
  } catch {
    return { version, dek: await leerDek(tenantId, version, conjunto) };
  }
}

function abrirSobre(sobre: string, dek: Buffer, tenantId: string, proposito: string): Buffer {
  const abierto = desempaquetarSobre(sobre);
  return descifrarAesGcm(dek, abierto.iv, abierto.tag, abierto.cifrado, aadDato(tenantId, proposito, abierto.versionDek));
}

export type ResultadoRotacionDek = {
  version: number;
  reprocesados: number;
  pendientes: number;
};

export type ServicioCifrado = {
  guardarAnexo(tenantId: string, referencia: string, bytes: Buffer): Promise<{ id: string; hash: string }>;
  leerAnexo(tenantId: string, id: string): Promise<Buffer>;
  guardarTextoClinico(
    tenantId: string,
    campo: CampoTextoClinico,
    referencia: string,
    texto: string,
  ): Promise<{ id: string }>;
  leerTextoClinico(tenantId: string, campo: CampoTextoClinico, referencia: string): Promise<string>;
  guardarSecretoAdaptador(
    tenantId: string,
    adaptador: Adaptador,
    nombre: NombreSecretoAdaptador,
    secreto: string,
  ): Promise<void>;
  listarAdaptadores(tenantId: string): Promise<VistaAdaptador[]>;
  cifrarSecretoMfa(tenantId: string, secreto: string): Promise<string>;
  revelarSecretoMfa(tenantId: string, protegido: string): Promise<string>;
  rotarClaveMaestra(tenantId: string): Promise<{ reenvueltas: number }>;
  rotarClaveDatos(tenantId: string, limite?: number): Promise<ResultadoRotacionDek>;
};

export function crearCifrado(conjunto: ConjuntoClavesMaestras): ServicioCifrado {
  async function cifrar(tenantId: string, proposito: string, claro: Buffer): Promise<{ sobre: string; version: number }> {
    const activa = await asegurarDekActiva(tenantId, conjunto);
    const sobre = cifrarConDek(activa.dek, activa.version, aadDato(tenantId, proposito, activa.version), claro);
    return { sobre, version: activa.version };
  }

  async function descifrar(tenantId: string, proposito: string, sobre: string): Promise<Buffer> {
    const abierto = desempaquetarSobre(sobre);
    const dek = await leerDek(tenantId, abierto.versionDek, conjunto);
    return abrirSobre(sobre, dek, tenantId, proposito);
  }

  return {
    async guardarAnexo(tenantId, referencia, bytes) {
      const { sobre, version } = await cifrar(tenantId, PROPOSITO_ANEXO, bytes);
      const id = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const [fila] = await tx
          .insert(contenidosCifrados)
          .values({
            tenant_id: tenantId,
            clase: 'anexo',
            campo: CAMPO_ANEXO,
            referencia,
            version_dek: version,
            sobre,
          })
          .returning({ id: contenidosCifrados.id });
        return fila.id;
      });
      return { id, hash: sha256Hex(bytes) };
    },

    async leerAnexo(tenantId, id) {
      const fila = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const [encontrada] = await tx
          .select()
          .from(contenidosCifrados)
          .where(
            and(
              eq(contenidosCifrados.tenant_id, tenantId),
              eq(contenidosCifrados.id, id),
              eq(contenidosCifrados.clase, 'anexo'),
            ),
          )
          .limit(1);
        return encontrada ?? null;
      });
      if (!fila) throw new ErrorCifrado('No está el anexo cifrado.');
      return descifrar(tenantId, PROPOSITO_ANEXO, fila.sobre);
    },

    async guardarTextoClinico(tenantId, campo, referencia, texto) {
      if (!esCampoTextoClinico(campo)) {
        throw new ErrorCifrado('Ese campo no está en la lista de texto clínico cifrado.');
      }
      const { sobre, version } = await cifrar(tenantId, PROPOSITO_TEXTO, Buffer.from(texto, 'utf8'));
      const id = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const [fila] = await tx
          .insert(contenidosCifrados)
          .values({
            tenant_id: tenantId,
            clase: 'texto_clinico',
            campo,
            referencia,
            version_dek: version,
            sobre,
          })
          .returning({ id: contenidosCifrados.id });
        return fila.id;
      });
      return { id };
    },

    async leerTextoClinico(tenantId, campo, referencia) {
      const fila = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const [encontrada] = await tx
          .select()
          .from(contenidosCifrados)
          .where(
            and(
              eq(contenidosCifrados.tenant_id, tenantId),
              eq(contenidosCifrados.clase, 'texto_clinico'),
              eq(contenidosCifrados.campo, campo),
              eq(contenidosCifrados.referencia, referencia),
            ),
          )
          .limit(1);
        return encontrada ?? null;
      });
      if (!fila) throw new ErrorCifrado('No está el texto clínico cifrado.');
      return (await descifrar(tenantId, PROPOSITO_TEXTO, fila.sobre)).toString('utf8');
    },

    async guardarSecretoAdaptador(tenantId, adaptador, nombre, secreto) {
      const { sobre, version } = await cifrar(tenantId, PROPOSITO_ADAPTADOR, Buffer.from(secreto, 'utf8'));
      await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        await tx
          .insert(secretosAdaptador)
          .values({
            tenant_id: tenantId,
            adaptador,
            nombre,
            version_dek: version,
            sobre,
          })
          .onConflictDoUpdate({
            target: [secretosAdaptador.tenant_id, secretosAdaptador.adaptador, secretosAdaptador.nombre],
            set: { version_dek: version, sobre, actualizado_en: new Date() },
          });
      });
    },

    async listarAdaptadores(tenantId) {
      const filas = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        return tx
          .select({ adaptador: secretosAdaptador.adaptador, nombre: secretosAdaptador.nombre })
          .from(secretosAdaptador)
          .where(eq(secretosAdaptador.tenant_id, tenantId));
      });
      return filas.map((fila) =>
        vistaPublicaAdaptador({
          adaptador: fila.adaptador as Adaptador,
          nombre: fila.nombre as NombreSecretoAdaptador,
        }),
      );
    },

    async cifrarSecretoMfa(tenantId, secreto) {
      const { sobre } = await cifrar(tenantId, PROPOSITO_MFA, Buffer.from(secreto, 'utf8'));
      return sobre;
    },

    async revelarSecretoMfa(tenantId, protegido) {
      if (!protegido.startsWith('optisaas1.')) {
        throw new ErrorCifrado('El secreto MFA no está cifrado.');
      }
      return (await descifrar(tenantId, PROPOSITO_MFA, protegido)).toString('utf8');
    },

    async rotarClaveMaestra(tenantId) {
      const kekNueva = claveKek(conjunto, conjunto.activa);
      return withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const filas = await tx.select().from(clavesDatos).where(eq(clavesDatos.tenant_id, tenantId));
        let reenvueltas = 0;
        for (const fila of filas) {
          if (fila.version_kek === conjunto.activa) continue;
          const dek = desenvolverDek(fila.dek_cifrada, claveKek(conjunto, fila.version_kek), tenantId, fila.version);
          const dekCifrada = envolverDek(dek, kekNueva, conjunto.activa, tenantId, fila.version);
          await tx
            .update(clavesDatos)
            .set({ dek_cifrada: dekCifrada, version_kek: conjunto.activa })
            .where(and(eq(clavesDatos.id, fila.id), eq(clavesDatos.tenant_id, tenantId)));
          reenvueltas += 1;
        }
        return { reenvueltas };
      });
    },

    async rotarClaveDatos(tenantId, limite = LOTE_POR_DEFECTO) {
      if (!Number.isInteger(limite) || limite < 1) {
        throw new ErrorCifrado('El lote de rotación debe ser un entero positivo.');
      }
      const previa = await asegurarDekActiva(tenantId, conjunto);
      let versionActiva = previa.version;

      const yaRotando = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        const [rotada] = await tx
          .select({ version: clavesDatos.version })
          .from(clavesDatos)
          .where(and(eq(clavesDatos.tenant_id, tenantId), eq(clavesDatos.estado, 'rotada')))
          .limit(1);
        return Boolean(rotada);
      });

      if (!yaRotando) {
        const dek = randomBytes(32);
        const version = versionActiva + 1;
        const dekCifrada = envolverDek(dek, claveKek(conjunto, conjunto.activa), conjunto.activa, tenantId, version);
        await withTenantTx({ tenant_id: tenantId }, async (tx) => {
          await tx
            .update(clavesDatos)
            .set({ estado: 'rotada', activa: false })
            .where(
              and(
                eq(clavesDatos.tenant_id, tenantId),
                eq(clavesDatos.version, versionActiva),
                eq(clavesDatos.estado, 'activa'),
              ),
            );
          await tx.insert(clavesDatos).values({
            tenant_id: tenantId,
            version,
            dek_cifrada: dekCifrada,
            version_kek: conjunto.activa,
            estado: 'activa',
            activa: true,
          });
        });
        versionActiva = version;
      }

      const dekActiva = await leerDek(tenantId, versionActiva, conjunto);
      let reprocesados = 0;
      let cupo = limite;

      const contenidos = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
        return tx
          .select()
          .from(contenidosCifrados)
          .where(and(eq(contenidosCifrados.tenant_id, tenantId), ne(contenidosCifrados.version_dek, versionActiva)))
          .limit(cupo);
      });
      for (const fila of contenidos) {
        const proposito = fila.clase === 'anexo' ? PROPOSITO_ANEXO : PROPOSITO_TEXTO;
        const dekVieja = await leerDek(tenantId, fila.version_dek, conjunto);
        const claro = abrirSobre(fila.sobre, dekVieja, tenantId, proposito);
        const sobre = cifrarConDek(dekActiva, versionActiva, aadDato(tenantId, proposito, versionActiva), claro);
        await withTenantTx({ tenant_id: tenantId }, async (tx) => {
          await tx
            .update(contenidosCifrados)
            .set({ sobre, version_dek: versionActiva, actualizado_en: new Date() })
            .where(and(eq(contenidosCifrados.id, fila.id), eq(contenidosCifrados.tenant_id, tenantId)));
        });
        reprocesados += 1;
        cupo -= 1;
      }

      if (cupo > 0) {
        const secretos = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
          return tx
            .select()
            .from(secretosAdaptador)
            .where(and(eq(secretosAdaptador.tenant_id, tenantId), ne(secretosAdaptador.version_dek, versionActiva)))
            .limit(cupo);
        });
        for (const fila of secretos) {
          const dekVieja = await leerDek(tenantId, fila.version_dek, conjunto);
          const claro = abrirSobre(fila.sobre, dekVieja, tenantId, PROPOSITO_ADAPTADOR);
          const sobre = cifrarConDek(
            dekActiva,
            versionActiva,
            aadDato(tenantId, PROPOSITO_ADAPTADOR, versionActiva),
            claro,
          );
          await withTenantTx({ tenant_id: tenantId }, async (tx) => {
            await tx
              .update(secretosAdaptador)
              .set({ sobre, version_dek: versionActiva, actualizado_en: new Date() })
              .where(and(eq(secretosAdaptador.id, fila.id), eq(secretosAdaptador.tenant_id, tenantId)));
          });
          reprocesados += 1;
          cupo -= 1;
        }
      }

      if (cupo > 0) {
        const hechos = await reprocesarColumna(
          tenantId,
          'factores_totp',
          'secreto_protegido',
          versionActiva,
          dekActiva,
          conjunto,
          cupo,
        );
        reprocesados += hechos;
        cupo -= hechos;
      }

      if (cupo > 0) {
        reprocesados += await reprocesarColumna(
          tenantId,
          'desafios_mfa',
          'secreto_pendiente',
          versionActiva,
          dekActiva,
          conjunto,
          cupo,
        );
      }

      const pendientes = await contarPendientes(tenantId, versionActiva);
      if (pendientes === 0) {
        await withTenantTx({ tenant_id: tenantId }, async (tx) => {
          await tx
            .update(clavesDatos)
            .set({ estado: 'retirada', activa: false })
            .where(and(eq(clavesDatos.tenant_id, tenantId), eq(clavesDatos.estado, 'rotada')));
        });
      }
      return { version: versionActiva, reprocesados, pendientes };
    },
  };
}

async function reprocesarColumna(
  tenantId: string,
  tabla: 'factores_totp' | 'desafios_mfa',
  columna: 'secreto_protegido' | 'secreto_pendiente',
  versionActiva: number,
  dekActiva: Buffer,
  conjunto: ConjuntoClavesMaestras,
  cupo: number,
): Promise<number> {
  const filas = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const resultado = await tx.execute(sql`
      select id, ${sql.raw(columna)} as valor
        from ${sql.raw(tabla)}
       where tenant_id = ${tenantId}::uuid
         and ${sql.raw(columna)} is not null
         and split_part(${sql.raw(columna)}, '.', 2) is distinct from ${String(versionActiva)}
       limit ${cupo}
    `);
    return filasDe<{ id: string; valor: string | null }>(resultado);
  });

  let hechos = 0;
  for (const fila of filas) {
    if (!fila.valor) continue;
    let claro: Buffer;
    if (fila.valor.startsWith('optisaas1.')) {
      const abierto = desempaquetarSobre(fila.valor);
      const dekVieja = await leerDek(tenantId, abierto.versionDek, conjunto);
      claro = abrirSobre(fila.valor, dekVieja, tenantId, PROPOSITO_MFA);
    } else {
      claro = Buffer.from(fila.valor, 'utf8');
    }
    const sobre = cifrarConDek(dekActiva, versionActiva, aadDato(tenantId, PROPOSITO_MFA, versionActiva), claro);
    await withTenantTx({ tenant_id: tenantId }, async (tx) => {
      if (tabla === 'factores_totp') {
        await tx
          .update(factoresTotp)
          .set({ secreto_protegido: sobre })
          .where(and(eq(factoresTotp.id, fila.id), eq(factoresTotp.tenant_id, tenantId)));
      } else {
        await tx
          .update(desafiosMfa)
          .set({ secreto_pendiente: sobre })
          .where(and(eq(desafiosMfa.id, fila.id), eq(desafiosMfa.tenant_id, tenantId)));
      }
    });
    hechos += 1;
  }
  return hechos;
}

async function contarPendientes(tenantId: string, versionActiva: number): Promise<number> {
  const total = await withTenantTx({ tenant_id: tenantId }, async (tx) => {
    const resultado = await tx.execute(sql`
      select (
        (select count(*) from contenidos_cifrados
          where tenant_id = ${tenantId}::uuid and version_dek <> ${versionActiva})
        + (select count(*) from secretos_adaptador
          where tenant_id = ${tenantId}::uuid and version_dek <> ${versionActiva})
        + (select count(*) from factores_totp
          where tenant_id = ${tenantId}::uuid
            and split_part(secreto_protegido, '.', 2) is distinct from ${String(versionActiva)})
        + (select count(*) from desafios_mfa
          where tenant_id = ${tenantId}::uuid
            and secreto_pendiente is not null
            and split_part(secreto_pendiente, '.', 2) is distinct from ${String(versionActiva)})
      )::text as total
    `);
    return filasDe<{ total: string }>(resultado)[0]?.total ?? '0';
  });
  return Number(total);
}

let instancia: ServicioCifrado | null = null;

export function obtenerCifrado(): ServicioCifrado {
  if (!instancia) instancia = crearCifrado(leerClavesMaestras(process.env));
  return instancia;
}

export function reiniciarCifradoParaPruebas(conjunto?: ConjuntoClavesMaestras): void {
  instancia = conjunto ? crearCifrado(conjunto) : null;
}
