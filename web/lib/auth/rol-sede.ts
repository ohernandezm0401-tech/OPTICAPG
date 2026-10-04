// El rol de la sesión es el de la sede activa, no el primero de una lista sin orden.

export function mapaRolesPorSede(
  filas: readonly { sede_id: string; rol: string }[],
): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const fila of filas) {
    if (!mapa[fila.sede_id]) mapa[fila.sede_id] = fila.rol;
  }
  return mapa;
}

export function rolDeSede(mapa: Record<string, string>, sedeId: string, respaldo = ''): string {
  return mapa[sedeId] ?? respaldo;
}
