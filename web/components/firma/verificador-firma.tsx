'use client';

import React, { useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';

export function VerificadorFirma() {
  const [mensaje, setMensaje] = useState('Suba el PDF sellado para compararlo con el registro del tenant.');
  const [valido, setValido] = useState<boolean | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const respuesta = await fetch('/api/firma/verificar', { method: 'POST', body: datos });
    const json = (await respuesta.json()) as { valido?: boolean; error?: string };
    if (!respuesta.ok) {
      setValido(false);
      setMensaje(json.error ?? 'No se pudo verificar el documento.');
      return;
    }
    setValido(json.valido === true);
    setMensaje(
      json.valido
        ? 'El PDF coincide con el hash registrado.'
        : 'La verificación falló: el PDF no coincide con el registro.',
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <PageHeader
        title="Verificador de documentos"
        subtitle="Compara el PDF subido con el hash SHA-256 del registro. Uso interno del tenant. PDF/A no garantizado."
      />
      <form onSubmit={enviar} className="space-y-3">
        <label className="block text-sm">
          PDF
          <input name="pdf" type="file" accept="application/pdf" required className="mt-1 block text-sm" />
        </label>
        <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
          Verificar
        </button>
      </form>
      <p role="status" data-valido={valido === null ? '' : String(valido)}>
        {mensaje}
      </p>
    </div>
  );
}
