'use client';

// SEG-05 (T15) — Captura separada de autorización, contacto y finalidades opcionales.
// TODO(Q-17): la negativa no bloquea el registro ni la atención una vez registrada.
// BORRADOR – requiere revisión jurídica.
import { useEffect, useState } from 'react';

import {
  accionEstadoAutorizacion,
  accionExportarEvidencia,
  accionListarPlantillas,
  accionPuedeAbrirAtencion,
  accionPuedeContactar,
  accionRegistrarAutorizacion,
  accionRevocarContacto,
} from '@/app/acciones/autorizaciones';
import { CODIGO_CONTACTO, CODIGO_TRATAMIENTO, NOTA_INSTRUMENTOS, ROTULO_BORRADOR } from '@/dominio/autorizacion-textos';
import { PadPaciente } from '@/components/firma/pad-paciente';

interface Plantilla {
  codigo: string;
  etiqueta: string;
  contenido: string;
  version: number;
  opcional: boolean;
  hash: string;
}

export function PanelAutorizacionPaciente({ pacienteId }: { pacienteId?: string }) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [tratamiento, setTratamiento] = useState<'' | 'otorgada' | 'negada'>('');
  const [contacto, setContacto] = useState(false);
  const [opcionales, setOpcionales] = useState<string[]>([]);
  const [medio, setMedio] = useState<'presencial' | 'electronico'>('presencial');
  const [urgencia, setUrgencia] = useState(false);
  const [estadoTratamiento, setEstadoTratamiento] = useState<string | null>(null);
  const [estadoContacto, setEstadoContacto] = useState<string | null>(null);
  const [autorizacionId, setAutorizacionId] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [evidencia, setEvidencia] = useState<string | null>(null);
  const [trazo, setTrazo] = useState<{ pngBase64: string; puntos: unknown } | null>(null);
  const [acuerdo, setAcuerdo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const lista = await accionListarPlantillas();
      if (cancelado) return;
      if (lista.ok) setPlantillas(lista.plantillas);
      if (!pacienteId) {
        setContacto(false);
        setEstadoTratamiento(null);
        setEstadoContacto(null);
        setAutorizacionId(null);
        return;
      }
      const estado = await accionEstadoAutorizacion(pacienteId);
      if (cancelado || !estado.ok) return;
      setEstadoTratamiento(estado.estado.tratamiento);
      setEstadoContacto(estado.estado.contacto);
      setContacto(false);
      const tratamientoGuardado = estado.estado.autorizaciones.find((fila) => fila.finalidad === CODIGO_TRATAMIENTO);
      setAutorizacionId(tratamientoGuardado?.id ?? estado.estado.autorizaciones[0]?.id ?? null);
    })();
    return () => {
      cancelado = true;
    };
  }, [pacienteId]);

  async function recargar() {
    if (!pacienteId) return;
    const estado = await accionEstadoAutorizacion(pacienteId);
    if (!estado.ok) return;
    setEstadoTratamiento(estado.estado.tratamiento);
    setEstadoContacto(estado.estado.contacto);
    setContacto(false);
    const tratamientoGuardado = estado.estado.autorizaciones.find((fila) => fila.finalidad === CODIGO_TRATAMIENTO);
    setAutorizacionId(tratamientoGuardado?.id ?? estado.estado.autorizaciones[0]?.id ?? null);
    const lista = await accionListarPlantillas();
    if (lista.ok) setPlantillas(lista.plantillas);
  }
  const textoTratamiento = plantillas.find((item) => item.codigo === CODIGO_TRATAMIENTO);
  const textoContacto = plantillas.find((item) => item.codigo === CODIGO_CONTACTO);
  const textosOpcionales = plantillas.filter((item) => item.opcional && item.codigo !== CODIGO_CONTACTO);

  async function registrar() {
    if (!pacienteId) return;
    setErrores([]);
    setEvidencia(null);
    setAviso(null);
    const respuesta = await accionRegistrarAutorizacion({
      pacienteId,
      medio,
      tratamiento: tratamiento || null,
      contacto,
      opcionales,
      trazoPngBase64: trazo?.pngBase64 ?? null,
      trazoPuntos: trazo?.puntos ?? null,
      acuerdoFirma: acuerdo,
    });
    if (!respuesta.ok) {
      setErrores(respuesta.errores);
      return;
    }
    setAviso('La autorización quedó registrada. El texto es un borrador sujeto a revisión jurídica.');
    setTratamiento('');
    setContacto(false);
    setOpcionales([]);
    await recargar();
  }

  return (
    <fieldset className="space-y-3 border border-border rounded-lg p-3" id="autorizacion-datos">
      <legend className="text-sm font-semibold px-1">Autorización de tratamiento de datos</legend>
      <p className="text-xs text-muted-foreground">{ROTULO_BORRADOR}</p>
      <p className="text-xs text-muted-foreground">{NOTA_INSTRUMENTOS}</p>
      <p className="text-xs text-muted-foreground">
        TODO(Q-17): si la persona no autoriza, la negativa queda registrada y el registro puede continuar. Esto no define la base legal de la historia clínica.
      </p>
      {textoTratamiento ? (
        <pre className="text-xs whitespace-pre-wrap border border-border rounded-lg p-2 bg-muted/40">{textoTratamiento.contenido}</pre>
      ) : null}
      <p className="text-sm">
        Estado del tratamiento clínico: {estadoTratamiento ?? 'sin captura'}
        {textoTratamiento ? ` · versión ${textoTratamiento.version}` : ''}
      </p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Decisión sobre el tratamiento clínico</legend>
        <label className="text-sm flex gap-2 items-start" htmlFor="autorizacion-otorgada">
          <input
            id="autorizacion-otorgada"
            type="radio"
            name="decision-tratamiento"
            checked={tratamiento === 'otorgada'}
            onChange={() => setTratamiento('otorgada')}
          />
          <span>Autorización otorgada</span>
        </label>
        <label className="text-sm flex gap-2 items-start" htmlFor="autorizacion-negada">
          <input
            id="autorizacion-negada"
            type="radio"
            name="decision-tratamiento"
            checked={tratamiento === 'negada'}
            onChange={() => setTratamiento('negada')}
          />
          <span>Autorización negada</span>
        </label>
      </fieldset>

      <fieldset className="space-y-2 border border-border rounded-lg p-3">
        <legend className="text-sm font-semibold px-1">Contacto comercial</legend>
        {textoContacto ? (
          <pre className="text-xs whitespace-pre-wrap border border-border rounded-lg p-2 bg-muted/40">{textoContacto.contenido}</pre>
        ) : null}
        <p className="text-xs text-muted-foreground">Estado: {estadoContacto ?? 'sin captura'}. Desmarcada no bloquea el registro.</p>
        <label className="text-sm flex gap-2 items-start" htmlFor="contacto-comercial">
          <input
            id="contacto-comercial"
            type="checkbox"
            checked={contacto}
            onChange={(evento) => setContacto(evento.target.checked)}
          />
          <span>Contacto comercial</span>
        </label>
      </fieldset>

      {textosOpcionales.length > 0 ? (
        <fieldset className="space-y-2 border border-border rounded-lg p-3">
          <legend className="text-sm font-semibold px-1">Finalidades opcionales</legend>
          {textosOpcionales.map((item) => (
            <label key={item.codigo} className="text-sm flex gap-2 items-start" htmlFor={`opcional-${item.codigo}`}>
              <input
                id={`opcional-${item.codigo}`}
                type="checkbox"
                checked={opcionales.includes(item.codigo)}
                onChange={(evento) => {
                  setOpcionales((actual) =>
                    evento.target.checked ? [...actual, item.codigo] : actual.filter((codigo) => codigo !== item.codigo),
                  );
                }}
              />
              <span>
                {item.etiqueta}
                <span className="block text-xs text-muted-foreground whitespace-pre-wrap">{item.contenido}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <label className="text-sm space-y-1 block" htmlFor="medio-autorizacion">
        <span>Medio de la autorización</span>
        <select
          id="medio-autorizacion"
          className="w-full border border-input rounded-lg px-2 py-2 bg-background"
          value={medio}
          onChange={(evento) => setMedio(evento.target.value as 'presencial' | 'electronico')}
        >
          <option value="presencial">Presencial</option>
          <option value="electronico">Electrónico</option>
        </select>
      </label>

      {tratamiento === 'otorgada' ? (
        <div className="space-y-2">
          <p className="text-sm">Firma de aceptación, si la persona desea trazarla. Si no hay trazo, queda la aceptación por el medio indicado.</p>
          <PadPaciente onChange={setTrazo} />
          <label className="text-sm flex gap-2 items-start" htmlFor="acuerdo-firma-autorizacion">
            <input
              id="acuerdo-firma-autorizacion"
              type="checkbox"
              checked={acuerdo}
              onChange={(evento) => setAcuerdo(evento.target.checked)}
            />
            <span>Acepto el acuerdo de uso de firma electrónica</span>
          </label>
        </div>
      ) : null}

      <label className="text-sm flex gap-2 items-start" htmlFor="urgencia-marcada">
        <input
          id="urgencia-marcada"
          type="checkbox"
          checked={urgencia}
          onChange={(evento) => setUrgencia(evento.target.checked)}
        />
        <span>Urgencia marcada. TODO(Q-17): la excepción de la Ley 1581 art. 10 la valida el abogado.</span>
      </label>

      {errores.length > 0 ? (
        <ul className="text-sm text-red-600 list-disc pl-5" role="alert">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {aviso ? (
        <p className="text-sm" role="status">
          {aviso}
        </p>
      ) : null}
      {evidencia ? (
        <pre className="text-xs whitespace-pre-wrap border border-border rounded-lg p-2" role="status">
          {evidencia}
        </pre>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border border-input rounded-lg px-3 py-2 text-sm"
          disabled={!pacienteId}
          onClick={() => void registrar()}
        >
          Registrar autorización
        </button>
        <button
          type="button"
          className="border border-input rounded-lg px-3 py-2 text-sm"
          disabled={!pacienteId}
          onClick={() => {
            if (!pacienteId) return;
            void accionPuedeAbrirAtencion(pacienteId, urgencia).then((respuesta) => {
              if (!respuesta.ok) {
                setErrores(respuesta.errores);
                return;
              }
              setAviso(
                respuesta.decision.permitida
                  ? `Se puede abrir la atención (${respuesta.decision.motivo}). La atención clínica todavía no existe: esta es la puerta que usará ese módulo.`
                  : `No se puede abrir la atención (${respuesta.decision.motivo}). Falta capturar la autorización, otorgada o negada.`,
              );
            });
          }}
        >
          Comprobar apertura de atención
        </button>
        <button
          type="button"
          className="border border-input rounded-lg px-3 py-2 text-sm"
          disabled={!autorizacionId}
          onClick={() => {
            if (!autorizacionId) return;
            void accionExportarEvidencia(autorizacionId).then((respuesta) => {
              if (!respuesta.ok) {
                setErrores(respuesta.errores);
                return;
              }
              const item = respuesta.evidencia;
              setEvidencia(
                `Texto exacto:\n${item.texto_exacto}\nHash: ${item.hash}\nHora UTC: ${item.hora_utc}\nHora Bogotá: ${item.hora_bogota}\nMedio: ${item.medio}`,
              );
            });
          }}
        >
          Exportar evidencia
        </button>
        <button
          type="button"
          className="border border-input rounded-lg px-3 py-2 text-sm"
          disabled={!pacienteId}
          onClick={() => {
            if (!pacienteId) return;
            void accionRevocarContacto(pacienteId).then(async (respuesta) => {
              if (!respuesta.ok) {
                setErrores(respuesta.errores);
                return;
              }
              setAviso('La autorización de contacto quedó revocada.');
              await recargar();
            });
          }}
        >
          Revocar contacto comercial
        </button>
        <button
          type="button"
          className="border border-input rounded-lg px-3 py-2 text-sm"
          disabled={!pacienteId}
          onClick={() => {
            if (!pacienteId) return;
            void accionPuedeContactar(pacienteId).then((respuesta) => {
              if (!respuesta.ok) {
                setErrores(respuesta.errores);
                return;
              }
              setAviso(
                respuesta.decision.permitida
                  ? 'El envío comercial está permitido. SEG-16 todavía no envía: debe consultar esta puerta.'
                  : `El envío comercial está detenido (${respuesta.decision.motivo}).`,
              );
            });
          }}
        >
          Comprobar envío comercial
        </button>
      </div>
    </fieldset>
  );
}
