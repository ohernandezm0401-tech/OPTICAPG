// SEG-01 (T08) — MFA reciente (≤ 10 min), regla 6 de la ficha.
// La firma clínica (SEG-08 / OPT-01) todavía no existe. `evaluarMfaParaFirma`
// es la comprobación reutilizable que esa firma deberá llamar: si el segundo
// factor tiene más de 10 min, hay que reautenticar.

export const VENTANA_MFA_RECIENTE_MS = 10 * 60 * 1000;

export type ResultadoMfaFirma = { ok: true } | { ok: false; requiereReautenticacion: true };

export function evaluarMfaParaFirma(verificadaEn: Date | null, ahora: Date): ResultadoMfaFirma {
  if (!verificadaEn) return { ok: false, requiereReautenticacion: true };
  const edad = ahora.getTime() - verificadaEn.getTime();
  if (edad < 0) return { ok: false, requiereReautenticacion: true };
  if (edad <= VENTANA_MFA_RECIENTE_MS) return { ok: true };
  return { ok: false, requiereReautenticacion: true };
}
