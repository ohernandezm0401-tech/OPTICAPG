// OPT-05 (T24) — Verificación del hash. Sin datos del paciente.
// BORRADOR – requiere revisión jurídica.
import { verificarPrescripcionPublica } from '@/db/verificacion-prescripcion';

export const dynamic = 'force-dynamic';

export default async function PaginaVerificacionPrescripcion({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const resultado = await verificarPrescripcionPublica(hash);
  return (
    <main id="main-content" className="mx-auto max-w-xl space-y-4 p-6 text-neutral-950">
      <h1 className="text-2xl font-bold">Verificación de la prescripción</h1>
      <p className="text-sm">BORRADOR – requiere revisión jurídica</p>
      {resultado.coincide ? (
        <dl className="space-y-2 text-sm" data-testid="verificacion-resultado">
          <div>
            <dt className="font-medium">Número</dt>
            <dd data-testid="verificacion-numero">{resultado.numero}</dd>
          </div>
          <div>
            <dt className="font-medium">Fecha de emisión</dt>
            <dd data-testid="verificacion-fecha">{resultado.fecha_emision}</dd>
          </div>
          <div>
            <dt className="font-medium">Prescriptor</dt>
            <dd data-testid="verificacion-prescriptor">{resultado.nombre_prescriptor}</dd>
          </div>
          <div>
            <dt className="font-medium">Registro profesional</dt>
            <dd data-testid="verificacion-registro">{resultado.registro_profesional}</dd>
          </div>
        </dl>
      ) : (
        <p data-testid="verificacion-resultado">El hash no coincide.</p>
      )}
    </main>
  );
}
