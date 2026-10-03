'use client';

// OPT-06 (T25) — Solicitud de la copia gratuita. El código llega al correo registrado.
// La entrega a terceros queda bloqueada hasta SEG-14.
// TODO(Q-07): el plazo del enlace no tiene valor por defecto.
// BORRADOR – requiere revisión jurídica.
import { useState } from 'react';

const CAMPO =
  'mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950';

export function PanelCopiaHc() {
  const [pacienteId, setPacienteId] = useState('');
  const [documento, setDocumento] = useState('');
  const [solicitante, setSolicitante] = useState('titular');
  const [representanteId, setRepresentanteId] = useState('');
  const [entregaId, setEntregaId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [hash, setHash] = useState('');
  const [costo, setCosto] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function solicitar() {
    setError('');
    setHash('');
    setCosto(null);
    const respuesta = await fetch('/api/entregas-hc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: pacienteId.trim(),
        solicitante,
        documento: documento.trim(),
        representante_id: solicitante === 'representante' ? representanteId.trim() : null,
      }),
    });
    const cuerpo = (await respuesta.json()) as { id?: string; error?: string; costo_cop?: number };
    if (!respuesta.ok || !cuerpo.id) {
      setEntregaId('');
      setError(cuerpo.error ?? 'No se pudo solicitar la copia.');
      return;
    }
    setEntregaId(cuerpo.id);
    setCosto(cuerpo.costo_cop ?? 0);
  }

  async function entregar() {
    setError('');
    const respuesta = await fetch(`/api/entregas-hc/${entregaId}/entregar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: codigo.trim() }),
    });
    const cuerpo = (await respuesta.json()) as { hash_pdf?: string; costo_cop?: number; error?: string };
    if (!respuesta.ok || !cuerpo.hash_pdf) {
      setError(cuerpo.error ?? 'No se pudo entregar la copia.');
      return;
    }
    setHash(cuerpo.hash_pdf);
    setCosto(cuerpo.costo_cop ?? 0);
  }

  return (
    <section id="seccion-copia-hc" aria-labelledby="titulo-copia-hc" className="space-y-3 rounded-md border border-neutral-300 p-4">
      <h2 id="titulo-copia-hc" className="text-lg font-semibold">
        Copia de la historia clínica
      </h2>
      <p className="text-sm">
        La copia electrónica es gratuita. El código de un solo uso se envía al correo registrado. BORRADOR – requiere
        revisión jurídica.
      </p>
      <div>
        <label htmlFor="copia-paciente" className="block text-sm font-medium text-neutral-950">
          Paciente de la copia
        </label>
        <input id="copia-paciente" className={CAMPO} value={pacienteId} onChange={(evento) => setPacienteId(evento.target.value)} />
      </div>
      <div>
        <label htmlFor="copia-documento" className="block text-sm font-medium text-neutral-950">
          Documento de identidad
        </label>
        <input id="copia-documento" className={CAMPO} value={documento} onChange={(evento) => setDocumento(evento.target.value)} />
      </div>
      <div>
        <label htmlFor="copia-solicitante" className="block text-sm font-medium text-neutral-950">
          Quién solicita
        </label>
        <select
          id="copia-solicitante"
          className={CAMPO}
          value={solicitante}
          onChange={(evento) => setSolicitante(evento.target.value)}
        >
          <option value="titular">Titular</option>
          <option value="representante">Representante</option>
          <option value="tercero">Tercero</option>
        </select>
      </div>
      {solicitante === 'representante' ? (
        <div>
          <label htmlFor="copia-representante" className="block text-sm font-medium text-neutral-950">
            Identificador del representante
          </label>
          <input
            id="copia-representante"
            className={CAMPO}
            value={representanteId}
            onChange={(evento) => setRepresentanteId(evento.target.value)}
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void solicitar()}
        className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950"
      >
        Solicitar copia
      </button>
      {entregaId ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="copia-codigo" className="block text-sm font-medium text-neutral-950">
              Código de un solo uso
            </label>
            <input id="copia-codigo" className={CAMPO} value={codigo} onChange={(evento) => setCodigo(evento.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => void entregar()}
            className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950"
          >
            Entregar copia
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" data-testid="error-copia-hc" className="text-sm text-red-900">
          {error}
        </p>
      ) : null}
      {costo != null ? (
        <p data-testid="costo-copia-hc" className="text-sm">
          Costo: {costo} COP
        </p>
      ) : null}
      {hash ? (
        <div className="space-y-2">
          <p data-testid="hash-copia-hc" className="break-all text-sm">
            {hash}
          </p>
          <a data-testid="copia-hc-pdf" className="text-sm font-semibold underline" href={`/api/entregas-hc/${entregaId}`}>
            Descargar copia
          </a>
        </div>
      ) : null}
    </section>
  );
}
