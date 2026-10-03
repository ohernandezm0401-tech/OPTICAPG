// PLT-10 (T05) — Sembrador idempotente de datos sintéticos.
//
// Lee `datos.json` (cada fila con `es_sintetico: true`, NIT con prefijo
// reservado y correos `@example.invalid`) y lo inserta con
// `ON CONFLICT DO NOTHING`: ejecutar dos veces deja la base igual
// (AC-PLT-10-3). Se niega a correr con `APP_ENV=produccion` y valida que
// ninguna fila parezca un dato real antes de insertar. Solo datos sintéticos;
// nunca datos reales de pacientes.
import 'server-only';

import { guardarPaciente, type ContextoPaciente } from '../../pacientes';
import { obtenerDb } from '../../index';
import { membresias, sedes, tenants, usuarios } from '../../esquema/nucleo';
import { esProduccion } from '../../../lib/entorno';
import {
  obtenerDatosSinteticos,
  validarFilaSintetica,
} from './reservados';

export interface ResumenSiembra {
  tenants: number;
  sedes: number;
  usuarios: number;
  membresias: number;
}

export async function sembrarDatosSinteticos(): Promise<ResumenSiembra> {
  if (esProduccion()) {
    throw new Error('La semilla sintética no corre con APP_ENV=produccion (ver docs/ENTORNOS.md).');
  }
  const datos = obtenerDatosSinteticos();
  for (const fila of datos.tenants) validarFilaSintetica(fila, 'tenants');
  for (const fila of datos.sedes) validarFilaSintetica({ ...fila, nit: fila.tenant_nit }, 'sedes');
  for (const fila of datos.usuarios) validarFilaSintetica({ ...fila, nit: fila.tenant_nit }, 'usuarios');
  for (const fila of datos.membresias)
    validarFilaSintetica({ ...fila, nit: fila.tenant_nit }, 'membresias');

  const db = obtenerDb();
  const porNit = new Map<string, string>();
  for (const fila of datos.tenants) {
    const [creado] = await db
      .insert(tenants)
      .values({ id: fila.id, razon_social: fila.razon_social, nit: fila.nit, estado: fila.estado })
      .onConflictDoNothing()
      .returning({ id: tenants.id });
    void creado;
    porNit.set(fila.nit, fila.id);
  }

  const sedesPorNombre = new Map<string, string>();
  for (const fila of datos.sedes) {
    const tenant_id = porNit.get(fila.tenant_nit);
    if (!tenant_id) throw new Error(`Semilla sedes sin tenant para el NIT reservado de ${fila.nombre}.`);
    const [creada] = await db
      .insert(sedes)
      .values({
        id: fila.id,
        tenant_id,
        nombre: fila.nombre,
        ciudad: fila.ciudad,
        direccion: fila.direccion,
        tipo: fila.tipo,
        estado: fila.estado,
      })
      .onConflictDoNothing()
      .returning({ id: sedes.id });
    void creada;
    sedesPorNombre.set(`${fila.tenant_nit}|${fila.nombre}`, fila.id);
  }

  const usuariosPorCorreo = new Map<string, string>();
  for (const fila of datos.usuarios) {
    const tenant_id = porNit.get(fila.tenant_nit);
    if (!tenant_id) throw new Error(`Semilla usuarios sin tenant para ${fila.email}.`);
    const [creado] = await db
      .insert(usuarios)
      .values({ id: fila.id, tenant_id, email: fila.email, estado: fila.estado })
      .onConflictDoNothing()
      .returning({ id: usuarios.id });
    void creado;
    usuariosPorCorreo.set(`${fila.tenant_nit}|${fila.email}`, fila.id);
  }

  for (const fila of datos.membresias) {
    const tenant_id = porNit.get(fila.tenant_nit);
    const usuario_id = usuariosPorCorreo.get(`${fila.tenant_nit}|${fila.usuario_email}`);
    const sede_id = sedesPorNombre.get(`${fila.tenant_nit}|${fila.sede_nombre}`);
    if (!tenant_id || !usuario_id || !sede_id) {
      throw new Error(`Semilla membresias sin referencia para ${fila.usuario_email}.`);
    }
    await db
      .insert(membresias)
      .values({ id: fila.id, tenant_id, usuario_id, sede_id, rol: fila.rol })
      .onConflictDoNothing();
  }

  await sembrarPacientesSinteticos(datos, porNit, sedesPorNombre);

  return {
    tenants: datos.tenants.length,
    sedes: datos.sedes.length,
    usuarios: datos.usuarios.length,
    membresias: datos.membresias.length,
  };
}

async function sembrarPacientesSinteticos(
  datos: ReturnType<typeof obtenerDatosSinteticos>,
  porNit: Map<string, string>,
  sedesPorNombre: Map<string, string>,
): Promise<void> {
  const lista = datos.pacientes ?? [];
  for (const fila of lista) {
    validarFilaSintetica(fila, 'pacientes');
    if (fila.email && !String(fila.email).endsWith('@example.invalid')) {
      throw new Error('Semilla pacientes con correo fuera del dominio reservado.');
    }
    if (!String(fila.num_doc).startsWith('900')) {
      throw new Error('Semilla pacientes con documento fuera del prefijo sintético 900.');
    }
    const tenant_id = porNit.get(fila.tenant_nit);
    const sede_id = sedesPorNombre.get(`${fila.tenant_nit}|${fila.sede_nombre}`);
    if (!tenant_id || !sede_id) throw new Error(`Semilla pacientes sin sede para ${fila.nombres}.`);
    const contexto: ContextoPaciente = {
      tenant_id,
      usuario_id: 'c2222222-2222-4222-8222-222222222222',
      sede_id,
      sedes: [sede_id],
      rol: 'asesor',
    };
    await guardarPaciente(contexto, {
      id: undefined,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      tipo_doc: fila.tipo_doc,
      num_doc: fila.num_doc,
      fecha_nacimiento: fila.fecha_nacimiento,
      sexo: fila.sexo,
      estado_civil: fila.estado_civil,
      ocupacion: fila.ocupacion,
      direccion: fila.direccion,
      telefono: fila.telefono,
      email: fila.email,
      acompanante: fila.acompanante,
      responsable: fila.responsable,
      aseguradora: fila.aseguradora,
      tipo_vinculacion: fila.tipo_vinculacion,
      representante: fila.representante ?? null,
    });
  }
}
