// Constantes compartidas para OptiSaaS.
// PLT-11 (T06): no hay tasa de IVA en código. TODO(Q-31) la tarifa vive en
// `tarifas_impuesto` y nace sin valor por defecto.

/** Días de trial predeterminado */
export const DEFAULT_TRIAL_DAYS = 15;

/** Endpoint de webhook de Stripe (producción) */
export const STRIPE_WEBHOOK_ENDPOINT = 'https://api.optisaas.co/api/v1/stripe/webhook';
