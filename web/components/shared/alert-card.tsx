import React from 'react';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  title: string;
  message: string;
  tone?: 'warning' | 'danger' | 'info';
}

const TONE_CLASS = {
  warning: 'border-warning',
  danger: 'border-destructive',
  info: 'border-primary',
};

export function AlertCard({ title, message, tone = 'info' }: AlertCardProps) {
  return (
    <div className={cn('border-l-4 pl-3 space-y-0.5', TONE_CLASS[tone])}>
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{message}</p>
    </div>
  );
}
