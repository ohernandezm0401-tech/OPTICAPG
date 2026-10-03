'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PanelPrescripcion } from '@/components/optometria/panel-prescripcion';

function Formulas() {
  const params = useSearchParams();
  return <PanelPrescripcion atencionInicial={params.get('atencion') ?? ''} />;
}

export default function FormulasPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm">Cargando la prescripción…</p>}>
      <Formulas />
    </Suspense>
  );
}
