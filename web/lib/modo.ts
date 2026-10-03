// PLT-02 (T03) — El modo demo (datos sintéticos en memoria) solo existe con
// `APP_MODE=demo`. Sin la variable, en producción no hay demo; en desarrollo
// se mantiene por comodidad local. Centraliza la guarda para que cada tarea
// (T05 cierra el resto) use el mismo criterio.
export function esModoDemo(): boolean {
  const modo = process.env.APP_MODE ?? process.env.NEXT_PUBLIC_APP_MODE;
  if (modo === 'demo') return true;
  if (modo) return false;
  return process.env.NODE_ENV !== 'production';
}
