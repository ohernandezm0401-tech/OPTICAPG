'use client';

// SEG-05 (T15) — Política de tratamiento editable y aviso de privacidad generado.
// Sin valores legales de relleno. BORRADOR – requiere revisión jurídica.
import { useEffect, useState } from 'react';

import {
  accionCrearFinalidadOpcional,
  accionGuardarPolitica,
  accionLeerPolitica,
  accionListarPlantillas,
  accionPublicarTexto,
} from '@/app/acciones/autorizaciones';
import { CODIGO_TRATAMIENTO, ROTULO_BORRADOR, type PoliticaTratamiento } from '@/dominio/autorizacion-textos';

const VACIA: PoliticaTratamiento = {
  razon_social: '',
  domicilio: '',
  correo: '',
  telefono: '',
  finalidades: '',
  derechos: '',
  area_pqr: '',
  procedimiento: '',
  vigencia: '',
  url_publica: '',
};

const CAMPOS: { clave: keyof PoliticaTratamiento; etiqueta: string }[] = [
  { clave: 'razon_social', etiqueta: 'Razón social' },
  { clave: 'domicilio', etiqueta: 'Domicilio' },
  { clave: 'correo', etiqueta: 'Correo' },
  { clave: 'telefono', etiqueta: 'Teléfono' },
  { clave: 'finalidades', etiqueta: 'Finalidades' },
  { clave: 'derechos', etiqueta: 'Derechos' },
  { clave: 'area_pqr', etiqueta: 'Área de PQR' },
  { clave: 'procedimiento', etiqueta: 'Procedimiento' },
  { clave: 'vigencia', etiqueta: 'Vigencia' },
  { clave: 'url_publica', etiqueta: 'URL pública' },
];

export function PoliticaTratamientoPanel() {
  const [politica, setPolitica] = useState<PoliticaTratamiento>(VACIA);
  const [aviso, setAviso] = useState('');
  const [texto, setTexto] = useState('');
  const [version, setVersion] = useState<number | null>(null);
  const [codigoOpcional, setCodigoOpcional] = useState('');
  const [etiquetaOpcional, setEtiquetaOpcional] = useState('');
  const [contenidoOpcional, setContenidoOpcional] = useState(`${ROTULO_BORRADOR}\n`);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const leida = await accionLeerPolitica();
      if (leida.ok) {
        setPolitica({
          razon_social: leida.politica.razon_social ?? '',
          domicilio: leida.politica.domicilio ?? '',
          correo: leida.politica.correo ?? '',
          telefono: leida.politica.telefono ?? '',
          finalidades: leida.politica.finalidades ?? '',
          derechos: leida.politica.derechos ?? '',
          area_pqr: leida.politica.area_pqr ?? '',
          procedimiento: leida.politica.procedimiento ?? '',
          vigencia: leida.politica.vigencia ?? '',
          url_publica: leida.politica.url_publica ?? '',
        });
        setAviso(leida.politica.aviso);
      }
      const plantillas = await accionListarPlantillas();
      if (plantillas.ok) {
        const tratamiento = plantillas.plantillas.find((item) => item.codigo === CODIGO_TRATAMIENTO);
        if (tratamiento) {
          setTexto(tratamiento.contenido);
          setVersion(tratamiento.version);
        }
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10" id="politica-tratamiento">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Política de tratamiento</h1>
        <p className="text-sm">{ROTULO_BORRADOR}</p>
      </div>
      {errores.length > 0 ? (
        <ul className="text-sm text-red-600 list-disc pl-5" role="alert">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {mensaje ? (
        <p className="text-sm" role="status">
          {mensaje}
        </p>
      ) : null}

      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          void accionGuardarPolitica(politica).then((respuesta) => {
            if (!respuesta.ok) {
              setErrores(respuesta.errores);
              return;
            }
            setAviso(respuesta.politica.aviso);
            setMensaje('Política guardada. El aviso se generó con los campos escritos; lo vacío queda sin dato configurado.');
            setErrores([]);
          });
        }}
      >
        {CAMPOS.map((campo) => (
          <label key={campo.clave} className="text-sm space-y-1 block" htmlFor={campo.clave}>
            <span>{campo.etiqueta}</span>
            <input
              id={campo.clave}
              className="w-full border border-input rounded-lg px-2 py-2 bg-background"
              value={politica[campo.clave] ?? ''}
              onChange={(evento) => setPolitica((actual) => ({ ...actual, [campo.clave]: evento.target.value }))}
            />
          </label>
        ))}
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
          Guardar política
        </button>
      </form>

      <section className="space-y-2" aria-label="Aviso de privacidad">
        <h2 className="font-semibold">Aviso de privacidad</h2>
        <pre className="text-xs whitespace-pre-wrap border border-border rounded-lg p-3">{aviso}</pre>
      </section>

      <form
        className="space-y-2"
        onSubmit={(evento) => {
          evento.preventDefault();
          void accionPublicarTexto(CODIGO_TRATAMIENTO, texto).then((respuesta) => {
            if (!respuesta.ok) {
              setErrores(respuesta.errores);
              return;
            }
            setVersion(respuesta.texto.version);
            setMensaje(`Nueva versión ${respuesta.texto.version}. Las autorizaciones anteriores conservan su texto.`);
            setErrores([]);
          });
        }}
      >
        <label className="text-sm space-y-1 block" htmlFor="texto-tratamiento">
          <span>Texto de autorización de tratamiento {version ? `(versión vigente ${version})` : ''}</span>
          <textarea
            id="texto-tratamiento"
            className="w-full min-h-40 border border-input rounded-lg px-2 py-2 bg-background"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
          />
        </label>
        <button type="submit" className="border border-input rounded-lg px-3 py-2 text-sm">
          Publicar nueva versión
        </button>
      </form>

      <form
        className="space-y-2 border border-border rounded-lg p-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          void accionCrearFinalidadOpcional(codigoOpcional, etiquetaOpcional, contenidoOpcional).then((respuesta) => {
            if (!respuesta.ok) {
              setErrores(respuesta.errores);
              return;
            }
            setMensaje('Finalidad opcional creada. Queda desmarcada en el registro del paciente.');
            setErrores([]);
          });
        }}
      >
        <h2 className="font-semibold text-sm">Finalidad opcional</h2>
        <label className="text-sm space-y-1 block" htmlFor="codigo-opcional">
          <span>Código</span>
          <input
            id="codigo-opcional"
            className="w-full border border-input rounded-lg px-2 py-2 bg-background"
            value={codigoOpcional}
            onChange={(evento) => setCodigoOpcional(evento.target.value)}
          />
        </label>
        <label className="text-sm space-y-1 block" htmlFor="etiqueta-opcional">
          <span>Etiqueta</span>
          <input
            id="etiqueta-opcional"
            className="w-full border border-input rounded-lg px-2 py-2 bg-background"
            value={etiquetaOpcional}
            onChange={(evento) => setEtiquetaOpcional(evento.target.value)}
          />
        </label>
        <label className="text-sm space-y-1 block" htmlFor="contenido-opcional">
          <span>Texto</span>
          <textarea
            id="contenido-opcional"
            className="w-full min-h-24 border border-input rounded-lg px-2 py-2 bg-background"
            value={contenidoOpcional}
            onChange={(evento) => setContenidoOpcional(evento.target.value)}
          />
        </label>
        <button type="submit" className="border border-input rounded-lg px-3 py-2 text-sm">
          Crear finalidad opcional
        </button>
      </form>
    </div>
  );
}
