'use client';

// SEG-11 (T29) — Consola de operación de plataforma. No envía nada a la SIC.
import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Alerta = { codigo: string; dias_habiles_antes: number; fecha: string };

type Incidente = {
  id: string;
  dia_deteccion: string;
  descripcion: string;
  alcance: string;
  datos_afectados: string;
  severidad: string;
  estado: string;
  plazo_sic: string;
  plazo_sic_dias: number;
  fuente_plazo: string;
  festivos_cargados: boolean;
  aviso_festivos: string | null;
  dias_habiles_restantes: number;
  alertas: Alerta[];
  tenants_afectados: string[];
  plantilla_optica: string;
  plantilla_sic: string;
  contencion: string | null;
  reporte_sic_en: string | null;
};

type Optica = { id: string; razon_social: string };

type Panel = {
  regla_sin_datos_personales: string;
  nota_q07: string;
  aviso_optica_horas: string | null;
  opticas: Optica[];
  incidentes: Incidente[];
  error?: string;
};

export function PanelIncidentesPlataforma() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [alcance, setAlcance] = useState('');
  const [datos, setDatos] = useState('');
  const [severidad, setSeveridad] = useState('');
  const [festivos, setFestivos] = useState('');
  const [detectado, setDetectado] = useState('');
  const [marcas, setMarcas] = useState<Record<string, string[]>>({});

  const cargar = useCallback(async () => {
    const res = await fetch('/api/incidentes');
    const cuerpo = (await res.json()) as Panel;
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudieron leer los incidentes.');
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

  async function crear(evento: FormEvent) {
    evento.preventDefault();
    setError('');
    const res = await fetch('/api/incidentes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        detectado_en: detectado.trim() || undefined,
        descripcion,
        alcance,
        datos_afectados: datos,
        severidad,
        festivos_csv: festivos,
      }),
    });
    const cuerpo = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo crear el incidente.');
      return;
    }
    setDescripcion('');
    setAlcance('');
    setDatos('');
    setSeveridad('');
    await cargar();
  }

  async function marcar(incidenteId: string) {
    setError('');
    const res = await fetch(`/api/incidentes/${incidenteId}/tenants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenant_ids: marcas[incidenteId] ?? [] }),
    });
    const cuerpo = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo avisar a las ópticas.');
      return;
    }
    await cargar();
  }

  async function avanzar(incidenteId: string, estado: string, nota: string | null, constancia: boolean) {
    setError('');
    const res = await fetch(`/api/incidentes/${incidenteId}/estado`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estado, nota, constancia_humana: constancia }),
    });
    const cuerpo = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo actualizar el estado.');
      return;
    }
    await cargar();
  }

  if (error && !panel) return <p className="text-sm text-red-700">{error}</p>;
  if (!panel) return <p className="text-sm">Cargando incidentes…</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Incidentes de seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Operación de plataforma. El sistema no envía avisos a la SIC ni a terceros.
        </p>
      </header>
      <p className="text-sm" data-testid="regla-sin-datos-personales">
        {panel.regla_sin_datos_personales}
      </p>
      <p className="text-sm" data-testid="nota-q07">
        {panel.nota_q07} Valor actual de aviso_optica_horas:{' '}
        {panel.aviso_optica_horas ?? 'sin valor'}.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <form onSubmit={crear} className="space-y-3 border rounded-lg p-4">
        <h2 className="font-semibold">Registrar detección</h2>
        <label className="block text-sm">
          Detectado en (UTC, opcional)
          <input
            className="mt-1 w-full border rounded px-2 py-1"
            value={detectado}
            onChange={(evento) => setDetectado(evento.target.value)}
            placeholder="2026-10-02T15:00:00.000Z"
          />
        </label>
        <label className="block text-sm">
          Descripción
          <textarea className="mt-1 w-full border rounded px-2 py-1" value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} required />
        </label>
        <label className="block text-sm">
          Alcance
          <textarea className="mt-1 w-full border rounded px-2 py-1" value={alcance} onChange={(evento) => setAlcance(evento.target.value)} required />
        </label>
        <label className="block text-sm">
          Datos afectados
          <textarea className="mt-1 w-full border rounded px-2 py-1" value={datos} onChange={(evento) => setDatos(evento.target.value)} required />
        </label>
        <label className="block text-sm">
          Severidad operativa
          <input className="mt-1 w-full border rounded px-2 py-1" value={severidad} onChange={(evento) => setSeveridad(evento.target.value)} required />
        </label>
        <label className="block text-sm">
          Festivos (CSV opcional: anio,fecha,nombre,fuente)
          <textarea className="mt-1 w-full border rounded px-2 py-1" value={festivos} onChange={(evento) => setFestivos(evento.target.value)} />
        </label>
        <button type="submit" className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm font-semibold">
          Crear incidente
        </button>
      </form>

      {panel.incidentes.map((incidente) => (
        <article key={incidente.id} className="border rounded-lg p-4 space-y-2" data-testid={`incidente-${incidente.id}`}>
          <h2 className="font-semibold">
            {incidente.estado} · {incidente.id}
          </h2>
          <p data-testid="dia-deteccion">Día de detección: {incidente.dia_deteccion}</p>
          <p data-testid="plazo-sic">
            Límite SIC: {incidente.plazo_sic} ({incidente.plazo_sic_dias} días hábiles). Quedan{' '}
            {incidente.dias_habiles_restantes}.
          </p>
          <p className="text-sm">{incidente.fuente_plazo}</p>
          {incidente.aviso_festivos ? (
            <p data-testid="aviso-festivos">{incidente.aviso_festivos}</p>
          ) : (
            <p data-testid="aviso-festivos">Festivos cargados para este cálculo.</p>
          )}
          <ul>
            {incidente.alertas.map((alerta) => (
              <li key={alerta.codigo} data-testid={`alerta-${alerta.codigo}`}>
                {alerta.codigo}: {alerta.fecha}
              </li>
            ))}
          </ul>
          <p className="text-sm">{incidente.descripcion}</p>
          <fieldset>
            <legend className="text-sm font-semibold">Ópticas afectadas</legend>
            {panel.opticas.map((optica) => (
              <label key={optica.id} className="block text-sm">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={(marcas[incidente.id] ?? incidente.tenants_afectados).includes(optica.id)}
                  onChange={(evento) => {
                    const previas = new Set(marcas[incidente.id] ?? []);
                    if (evento.target.checked) previas.add(optica.id);
                    else previas.delete(optica.id);
                    setMarcas({ ...marcas, [incidente.id]: [...previas] });
                  }}
                />
                {optica.razon_social}
              </label>
            ))}
          </fieldset>
          <button type="button" className="text-sm underline" onClick={() => void marcar(incidente.id)}>
            Avisar a las ópticas marcadas
          </button>
          {incidente.estado === 'detectado' ? (
            <button
              type="button"
              className="block text-sm underline"
              onClick={() => void avanzar(incidente.id, 'contenido', 'Accesos revocados y copias aisladas', false)}
            >
              Registrar contención
            </button>
          ) : null}
          {incidente.estado === 'notificado_responsable' ? (
            <button
              type="button"
              className="block text-sm underline"
              onClick={() => void avanzar(incidente.id, 'reportado_sic', null, true)}
            >
              Registrar que un humano reportó a la SIC
            </button>
          ) : null}
          {incidente.estado === 'reportado_sic' ? (
            <button
              type="button"
              className="block text-sm underline"
              onClick={() => void avanzar(incidente.id, 'cerrado', 'Cierre operativo sin datos de personas', false)}
            >
              Cerrar incidente
            </button>
          ) : null}
          <details>
            <summary>Plantilla para la óptica</summary>
            <pre className="text-xs whitespace-pre-wrap" data-testid="plantilla-optica">
              {incidente.plantilla_optica}
            </pre>
          </details>
          <details>
            <summary>Plantilla para la SIC</summary>
            <pre className="text-xs whitespace-pre-wrap" data-testid="plantilla-sic">
              {incidente.plantilla_sic}
            </pre>
          </details>
        </article>
      ))}
    </div>
  );
}
