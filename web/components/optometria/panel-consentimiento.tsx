'use client';

// OPT-04 (T22) — Consentimiento informado en la ficha de atención.
// TODO(Q-17): la negativa de datos no bloquea la historia; el procedimiento sí.
// BORRADOR – requiere revisión jurídica.
import { useCallback, useEffect, useState } from 'react';

import { PadPaciente } from '@/components/firma/pad-paciente';
import {
  ETIQUETAS_PROCEDIMIENTO,
  PROCEDIMIENTO_ADAPTACION_LC,
  PROCEDIMIENTOS_CON_CONSENTIMIENTO,
  ROTULO_CONSENTIMIENTO,
  type ProcedimientoConsentimiento,
} from '@/dominio/consentimiento-clinico';

interface Plantilla {
  procedimiento: ProcedimientoConsentimiento;
  etiqueta: string;
  version: number;
  hash: string;
  texto: string;
}

interface Fila {
  id: string;
  procedimiento: ProcedimientoConsentimiento;
  version: number;
  hash: string;
  estado: string;
  revocado: boolean;
  firma_id: string | null;
  hash_anexo: string | null;
  hora_bogota: string;
}

interface Puerta {
  permitida: boolean;
  motivo: string;
}

interface Vista {
  plantillas: Plantilla[];
  consentimientos: Fila[];
  puertas: Record<string, Puerta>;
}

const MOTIVOS: Record<string, string> = {
  sin_consentimiento: 'No hay un consentimiento firmado de la plantilla vigente.',
  sin_plantilla: 'No hay plantilla vigente para este procedimiento.',
  negado: 'La negativa quedó registrada. Este procedimiento no inicia.',
  revocado: 'La revocatoria quedó registrada. El consentimiento original sigue en la atención.',
  version_no_vigente: 'El consentimiento guardado es de una versión anterior. Hace falta la plantilla vigente.',
  firmado_vigente: 'Hay consentimiento firmado de la plantilla vigente.',
  no_exige: 'Este procedimiento no exige consentimiento en este módulo.',
};

export function PanelConsentimiento({ atencionId }: { atencionId: string | null }) {
  const [procedimiento, setProcedimiento] = useState<ProcedimientoConsentimiento>(PROCEDIMIENTO_ADAPTACION_LC);
  const [vista, setVista] = useState<Vista | null>(null);
  const [acuerdo, setAcuerdo] = useState(false);
  const [trazo, setTrazo] = useState<{ pngBase64: string; puntos: unknown } | null>(null);
  const [textoNuevo, setTextoNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const recordarTrazo = useCallback((dato: { pngBase64: string; puntos: unknown }) => {
    setTrazo(dato);
  }, []);

  const cargar = useCallback(async (id: string) => {
    const respuesta = await fetch(`/api/atenciones/${id}/consentimientos`);
    const cuerpo = (await respuesta.json()) as Vista & { error?: string };
    if (!respuesta.ok) {
      setError(cuerpo.error ?? 'No se pudieron leer los consentimientos.');
      return;
    }
    setVista(cuerpo);
    setError(null);
  }, []);

  useEffect(() => {
    if (!atencionId) {
      setVista(null);
      return;
    }
    void cargar(atencionId);
  }, [atencionId, cargar]);

  const plantilla = vista?.plantillas.find((item) => item.procedimiento === procedimiento) ?? null;
  const ultimo = vista?.consentimientos.find((item) => item.procedimiento === procedimiento) ?? null;
  const puerta = vista?.puertas[procedimiento] ?? null;
  const etiqueta = ETIQUETAS_PROCEDIMIENTO[procedimiento];

  useEffect(() => {
    setTextoNuevo(plantilla?.texto ?? '');
  }, [plantilla?.texto]);

  async function enviar(accion: 'registrar' | 'revocar' | 'iniciar' | 'publicar', decision?: 'otorgado' | 'negado') {
    if (!atencionId) return;
    setError(null);
    setAviso(null);
    if (accion === 'registrar' && decision === 'otorgado') {
      if (!acuerdo) {
        setError('Falta el acuerdo de uso de firma electrónica.');
        return;
      }
      if (!trazo) {
        setError('Falta el trazo de la firma.');
        return;
      }
    }
    const respuesta = await fetch(`/api/atenciones/${atencionId}/consentimientos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accion,
        procedimiento,
        decision,
        contenido: textoNuevo,
        trazo_png_base64: trazo?.pngBase64 ?? null,
        trazo_puntos: trazo?.puntos ?? null,
        acuerdo,
      }),
    });
    const cuerpo = (await respuesta.json()) as { error?: string; permitida?: boolean; motivo?: string };
    if (!respuesta.ok) {
      setError(cuerpo.error ?? 'No se pudo registrar el consentimiento.');
      return;
    }
    if (accion === 'iniciar') {
      const motivo = cuerpo.motivo ? (MOTIVOS[cuerpo.motivo] ?? cuerpo.motivo) : '';
      if (cuerpo.permitida) {
        setAviso(`Se puede iniciar: ${etiqueta}. ${motivo}`);
      } else {
        setError(`No se puede iniciar ${etiqueta}. ${motivo}`);
      }
      return;
    }
    if (accion === 'revocar') {
      setAviso('La revocatoria quedó registrada. El consentimiento original no se borró.');
    } else if (accion === 'publicar') {
      setAviso('La plantilla quedó versionada. Los consentimientos anteriores conservan su texto.');
    } else if (decision === 'negado') {
      setAviso('La negativa quedó registrada. El procedimiento no inicia.');
    } else {
      setAviso('El consentimiento quedó firmado y anexo a la atención.');
    }
    await cargar(atencionId);
  }

  return (
    <section id="seccion-consentimiento" aria-labelledby="titulo-consentimiento" className="space-y-3 rounded-md border border-neutral-300 p-4">
      <h2 id="titulo-consentimiento" className="text-lg font-semibold">
        Consentimiento informado
      </h2>
      <p className="text-sm text-neutral-950">{ROTULO_CONSENTIMIENTO}</p>
      <p className="text-sm text-neutral-950">
        TODO(Q-17): este instrumento no define la base legal de la historia clínica. Es distinto de la autorización de datos.
      </p>
      {!atencionId ? <p className="text-sm">Guarde el borrador de la atención para registrar el consentimiento.</p> : null}
      <div>
        <label htmlFor="procedimiento-consentimiento" className="block text-sm font-medium text-neutral-950">
          Procedimiento
        </label>
        <select
          id="procedimiento-consentimiento"
          className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950"
          value={procedimiento}
          onChange={(event) => setProcedimiento(event.target.value as ProcedimientoConsentimiento)}
        >
          {PROCEDIMIENTOS_CON_CONSENTIMIENTO.map((codigo) => (
            <option key={codigo} value={codigo}>
              {ETIQUETAS_PROCEDIMIENTO[codigo]}
            </option>
          ))}
        </select>
      </div>
      {plantilla ? (
        <div className="space-y-1 text-sm text-neutral-950">
          <p data-testid="consentimiento-version">Versión vigente: {plantilla.version}</p>
          <p data-testid="consentimiento-hash" className="break-all">
            Hash de la plantilla: {plantilla.hash}
          </p>
          <p className="whitespace-pre-wrap rounded-md border border-neutral-300 bg-neutral-50 p-3">{plantilla.texto}</p>
        </div>
      ) : null}
      {ultimo ? (
        <p data-testid="consentimiento-estado" className="text-sm text-neutral-950">
          Último registro: {ultimo.estado}, versión {ultimo.version}
          {ultimo.hash_anexo ? `, anexo ${ultimo.hash_anexo}` : ''}
          {ultimo.firma_id ? ', con firma' : ''}
          {ultimo.hora_bogota ? `. Hora en Bogotá: ${ultimo.hora_bogota}` : ''}
        </p>
      ) : (
        <p data-testid="consentimiento-estado" className="text-sm text-neutral-950">
          Último registro: pendiente
        </p>
      )}
      {puerta ? (
        <p data-testid="puerta-procedimiento" className="text-sm text-neutral-950">
          {puerta.permitida ? 'El procedimiento puede iniciar.' : 'El procedimiento no puede iniciar.'} {MOTIVOS[puerta.motivo] ?? ''}
        </p>
      ) : null}
      <div className="flex items-start gap-2">
        <input
          id="acuerdo-consentimiento"
          type="checkbox"
          checked={acuerdo}
          onChange={(event) => setAcuerdo(event.target.checked)}
          className="mt-1"
        />
        <label htmlFor="acuerdo-consentimiento" className="text-sm text-neutral-950">
          Acepto el acuerdo de firma electrónica
        </label>
      </div>
      <PadPaciente onChange={recordarTrazo} />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!atencionId}
          onClick={() => void enviar('registrar', 'otorgado')}
          className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:bg-neutral-300 disabled:text-neutral-950"
        >
          Registrar consentimiento firmado
        </button>
        <button
          type="button"
          disabled={!atencionId}
          onClick={() => void enviar('registrar', 'negado')}
          className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-950"
        >
          Registrar negativa
        </button>
        <button
          type="button"
          disabled={!atencionId}
          onClick={() => void enviar('revocar')}
          className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-950"
        >
          Revocar consentimiento
        </button>
        <button
          type="button"
          disabled={!atencionId}
          onClick={() => void enviar('iniciar')}
          className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-950"
        >
          Iniciar: {etiqueta}
        </button>
      </div>
      <div>
        <label htmlFor="texto-plantilla-consentimiento" className="block text-sm font-medium text-neutral-950">
          Nueva versión del texto
        </label>
        <textarea
          id="texto-plantilla-consentimiento"
          rows={4}
          value={textoNuevo}
          onChange={(event) => setTextoNuevo(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950"
        />
        <button
          type="button"
          disabled={!atencionId}
          onClick={() => void enviar('publicar')}
          className="mt-2 rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-950"
        >
          Publicar nueva versión
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-md border border-red-900 bg-red-50 px-3 py-2 text-sm text-red-950">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p role="status" className="rounded-md border border-neutral-700 bg-neutral-50 px-3 py-2 text-sm text-neutral-950">
          {aviso}
        </p>
      ) : null}
    </section>
  );
}
