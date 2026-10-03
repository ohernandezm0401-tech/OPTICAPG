import React from 'react';
import { cn } from '@/lib/utils';

interface CardContainerProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function CardContainer({ title, children, className, action }: CardContainerProps) {
  return (
    <section className={cn('bg-card border border-border rounded-2xl p-5 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
