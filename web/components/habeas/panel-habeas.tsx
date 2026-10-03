'use client';

// SEG-07 (T26) — Radicación y seguimiento de habeas data / PQR.
// TODO(Q-32): el aviso de festivos se muestra si el tenant no cargó ninguno.
// TODO(Q-07): la causa de supresión clínica es un borrador sin plazo en años.
// La causa puede citar el estado de retención de SEG-09.
// TODO(Q-17): el sistema no resuelve la base legal de la historia clínica.
// BORRADOR – requiere revisión jurídica.
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { CAMPOS_DEMOGRAFICOS, ROTULO_BORRADOR_JURIDICO } from '@/dominio/habeas-data';

interface SolicitudVista {
  id: string;
  radicado: string;
  tipo: string;
  estado: string;
  vence_en: string;
  plazo_dias_habiles: number;
  aviso_festivos: string | null;
  semaforo: string;
  etiqueta_semaforo: string;
  dias_habiles_restantes: number;
  alerta_marca: boolean;
  leyenda: string | null;
  marcada_en: string | null;
  prorroga_hasta: string | null;
  respuesta: string | null;
  valor_original: string | null;
  adenda_id: string | null;
  historial_demografico: { campo: string; valor_anterior: string; valor_nuevo: string }[];
  bitacora: { tipo: string; texto: string; registrada_en: string; hora_bogota: string; quien: string }[];
}

interface PanelHabeas {
  aviso_festivos: string | null;
  plazos: {
    consulta_dias: number;
    reclamo_dias: number;
    prorroga_dias: number;
    marca_horas: number;
    fuentes: { consulta: string; reclamo: string; prorroga: string; marca: string };
  };
  solicitudes: SolicitudVista[];
}

const TIPOS = [
  { valor: 'consulta', etiqueta: 'Consulta' },
  { valor: 'reclamo', etiqueta: 'Reclamo' },
  { valor: 'rectificacion', etiqueta: 'Rectificación' },
  { valor: 'supresion', etiqueta: 'Supresión' },
  { valor: 'revocatoria', etiqueta: 'Revocatoria' },
] as const;

const CAMPOS_REFRACCION = [
  'esfera_od',
  'cilindro_od',
  'eje_od',
  'adicion_od',
  'agudeza_od',
  'esfera_oi',
  'cilindro_oi',
  'eje_oi',
  'adicion_oi',
  'agudeza_oi',
  'dip',
];

const COLOR: Record<string, string> = {
  verde: 'bg-emerald-600',
  amarillo: 'bg-amber-500',
  rojo: 'bg-red-600',
};

export function PanelHabeas() {
  const [panel, setPanel] = useState<PanelHabeas | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['valor']>('reclamo');
  const [canal, setCanal] = useState('presencial');
  const [ambito, setAmbito] = useState<'clinico' | 'demografico'>('clinico');
  const [pacienteId, setPacienteId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [atencionId, setAtencionId] = useState('');
  const [campoRef, setCampoRef] = useState('esfera_od');
  const [nuevoValor, setNuevoValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [campoDemo, setCampoDemo] = useState<(typeof CAMPOS_DEMOGRAFICOS)[number]>('direccion');
  const [valorDemo, setValorDemo] = useState('');
  const [respuesta, setRespuesta] = useState('');

  const cargar = useCallback(async () => {
    const res = await fetch('/api/habeas-data');
    const cuerpo = (await res.json()) as PanelHabeas & { error?: string };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo cargar el módulo.');
      return;
    }
    setPanel(cuerpo);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargar();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargar]);

  async function radicar(evento: FormEvent) {
    evento.preventDefault();
    setError('');
    setAviso('');
    const res = await fetch('/api/habeas-data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tipo,
        canal,
        descripcion,
        paciente_id: pacienteId || null,
        ambito: tipo === 'rectificacion' || tipo === 'supresion' ? ambito : null,
        atencion_id: atencionId || null,
        campo_ref: campoRef,
        nuevo_valor: nuevoValor,
        motivo,
        campo_demografico: campoDemo,
        valor_demografico: valorDemo,
      }),
    });
    const cuerpo = (await res.json()) as SolicitudVista & { error?: string; bloqueo_supresion?: boolean };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo radicar.');
      return;
    }
    setAviso(
      cuerpo.bloqueo_supresion
        ? 'La supresión clínica quedó bloqueada. La causa legal se archivó como respuesta.'
        : `Solicitud ${cuerpo.radicado} radicada. Vence el ${cuerpo.vence_en}.`,
    );
    setDescripcion('');
    await cargar();
  }

  async function accion(id: string, ruta: 'marcar' | 'responder' | 'prorrogar') {
    setError('');
    const res = await fetch(`/api/habeas-data/${id}/${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: ruta === 'responder' ? JSON.stringify({ texto: respuesta }) : '{}',
    });
    const cuerpo = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo completar la acción.');
      return;
    }
    setRespuesta('');
    await cargar();
  }

  const plazos = panel?.plazos;

  return (
    <section className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Habeas Data y PQR</h1>
        <p className="text-sm text-muted-foreground mt-1">{ROTULO_BORRADOR_JURIDICO}</p>
      </header>

      {panel?.aviso_festivos ? (
        <p role="status" data-testid="aviso-festivos" className="rounded-md border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">
          {panel.aviso_festivos}
        </p>
      ) : null}

      {plazos ? (
        <dl className="grid gap-2 text-sm md:grid-cols-2" data-testid="plazos-legales">
          <div>Consulta: {plazos.consulta_dias} días hábiles. {plazos.fuentes.consulta}</div>
          <div>Reclamo: {plazos.reclamo_dias} días hábiles. {plazos.fuentes.reclamo}</div>
          <div>Marca del dato: {plazos.marca_horas} h hábiles. {plazos.fuentes.marca}</div>
          <div>Prórroga del reclamo: {plazos.prorroga_dias} días hábiles. {plazos.fuentes.prorroga}</div>
        </dl>
      ) : null}

      <form onSubmit={radicar} className="space-y-3 rounded-md border border-border p-4">
        <h2 className="font-medium">Radicar solicitud</h2>
        <label className="block text-sm">
          Tipo
          <select className="mt-1 w-full border rounded p-2" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo">
            {TIPOS.map((item) => (
              <option key={item.valor} value={item.valor}>{item.etiqueta}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Canal
          <select className="mt-1 w-full border rounded p-2" value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal">
            <option value="presencial">Presencial</option>
            <option value="escrito">Escrito</option>
            <option value="electronico">Electrónico</option>
          </select>
        </label>
        {(tipo === 'rectificacion' || tipo === 'supresion') && (
          <label className="block text-sm">
            Ámbito
            <select className="mt-1 w-full border rounded p-2" value={ambito} onChange={(e) => setAmbito(e.target.value as 'clinico' | 'demografico')} aria-label="Ámbito">
              <option value="clinico">Clínico</option>
              <option value="demografico">Demográfico</option>
            </select>
          </label>
        )}
        <label className="block text-sm">
          Paciente
          <input className="mt-1 w-full border rounded p-2" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} aria-label="Paciente" />
        </label>
        <label className="block text-sm">
          Descripción
          <textarea className="mt-1 w-full border rounded p-2" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} aria-label="Descripción" required />
        </label>
        {tipo === 'rectificacion' && ambito === 'clinico' ? (
          <>
            <label className="block text-sm">
              Atención
              <input className="mt-1 w-full border rounded p-2" value={atencionId} onChange={(e) => setAtencionId(e.target.value)} aria-label="Atención" />
            </label>
            <label className="block text-sm">
              Campo de refracción
              <select className="mt-1 w-full border rounded p-2" value={campoRef} onChange={(e) => setCampoRef(e.target.value)} aria-label="Campo de refracción">
                {CAMPOS_REFRACCION.map((campo) => (
                  <option key={campo} value={campo}>{campo}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Nuevo valor
              <input className="mt-1 w-full border rounded p-2" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)} aria-label="Nuevo valor" />
            </label>
            <label className="block text-sm">
              Motivo de la adenda
              <input className="mt-1 w-full border rounded p-2" value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo de la adenda" />
            </label>
          </>
        ) : null}
        {tipo === 'rectificacion' && ambito === 'demografico' ? (
          <>
            <label className="block text-sm">
              Campo demográfico
              <select className="mt-1 w-full border rounded p-2" value={campoDemo} onChange={(e) => setCampoDemo(e.target.value as typeof campoDemo)} aria-label="Campo demográfico">
                {CAMPOS_DEMOGRAFICOS.map((campo) => (
                  <option key={campo} value={campo}>{campo}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Valor nuevo
              <input className="mt-1 w-full border rounded p-2" value={valorDemo} onChange={(e) => setValorDemo(e.target.value)} aria-label="Valor nuevo" />
            </label>
          </>
        ) : null}
        <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground">Radicar solicitud</button>
      </form>

      {error ? <p role="alert" className="text-red-700">{error}</p> : null}
      {aviso ? <p role="status" className="text-emerald-800">{aviso}</p> : null}

      <div className="space-y-4">
        {(panel?.solicitudes ?? []).map((solicitud) => (
          <article key={solicitud.id} data-testid={`solicitud-${solicitud.radicado}`} className="rounded-md border border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-full ${COLOR[solicitud.semaforo]}`} aria-hidden />
              <p data-testid="semaforo">Semáforo: {solicitud.etiqueta_semaforo}</p>
            </div>
            <p className="font-medium">{solicitud.radicado} · {solicitud.tipo} · {solicitud.estado}</p>
            <p data-testid="vence-en">Vence el {solicitud.vence_en} ({solicitud.plazo_dias_habiles} días hábiles)</p>
            <p data-testid="dias-habiles">Días hábiles restantes: {solicitud.dias_habiles_restantes}</p>
            {solicitud.aviso_festivos ? <p className="text-sm">{solicitud.aviso_festivos}</p> : null}
            {solicitud.alerta_marca ? (
              <p role="alert" data-testid="alerta-marca">Alerta: pasaron las horas hábiles y el reclamo no está marcado.</p>
            ) : null}
            {solicitud.leyenda ? <p data-testid="leyenda-reclamo">{solicitud.leyenda}</p> : null}
            {solicitud.adenda_id ? (
              <p data-testid="adenda-generada">Adenda registrada. El original sigue visible.</p>
            ) : null}
            {solicitud.valor_original ? (
              <p data-testid="valor-original">Valor original: {solicitud.valor_original}</p>
            ) : null}
            {solicitud.historial_demografico.map((linea) => (
              <p key={`${linea.campo}-${linea.valor_anterior}`} data-testid="historial-demografico">
                Historial {linea.campo}: antes «{linea.valor_anterior}», ahora «{linea.valor_nuevo}». El anterior sigue visible.
              </p>
            ))}
            {solicitud.respuesta ? <p>Respuesta: {solicitud.respuesta}</p> : null}
            <ul data-testid="bitacora-respuesta" className="text-sm space-y-1">
              {solicitud.bitacora.map((entrada) => (
                <li key={`${entrada.tipo}-${entrada.registrada_en}`}>
                  {entrada.tipo}: {entrada.texto} — {entrada.quien} — {entrada.hora_bogota} (America/Bogotá)
                </li>
              ))}
            </ul>
            {solicitud.tipo === 'reclamo' && !solicitud.marcada_en && solicitud.estado !== 'respondida' ? (
              <button type="button" className="rounded border px-3 py-1" onClick={() => void accion(solicitud.id, 'marcar')}>
                Marcar reclamo en trámite
              </button>
            ) : null}
            {solicitud.tipo === 'reclamo' && !solicitud.prorroga_hasta && solicitud.estado !== 'respondida' ? (
              <button type="button" className="rounded border px-3 py-1 ml-2" onClick={() => void accion(solicitud.id, 'prorrogar')}>
                Prorrogar
              </button>
            ) : null}
            {solicitud.estado !== 'respondida' && solicitud.estado !== 'cerrada' ? (
              <div className="flex gap-2">
                <label className="sr-only" htmlFor={`respuesta-${solicitud.id}`}>Respuesta</label>
                <input id={`respuesta-${solicitud.id}`} className="flex-1 border rounded p-2" aria-label="Respuesta" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
                <button type="button" className="rounded border px-3 py-1" onClick={() => void accion(solicitud.id, 'responder')}>
                  Archivar respuesta
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
