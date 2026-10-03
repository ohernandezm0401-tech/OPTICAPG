'use client';

import React from 'react';
import { useToastStore, ToastType } from '@/lib/toast-store';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-success" />,
  error: <AlertCircle className="w-5 h-5 text-destructive" />,
  info: <Info className="w-5 h-5 text-primary" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning" />
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-card border-success/30 text-foreground',
  error: 'bg-card border-destructive/30 text-foreground',
  info: 'bg-card border-primary/30 text-foreground',
  warning: 'bg-card border-warning/30 text-foreground'
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center justify-between border-2 p-4 rounded-xl shadow-lg backdrop-blur-md ${bgColors[toast.type]}`}
          >
            <div className="flex items-center gap-3">
              {icons[toast.type]}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors ml-4 p-1 rounded-md hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
