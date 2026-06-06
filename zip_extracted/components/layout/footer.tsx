import React from 'react';
import { cn } from '@/lib/utils';

export default function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("flex items-center justify-between px-6 text-[10px] sm:text-[11px]", className)}>
      <div>
        &copy; {new Date().getFullYear()} OptiSaaS Colombia - Cumplimiento Ley 1581 & Res 1995/3100
      </div>
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-1.5">
          Estado Servidor: <span className="w-2 h-2 bg-success rounded-full ml-1"></span> Óptimo
        </div>
        <div className="hidden sm:block">
          Facturación Electrónica: <strong>Activa</strong>
        </div>
      </div>
    </footer>
  );
}
