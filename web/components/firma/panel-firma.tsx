'use client';

import React, { useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { PadPaciente } from '@/components/firma/pad-paciente';

interface Estado {
  puede_firmar?: boolean;
  motivo?: string | null;
  mfa_reciente?: boolean;
  tarjeta_vigente?: boolean;
  aviso?: string;
  error?: string;
}

export function PanelFirma() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [documentoId, setDocumentoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [codigo, setCodigo] = useState('');
  const [trazo, setTrazo] = useState<{ pngBase64: string; puntos: unknown } | null>(null);
  const [acuerdo, setAcuerdo] = useState(false);
  const [nombre, setNombre] = useState('Paciente Sintético');
  const [documento, setDocumento] = useState('900000014');

  async function post(cuerpo: Record<string, unknown>) {
    const respuesta = await fetch('/api/firma', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const json = (await respuesta.json()) as { error?: string; id?: string; codigo?: string; aviso?: string };
    if (!respuesta.ok) {
      setMensaje(json.error ?? 'No se pudo completar la firma.');
      return null;
    }
    setMensaje(json.aviso ?? '');
    return json;
  }

  async function cargarEstado() {
    const respuesta = await fetch('/api/firma');
    const json = (await respuesta.json()) as Estado;
    setEstado(json);
    if (json.error) setMensaje(json.error);
  }

  React.useEffect(() => {
    void cargarEstado();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <PageHeader
        title="Firma electrónica de ejemplo"
        subtitle="Documento sintético. No es una historia clínica, una prescripción ni un consentimiento. BORRADOR – requiere revisión jurídica. PDF/A no garantizado."
      />
      <p className="text-sm text-muted-foreground" role="status">
        {estado?.aviso}
        {estado?.motivo === 'mfa_reciente' ? ' Firmar exige un segundo factor reciente.' : ''}
        {estado?.tarjeta_vigente === true
          ? ''
          : ' Sin registro profesional vigente no puede firmar.'}
      </p>
      {mensaje ? (
        <p className="text-sm" role="alert">
          {mensaje}
        </p>
      ) : null}

      <button
        type="button"
        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        onClick={() =>
          void post({
            accion: 'crear',
            titulo: 'Ejemplo sintético de sellado',
            cuerpo: 'Texto de ejemplo sin datos reales de pacientes.',
          }).then((json) => {
            if (json?.id) setDocumentoId(json.id);
          })
        }
      >
        Crear documento de ejemplo
      </button>

      <p className="text-sm">Documento: {documentoId || 'aún no creado'}</p>

      {estado?.tarjeta_vigente === true ? (
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => void post({ accion: 'profesional', documento_id: documentoId || '00000000-0000-4000-8000-000000000000' })}
        >
          Firmar como profesional
        </button>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!trazo) {
            setMensaje('Falta el trazo de la firma.');
            return;
          }
          void post({
            accion: 'paciente',
            documento_id: documentoId,
            trazo_png_base64: trazo.pngBase64,
            trazo_puntos: trazo.puntos,
            nombre,
            documento,
            otp: codigo || null,
            acuerdo_aceptado: acuerdo,
          });
        }}
      >
        <PadPaciente onChange={setTrazo} />
        <label className="block text-sm">
          Nombre del paciente
          <input className="mt-1 w-full rounded-md border px-2 py-1" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block text-sm">
          Documento
          <input className="mt-1 w-full rounded-md border px-2 py-1" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={acuerdo} onChange={(e) => setAcuerdo(e.target.checked)} />
          Acepto el acuerdo de uso de firma electrónica. BORRADOR – requiere revisión jurídica.
        </label>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() =>
            void post({ accion: 'otp', documento_id: documentoId }).then((json) => {
              if (json && 'codigo' in json && json.codigo) setCodigo(String(json.codigo));
            })
          }
        >
          Generar código OTP de prueba
        </button>
        <label className="block text-sm">
          Código OTP
          <input className="mt-1 w-full rounded-md border px-2 py-1" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" />
        </label>
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">
          Guardar firma del paciente
        </button>
      </form>

      <button
        type="button"
        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        onClick={() => void post({ accion: 'sellar', documento_id: documentoId })}
      >
        Sellar PDF
      </button>
    </div>
  );
}
