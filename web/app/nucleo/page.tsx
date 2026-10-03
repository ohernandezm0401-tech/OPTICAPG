// PLT-02 (T03) — Página del núcleo multi-tenant persistido en PostgreSQL.
// AC-PLT-02-3: lo creado aquí sobrevive a recargar el navegador o abrir otra
// sesión (la prueba E2E `tests/e2e/nucleo.spec.ts` lo verifica). Solo datos
// sintéticos de prueba; el resto de la app sigue con la capa demo en memoria
// hasta que cada entidad migre en su propio PR.
import { accionCrearTenant } from '@/app/acciones/nucleo';
import { listarTenants } from '@/db/nucleo';

export const dynamic = 'force-dynamic';

export default async function NucleoPage() {
  let tenants: Awaited<ReturnType<typeof listarTenants>> = [];
  let errorBd: string | null = null;
  try {
    tenants = await listarTenants();
  } catch (error) {
    errorBd = error instanceof Error ? error.message : 'Error de conexión a la base de datos.';
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Núcleo multi-tenant (PostgreSQL)</h1>
      <p className="mt-2 text-sm text-slate-600">
        Los registros creados aquí persisten en la base de datos: recargue la página o abra otra
        sesión y seguirán visibles.
      </p>

      {errorBd ? (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Base de datos no disponible: {errorBd}
        </p>
      ) : (
        <>
          <form action={accionCrearTenant} className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">Registrar tenant de prueba</h2>
            <div>
              <label htmlFor="razon_social" className="text-sm font-medium text-slate-700">
                Razón social
              </label>
              <input
                id="razon_social"
                name="razon_social"
                required
                minLength={3}
                placeholder="Óptica Sintética de Prueba S.A.S."
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="nit" className="text-sm font-medium text-slate-700">
                NIT
              </label>
              <input
                id="nit"
                name="nit"
                required
                placeholder="900.000.001-1"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Guardar tenant
            </button>
          </form>

          <section aria-label="Tenants registrados" className="mt-8">
            <h2 className="text-base font-semibold text-slate-900">
              Tenants registrados ({tenants.length})
            </h2>
            {tenants.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aún no hay tenants registrados.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {tenants.map((tenant) => (
                  <li
                    key={tenant.id}
                    data-testid={`tenant-${tenant.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-slate-900">{tenant.razon_social}</span>{' '}
                    <span className="text-slate-500">NIT {tenant.nit}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
