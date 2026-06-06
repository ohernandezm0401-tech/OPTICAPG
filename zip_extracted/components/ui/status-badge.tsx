import React from 'react';
import { cn } from '@/lib/utils';
import { StatusType } from '@/lib/types';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'por-llegar':
        return 'bg-secondary text-secondary-foreground border-border';
      case 'en-sala':
        return 'bg-success/15 text-success border-success/20';
      case 'en-consulta':
        return 'bg-primary/15 text-primary border-primary/20';
      case 'cotizando':
        return 'bg-accent/15 text-accent border-accent/20';
      case 'pagado':
        return 'bg-success/20 text-success-foreground border-success/30 font-bold';
      case 'no-asistio':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      case 'confirmada':
        return 'bg-warning/15 text-warning border-warning/20';
      case 'vigente':
        return 'bg-success/15 text-success border-success/20';
      case 'alerta':
        return 'bg-warning/15 text-warning border-warning/20';
      case 'vencido':
        return 'bg-destructive/15 text-destructive border-destructive/20';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const formatStatus = (status: string) => {
    if (status === 'cotizando') return 'ORDEN DE TRABAJO';
    return status.replace('-', ' ').toUpperCase();
  };

  return (
    <span 
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider",
        getStatusStyles(status),
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
