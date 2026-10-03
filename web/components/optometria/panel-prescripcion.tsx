'use client';

// OPT-05 (T23) — Formulario de la prescripción. La vigencia nace vacía.
// TODO(Q-18): el profesional la escribe; no hay plazo por defecto.
// BORRADOR – requiere revisión jurídica.
import { useState } from 'react';

const VACIO = {
  prestador_nombre: '',
  direccion: '',
  telefono: '',
  correo: '',
  lugar: '',
  fecha: '',
  paciente_nombre: '',
  paciente_documento: '',
  numero_hc: '',
  tipo_usuario: '',
  dispositivo: '',
  agudeza_visual: '',
  forma_uso: '',
  distancia_pupilar: '',
  filtro: '',
  duracion_tratamiento: '',
  cantidad_num: '',
  cantidad_letras: '',
  indicaciones: '',
  vigencia_hasta: '',
  nombre_prescriptor: '',
  registro_profesional: '',
  tipo: 'lentes_oftalmicos',
};

type Campos = typeof VACIO;

const ETIQUETAS: Record<keyof Campos, string> = {
  prestador_nombre: 'Prestador o profesional',
  direccion: 'Dirección',
  telefono: 'Teléfono',
  correo: 'Correo',
  lugar: 'Lugar',
  fecha: 'Fecha',
  paciente_nombre: 'Paciente',
  paciente_documento: 'Documento del paciente',
  numero_hc: 'Número de historia clínica',
  tipo_usuario: 'Tipo de usuario',
  dispositivo: 'Dispositivo prescrito',
  agudeza_visual: 'Agudeza visual',
  forma_uso: 'Forma de uso',
  distancia_pupilar: 'Distancia pupilar',
  filtro: 'Filtro',
  duracion_tratamiento: 'Duración del tratamiento',
  cantidad_num: 'Cantidad en números',
  cantidad_letras: 'Cantidad en letras',
  indicaciones: 'Indicaciones',
  vigencia_hasta: 'Vigencia',
  nombre_prescriptor: 'Nombre del prescriptor',
  registro_profesional: 'Registro profesional',
  tipo: 'Tipo de prescripción',
};

export function PanelPrescripcion({ atencionInicial }: { atencionInicial: string }) {
  const [atencionId, setAtencionId] = useState(atencionInicial);
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [prescripcionId, setPrescripcionId] = useState('');
  const [numero, setNumero] = useState('');
  const [estado, setEstado] = useState('');
  const [dispensable, setDispensable] = useState('');

  function poner(clave: keyof Campos, valor: string) {
    setCampos((actual) => ({ ...actual, [clave]: valor }));
  }

  async function cargar() {
    setError('');
    const respuesta = await fetch(`/api/prescripciones?atencion_id=${encodeURIComponent(atencionId)}`);
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;
    if (!respuesta.ok) {
      setError(typeof cuerpo.error === 'string' ? cuerpo.error : 'No se pudo cargar la atención.');
      return;
    }
    setCampos((actual) => ({
      ...actual,
      prestador_nombre: String(cuerpo.prestador_nombre ?? ''),
      direccion: String(cuerpo.direccion ?? ''),
      lugar: String(cuerpo.lugar ?? ''),
      fecha: String(cuerpo.fecha ?? ''),
      paciente_nombre: String(cuerpo.paciente_nombre ?? ''),
      numero_hc: String(cuerpo.numero_hc ?? ''),
      tipo_usuario: String(cuerpo.tipo_usuario ?? ''),
      nombre_prescriptor: String(cuerpo.nombre_prescriptor ?? ''),
      registro_profesional: String(cuerpo.registro_profesional ?? ''),
      vigencia_hasta: '',
      cantidad_num: '',
      cantidad_letras: '',
    }));
    setAviso('La vigencia y la cantidad no tienen valor por defecto. Escríbalas usted.');
  }

  function cuerpo() {
    return {
      ...campos,
      atencion_id: atencionId,
      cantidad_num: campos.cantidad_num === '' ? null : Number(campos.cantidad_num),
    };
  }

  function mostrar(fila: {
    id?: string;
    numero?: string | null;
    estado_visible?: string;
    dispensacion?: { dispensable?: boolean; motivo?: string };
  }) {
    setPrescripcionId(fila.id ?? '');
    setNumero(fila.numero ?? '');
    setEstado(fila.estado_visible ?? '');
    const motivo = fila.dispensacion?.motivo ?? '';
    setDispensable(fila.dispensacion?.dispensable ? 'sí' : `no (${motivo})`);
  }

  async function firmar() {
    setError('');
    const respuesta = await fetch('/api/prescripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo()),
    });
    const data = (await respuesta.json()) as { error?: string; id?: string; numero?: string | null; estado_visible?: string; dispensacion?: { dispensable?: boolean; motivo?: string } };
    if (!respuesta.ok) {
      setError(data.error ?? 'No se pudo firmar la prescripción.');
      return;
    }
    mostrar(data);
    setAviso('Prescripción firmada. La dispensación (ASE-07) todavía no existe.');
  }

  async function corregir() {
    setError('');
    const respuesta = await fetch(`/api/prescripciones/${prescripcionId}/corregir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo()),
    });
    const data = (await respuesta.json()) as {
      error?: string;
      nueva?: { id?: string; numero?: string | null; estado_visible?: string; dispensacion?: { dispensable?: boolean; motivo?: string } };
      anterior?: { prescripcion?: { estado_visible?: string } };
    };
    if (!respuesta.ok) {
      setError(data.error ?? 'No se pudo corregir la prescripción.');
      return;
    }
    if (data.nueva) mostrar(data.nueva);
    const visible = data.anterior?.prescripcion?.estado_visible;
    setAviso(visible ? `La anterior quedó ${visible}.` : 'Se creó una prescripción nueva.');
  }

  return (
    <section id="ficha-prescripcion" aria-label="Prescripción" className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Prescripción</h1>
        <p className="text-sm text-muted-foreground">BORRADOR – requiere revisión jurídica</p>
        <p className="text-sm">TODO(Q-18): la vigencia es obligatoria y no tiene valor por defecto.</p>
      </header>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-sm">
          Atención firmada
          <input
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
            value={atencionId}
            onChange={(evento) => setAtencionId(evento.target.value)}
          />
        </label>
        <button type="button" className="self-end rounded-lg border px-3 py-2 text-sm" onClick={() => void cargar()}>
          Cargar atención
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(ETIQUETAS) as (keyof Campos)[]).map((clave) => (
          <label key={clave} className="text-sm">
            {ETIQUETAS[clave]}
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
              aria-label={ETIQUETAS[clave]}
              value={campos[clave]}
              onChange={(evento) => poner(clave, evento.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={() => void firmar()}>
          Firmar prescripción
        </button>
        {prescripcionId ? (
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => void corregir()}>
            Corregir con una nueva
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" data-testid="prescripcion-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {aviso ? <p className="text-sm">{aviso}</p> : null}
      {numero ? (
        <p data-testid="prescripcion-numero" className="text-sm">
          Número {numero}. Estado {estado}.
        </p>
      ) : null}
      {dispensable ? (
        <p data-testid="prescripcion-dispensable" className="text-sm">
          Dispensable: {dispensable}
        </p>
      ) : null}
      {prescripcionId ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <a data-testid="prescripcion-pdf" href={`/api/prescripciones/${prescripcionId}/pdf`}>
            Descargar PDF
          </a>
          <a
            data-testid="prescripcion-imprimir"
            href={`/api/prescripciones/${prescripcionId}/pdf?medio=impresion`}
            target="_blank"
            rel="noreferrer"
          >
            Imprimir
          </a>
        </div>
      ) : null}
    </section>
  );
}
