// ASE-01 / SEG-06 (T13) — Persistencia de pacientes con RLS, cifrado del
// documento (T11) y bitácora de cambios (T10). Solo datos sintéticos.
import type { PoolClient } from 'pg';

import { hashDocumento } from '../dominio/documento-hash';
import {
  avisoMayoriaDeEdad,
  edadCumplida,
  enmascararDocumento,
  esMenorDeEdad,
  fechaCivilBogota,
  fichaSinDiagnosticoParaRol,
  siguienteNumHc,
  validarPaciente,
  type PacienteEntrada,
  type PacienteNormalizado,
  type TipoDocumento,
} from '../dominio/pacientes';
import { registrarEvento } from '../lib/auditoria/servicio';
import { cifrarParaTenant, descifrarParaTenant } from '../lib/cifrado/almacen.mjs';
import { leerRegistroKek } from '../lib/cifrado/kek.mjs';
import { obtenerPool } from './index';
import type { ContextoTenant } from './tenant';

export class ErrorPaciente extends Error {
  readonly codigo: 'validacion' | 'duplicado' | 'no_encontrado';

  constructor(
    codigo: ErrorPaciente['codigo'],
    mensaje: string,
    readonly errores: string[] = [],
    readonly existenteId?: string,
  ) {
    super(mensaje);
    this.name = 'ErrorPaciente';
    this.codigo = codigo;
  }
}

export interface ContextoPaciente extends ContextoTenant {
  tenant_id: string;
  usuario_id: string;
  sede_id: string;
  sedes: string[];
  rol: string;
}

export interface FilaLista {
  id: string;
  num_hc: number;
  tipo_doc: string;
  documento_enmascarado: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  edad: number;
  telefono: string;
  estado: string;
  menor: boolean;
}

export interface ResultadoGuardado {
  id: string;
  num_hc: number;
  duplicado: boolean;
  existente_id?: string;
  aviso_mayoria: string | null;
  aviso_similares: { id: string; num_hc: number }[];
}

interface FilaPaciente {
  id: string;
  num_hc: number;
  tipo_doc: string;
  num_doc: string;
  num_doc_hash: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string;
  estado_civil: string;
  ocupacion: string;
  direccion: string;
  telefono: string;
  email: string | null;
  acompanante: string;
  responsable: string;
  aseguradora: string;
  tipo_vinculacion: string;
  sede_alta_id: string;
  estado: string;
  fusionado_en_id: string | null;
  negativa_autorizacion: boolean;
}

const COLUMNAS = `id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos,
  to_char(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento, sexo, estado_civil, ocupacion,
  direccion, telefono, email, acompanante, responsable, aseguradora, tipo_vinculacion,
  sede_alta_id, estado, fusionado_en_id, negativa_autorizacion`;

function claveHmac(): Buffer {
  const registro = leerRegistroKek();
  const clave = registro.claves.get(registro.activaId);
  if (!clave) throw new Error('no hay clave para el hash del documento');
  return clave;
}

async function cifrar(tenantId: string, plano: string): Promise<string> {
  const sobre = await cifrarParaTenant(obtenerPool(), leerRegistroKek(), tenantId, Buffer.from(plano, 'utf8'));
  return sobre.texto;
}

async function descifrar(tenantId: string, sobre: string): Promise<string> {
  const plano = await descifrarParaTenant(obtenerPool(), leerRegistroKek(), tenantId, sobre);
  return plano.toString('utf8');
}

async function conApp<T>(contexto: ContextoPaciente, fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
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

async function reservarNumHc(cliente: PoolClient, tenantId: string): Promise<number> {
  const actual = await cliente.query<{ ultimo: number }>(
    `select ultimo from secuencias_hc where tenant_id = $1 for update`,
    [tenantId],
  );
  const ultimo = actual.rows[0]?.ultimo ?? 0;
  const siguiente = siguienteNumHc(ultimo);
  if (actual.rows.length === 0) {
    await cliente.query(`insert into secuencias_hc (tenant_id, ultimo) values ($1, $2)`, [tenantId, siguiente]);
  } else {
    await cliente.query(`update secuencias_hc set ultimo = $2 where tenant_id = $1`, [tenantId, siguiente]);
  }
  return siguiente;
}

async function buscarDuplicado(
  cliente: PoolClient,
  tipo: string,
  hash: string,
  exceptoId?: string,
): Promise<{ id: string; num_hc: number } | null> {
  const r = await cliente.query<{ id: string; num_hc: number }>(
    `select id, num_hc from pacientes
      where tipo_doc = $1 and num_doc_hash = $2 and estado <> 'fusionado'
        and ($3::uuid is null or id <> $3::uuid)
      limit 1`,
    [tipo, hash, exceptoId ?? null],
  );
  return r.rows[0] ?? null;
}

async function vincularRepresentante(
  cliente: PoolClient,
  contexto: ContextoPaciente,
  pacienteId: string,
  datos: PacienteNormalizado,
  sobreRep: string | null,
  hashRep: string | null,
): Promise<void> {
  const rep = datos.representante;
  if (!rep || !sobreRep || !hashRep) return;
  const existente = await cliente.query<{ id: string }>(
    `select id from representantes where tipo_doc = $1 and num_doc_hash = $2`,
    [rep.tipo_doc, hashRep],
  );
  let representanteId = existente.rows[0]?.id;
  if (!representanteId) {
    const insertado = await cliente.query<{ id: string }>(
      `insert into representantes (tenant_id, nombre, tipo_doc, num_doc, num_doc_hash)
       values ($1, $2, $3, $4, $5) returning id`,
      [contexto.tenant_id, rep.nombre, rep.tipo_doc, sobreRep, hashRep],
    );
    representanteId = insertado.rows[0].id;
  } else {
    await cliente.query(`update representantes set nombre = $2 where id = $1`, [representanteId, rep.nombre]);
  }
  const vinculo = await cliente.query<{ id: string }>(
    `select id from pacientes_representantes where paciente_id = $1 and representante_id = $2`,
    [pacienteId, representanteId],
  );
  if (vinculo.rows[0]) {
    await cliente.query(
      `update pacientes_representantes
          set parentesco = $2, contacto = $3, vigente = true, cerrado_en = null, escucho_menor = $4
        where id = $1`,
      [vinculo.rows[0].id, rep.parentesco, rep.contacto, rep.escucho_menor ?? null],
    );
  } else {
    await cliente.query(
      `insert into pacientes_representantes
        (tenant_id, paciente_id, representante_id, parentesco, contacto, vigente, es_quien_firmo, escucho_menor)
       values ($1, $2, $3, $4, $5, true, true, $6)`,
      [contexto.tenant_id, pacienteId, representanteId, rep.parentesco, rep.contacto, rep.escucho_menor ?? null],
    );
  }
}

function combinar(base: PacienteEntrada, entrada: PacienteEntrada, vigente: boolean): PacienteEntrada {
  return {
    ...base,
    ...entrada,
    representante: entrada.representante ?? null,
    tiene_representante_vigente: vigente && !entrada.representante,
  };
}

export async function guardarPaciente(
  contexto: ContextoPaciente,
  entrada: PacienteEntrada & { id?: string; cerrar_vigencia_representante?: boolean },
  opciones?: { ahora?: Date },
): Promise<ResultadoGuardado> {
  const hoy = fechaCivilBogota(opciones?.ahora ?? new Date());
  const previo = entrada.id
    ? await conApp(contexto, async (cliente) => {
        const fila = await cliente.query<FilaPaciente>(`select ${COLUMNAS} from pacientes where id = $1`, [entrada.id]);
        if (!fila.rows[0]) return null;
        const vigente = await cliente.query(
          `select 1 from pacientes_representantes where paciente_id = $1 and vigente = true limit 1`,
          [entrada.id],
        );
        return { fila: fila.rows[0], vigente: vigente.rows.length > 0 };
      })
    : null;
  if (entrada.id && !previo) throw new ErrorPaciente('no_encontrado', 'No se encontró el paciente.');

  const base = previo
    ? ({
        nombres: previo.fila.nombres,
        apellidos: previo.fila.apellidos,
        tipo_doc: previo.fila.tipo_doc,
        num_doc: await descifrar(contexto.tenant_id, previo.fila.num_doc),
        fecha_nacimiento: previo.fila.fecha_nacimiento,
        sexo: previo.fila.sexo,
        estado_civil: previo.fila.estado_civil,
        ocupacion: previo.fila.ocupacion,
        direccion: previo.fila.direccion,
        telefono: previo.fila.telefono,
        email: previo.fila.email,
        acompanante: previo.fila.acompanante,
        responsable: previo.fila.responsable,
        aseguradora: previo.fila.aseguradora,
        tipo_vinculacion: previo.fila.tipo_vinculacion,
        negativa_autorizacion: previo.fila.negativa_autorizacion,
      } satisfies PacienteEntrada)
    : entrada;
  const validacion = validarPaciente(combinar(base, entrada, previo?.vigente === true), hoy);
  if (!validacion.ok) throw new ErrorPaciente('validacion', validacion.errores[0], validacion.errores);
  const datos = validacion.datos;
  const hash = hashDocumento(datos.tipo_doc, datos.num_doc, claveHmac());
  const sobre = await cifrar(contexto.tenant_id, datos.num_doc);
  const hashRep = datos.representante ? hashDocumento(datos.representante.tipo_doc, datos.representante.num_doc, claveHmac()) : null;
  const sobreRep = datos.representante ? await cifrar(contexto.tenant_id, datos.representante.num_doc) : null;

  const guardado = await conApp(contexto, async (cliente) => {
    const duplicado = await buscarDuplicado(cliente, datos.tipo_doc, hash, entrada.id);
    if (duplicado) return { duplicado: true as const, id: duplicado.id, num_hc: duplicado.num_hc };
    const similares = await cliente.query<{ id: string; num_hc: number }>(
      `select id, num_hc from pacientes
        where estado <> 'fusionado'
          and lower(nombres) = lower($1) and lower(apellidos) = lower($2)
          and fecha_nacimiento = $3::date
          and not (tipo_doc = $4 and num_doc_hash = $5)
          and ($6::uuid is null or id <> $6::uuid)
        limit 5`,
      [datos.nombres, datos.apellidos, datos.fecha_nacimiento, datos.tipo_doc, hash, entrada.id ?? null],
    );
    const negativaEn = datos.negativa_autorizacion ? new Date().toISOString() : null;
    let id = entrada.id;
    let numHc: number;
    const valores = [
      datos.tipo_doc,
      sobre,
      hash,
      datos.nombres,
      datos.apellidos,
      datos.fecha_nacimiento,
      datos.sexo,
      datos.estado_civil,
      datos.ocupacion,
      datos.direccion,
      datos.telefono,
      datos.email,
      datos.acompanante,
      datos.responsable,
      datos.aseguradora,
      datos.tipo_vinculacion,
      datos.negativa_autorizacion === true,
      negativaEn,
    ];
    if (!id) {
      numHc = await reservarNumHc(cliente, contexto.tenant_id);
      const insertado = await cliente.query<{ id: string }>(
        `insert into pacientes (
           tenant_id, num_hc, tipo_doc, num_doc, num_doc_hash, nombres, apellidos, fecha_nacimiento,
           sexo, estado_civil, ocupacion, direccion, telefono, email, acompanante, responsable,
           aseguradora, tipo_vinculacion, sede_alta_id, estado, negativa_autorizacion, negativa_autorizacion_en
         ) values (
           $1,$2,$3,$4,$5,$6,$7,$8::date,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'activo',$20,$21
         ) returning id`,
        [
          contexto.tenant_id,
          numHc,
          datos.tipo_doc,
          sobre,
          hash,
          datos.nombres,
          datos.apellidos,
          datos.fecha_nacimiento,
          datos.sexo,
          datos.estado_civil,
          datos.ocupacion,
          datos.direccion,
          datos.telefono,
          datos.email,
          datos.acompanante,
          datos.responsable,
          datos.aseguradora,
          datos.tipo_vinculacion,
          contexto.sede_id,
          datos.negativa_autorizacion === true,
          negativaEn,
        ],
      );
      id = insertado.rows[0].id;
    } else {
      const actual = await cliente.query<{ num_hc: number; estado: string }>(
        `select num_hc, estado from pacientes where id = $1`,
        [id],
      );
      if (!actual.rows[0] || actual.rows[0].estado === 'fusionado') {
        throw new ErrorPaciente('no_encontrado', 'No se encontró el paciente.');
      }
      numHc = actual.rows[0].num_hc;
      await cliente.query(
        `update pacientes set
           tipo_doc = $2, num_doc = $3, num_doc_hash = $4, nombres = $5, apellidos = $6,
           fecha_nacimiento = $7::date, sexo = $8, estado_civil = $9, ocupacion = $10, direccion = $11,
           telefono = $12, email = $13, acompanante = $14, responsable = $15, aseguradora = $16,
           tipo_vinculacion = $17, negativa_autorizacion = $18, negativa_autorizacion_en = $19,
           actualizado_en = now()
         where id = $1`,
        [id, ...valores],
      );
    }
    await vincularRepresentante(cliente, contexto, id, datos, sobreRep, hashRep);
    if (entrada.cerrar_vigencia_representante === true && !esMenorDeEdad(datos.fecha_nacimiento, hoy)) {
      await cliente.query(
        `update pacientes_representantes set vigente = false, cerrado_en = now()
          where paciente_id = $1 and vigente = true`,
        [id],
      );
    }
    const historico = await cliente.query(
      `select 1 from pacientes_representantes where paciente_id = $1 and es_quien_firmo = true limit 1`,
      [id],
    );
    return {
      duplicado: false as const,
      id,
      num_hc: numHc,
      aviso_mayoria: avisoMayoriaDeEdad(datos.fecha_nacimiento, hoy, historico.rows.length > 0),
      aviso_similares: similares.rows,
      accion: entrada.id ? ('actualizar' as const) : ('crear' as const),
    };
  });

  if (guardado.duplicado) {
    return {
      id: guardado.id,
      num_hc: guardado.num_hc,
      duplicado: true,
      existente_id: guardado.id,
      aviso_mayoria: null,
      aviso_similares: [],
    };
  }

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
      recurso: 'pacientes',
      recurso_id: guardado.id,
      accion: guardado.accion,
      resultado: 'ok',
    },
  );

  return {
    id: guardado.id,
    num_hc: guardado.num_hc,
    duplicado: false,
    aviso_mayoria: guardado.aviso_mayoria,
    aviso_similares: guardado.aviso_similares,
  };
}

export async function buscarPacientes(
  contexto: ContextoPaciente,
  termino: string,
  opciones?: { ahora?: Date },
): Promise<FilaLista[]> {
  const hoy = fechaCivilBogota(opciones?.ahora ?? new Date());
  const texto = termino.trim();
  const tipos: TipoDocumento[] = ['CC', 'TI', 'RC', 'CE', 'PA', 'PE', 'PPT', 'NUIP'];
  const hashes = texto.length >= 3 ? tipos.map((tipo) => hashDocumento(tipo, texto, claveHmac())) : [''];
  const filas = await conApp(contexto, async (cliente) => {
    const r = await cliente.query<FilaPaciente>(
      `select ${COLUMNAS} from pacientes
        where estado <> 'fusionado'
          and (
            $1 = ''
            or nombres ilike $2
            or apellidos ilike $2
            or (nombres || ' ' || apellidos) ilike $2
            or num_doc_hash = any($3::text[])
            or num_hc::text = $1
          )
        order by apellidos, nombres
        limit 50`,
      [texto, `%${texto}%`, hashes],
    );
    return r.rows;
  });
  const lista: FilaLista[] = [];
  for (const fila of filas) {
    const num = await descifrar(contexto.tenant_id, fila.num_doc);
    const nacimiento = fila.fecha_nacimiento;
    lista.push({
      id: fila.id,
      num_hc: fila.num_hc,
      tipo_doc: fila.tipo_doc,
      documento_enmascarado: enmascararDocumento(num),
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      fecha_nacimiento: nacimiento,
      edad: edadCumplida(nacimiento, hoy),
      telefono: fila.telefono,
      estado: fila.estado,
      menor: esMenorDeEdad(nacimiento, hoy),
    });
  }
  return lista;
}

export async function abrirPaciente(contexto: ContextoPaciente, id: string, opciones?: { ahora?: Date }) {
  const hoy = fechaCivilBogota(opciones?.ahora ?? new Date());
  const abierto = await conApp(contexto, async (cliente) => {
    const fila = await cliente.query<FilaPaciente>(`select ${COLUMNAS} from pacientes where id = $1`, [id]);
    if (!fila.rows[0]) return null;
    const vinculos = await cliente.query<{
      nombre: string;
      tipo_doc: string;
      num_doc: string;
      parentesco: string;
      contacto: string;
      vigente: boolean;
      es_quien_firmo: boolean;
      escucho_menor: boolean | null;
    }>(
      `select r.nombre, r.tipo_doc, r.num_doc, v.parentesco, v.contacto, v.vigente, v.es_quien_firmo, v.escucho_menor
         from pacientes_representantes v
         join representantes r on r.id = v.representante_id
        where v.paciente_id = $1
        order by v.creado_en`,
      [id],
    );
    const diagnosticos = await cliente.query<{ descripcion_cifrada: string }>(
      `select descripcion_cifrada from paciente_diagnosticos where paciente_id = $1`,
      [id],
    );
    const historial = await cliente.query<{ id: string; ts: Date; accion: string; rol: string | null }>(
      `select id::text, ts, accion, rol from auditoria
        where recurso = 'pacientes' and recurso_id = $1
        order by id desc limit 30`,
      [id],
    );
    return { fila: fila.rows[0], vinculos: vinculos.rows, diagnosticos: diagnosticos.rows, historial: historial.rows };
  });
  if (!abierto) throw new ErrorPaciente('no_encontrado', 'No se encontró el paciente.');
  const num = await descifrar(contexto.tenant_id, abierto.fila.num_doc);
  const representantes = [];
  for (const vinculo of abierto.vinculos) {
    representantes.push({
      nombre: vinculo.nombre,
      tipo_doc: vinculo.tipo_doc,
      num_doc: await descifrar(contexto.tenant_id, vinculo.num_doc),
      parentesco: vinculo.parentesco,
      contacto: vinculo.contacto,
      vigente: vinculo.vigente,
      es_quien_firmo: vinculo.es_quien_firmo,
      escucho_menor: vinculo.escucho_menor,
    });
  }
  const diagnosticos = [];
  for (const fila of abierto.diagnosticos) {
    diagnosticos.push({ descripcion: (await descifrar(contexto.tenant_id, fila.descripcion_cifrada)) });
  }
  const nacimiento = abierto.fila.fecha_nacimiento;
  const ficha = {
    ...abierto.fila,
    num_doc: num,
    documento_enmascarado: enmascararDocumento(num),
    edad: edadCumplida(nacimiento, hoy),
    menor: esMenorDeEdad(nacimiento, hoy),
    aviso_mayoria: avisoMayoriaDeEdad(
      nacimiento,
      hoy,
      representantes.some((rep) => rep.es_quien_firmo),
    ),
    representantes,
    historial: abierto.historial.map((evento) => ({
      id: evento.id,
      ts_utc: new Date(evento.ts).toISOString(),
      ts_bogota: new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(evento.ts)),
      accion: evento.accion,
      rol: evento.rol,
    })),
    diagnosticos,
  };
  return fichaSinDiagnosticoParaRol(contexto.rol, ficha);
}

/** Fusiona el duplicado en el paciente que se conserva. El num_hc de ambos sigue ocupado. */
export async function fusionarPacientes(contexto: ContextoPaciente, origenId: string, destinoId: string): Promise<void> {
  if (origenId === destinoId) throw new ErrorPaciente('validacion', 'No se puede fusionar un paciente consigo mismo.');
  await conApp(contexto, async (cliente) => {
    const cambio = await cliente.query(
      `update pacientes set estado = 'fusionado', fusionado_en_id = $2, actualizado_en = now()
        where id = $1 and estado <> 'fusionado'`,
      [origenId, destinoId],
    );
    if ((cambio.rowCount ?? 0) !== 1) throw new ErrorPaciente('no_encontrado', 'No se encontró el paciente a fusionar.');
  });
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
      recurso: 'pacientes',
      recurso_id: origenId,
      accion: 'actualizar',
      resultado: 'ok',
    },
  );
}
