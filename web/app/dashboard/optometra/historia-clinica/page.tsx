'use client';

// OPT-01 / OPT-24 (T19) — Captura mínima de la atención, navegable con teclado.
// TODO(Q-25): no hay controles de telemedicina. La modalidad queda en presencial.
// TODO(Q-26): esta pantalla es del optómetra; el auxiliar no firma.
import React, { useEffect, useState } from 'react';
import { esquemaCrearAtencion, esquemaExamenOptometrico } from '@/dominio/valores-opticos';

interface VistaAtencion {
  id: string;
  estado: string;
  modalidad: string;
  folio: number | null;
  firmado_en: string | null;
  hora_bogota: string | null;
  motivo: string;
  examen: Record<string, number | null>;
  diagnostico: { codigo_cie10: string; descripcion: string } | null;
  plan: { conducta: string } | null;
}

const CAMPOS_OJO = [
  ['esfera_od', 'Esfera ojo derecho'],
  ['cilindro_od', 'Cilindro ojo derecho'],
  ['eje_od', 'Eje ojo derecho'],
  ['adicion_od', 'Adición ojo derecho'],
  ['agudeza_od', 'Agudeza ojo derecho'],
  ['esfera_oi', 'Esfera ojo izquierdo'],
  ['cilindro_oi', 'Cilindro ojo izquierdo'],
  ['eje_oi', 'Eje ojo izquierdo'],
  ['adicion_oi', 'Adición ojo izquierdo'],
  ['agudeza_oi', 'Agudeza ojo izquierdo'],
  ['dip', 'DIP binocular (mm)'],
] as const;

function numeroOVacio(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : Number.NaN;
}

export default function HistoriaClinicaPage() {
  const [pacienteId, setPacienteId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [conducta, setConducta] = useState('');
  const [valores, setValores] = useState<Record<string, string>>({});
  const [atencionId, setAtencionId] = useState<string | null>(null);
  const [estado, setEstado] = useState('borrador');
  const [folio, setFolio] = useState<number | null>(null);
  const [horaBogota, setHoraBogota] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firmada = estado === 'firmado';

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    void fetch(`/api/atenciones/${id}`)
      .then(async (respuesta) => {
        const cuerpo = (await respuesta.json()) as VistaAtencion & { error?: string };
        if (!respuesta.ok) {
          setError(cuerpo.error ?? 'No se pudo abrir la atención.');
          return;
        }
        aplicarVista(cuerpo);
      })
      .catch(() => setError('No se pudo abrir la atención.'));
  }, []);

  function aplicarVista(vista: VistaAtencion) {
    setAtencionId(vista.id);
    setEstado(vista.estado);
    setFolio(vista.folio);
    setHoraBogota(vista.hora_bogota);
    setMotivo(vista.motivo);
    setCodigo(vista.diagnostico?.codigo_cie10 ?? '');
    setConducta(vista.plan?.conducta ?? '');
    const siguientes: Record<string, string> = {};
    for (const [campo] of CAMPOS_OJO) {
      const valor = vista.examen[campo];
      siguientes[campo] = valor == null ? '' : String(valor);
    }
    setValores(siguientes);
  }

  function examenDesdeFormulario() {
    const examen: Record<string, number | null> = {};
    for (const [campo, etiqueta] of CAMPOS_OJO) {
      const valor = numeroOVacio(valores[campo] ?? '');
      if (Number.isNaN(valor)) {
        return { error: `${etiqueta} no es un número.` };
      }
      examen[campo] = valor;
    }
    return { examen };
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMensaje(null);
    if (firmada) {
      setError('El registro firmado no se puede modificar.');
      return;
    }
    const armado = examenDesdeFormulario();
    if ('error' in armado && armado.error) {
      setError(armado.error);
      return;
    }
    const examenParseado = esquemaExamenOptometrico.safeParse(armado.examen);
    if (!examenParseado.success) {
      setError(examenParseado.error.issues[0]?.message ?? 'Hay un valor óptico fuera de rango.');
      return;
    }
    const cuerpo = {
      paciente_id: pacienteId.trim(),
      tipo: 'primera_vez' as const,
      modalidad: 'presencial' as const,
      motivo,
      examen: examenParseado.data,
      diagnostico: { codigo_cie10: codigo.trim() },
      plan: { conducta },
    };
    if (!atencionId) {
      const validacion = esquemaCrearAtencion.safeParse(cuerpo);
      if (!validacion.success) {
        setError(validacion.error.issues[0]?.message ?? 'Revise los datos de la atención.');
        return;
      }
    }
    const respuesta = await fetch(atencionId ? `/api/atenciones/${atencionId}` : '/api/atenciones', {
      method: atencionId ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        atencionId
          ? { motivo, examen: examenParseado.data, diagnostico: { codigo_cie10: codigo.trim() }, plan: { conducta } }
          : cuerpo,
      ),
    });
    const json = (await respuesta.json()) as VistaAtencion & { error?: string };
    if (!respuesta.ok) {
      setError(json.error ?? 'No se pudo guardar la atención.');
      return;
    }
    aplicarVista(json);
    setMensaje('Borrador guardado.');
  }

  async function firmar() {
    if (!atencionId || firmada) return;
    setError(null);
    const respuesta = await fetch(`/api/atenciones/${atencionId}/firmar`, { method: 'POST' });
    const json = (await respuesta.json()) as VistaAtencion & { error?: string };
    if (!respuesta.ok) {
      setError(json.error ?? 'No se pudo firmar la atención.');
      return;
    }
    aplicarVista(json);
    setMensaje('Atención firmada.');
  }

  return (
    <form id="ficha-atencion" onSubmit={guardar} className="mx-auto max-w-3xl space-y-6 pb-10" aria-labelledby="titulo-atencion">
      <header className="space-y-1">
        <h1 id="titulo-atencion" className="text-2xl font-bold text-foreground">
          Atención de optometría
        </h1>
        <p className="text-sm text-foreground">
          Modalidad: <span data-testid="modalidad-atencion">Presencial</span>
          {folio != null ? ` · Folio ${folio}` : ''}
          {horaBogota ? ` · Firmada ${horaBogota}` : ''}
        </p>
      </header>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      {mensaje ? (
        <p role="status" className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
          {mensaje}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Paciente
          <input
            value={pacienteId}
            onChange={(event) => setPacienteId(event.target.value)}
            disabled={firmada || Boolean(atencionId)}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Motivo de consulta
          <textarea
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            disabled={firmada}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-900"
          />
        </label>
        {CAMPOS_OJO.map(([campo, etiqueta]) => (
          <label key={campo} className="block text-sm font-medium">
            {etiqueta}
            <input
              inputMode="decimal"
              value={valores[campo] ?? ''}
              onChange={(event) => setValores((actual) => ({ ...actual, [campo]: event.target.value }))}
              disabled={firmada}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-900"
            />
          </label>
        ))}
        <label className="block text-sm font-medium">
          Código CIE-10 principal
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            disabled={firmada}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-900"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Conducta
          <textarea
            value={conducta}
            onChange={(event) => setConducta(event.target.value)}
            disabled={firmada}
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-900"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={firmada}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-neutral-300 disabled:text-neutral-900"
        >
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={() => void firmar()}
          disabled={firmada || !atencionId}
          className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-900"
        >
          Firmar atención
        </button>
      </div>
    </form>
  );
}
