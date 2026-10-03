'use client';

// SEG-11 (T29) — Lo que el admin de la óptica puede ver de un incidente.
import { useCallback, useEffect, useState } from 'react';

type Alerta = { codigo: string; fecha: string };

type Aviso = {
  id: string;
  incidente_id: string;
  aviso_borrador: string;
  dia_deteccion: string;
  plazo_sic: string;
  plazo_sic_dias: number;
  fuente_plazo: string;
  aviso_festivos: string | null;
  alertas: Alerta[];
  estado: string;
  descripcion: string;
};

type Nota = { id: string; titulo: string; cuerpo: string; incidente_id: string };

type Panel = {
  regla_sin_datos_personales: string;
  nota_q07: string;
  incidentes: Aviso[];
  notificaciones: Nota[];
  error?: string;
};

export function PanelIncidentesAdmin() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [error, setError] = useState('');

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

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!panel) return <p className="text-sm">Cargando avisos…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold">Incidentes que afectan a esta óptica</h1>
        <p className="text-sm text-muted-foreground">Aviso interno. El sistema no envía correo ni reporta a la SIC.</p>
      </header>
      <p className="text-sm" data-testid="regla-sin-datos-personales">
        {panel.regla_sin_datos_personales}
      </p>
      <p className="text-sm" data-testid="nota-q07">
        {panel.nota_q07}
      </p>
      {panel.notificaciones.length === 0 ? (
        <p className="text-sm">No hay notificaciones internas.</p>
      ) : (
        panel.notificaciones.map((nota) => (
          <article key={nota.id} className="border rounded-lg p-4" data-testid="notificacion-incidente">
            <h2 className="font-semibold">{nota.titulo}</h2>
            <p className="text-sm">{nota.cuerpo}</p>
          </article>
        ))
      )}
      {panel.incidentes.map((incidente) => (
        <article key={incidente.id} className="border rounded-lg p-4 space-y-2" data-testid="incidente-optica">
          <p data-testid="plazo-sic">
            Límite SIC: {incidente.plazo_sic} ({incidente.plazo_sic_dias} días hábiles)
          </p>
          <p className="text-sm">{incidente.fuente_plazo}</p>
          <p>Estado: {incidente.estado}</p>
          <p>{incidente.descripcion}</p>
          {incidente.aviso_festivos ? <p data-testid="aviso-festivos">{incidente.aviso_festivos}</p> : null}
          <ul>
            {(incidente.alertas ?? []).map((alerta) => (
              <li key={alerta.codigo} data-testid={`alerta-${alerta.codigo}`}>
                {alerta.codigo}: {alerta.fecha}
              </li>
            ))}
          </ul>
          <pre className="text-xs whitespace-pre-wrap" data-testid="plantilla-optica">
            {incidente.aviso_borrador}
          </pre>
        </article>
      ))}
    </div>
  );
}
