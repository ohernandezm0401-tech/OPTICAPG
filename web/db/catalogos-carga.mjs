// OPT-10 (T18) — Carga local de CIE-10 y CUPS.
// TODO(Q-23): corre con el rol de administración (dueño de la conexión de
// `DATABASE_URL`), no con `optisaas_app`. Ese rol de aplicación solo tiene
// SELECT. El dueño escribe porque las tablas globales no tienen RLS por
// tenant (no hay tenant_id). La carga no pide salto de RLS.

const TABLAS = {
  cie10: 'catalogo_cie10',
  cups: 'catalogo_cups',
};

/**
 * @param {import('pg').Pool | import('pg').PoolClient | import('pg').Client} cliente
 * @param {{ tipo: 'cie10' | 'cups', codigo: string, descripcion: string, version: string, vigente_desde: string }[]} filas
 */
export async function cargarFilasCatalogo(cliente, filas) {
  await cliente.query('BEGIN');
  try {
    const conteo = { cie10: 0, cups: 0 };
    for (const fila of filas) {
      const tabla = TABLAS[fila.tipo];
      if (!tabla) {
        throw new Error(`tipo de catálogo no admitido: ${fila.tipo}`);
      }
      await cliente.query(
        `insert into ${tabla} (codigo, descripcion, version, vigente_desde)
         values ($1, $2, $3, $4)
         on conflict (codigo, version) do update
           set descripcion = excluded.descripcion,
               vigente_desde = excluded.vigente_desde`,
        [fila.codigo, fila.descripcion, fila.version, fila.vigente_desde],
      );
      conteo[fila.tipo] += 1;
    }
    await cliente.query('COMMIT');
    return conteo;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      // Se informa el error original.
    }
    throw error;
  }
}
