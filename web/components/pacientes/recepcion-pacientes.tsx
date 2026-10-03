'use client';

// ASE-01 / SEG-06 (T13) — Recepción: búsqueda, alta y edición.
// El registro vive en PostgreSQL. Esta pantalla no usa el almacén del navegador.
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';

import { accionAbrirPaciente, accionBuscarPacientes, accionGuardarPaciente } from '@/app/acciones/pacientes';
import { PanelAutorizacionPaciente } from '@/components/autorizacion/panel-autorizacion';
import {
  MARCA_NO_APLICA,
  TIPOS_DOCUMENTO,
  TIPOS_VINCULACION,
  type PacienteEntrada,
} from '@/dominio/pacientes';

type Valores = PacienteEntrada & {
  id?: string;
  cerrar_vigencia_representante?: boolean;
  rep_nombre?: string;
  rep_tipo_doc?: string;
  rep_num_doc?: string;
  rep_parentesco?: string;
  rep_contacto?: string;
  rep_escucho?: boolean;
};

const VACIO: Valores = {
  nombres: '',
  apellidos: '',
  tipo_doc: 'CC',
  num_doc: '',
  fecha_nacimiento: '',
  sexo: '',
  estado_civil: '',
  ocupacion: '',
  direccion: '',
  telefono: '',
  email: '',
  acompanante: '',
  responsable: '',
  aseguradora: '',
  tipo_vinculacion: 'particular',
  negativa_autorizacion: false,
  rep_nombre: '',
  rep_tipo_doc: 'CC',
  rep_num_doc: '',
  rep_parentesco: '',
  rep_contacto: '',
  rep_escucho: false,
  cerrar_vigencia_representante: false,
};

interface ListaItem {
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

const ETIQUETAS_NO_APLICA: { campo: keyof Valores; etiqueta: string }[] = [
  { campo: 'sexo', etiqueta: 'Sexo' },
  { campo: 'estado_civil', etiqueta: 'Estado civil' },
  { campo: 'ocupacion', etiqueta: 'Ocupación' },
  { campo: 'direccion', etiqueta: 'Dirección' },
  { campo: 'telefono', etiqueta: 'Teléfono' },
  { campo: 'acompanante', etiqueta: 'Acompañante' },
  { campo: 'responsable', etiqueta: 'Responsable' },
  { campo: 'aseguradora', etiqueta: 'Aseguradora' },
];

export function RecepcionPacientes() {
  const { data: sesion } = useSession();
  const rol = sesion?.user?.role ?? '';
  const puedeCrear = rol === 'asesor' || rol === 'admin' || rol === 'auxiliar' || rol === 'auxiliar_clinico';
  const veDiagnosticos = rol === 'optometra' || rol === 'oftalmologo';
  const [lista, setLista] = useState<ListaItem[]>([]);
  const [termino, setTermino] = useState('');
  const [errores, setErrores] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<{ id: string; num_hc: number } | null>(null);
  const [historial, setHistorial] = useState<{ id: string; ts_bogota: string; accion: string; rol: string | null }[]>([]);
  const [representantes, setRepresentantes] = useState<
    { nombre: string; parentesco: string; vigente: boolean; es_quien_firmo: boolean }[]
  >([]);
  const [diagnosticos, setDiagnosticos] = useState<string[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pacienteId, setPacienteId] = useState<string | undefined>(undefined);
  const form = useForm<Valores>({ defaultValues: VACIO });

  async function cargar(q = '') {
    const filas = await accionBuscarPacientes(q);
    setLista(filas);
  }

  useEffect(() => {
    void cargar('');
  }, []);

  function marcarNoAplica(campo: keyof Valores) {
    form.setValue(campo, campo === 'tipo_vinculacion' ? 'no_aplica' : MARCA_NO_APLICA);
  }

  async function abrir(id: string) {
    const respuesta = await accionAbrirPaciente(id);
    if (!respuesta.ok) {
      setErrores(respuesta.errores);
      return;
    }
    const ficha = respuesta.ficha;
    form.reset({
      ...VACIO,
      id: ficha.id,
      nombres: ficha.nombres,
      apellidos: ficha.apellidos,
      tipo_doc: ficha.tipo_doc,
      num_doc: ficha.num_doc,
      fecha_nacimiento: ficha.fecha_nacimiento,
      sexo: ficha.sexo,
      estado_civil: ficha.estado_civil,
      ocupacion: ficha.ocupacion,
      direccion: ficha.direccion,
      telefono: ficha.telefono,
      email: ficha.email ?? '',
      acompanante: ficha.acompanante,
      responsable: ficha.responsable,
      aseguradora: ficha.aseguradora,
      tipo_vinculacion: ficha.tipo_vinculacion as Valores['tipo_vinculacion'],
      negativa_autorizacion: ficha.negativa_autorizacion,
    });
    setHistorial(ficha.historial);
    setRepresentantes(ficha.representantes);
    setDiagnosticos('diagnosticos' in ficha && Array.isArray(ficha.diagnosticos) ? ficha.diagnosticos.map((d) => d.descripcion) : null);
    setAviso(ficha.aviso_mayoria);
    setDuplicado(null);
    setErrores([]);
    setEditando(true);
    setAbierto(true);
    setPacienteId(ficha.id);
  }

  async function onSubmit(valores: Valores) {
    setErrores([]);
    setDuplicado(null);
    const representante =
      valores.rep_nombre?.trim()
        ? {
            nombre: valores.rep_nombre,
            tipo_doc: valores.rep_tipo_doc || 'CC',
            num_doc: valores.rep_num_doc || '',
            parentesco: valores.rep_parentesco || '',
            contacto: valores.rep_contacto || '',
            escucho_menor: valores.rep_escucho === true,
          }
        : null;
    const respuesta = await accionGuardarPaciente({
      id: valores.id,
      nombres: valores.nombres,
      apellidos: valores.apellidos,
      tipo_doc: valores.tipo_doc,
      num_doc: valores.num_doc,
      fecha_nacimiento: valores.fecha_nacimiento,
      sexo: valores.sexo,
      estado_civil: valores.estado_civil,
      ocupacion: valores.ocupacion,
      direccion: valores.direccion,
      telefono: valores.telefono,
      email: valores.email,
      acompanante: valores.acompanante,
      responsable: valores.responsable,
      aseguradora: valores.aseguradora,
      tipo_vinculacion: valores.tipo_vinculacion,
      negativa_autorizacion: valores.negativa_autorizacion === true,
      cerrar_vigencia_representante: valores.cerrar_vigencia_representante === true,
      representante,
    });
    if (!respuesta.ok) {
      setErrores(respuesta.errores);
      return;
    }
    if (respuesta.resultado.duplicado && respuesta.resultado.existente_id) {
      setDuplicado({ id: respuesta.resultado.existente_id, num_hc: respuesta.resultado.num_hc });
      return;
    }
    setAviso(respuesta.resultado.aviso_mayoria);
    await cargar(termino);
    await abrir(respuesta.resultado.id);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recepción de pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Identificación de la historia clínica. La edad se calcula. El documento se muestra enmascarado en la lista.
          </p>
        </div>
        {puedeCrear ? (
          <button
            type="button"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold"
            onClick={() => {
              form.reset(VACIO);
              setPacienteId(undefined);
              setEditando(false);
              setAbierto(true);
              setHistorial([]);
              setRepresentantes([]);
              setDiagnosticos(null);
              setAviso(null);
              setErrores([]);
              setDuplicado(null);
            }}
          >
            Nuevo paciente
          </button>
        ) : null}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          void cargar(termino);
        }}
      >
        <label className="sr-only" htmlFor="buscar-paciente">
          Buscar por documento o nombre
        </label>
        <input
          id="buscar-paciente"
          value={termino}
          onChange={(evento) => setTermino(evento.target.value)}
          placeholder="Buscar por documento o nombre"
          className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background"
        />
        <button type="submit" className="border border-input rounded-lg px-3 py-2 text-sm">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto border border-border rounded-xl">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Paciente</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Edad</th>
              <th className="px-4 py-2">HC</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((fila) => (
              <tr key={fila.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <button type="button" className="font-semibold underline" onClick={() => void abrir(fila.id)}>
                    {fila.apellidos}, {fila.nombres}
                  </button>
                </td>
                <td className="px-4 py-2">
                  {fila.tipo_doc} {fila.documento_enmascarado}
                </td>
                <td className="px-4 py-2">
                  {fila.edad} años{fila.menor ? ' · menor' : ''}
                </td>
                <td className="px-4 py-2">{fila.num_hc}</td>
              </tr>
            ))}
            {lista.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  No hay pacientes con ese criterio.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {abierto ? (
        <form id="ficha-paciente" className="space-y-4 border border-border rounded-xl p-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <h2 className="font-semibold">{editando ? 'Editar paciente' : 'Nuevo paciente'}</h2>
          <p className="text-xs text-muted-foreground">La edad se calcula al guardar a partir de la fecha de nacimiento. No se digita.</p>
          {aviso ? (
            <p className="text-sm border border-amber-500/40 bg-amber-500/10 rounded-lg p-3" role="status">
              {aviso}
            </p>
          ) : null}
          {duplicado ? (
            <div className="text-sm border border-amber-500/40 rounded-lg p-3 space-y-2" role="alert">
              <p>
                Ya existe un paciente con ese tipo y número de documento (HC {duplicado.num_hc}). No se guardó otro.
              </p>
              <button type="button" className="underline font-semibold" onClick={() => void abrir(duplicado.id)}>
                Abrir el existente
              </button>
            </div>
          ) : null}
          {errores.length > 0 ? (
            <ul className="text-sm text-red-600 list-disc pl-5" role="alert">
              {errores.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3">
            <Campo etiqueta="Nombres" id="nombres" registro={form.register('nombres')} />
            <Campo etiqueta="Apellidos" id="apellidos" registro={form.register('apellidos')} />
            <label className="text-sm space-y-1" htmlFor="tipo_doc">
              <span>Tipo de documento</span>
              <select id="tipo_doc" className="w-full border border-input rounded-lg px-2 py-2 bg-background" {...form.register('tipo_doc')}>
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
            <Campo etiqueta="Número de documento" id="num_doc" registro={form.register('num_doc')} />
            <Campo etiqueta="Fecha de nacimiento" id="fecha_nacimiento" tipo="date" registro={form.register('fecha_nacimiento')} />
            <Campo etiqueta="Correo (opcional)" id="email" tipo="email" registro={form.register('email')} />
            {ETIQUETAS_NO_APLICA.map((item) => (
              <div key={item.campo} className="space-y-1">
                <Campo etiqueta={item.etiqueta} id={item.campo} registro={form.register(item.campo)} />
                <button type="button" className="text-xs underline" onClick={() => marcarNoAplica(item.campo)}>
                  Marcar «No aplica»
                </button>
              </div>
            ))}
            <label className="text-sm space-y-1" htmlFor="tipo_vinculacion">
              <span>Tipo de vinculación</span>
              <select
                id="tipo_vinculacion"
                className="w-full border border-input rounded-lg px-2 py-2 bg-background"
                {...form.register('tipo_vinculacion')}
              >
                {TIPOS_VINCULACION.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo === 'no_aplica' ? 'No aplica' : tipo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="space-y-2 border border-border rounded-lg p-3">
            <legend className="text-sm font-semibold px-1">Representante legal</legend>
            <p className="text-xs text-muted-foreground">Obligatorio si el paciente es menor de 18 años.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="Nombre del representante" id="rep_nombre" registro={form.register('rep_nombre')} />
              <label className="text-sm space-y-1" htmlFor="rep_tipo_doc">
                <span>Tipo de documento del representante</span>
                <select id="rep_tipo_doc" className="w-full border border-input rounded-lg px-2 py-2 bg-background" {...form.register('rep_tipo_doc')}>
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
              <Campo etiqueta="Número de documento del representante" id="rep_num_doc" registro={form.register('rep_num_doc')} />
              <Campo etiqueta="Parentesco" id="rep_parentesco" registro={form.register('rep_parentesco')} />
              <Campo etiqueta="Contacto del representante" id="rep_contacto" registro={form.register('rep_contacto')} />
            </div>
            <label className="text-sm flex gap-2 items-center" htmlFor="rep_escucho">
              <input id="rep_escucho" type="checkbox" {...form.register('rep_escucho')} />
              Se escuchó al menor según su madurez (dato informativo)
            </label>
            {representantes.length > 0 ? (
              <ul className="text-sm space-y-1">
                {representantes.map((rep) => (
                  <li key={`${rep.nombre}-${rep.parentesco}`}>
                    {rep.nombre} · {rep.parentesco}
                    {rep.es_quien_firmo ? ' · quien firmó' : ''}
                    {rep.vigente ? ' · vigente' : ' · histórico'}
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="text-sm flex gap-2 items-center" htmlFor="cerrar_vigencia_representante">
              <input id="cerrar_vigencia_representante" type="checkbox" {...form.register('cerrar_vigencia_representante')} />
              Cerrar la vigencia del representante tras revisión (no cambia el estado del paciente)
            </label>
          </fieldset>

          <PanelAutorizacionPaciente pacienteId={pacienteId} />

          {veDiagnosticos && diagnosticos ? (
            <section aria-label="Diagnósticos">
              <h3 className="font-semibold text-sm">Diagnósticos</h3>
              {diagnosticos.length === 0 ? <p className="text-sm text-muted-foreground">Sin diagnósticos registrados.</p> : null}
              <ul className="text-sm list-disc pl-5">
                {diagnosticos.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div>
            <h3 className="font-semibold text-sm">Historial de cambios</h3>
            {historial.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cambios registrados en la bitácora.</p> : null}
            <ul className="text-sm">
              {historial.map((evento) => (
                <li key={evento.id}>
                  {evento.ts_bogota} · {evento.accion} · {evento.rol}
                </li>
              ))}
            </ul>
          </div>

          {puedeCrear || editando ? (
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
              Guardar
            </button>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function Campo({
  etiqueta,
  id,
  registro,
  tipo = 'text',
}: {
  etiqueta: string;
  id: string;
  registro: ReturnType<ReturnType<typeof useForm<Valores>>['register']>;
  tipo?: string;
}) {
  return (
    <label className="text-sm space-y-1 block" htmlFor={id}>
      <span>{etiqueta}</span>
      <input id={id} type={tipo} className="w-full border border-input rounded-lg px-2 py-2 bg-background" {...registro} />
    </label>
  );
}
