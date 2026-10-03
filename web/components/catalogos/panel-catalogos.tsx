'use client';

// OPT-10 (T18) — Búsqueda de CIE-10/CUPS y glosario editable. UI en español.
// TODO(Q-23): no hay catálogo oficial embebido.
import { useEffect, useState, type FormEvent } from 'react';

import {
  accionBuscarCatalogo,
  accionEliminarAbreviatura,
  accionGuardarAbreviatura,
  accionListarGlosario,
  accionRevisarAbreviaturas,
  accionSembrarGlosario,
} from '@/app/acciones/catalogos';
type TipoCatalogo = 'cie10' | 'cups';

interface FilaCatalogo {
  codigo: string;
  descripcion: string;
  version: string;
  vigente_desde: string;
}

interface FilaGlosario {
  id: string;
  abreviatura: string;
  expansion: string;
}

export function PanelCatalogos() {
  const [tipo, setTipo] = useState<TipoCatalogo>('cie10');
  const [consulta, setConsulta] = useState('');
  const [resultados, setResultados] = useState<FilaCatalogo[]>([]);
  const [eligio, setEligio] = useState<FilaCatalogo | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [glosario, setGlosario] = useState<FilaGlosario[]>([]);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [abreviatura, setAbreviatura] = useState('');
  const [expansion, setExpansion] = useState('');
  const [errorGlosario, setErrorGlosario] = useState<string | null>(null);
  const [nota, setNota] = useState('AV 20/20 en OD. XYZ sin definir.');
  const [advertencias, setAdvertencias] = useState<{ abreviatura: string; mensaje: string }[]>([]);
  const [conservado, setConservado] = useState<string | null>(null);

  async function recargarGlosario() {
    const data = await accionListarGlosario();
    if (!data.ok) {
      setErrorGlosario(data.mensaje ?? 'No se pudo leer el glosario.');
      return;
    }
    setGlosario(data.filas);
    setPuedeEditar(data.puedeEditar);
  }

  useEffect(() => {
    void recargarGlosario();
  }, []);

  useEffect(() => {
    const q = consulta.trim();
    if (q.length < 1) {
      setResultados([]);
      setErrorBusqueda(null);
      return;
    }
    const id = setTimeout(() => {
      void accionBuscarCatalogo({ tipo, consulta: q }).then((data) => {
        if (!data.ok) {
          setResultados([]);
          setErrorBusqueda(data.mensaje ?? 'No se pudo buscar.');
          return;
        }
        setErrorBusqueda(null);
        setResultados(data.filas);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [consulta, tipo]);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    setErrorGlosario(null);
    const data = await accionGuardarAbreviatura({ abreviatura, expansion });
    if (!data.ok) {
      setErrorGlosario(data.mensaje ?? 'No se pudo guardar.');
      return;
    }
    setGlosario(data.filas);
    setAbreviatura('');
    setExpansion('');
  }

  async function sembrar() {
    setErrorGlosario(null);
    const data = await accionSembrarGlosario();
    if (!data.ok) {
      setErrorGlosario(data.mensaje ?? 'No se pudo agregar el glosario inicial.');
      return;
    }
    setGlosario(data.filas);
  }

  async function quitar(id: string) {
    const data = await accionEliminarAbreviatura(id);
    if (!data.ok) {
      setErrorGlosario(data.mensaje ?? 'No se pudo quitar la abreviatura.');
      return;
    }
    setGlosario(data.filas);
  }

  async function revisar() {
    setConservado(null);
    const data = await accionRevisarAbreviaturas(nota);
    if (!data.ok) {
      setAdvertencias([]);
      setErrorGlosario(data.mensaje ?? 'No se pudo revisar el texto.');
      return;
    }
    setAdvertencias(data.advertencias);
  }

  function conservar() {
    const cantidad = advertencias.length;
    setConservado(
      cantidad === 0
        ? 'Texto conservado. No hay advertencias.'
        : `Texto conservado. Hay ${cantidad} advertencia${cantidad === 1 ? '' : 's'} no bloqueante${cantidad === 1 ? '' : 's'}.`,
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Catálogos clínicos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CIE-10 y CUPS se cargan desde un archivo local que usted descarga. La fuente prevista es la que publica el
          Ministerio de Salud y la Protección Social a través de SISPRO. La licencia de uso sigue pendiente
          (TODO Q-23): este repositorio no incluye el catálogo oficial.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Comando de carga, con el rol de administración de la base:{' '}
          <code className="rounded bg-muted px-1">npm run catalogos:cargar -- archivo.csv</code>
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-busqueda">
        <h2 id="titulo-busqueda" className="text-lg font-semibold">
          Buscar código o descripción
        </h2>
        <div className="flex gap-2">
          <label className="text-sm">
            Catálogo
            <select
              className="mt-1 block rounded-md border border-border bg-background px-3 py-2"
              value={tipo}
              onChange={(event) => setTipo(event.target.value as TipoCatalogo)}
            >
              <option value="cie10">CIE-10</option>
              <option value="cups">CUPS</option>
            </select>
          </label>
          <label className="block flex-1 text-sm">
            Código o descripción
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={consulta}
              onChange={(event) => {
                setConsulta(event.target.value);
                setEligio(null);
              }}
              role="combobox"
              aria-expanded={resultados.length > 0}
              aria-controls="lista-catalogo"
              aria-autocomplete="list"
              placeholder="Por ejemplo, H52.1"
            />
          </label>
        </div>
        {errorBusqueda ? <p className="text-sm text-destructive">{errorBusqueda}</p> : null}
        {resultados.length > 0 ? (
          <ul id="lista-catalogo" role="listbox" className="rounded-md border border-border bg-card">
            {resultados.map((fila) => (
              <li key={`${fila.codigo}-${fila.version}`} role="option" aria-selected={eligio?.codigo === fila.codigo}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setEligio(fila);
                    setConsulta(fila.codigo);
                    setResultados([]);
                  }}
                >
                  <span className="font-semibold">{fila.codigo}</span>
                  <span className="text-sm text-muted-foreground">{fila.descripcion}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {eligio ? (
          <p className="text-sm" data-testid="codigo-elegido">
            Código {eligio.codigo}: {eligio.descripcion} (versión {eligio.version})
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-glosario">
        <h2 id="titulo-glosario" className="text-lg font-semibold">
          Glosario de abreviaturas
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada óptica edita sus abreviaturas (AV, OD, OI, DIP, ADD y las que agregue). Una abreviatura fuera del
          glosario avisa y no impide continuar.
        </p>
        {puedeEditar ? (
          <>
            <button type="button" className="w-fit rounded-md border border-border px-3 py-2 text-sm" onClick={() => void sembrar()}>
              Agregar abreviaturas iniciales
            </button>
            <form className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]" onSubmit={(event) => void guardar(event)}>
              <label className="text-sm">
                Abreviatura
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 uppercase"
                  value={abreviatura}
                  onChange={(event) => setAbreviatura(event.target.value.toUpperCase())}
                  maxLength={6}
                  required
                />
              </label>
              <label className="text-sm">
                Significado
                <input
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                  value={expansion}
                  onChange={(event) => setExpansion(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="self-end rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                Guardar
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Solo el administrador de la óptica puede editar el glosario.</p>
        )}
        {errorGlosario ? <p className="text-sm text-destructive">{errorGlosario}</p> : null}
        {glosario.length === 0 ? (
          <p className="text-sm">Todavía no hay abreviaturas en esta óptica.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {glosario.map((fila) => (
              <li key={fila.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span>
                  <strong>{fila.abreviatura}</strong> — {fila.expansion}
                </span>
                {puedeEditar ? (
                  <button type="button" className="text-destructive" onClick={() => void quitar(fila.id)}>
                    Quitar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="titulo-nota">
        <h2 id="titulo-nota" className="text-lg font-semibold">
          Revisar abreviaturas del texto
        </h2>
        <label className="text-sm">
          Nota clínica
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
            value={nota}
            onChange={(event) => {
              setNota(event.target.value);
              setConservado(null);
            }}
          />
        </label>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => void revisar()}>
            Revisar
          </button>
          <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={conservar}>
            Conservar texto
          </button>
        </div>
        <div role="status" aria-live="polite" className="flex flex-col gap-1">
          {advertencias.map((item) => (
            <p key={item.abreviatura} className="text-sm text-amber-700 dark:text-amber-400">
              {item.mensaje}
            </p>
          ))}
          {conservado ? <p className="text-sm">{conservado}</p> : null}
        </div>
      </section>
    </div>
  );
}
