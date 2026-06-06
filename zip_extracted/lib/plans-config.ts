export interface PlanDetails {
  name: string;
  priceCOP: number;
  stripePriceId: string;
  maxSedes: number;
  maxUsuarios: number;
  maxHistoriasMes: number;
  modules: {
    agenda: boolean;
    pacientes: boolean;
    historiaClinica: boolean;
    ventasPOS: boolean;
    promocionesMarketing: boolean;
    conveniosEmpresariales: boolean;
    inventoryScraping: boolean;
  };
}

export const PLANES_CONFIG: Record<'basico' | 'premium' | 'enterprise', PlanDetails> = {
  basico: {
    name: 'Básico',
    priceCOP: 500000,
    stripePriceId: 'price_1Qbasic_500k',
    maxSedes: 1,
    maxUsuarios: 3,
    maxHistoriasMes: 100,
    modules: {
      agenda: true,
      pacientes: true,
      historiaClinica: true,
      ventasPOS: false,
      promocionesMarketing: false,
      conveniosEmpresariales: false,
      inventoryScraping: false,
    }
  },
  premium: {
    name: 'Premium',
    priceCOP: 1500000,
    stripePriceId: 'price_1Qpremium_15m',
    maxSedes: 3,
    maxUsuarios: 10,
    maxHistoriasMes: 500,
    modules: {
      agenda: true,
      pacientes: true,
      historiaClinica: true,
      ventasPOS: true,
      promocionesMarketing: false,
      conveniosEmpresariales: true,
      inventoryScraping: false,
    }
  },
  enterprise: {
    name: 'Enterprise',
    priceCOP: 4500000,
    stripePriceId: 'price_1Qenterprise_45m',
    maxSedes: 999, // unlimited
    maxUsuarios: 999, // unlimited
    maxHistoriasMes: 99999, // unlimited
    modules: {
      agenda: true,
      pacientes: true,
      historiaClinica: true,
      ventasPOS: true,
      promocionesMarketing: true,
      conveniosEmpresariales: true,
      inventoryScraping: true,
    }
  }
};
