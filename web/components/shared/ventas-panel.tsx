interface VentasPanelProps {
  titulo: string;
  total: number;
  consultasExentas: number;
  dispositivosGravados: number;
}

export function VentasPanel({ titulo, total, consultasExentas, dispositivosGravados }: VentasPanelProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{titulo}</h3>
        <div className="text-3xl font-black text-foreground">$ {total.toLocaleString('es-CO')}</div>
        <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full inline-block mt-1">
          Facturado electrónicamente
        </span>
      </div>
      <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border/50 pt-3.5">
        <div className="flex justify-between items-center">
          <span>Consultas (Exentas de IVA)</span>
          <span className="font-bold text-foreground font-mono">$ {consultasExentas.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Dispositivos Oculares (Gravados 19%)</span>
          <span className="font-bold text-foreground font-mono">$ {dispositivosGravados.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex justify-between items-center border-t border-border/20 pt-2 font-semibold">
          <span className="text-foreground">IVA Simulado (DIAN)</span>
          <span className="font-bold text-success font-mono">$ {Math.round(dispositivosGravados * 0.19).toLocaleString('es-CO')}</span>
        </div>
      </div>
    </div>
  );
}
