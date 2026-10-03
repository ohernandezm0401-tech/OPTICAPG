'use client';

// OPT-01 (T20) — Historia por secciones, autoguardado y firma con resumen.
// TODO(Q-25): no hay controles de telemedicina. La modalidad queda en presencial.
// TODO(Q-26): esta pantalla es del optómetra; el auxiliar no firma.
// TODO(Q-22): el sello visible es la línea del servidor, no una TSA externa.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';

import { PanelAdenda } from '@/components/optometria/adenda-atencion';
import { PanelConsentimiento } from '@/components/optometria/panel-consentimiento';
import { PanelCopiaHc } from '@/components/optometria/panel-copia-hc';
import { PanelPrescripcion } from '@/components/optometria/panel-prescripcion';
import type { HistorialProyectado } from '@/dominio/adenda-atencion';
import {
  AUTOGUARDADO_MS,
  CAPTURA_VACIA,
  LIMITES_CAPTURA_PROPUESTOS,
  esquemaCapturaTexto,
  examenDesdeCaptura,
  type CapturaTexto,
  type LimitesCaptura,
} from '@/dominio/valores-opticos';

interface VistaAtencion {
  id: string;
  estado: string;
  modalidad: string;
  folio: number | null;
  firmado_en: string | null;
  hora_bogota: string | null;
  motivo: string;
  antecedentes?: string;
  queratometria?: string;
  salud_ocular?: string;
  sello?: string | null;
  version_borrador?: number;
  examen: Record<string, number | null>;
  diagnostico: { codigo_cie10: string; descripcion: string } | null;
  plan: { conducta: string; recomendaciones?: string | null } | null;
}

const SECCIONES = [
  ['motivo', 'Motivo'],
  ['antecedentes', 'Antecedentes'],
  ['agudeza', 'Agudeza'],
  ['refraccion', 'Refracción'],
  ['queratometria', 'Queratometría'],
  ['salud', 'Salud ocular'],
  ['diagnostico', 'Diagnóstico'],
  ['plan', 'Plan'],
  ['consentimiento', 'Consentimiento'],
  ['prescripcion', 'Prescripción'],
] as const;

const CLASE_CAMPO =
  'mt-1 w-full rounded-md border border-neutral-700 bg-white px-3 py-2 text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-950';

function textoNumero(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}

function capturaDesdeVista(vista: VistaAtencion, pacienteId: string): CapturaTexto {
  return {
    ...CAPTURA_VACIA,
    paciente_id: pacienteId,
    motivo: vista.motivo ?? '',
    antecedentes: vista.antecedentes ?? '',
    agudeza_od: textoNumero(vista.examen.agudeza_od),
    agudeza_oi: textoNumero(vista.examen.agudeza_oi),
    esfera_od: textoNumero(vista.examen.esfera_od),
    cilindro_od: textoNumero(vista.examen.cilindro_od),
    eje_od: textoNumero(vista.examen.eje_od),
    adicion_od: textoNumero(vista.examen.adicion_od),
    esfera_oi: textoNumero(vista.examen.esfera_oi),
    cilindro_oi: textoNumero(vista.examen.cilindro_oi),
    eje_oi: textoNumero(vista.examen.eje_oi),
    adicion_oi: textoNumero(vista.examen.adicion_oi),
    dip: textoNumero(vista.examen.dip),
    queratometria: vista.queratometria ?? '',
    salud_ocular: vista.salud_ocular ?? '',
    codigo_cie10: vista.diagnostico?.codigo_cie10 ?? '',
    conducta: vista.plan?.conducta ?? '',
    recomendaciones: vista.plan?.recomendaciones ?? '',
  };
}

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  const errorId = error ? `error-${id}` : undefined;
  const ayudaId = ayuda ? `ayuda-${id}` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-950">
        {etiqueta}
      </label>
      {children}
      {ayuda ? (
        <p id={ayudaId} className="mt-1 text-sm text-neutral-800">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FichaAtencion({ limitesIniciales = LIMITES_CAPTURA_PROPUESTOS }: { limitesIniciales?: LimitesCaptura }) {
  const [limites, setLimites] = useState(limitesIniciales);
  const limitesRef = useRef(limites);
  const [atencionId, setAtencionId] = useState<string | null>(null);
  const atencionIdRef = useRef<string | null>(null);
  const [estado, setEstado] = useState('borrador');
  const [folio, setFolio] = useState<number | null>(null);
  const [horaServidor, setHoraServidor] = useState<string | null>(null);
  const [horaBogota, setHoraBogota] = useState<string | null>(null);
  const [sello, setSello] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState(false);
  const [marcas, setMarcas] = useState<Record<string, string>>({});
  const alHistorial = useCallback((historial: HistorialProyectado) => {
    setMarcas(historial.marcas);
  }, []);
  const ultimo = useRef('');
  const temporizador = useRef<number | undefined>(undefined);
  const epoca = useRef(0);
  const confirmarRef = useRef<HTMLButtonElement>(null);
  const pacienteInicial = useRef('');

  const resolver = useCallback<Resolver<CapturaTexto>>(
    async (values, context, options) =>
      zodResolver(esquemaCapturaTexto(limitesRef.current))(values, context, options),
    [],
  );

  const {
    register,
    reset,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<CapturaTexto>({
    defaultValues: CAPTURA_VACIA,
    mode: 'onChange',
    resolver,
  });

  const firmada = estado === 'firmado';
  const firmadaRef = useRef(firmada);
  const registroCodigo = register('codigo_cie10');

  useEffect(() => {
    limitesRef.current = limites;
    firmadaRef.current = firmada;
  }, [limites, firmada]);

  function aplicarVista(vista: VistaAtencion, pacienteId = pacienteInicial.current) {
    if (pacienteId) pacienteInicial.current = pacienteId;
    const captura = capturaDesdeVista(vista, pacienteInicial.current);
    atencionIdRef.current = vista.id;
    setAtencionId(vista.id);
    setEstado(vista.estado);
    setFolio(vista.folio);
    setHoraServidor(vista.firmado_en);
    setHoraBogota(vista.hora_bogota);
    setSello(vista.sello ?? null);
    setVersion(vista.version_borrador ?? null);
    setMarcas({});
    reset(captura);
    ultimo.current = JSON.stringify(captura);
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    void fetch('/api/limites-captura')
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const cuerpo = (await respuesta.json()) as { limites?: LimitesCaptura };
        if (cuerpo.limites) setLimites(cuerpo.limites);
      })
      .catch(() => undefined);
    if (!id) return;
    void fetch(`/api/atenciones/${id}`)
      .then(async (respuesta) => {
        const cuerpo = (await respuesta.json()) as VistaAtencion & { error?: string };
        if (!respuesta.ok) {
          setError(cuerpo.error ?? 'No se pudo abrir la atención.');
          return;
        }
        aplicarVista(cuerpo);
      })
      .catch(() => setError('No se pudo abrir la atención.'));
    // La carga inicial no depende del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resumen) confirmarRef.current?.focus();
  }, [resumen]);

  async function persistir(valores: CapturaTexto, silencioso: boolean) {
    if (firmadaRef.current) return;
    const marca = epoca.current;
    const serial = JSON.stringify(valores);
    if (serial === ultimo.current) return;
    const validacion = esquemaCapturaTexto(limitesRef.current).safeParse(valores);
    if (!validacion.success) {
      if (!silencioso) {
        setMensaje(null);
        setError(validacion.error.issues[0]?.message ?? 'Revise los datos de la atención.');
      }
      return;
    }
    const armado = examenDesdeCaptura(valores);
    if ('error' in armado) {
      if (!silencioso) setError(armado.error);
      return;
    }
    const cuerpo = {
      paciente_id: valores.paciente_id.trim(),
      tipo: 'primera_vez' as const,
      modalidad: 'presencial' as const,
      motivo: valores.motivo.trim(),
      antecedentes: { texto: valores.antecedentes.trim() },
      queratometria: { texto: valores.queratometria.trim() },
      salud_ocular: { texto: valores.salud_ocular.trim() },
      examen: armado.examen,
      diagnostico: { codigo_cie10: valores.codigo_cie10.trim().toUpperCase() },
      plan: {
        conducta: valores.conducta.trim(),
        recomendaciones: valores.recomendaciones.trim() || null,
      },
    };
    const id = atencionIdRef.current;
    const respuesta = await fetch(id ? `/api/atenciones/${id}` : '/api/atenciones', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        id
          ? {
              motivo: cuerpo.motivo,
              antecedentes: cuerpo.antecedentes,
              queratometria: cuerpo.queratometria,
              salud_ocular: cuerpo.salud_ocular,
              examen: cuerpo.examen,
              diagnostico: cuerpo.diagnostico,
              plan: cuerpo.plan,
            }
          : cuerpo,
      ),
    });
    const json = (await respuesta.json()) as VistaAtencion & { error?: string };
    if (marca !== epoca.current || firmadaRef.current) return;
    if (!respuesta.ok) {
      setMensaje(null);
      setError(json.error ?? 'No se pudo guardar la atención.');
      return;
    }
    pacienteInicial.current = valores.paciente_id.trim();
    aplicarVista(json, pacienteInicial.current);
    setError(null);
    setMensaje(silencioso ? 'Autoguardado.' : 'Borrador guardado.');
  }

  function programarAutoguardado() {
    if (firmadaRef.current) return;
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      void persistir(getValues(), true);
    }, AUTOGUARDADO_MS);
  }

  async function pedirFirma() {
    if (firmada || !atencionIdRef.current) {
      setError('Guarde un borrador válido antes de firmar.');
      return;
    }
    const ok = await trigger();
    if (!ok) {
      setError('Revise los campos marcados antes de firmar.');
      return;
    }
    setError(null);
    setResumen(true);
  }

  async function confirmarFirma() {
    const id = atencionIdRef.current;
    if (!id || firmada) return;
    setError(null);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    epoca.current += 1;
    firmadaRef.current = true;
    const respuesta = await fetch(`/api/atenciones/${id}/firmar`, { method: 'POST' });
    const json = (await respuesta.json()) as VistaAtencion & { error?: string };
    if (!respuesta.ok) {
      firmadaRef.current = false;
      setResumen(false);
      setError(json.error ?? 'No se pudo firmar la atención.');
      return;
    }
    aplicarVista(json, pacienteInicial.current);
    setResumen(false);
    setMensaje('Atención firmada.');
  }

  function descrito(id: string, ayuda: boolean): string | undefined {
    const partes = [ayuda ? `ayuda-${id}` : '', errors[id as keyof CapturaTexto] ? `error-${id}` : ''].filter(Boolean);
    return partes.length > 0 ? partes.join(' ') : undefined;
  }

  const valores = getValues();
  const bloqueado = firmada;

  return (
    <div id="ficha-atencion" className="mx-auto max-w-3xl space-y-6 bg-white pb-10 text-neutral-950">
      <header className="space-y-1">
        <h1 id="titulo-atencion" className="text-2xl font-bold">
          Atención de optometría
        </h1>
        <p className="text-sm">
          Modalidad: <span data-testid="modalidad-atencion">Presencial</span>
        </p>
        {folio != null ? <p data-testid="folio-atencion">Folio {folio}</p> : null}
        {horaServidor ? <p data-testid="hora-servidor">Hora del servidor: {horaServidor}</p> : null}
        {horaBogota ? <p data-testid="hora-bogota">Hora en Bogotá: {horaBogota}</p> : null}
        {sello ? <p data-testid="sello-atencion">{sello}</p> : null}
        {version != null && !firmada ? <p>Versión del borrador: {version}</p> : null}
        {firmada ? <p>La atención firmada es de solo lectura.</p> : null}
        {atencionId ? (
          <p data-testid="atencion-id" className="text-sm">
            Atención {atencionId}
          </p>
        ) : null}
      </header>

      <nav aria-label="Secciones de la historia clínica" className="flex flex-wrap gap-2">
        {SECCIONES.map(([id, titulo]) => (
          <a
            key={id}
            href={`#seccion-${id}`}
            className="rounded-md border border-neutral-700 bg-white px-3 py-1 text-sm font-medium text-neutral-950 underline focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950"
          >
            {titulo}
          </a>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="rounded-md border border-red-900 bg-red-50 px-3 py-2 text-sm text-red-950">
          {error}
        </p>
      ) : null}
      {mensaje ? (
        <p role="status" className="rounded-md border border-neutral-700 bg-neutral-50 px-3 py-2 text-sm text-neutral-950">
          {mensaje}
        </p>
      ) : null}

      <form
        aria-labelledby="titulo-atencion"
        noValidate
        inert={resumen}
        onInput={programarAutoguardado}
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const ok = await trigger();
            if (!ok) {
              const validacion = esquemaCapturaTexto(limitesRef.current).safeParse(getValues());
              setMensaje(null);
              setError(validacion.success ? 'Revise los datos de la atención.' : (validacion.error.issues[0]?.message ?? 'Revise los datos de la atención.'));
              return;
            }
            await persistir(getValues(), false);
          })();
        }}
        className="space-y-6"
      >
        <section id="seccion-motivo" aria-labelledby="titulo-motivo" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-motivo" className="text-lg font-semibold">
            Motivo
          </h2>
          <Campo id="paciente_id" etiqueta="Paciente" error={errors.paciente_id?.message}>
            <input
              id="paciente_id"
              autoComplete="off"
              disabled={bloqueado || Boolean(atencionId)}
              aria-invalid={Boolean(errors.paciente_id)}
              aria-describedby={descrito('paciente_id', false)}
              className={CLASE_CAMPO}
              {...register('paciente_id')}
            />
          </Campo>
          <Campo id="motivo" etiqueta="Motivo de consulta" error={errors.motivo?.message}>
            <textarea
              id="motivo"
              rows={3}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.motivo)}
              aria-describedby={descrito('motivo', false)}
              className={CLASE_CAMPO}
              {...register('motivo')}
            />
          </Campo>
        </section>

        <section id="seccion-antecedentes" aria-labelledby="titulo-antecedentes" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-antecedentes" className="text-lg font-semibold">
            Antecedentes
          </h2>
          <Campo id="antecedentes" etiqueta="Antecedentes" error={errors.antecedentes?.message}>
            <textarea
              id="antecedentes"
              rows={3}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.antecedentes)}
              aria-describedby={descrito('antecedentes', false)}
              className={CLASE_CAMPO}
              {...register('antecedentes')}
            />
          </Campo>
        </section>

        <section id="seccion-agudeza" aria-labelledby="titulo-agudeza" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-agudeza" className="text-lg font-semibold">
            Agudeza
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="agudeza_od"
              etiqueta="Agudeza ojo derecho"
              error={errors.agudeza_od?.message}
              ayuda={`Límite de captura: ${limites.agudeza.min} a ${limites.agudeza.max}.`}
            >
              <input
                id="agudeza_od"
                inputMode="decimal"
                disabled={bloqueado}
                aria-invalid={Boolean(errors.agudeza_od)}
                aria-describedby={descrito('agudeza_od', true)}
                className={CLASE_CAMPO}
                {...register('agudeza_od')}
              />
            </Campo>
            <Campo
              id="agudeza_oi"
              etiqueta="Agudeza ojo izquierdo"
              error={errors.agudeza_oi?.message}
              ayuda={`Límite de captura: ${limites.agudeza.min} a ${limites.agudeza.max}.`}
            >
              <input
                id="agudeza_oi"
                inputMode="decimal"
                disabled={bloqueado}
                aria-invalid={Boolean(errors.agudeza_oi)}
                aria-describedby={descrito('agudeza_oi', true)}
                className={CLASE_CAMPO}
                {...register('agudeza_oi')}
              />
            </Campo>
          </div>
        </section>

        <section id="seccion-refraccion" aria-labelledby="titulo-refraccion" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-refraccion" className="text-lg font-semibold">
            Refracción
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['esfera_od', 'Esfera ojo derecho', limites.esfera],
                ['cilindro_od', 'Cilindro ojo derecho', limites.cilindro],
                ['eje_od', 'Eje ojo derecho', limites.eje],
                ['adicion_od', 'Adición ojo derecho', limites.adicion],
                ['esfera_oi', 'Esfera ojo izquierdo', limites.esfera],
                ['cilindro_oi', 'Cilindro ojo izquierdo', limites.cilindro],
                ['eje_oi', 'Eje ojo izquierdo', limites.eje],
                ['adicion_oi', 'Adición ojo izquierdo', limites.adicion],
                ['dip', 'DIP binocular (mm)', limites.dip],
              ] as const
            ).map(([id, etiqueta, rango]) => (
              <Campo
                key={id}
                id={id}
                etiqueta={etiqueta}
                error={errors[id]?.message}
                ayuda={`Límite de captura: ${rango.min} a ${rango.max}.`}
              >
                <input
                  id={id}
                  inputMode="decimal"
                  disabled={bloqueado}
                  data-testid={id === 'eje_od' ? 'limite-eje' : undefined}
                  aria-invalid={Boolean(errors[id])}
                  aria-describedby={descrito(id, true)}
                  className={CLASE_CAMPO}
                  {...register(id)}
                />
                {marcas[id] ? (
                  <p data-testid={`marca-${id}`} className="mt-1 text-sm">
                    {marcas[id]}
                  </p>
                ) : null}
              </Campo>
            ))}
          </div>
        </section>

        <section id="seccion-queratometria" aria-labelledby="titulo-queratometria" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-queratometria" className="text-lg font-semibold">
            Queratometría
          </h2>
          <Campo id="queratometria" etiqueta="Queratometría" error={errors.queratometria?.message}>
            <textarea
              id="queratometria"
              rows={2}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.queratometria)}
              aria-describedby={descrito('queratometria', false)}
              className={CLASE_CAMPO}
              {...register('queratometria')}
            />
          </Campo>
        </section>

        <section id="seccion-salud" aria-labelledby="titulo-salud" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-salud" className="text-lg font-semibold">
            Salud ocular
          </h2>
          <Campo id="salud_ocular" etiqueta="Salud ocular" error={errors.salud_ocular?.message}>
            <textarea
              id="salud_ocular"
              rows={3}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.salud_ocular)}
              aria-describedby={descrito('salud_ocular', false)}
              className={CLASE_CAMPO}
              {...register('salud_ocular')}
            />
          </Campo>
        </section>

        <section id="seccion-diagnostico" aria-labelledby="titulo-diagnostico" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-diagnostico" className="text-lg font-semibold">
            Diagnóstico
          </h2>
          <Campo id="codigo_cie10" etiqueta="Código CIE-10 principal" error={errors.codigo_cie10?.message}>
            <input
              id="codigo_cie10"
              autoComplete="off"
              spellCheck={false}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.codigo_cie10)}
              aria-describedby={descrito('codigo_cie10', false)}
              className={CLASE_CAMPO}
              {...registroCodigo}
              onChange={(event) => {
                event.target.value = event.target.value.toUpperCase();
                void registroCodigo.onChange(event);
              }}
            />
          </Campo>
        </section>

        <section id="seccion-plan" aria-labelledby="titulo-plan" className="space-y-3 rounded-md border border-neutral-300 p-4">
          <h2 id="titulo-plan" className="text-lg font-semibold">
            Plan
          </h2>
          <Campo id="conducta" etiqueta="Conducta" error={errors.conducta?.message}>
            <textarea
              id="conducta"
              rows={3}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.conducta)}
              aria-describedby={descrito('conducta', false)}
              className={CLASE_CAMPO}
              {...register('conducta')}
            />
          </Campo>
          <Campo id="recomendaciones" etiqueta="Recomendaciones" error={errors.recomendaciones?.message}>
            <textarea
              id="recomendaciones"
              rows={2}
              disabled={bloqueado}
              aria-invalid={Boolean(errors.recomendaciones)}
              aria-describedby={descrito('recomendaciones', false)}
              className={CLASE_CAMPO}
              {...register('recomendaciones')}
            />
          </Campo>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={bloqueado}
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:bg-neutral-300 disabled:text-neutral-950"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => void pedirFirma()}
            disabled={bloqueado || !atencionId}
            className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950 disabled:border-neutral-400 disabled:bg-neutral-200 disabled:text-neutral-950"
          >
            Firmar atención
          </button>
        </div>
      </form>

      <PanelConsentimiento atencionId={atencionId} />

      <PanelCopiaHc />

      <section id="seccion-prescripcion" aria-labelledby="titulo-prescripcion" className="space-y-3 rounded-md border border-neutral-300 p-4">
        <h2 id="titulo-prescripcion" className="text-lg font-semibold">
          Prescripción
        </h2>
        {firmada && atencionId ? (
          <PanelPrescripcion atencionInicial={atencionId} />
        ) : (
          <p className="text-sm">La prescripción se escribe después de firmar la atención.</p>
        )}
      </section>

      {firmada && atencionId ? <PanelAdenda atencionId={atencionId} onHistorial={alHistorial} /> : null}

      {resumen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-resumen"
          className="rounded-md border border-neutral-800 bg-white p-4 text-neutral-950"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setResumen(false);
          }}
        >
          <h2 id="titulo-resumen" className="text-lg font-semibold">
            Resumen antes de firmar
          </h2>
          <p className="mt-2 text-sm">Al confirmar, la atención queda de solo lectura y recibe folio, hora del servidor y sello.</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div>
              <dt className="font-medium">Motivo</dt>
              <dd>{valores.motivo}</dd>
            </div>
            <div>
              <dt className="font-medium">Antecedentes</dt>
              <dd>{valores.antecedentes || 'Sin registro'}</dd>
            </div>
            <div>
              <dt className="font-medium">Agudeza ojo derecho</dt>
              <dd>{valores.agudeza_od || 'Sin registro'}</dd>
            </div>
            <div>
              <dt className="font-medium">Eje ojo derecho</dt>
              <dd>{valores.eje_od || 'Sin registro'}</dd>
            </div>
            <div>
              <dt className="font-medium">Queratometría</dt>
              <dd>{valores.queratometria || 'Sin registro'}</dd>
            </div>
            <div>
              <dt className="font-medium">Salud ocular</dt>
              <dd>{valores.salud_ocular || 'Sin registro'}</dd>
            </div>
            <div>
              <dt className="font-medium">CIE-10</dt>
              <dd>{valores.codigo_cie10}</dd>
            </div>
            <div>
              <dt className="font-medium">Conducta</dt>
              <dd>{valores.conducta}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              ref={confirmarRef}
              type="button"
              onClick={() => void confirmarFirma()}
              className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-950"
            >
              Confirmar firma
            </button>
            <button
              type="button"
              onClick={() => setResumen(false)}
              className="rounded-md border border-neutral-700 bg-white px-4 py-2 text-sm font-semibold text-neutral-950"
            >
              Volver al borrador
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
