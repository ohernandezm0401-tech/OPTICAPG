'use client';

// ADM-01 (T16) — Ficha de sede, certificado y módulos. Solo datos sintéticos.
import { useEffect, useState, type FormEvent } from 'react';

import { accionGuardarSede, accionListarSedes } from '@/app/acciones/sedes';
import {
  ETIQUETAS_CERTIFICADO,
  ETIQUETAS_ESTABLECIMIENTO,
  ETIQUETAS_MODULO,
  modulosDeSede,
  ofrecePosPublico,
  presentarFechaCivil,
  TIPOS_ESTABLECIMIENTO,
  type TipoEstablecimiento,
  type VistaSede,
} from '@/dominio/sedes';

interface UsuarioOpcion {
  id: string;
  email: string;
}

const VACIO = {
  nombre: '',
  ciudad: '',
  direccion: '',
  tipo_establecimiento: 'optica_sin_consultorio' as TipoEstablecimiento,
  reps_codigo: '',
  director_cientifico_id: '',
  responsable_tecnovigilancia_id: '',
  certificado_numero: '',
  certificado_vence: '',
  override_director: false,
};

export function FichaSedes() {
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [sedes, setSedes] = useState<VistaSede[]>([]);
  const [formulario, setFormulario] = useState(VACIO);
  const [resultado, setResultado] = useState<VistaSede | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function recargar() {
    const data = await accionListarSedes();
    setSedes(data.sedes);
    setUsuarios(data.usuarios);
  }

  useEffect(() => {
    void recargar();
  }, []);

  const tipo = formulario.tipo_establecimiento;
  const modulos = modulosDeSede(tipo, formulario.reps_codigo);
  const pos = ofrecePosPublico(tipo);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setCargando(true);
    setError(null);
    setCodigo(null);
    const respuesta = await accionGuardarSede({
      nombre: formulario.nombre,
      ciudad: formulario.ciudad,
      direccion: formulario.direccion,
      tipo_establecimiento: formulario.tipo_establecimiento,
      reps_codigo: formulario.reps_codigo,
      director_cientifico_id: formulario.director_cientifico_id || null,
      responsable_tecnovigilancia_id: formulario.responsable_tecnovigilancia_id || null,
      certificado_numero: formulario.certificado_numero,
      certificado_vence: formulario.certificado_vence,
      override_director: formulario.override_director,
    });
    setCargando(false);
    if (!respuesta.ok || !respuesta.sede) {
      setResultado(null);
      setError(respuesta.mensaje ?? 'No se pudo guardar la sede.');
      setCodigo(respuesta.codigo ?? null);
      return;
    }
    setResultado(respuesta.sede);
    setFormulario({ ...VACIO, override_director: false });
    await recargar();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sedes y certificados</h1>
        <p className="text-sm text-muted-foreground">
          Tipo de establecimiento, certificado y director científico de cada sede.
        </p>
      </header>

      <form onSubmit={guardar} className="space-y-4 rounded-md border border-border p-4" id="ficha-sede">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Nombre
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.nombre}
              onChange={(event) => setFormulario({ ...formulario, nombre: event.target.value })}
              required
              minLength={3}
            />
          </label>
          <label className="block text-sm">
            Ciudad
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.ciudad}
              onChange={(event) => setFormulario({ ...formulario, ciudad: event.target.value })}
              required
              minLength={2}
            />
          </label>
        </div>
        <label className="block text-sm">
          Tipo de establecimiento
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            value={formulario.tipo_establecimiento}
            onChange={(event) =>
              setFormulario({
                ...formulario,
                tipo_establecimiento: event.target.value as TipoEstablecimiento,
              })
            }
          >
            {TIPOS_ESTABLECIMIENTO.map((item) => (
              <option key={item} value={item}>
                {ETIQUETAS_ESTABLECIMIENTO[item]}
              </option>
            ))}
          </select>
        </label>
        <p id="modulos-sede" className="text-sm">
          {pos ? 'Esta sede puede ofrecer POS al público.' : 'No ofrece POS al público.'}
        </p>
        <p className="text-sm text-muted-foreground">
          Módulos: {modulos.habilitados.map((item) => ETIQUETAS_MODULO[item]).join(', ') || 'ninguno'}.
        </p>
        <label className="block text-sm">
          Código REPS
          <input
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            value={formulario.reps_codigo}
            onChange={(event) => setFormulario({ ...formulario, reps_codigo: event.target.value })}
            placeholder="Campo libre, sin valor por defecto"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Director científico
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.director_cientifico_id}
              onChange={(event) => setFormulario({ ...formulario, director_cientifico_id: event.target.value })}
            >
              <option value="">Sin asignar</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Responsable de tecnovigilancia
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.responsable_tecnovigilancia_id}
              onChange={(event) =>
                setFormulario({ ...formulario, responsable_tecnovigilancia_id: event.target.value })
              }
            >
              <option value="">Sin asignar</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.email}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Número de certificado
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.certificado_numero}
              onChange={(event) => setFormulario({ ...formulario, certificado_numero: event.target.value })}
            />
          </label>
          <label className="block text-sm">
            Vencimiento del certificado
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={formulario.certificado_vence}
              onChange={(event) => setFormulario({ ...formulario, certificado_vence: event.target.value })}
            />
          </label>
        </div>
        {codigo === 'director_limite' ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={formulario.override_director}
              onChange={(event) => setFormulario({ ...formulario, override_director: event.target.checked })}
            />
            <span>Autorizar como administrador el establecimiento adicional</span>
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          disabled={cargando}
        >
          Guardar sede
        </button>
      </form>

      {resultado ? <ResultadoSede sede={resultado} /> : null}

      <ul className="space-y-2">
        {sedes.map((sede) => (
          <li key={sede.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <span className="font-medium">{sede.nombre}</span> · {ETIQUETAS_ESTABLECIMIENTO[sede.tipo_establecimiento]} ·{' '}
            {sede.completitud}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultadoSede({ sede }: { sede: VistaSede }) {
  return (
    <section id="resultado-sede" className="space-y-2 rounded-md border border-border p-4" aria-live="polite">
      <h2 className="font-semibold">{sede.nombre}</h2>
      <p>
        Estado: <span>{sede.completitud}</span>
      </p>
      {sede.faltantes.length > 0 ? (
        <div>
          <p>Falta:</p>
          <ul>
            {sede.faltantes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {sede.alerta?.umbral ? <p role="status">Alerta de {sede.alerta.umbral} días</p> : null}
      {sede.alerta?.roja ? (
        <div role="alert" data-alerta="roja" data-bloquea-atencion="false" className="rounded-md bg-red-50 px-3 py-2 text-red-950">
          <p className="font-semibold">Alerta roja: certificado vencido.</p>
          <p>
            Venció el {sede.certificado_vence ? presentarFechaCivil(sede.certificado_vence) : 'la fecha registrada'}. La
            atención clínica no se bloquea.
          </p>
          <a className="underline font-medium" href="/dashboard/admin/agenda">
            Continuar atención clínica
          </a>
        </div>
      ) : null}
      <p>{sede.ofrece_pos_publico ? 'Ofrece POS al público.' : 'No ofrece POS al público.'}</p>
      {sede.certificado_tipo ? (
        <p>
          {ETIQUETAS_CERTIFICADO[sede.certificado_tipo]}
          {sede.certificado_numero ? ` ${sede.certificado_numero}` : ''}
        </p>
      ) : null}
    </section>
  );
}
