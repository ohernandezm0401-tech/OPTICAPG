import { AlertCard } from './alert-card';
import { Alerta } from '@/lib/types';
import { ShieldAlert } from 'lucide-react';

interface AlertasPanelProps {
  titulo?: string;
  alertas: Pick<Alerta, 'id' | 'titulo' | 'mensaje' | 'tipo'>[];
}

export function AlertasPanel({ titulo = 'Alertas', alertas }: AlertasPanelProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-warning" />
        {titulo}
      </h3>
      <div className="space-y-3 text-xs">
        {alertas.length === 0 && <p className="text-muted-foreground">No hay alertas para esta sede.</p>}
        {alertas.map((alerta) => (
          <AlertCard key={alerta.id} title={alerta.titulo} message={alerta.mensaje} tone={alerta.tipo} />
        ))}
      </div>
    </div>
  );
}
