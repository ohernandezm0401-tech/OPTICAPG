'use client';

import React, { useState } from 'react';
import Link from 'next/link';

import { PageHeader } from '@/components/shared/page-header';

interface FilaVista {
  id: string;
  ts_bogota: string;
  actor_id: string | null;
  rol: string | null;
  sede_id: string | null;
  recurso: string;
  recurso_id: string | null;
  accion: string;
  resultado: string;
  hash: string;
}

export default function PaginaAuditoria() {
  const [recurso, setRecurso] = useState('');
  const [accion, setAccion] = useState('');
  const [filas, setFilas] = useState<FilaVista[]>([]);
  const [puedeExportar, setPuedeExportar] = useState(false);
  const [mensaje, setMensaje] = useState('Consultando la bitácora…');
  const [consultado, setConsultado] = useState(false);

  async function consultar(evento?: React.FormEvent) {
    evento?.preventDefault();
    const params = new URLSearchParams();
    if (recurso.trim()) params.set('recurso', recurso.trim());
    if (accion.trim()) params.set('accion', accion.trim());
    const respuesta = await fetch(`/api/auditoria?${params.toString()}`);
    const cuerpo = (await respuesta.json()) as { filas?: FilaVista[]; puedeExportar?: boolean; error?: string };
    if (!respuesta.ok) {
      setFilas([]);
      setPuedeExportar(false);
      setMensaje(cuerpo.error ?? 'No se pudo consultar la bitácora.');
      setConsultado(true);
      return;
    }
    setFilas(cuerpo.filas ?? []);
    setPuedeExportar(Boolean(cuerpo.puedeExportar));
    setMensaje(cuerpo.filas && cuerpo.filas.length > 0 ? '' : 'No hay eventos para este filtro.');
    setConsultado(true);
  }

  React.useEffect(() => {
    void consultar();
    // La primera carga usa los filtros vacíos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paramsExportar = new URLSearchParams();
  if (recurso.trim()) paramsExportar.set('recurso', recurso.trim());
  if (accion.trim()) paramsExportar.set('accion', accion.trim());

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <PageHeader
        title="Bitácora de auditoría"
        subtitle="Quién consultó o cambió un recurso, con la sede y el resultado. No incluye el contenido clínico: solo referencias y el hash de la cadena."
        actions={
          puedeExportar ? (
            <Link
              href={`/api/auditoria/csv?${paramsExportar.toString()}`}
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Exportar CSV
            </Link>
          ) : null
        }
      />

      <form onSubmit={consultar} className="flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          Recurso
          <input
            value={recurso}
            onChange={(evento) => setRecurso(evento.target.value)}
            className="mt-1 block rounded-md border border-border bg-card px-3 py-2"
            placeholder="R3"
          />
        </label>
        <label className="text-sm">
          Acción
          <input
            value={accion}
            onChange={(evento) => setAccion(evento.target.value)}
            className="mt-1 block rounded-md border border-border bg-card px-3 py-2"
            placeholder="lectura"
          />
        </label>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-semibold">
          Filtrar
        </button>
      </form>

      {mensaje ? <p className="text-sm text-muted-foreground">{mensaje}</p> : null}

      {consultado && filas.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Fecha (Bogotá)</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Sede</th>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Id</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Resultado</th>
                <th className="px-3 py-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{fila.ts_bogota}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fila.actor_id ?? '—'}</td>
                  <td className="px-3 py-2">{fila.rol ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fila.sede_id ?? '—'}</td>
                  <td className="px-3 py-2">{fila.recurso}</td>
                  <td className="px-3 py-2 font-mono text-xs">{fila.recurso_id ?? '—'}</td>
                  <td className="px-3 py-2">{fila.accion}</td>
                  <td className="px-3 py-2">{fila.resultado}</td>
                  <td className="px-3 py-2 font-mono text-xs" title={fila.hash}>
                    {fila.hash.slice(0, 12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
