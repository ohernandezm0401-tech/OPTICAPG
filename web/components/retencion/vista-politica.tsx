// SEG-09 (T27) — Textos de la política de retención. Sin estado de React.
import {
  DECLARACION_CONTRATANTE_NO_PRESTADOR,
  NOTA_PURGA_NO_IMPLEMENTADA,
  marcaVerificacionPantalla,
  type FilaPoliticaRetencion,
} from '@/dominio/retencion';

export type FilaPoliticaVista = FilaPoliticaRetencion & { texto: string };

export function VistaPoliticaRetencion({
  filas,
  declaracion = DECLARACION_CONTRATANTE_NO_PRESTADOR,
  notaPurga = NOTA_PURGA_NO_IMPLEMENTADA,
}: {
  filas: FilaPoliticaVista[];
  declaracion?: string;
  notaPurga?: string;
}) {
  return (
    <section className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Política de retención</h1>
        <p className="text-sm text-muted-foreground mt-1">BORRADOR – requiere revisión jurídica</p>
      </header>
      <p data-testid="declaracion-contratante" className="text-sm">
        {declaracion}
      </p>
      <p data-testid="nota-purga" className="rounded-md border border-border p-3 text-sm">
        {notaPurga}
      </p>
      <table className="w-full text-sm border-collapse">
        <caption className="text-left font-medium mb-2">Plazos documentados</caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-3">Tipo</th>
            <th className="py-2 pr-3">Plazo</th>
            <th className="py-2 pr-3">Verificación</th>
            <th className="py-2">Fuente</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.tipo_documento} className="border-b border-border" data-testid={`plazo-${fila.tipo_documento}`}>
              <td className="py-2 pr-3">{fila.tipo_documento}</td>
              <td className="py-2 pr-3">{fila.anios == null ? 'sin plazo por defecto' : `${fila.anios} años`}</td>
              <td className="py-2 pr-3">{marcaVerificacionPantalla(fila.verificado)}</td>
              <td className="py-2">{fila.base_normativa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
