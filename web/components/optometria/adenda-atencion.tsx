'use client';

// OPT-02 (T21) — Adenda con motivo obligatorio y línea de tiempo.
// La ficha firmada sigue mostrando la refracción original.
import React, { useEffect, useRef, useState } from 'react';

import {
  CAMPOS_REFRACCION_ADENDA,
  ETIQUETAS_REFRACCION,
  type CampoRefraccionAdenda,
  type HistorialProyectado,
} from '@/dominio/adenda-atencion';

const CLASE_CAMPO =
  'mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-950';

export function PanelAdenda({
  atencionId,
  onHistorial,
}: {
  atencionId: string;
  onHistorial: (historial: HistorialProyectado) => void;
}) {
  const [campo, setCampo] = useState<CampoRefraccionAdenda>('esfera_od');
  const [nuevoValor, setNuevoValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [historial, setHistorial] = useState<HistorialProyectado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const aviso = useRef(onHistorial);

  useEffect(() => {
    aviso.current = onHistorial;
    let vigente = true;
    void fetch(`/api/atenciones/${atencionId}/adendas`)
      .then(async (respuesta) => {
        const cuerpo = (await respuesta.json()) as HistorialProyectado & { error?: string };
        if (!vigente) return;
        if (!respuesta.ok) {
          setError(cuerpo.error ?? 'No se pudo leer el historial.');
          return;
        }
        setHistorial(cuerpo);
        aviso.current(cuerpo);
      })
      .catch(() => {
        if (vigente) setError('No se pudo leer el historial.');
      });
    return () => {
      vigente = false;
    };
  }, [atencionId, onHistorial]);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setMensaje(null);
      setError('El motivo de la adenda es obligatorio.');
      return;
    }
    if (!nuevoValor.trim()) {
      setMensaje(null);
      setError('El nuevo valor de refracción es obligatorio.');
      return;
    }
    setEnviando(true);
    setError(null);
    const respuesta = await fetch(`/api/atenciones/${atencionId}/adendas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campo_ref: campo, nuevo_valor: nuevoValor, motivo: motivoLimpio }),
    });
    const cuerpo = (await respuesta.json()) as HistorialProyectado & { error?: string };
    setEnviando(false);
    if (!respuesta.ok) {
      setMensaje(null);
      setError(cuerpo.error ?? 'No se pudo guardar la adenda.');
      return;
    }
    setHistorial(cuerpo);
    onHistorial(cuerpo);
    setMotivo('');
    setNuevoValor('');
    setMensaje('Adenda firmada. La atención original no se modificó.');
  }

  const original = historial?.original_refraccion ?? {};

  return (
    <section aria-labelledby="titulo-adenda" className="space-y-4 rounded-md border border-neutral-800 p-4">
      <h2 id="titulo-adenda" className="text-lg font-semibold">
        Adendas
      </h2>
      <p className="text-sm">La atención firmada no se modifica. La corrección queda como una adenda nueva.</p>
      <div data-testid="refraccion-original">
        <h3 className="text-sm font-semibold">Refracción original</h3>
        <ul className="mt-1 text-sm">
          {Object.entries(original).length === 0 ? <li>Sin registro</li> : null}
          {Object.entries(original).map(([campoRef, valor]) => (
            <li key={campoRef}>
              {ETIQUETAS_REFRACCION[campoRef as CampoRefraccionAdenda] ?? campoRef}: {valor}
            </li>
          ))}
        </ul>
      </div>
      <form onSubmit={(event) => void enviar(event)} noValidate className="space-y-3">
        <div>
          <label htmlFor="adenda-campo" className="text-sm font-medium">
            Campo de refracción
          </label>
          <select
            id="adenda-campo"
            value={campo}
            onChange={(event) => setCampo(event.target.value as CampoRefraccionAdenda)}
            className={CLASE_CAMPO}
          >
            {CAMPOS_REFRACCION_ADENDA.map((item) => (
              <option key={item} value={item}>
                {ETIQUETAS_REFRACCION[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="adenda-valor" className="text-sm font-medium">
            Nuevo valor
          </label>
          <input
            id="adenda-valor"
            value={nuevoValor}
            onChange={(event) => setNuevoValor(event.target.value)}
            inputMode="decimal"
            className={CLASE_CAMPO}
          />
        </div>
        <div>
          <label htmlFor="adenda-motivo" className="text-sm font-medium">
            Motivo de la adenda
          </label>
          <textarea
            id="adenda-motivo"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            rows={3}
            aria-invalid={Boolean(error)}
            className={CLASE_CAMPO}
          />
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:bg-neutral-300"
        >
          Agregar adenda
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {mensaje ? (
        <p role="status" className="text-sm">
          {mensaje}
        </p>
      ) : null}
      <div data-testid="linea-tiempo">
        <h3 className="text-sm font-semibold">Línea de tiempo</h3>
        <ol className="mt-2 space-y-3 text-sm">
          {(historial?.linea ?? []).map((item) => (
            <li key={`${item.tipo}-${item.orden}`} className="rounded-md border border-neutral-300 p-3">
              <p className="font-medium">{item.tipo === 'original' ? 'Atención original' : `Adenda #${item.numero}`}</p>
              <p>Quién: {item.autor}</p>
              <p>Cuándo: {item.hora_bogota ? `${item.hora_bogota} (America/Bogotá)` : 'Sin hora'}</p>
              {item.tipo === 'adenda' ? <p>Por qué: {item.motivo}</p> : null}
              {item.campo_etiqueta ? (
                <p>
                  {item.campo_etiqueta}: valor original {item.valor_anterior}; adenda {item.nuevo_valor}
                </p>
              ) : null}
              {item.marca ? <p>{item.marca}</p> : null}
              {item.tipo_nota === 'complementaria' ? <p>Nota complementaria</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
