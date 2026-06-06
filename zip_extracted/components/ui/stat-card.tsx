'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, trend, icon, className, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group",
        className
      )}
    >
      {/* Decorative gradient blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2 relative z-10">
        <div className="text-3xl font-black tracking-tight">{value}</div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            trend.isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-2 font-medium relative z-10">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
