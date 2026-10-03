// ADM-01 (T16) — Banner de certificado vencido. TODO(Q-01): no bloquea la atención.
import { accionLeerBanner } from '@/app/acciones/sedes';

export async function BannerCertificado() {
  const banner = await accionLeerBanner();
  if (!banner) return null;
  return (
    <div
      role="alert"
      data-alerta="roja"
      data-bloquea-atencion="false"
      className="mb-4 rounded-md border border-red-700 bg-red-50 px-4 py-3 text-red-950"
    >
      <p className="font-semibold">Certificado vencido en {banner.nombre}</p>
      <p>La atención clínica no se bloquea.</p>
    </div>
  );
}
