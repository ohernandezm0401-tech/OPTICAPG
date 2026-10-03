'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, User, Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from 'motion/react';
import { useSessionUser } from '@/hooks/use-session-user';

export default function Header({ className }: { className?: string }) {
  const { session, sede, sedes, sedeId, updateSede } = useSessionUser();

  if (!session?.user) return null;

  const isOwner = session.user.role === 'owner';
  const sedeLabel = sede ? `${sede.nombre} — ${sede.ciudad}` : 'Sede';

  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center justify-between px-4 md:px-6 py-2 shadow-sm", className)}
    >
      <div className="flex items-center gap-4 pl-10 md:pl-0">
        {/* Sede indicator */}
        {!isOwner && (
          <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full text-xs font-medium border border-border">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            {sedes.length > 1 ? (
              <select
                aria-label="Cambiar sede"
                value={sedeId}
                onChange={(event) => updateSede(event.target.value)}
                className="bg-transparent text-xs font-medium outline-none max-w-[220px]"
              >
                {sedes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} — {item.ciudad}
                  </option>
                ))}
              </select>
            ) : (
              <span>{sedeLabel}</span>
            )}
          </div>
        )}
        {isOwner && (
          <div className="hidden sm:flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            Plataforma Global
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 md:gap-3">
        {/* Regulatory badges - hidden on mobile */}
        {!isOwner && (
          <div className="hidden lg:flex items-center gap-2 mr-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-success/10 text-success rounded-full border border-success/20">
              HABILITACIÓN: {sede?.estado === 'activa' ? 'VIGENTE' : 'REVISAR'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-warning/10 text-warning rounded-full border border-warning/20">
              INVIMA: 4 ALERTAS
            </span>
          </div>
        )}

        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Notifications */}
        <button className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors relative" aria-label="Notificaciones">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
        </button>

        <div className="h-6 w-px bg-border mx-0.5 hidden sm:block"></div>

        {/* User info */}
        <div className="flex items-center gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border",
            isOwner 
              ? "bg-purple-500/10 text-purple-600 border-purple-500/20" 
              : "bg-primary/10 text-primary border-primary/20"
          )}>
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-semibold leading-tight">{session.user.name}</span>
            <span className={cn(
              "text-[10px] uppercase font-bold",
              isOwner ? "text-purple-500" : "text-muted-foreground"
            )}>
              {session.user.role}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
        </div>
        
        {/* Logout */}
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </motion.header>
  );
}
