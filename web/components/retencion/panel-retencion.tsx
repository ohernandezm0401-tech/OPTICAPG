'use client';

// SEG-09 (T27) — Pantalla de la política. Los plazos salen de la base.
import { useCallback, useEffect, useState } from 'react';

import { VistaPoliticaRetencion, type FilaPoliticaVista } from '@/components/retencion/vista-politica';

type Respuesta = {
  filas: FilaPoliticaVista[];
  declaracion_contratante: string;
  nota_purga: string;
  error?: string;
};

export function PanelRetencion() {
  const [panel, setPanel] = useState<Respuesta | null>(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const res = await fetch('/api/retencion');
    const cuerpo = (await res.json()) as Respuesta;
    if (!res.ok) {
      setError(cuerpo.error ?? 'No se pudo leer la política de retención.');
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

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!panel) {
    return <p className="text-sm">Cargando la política de retención…</p>;
  }
  return (
    <VistaPoliticaRetencion
      filas={panel.filas}
      declaracion={panel.declaracion_contratante}
      notaPurga={panel.nota_purga}
    />
  );
}
