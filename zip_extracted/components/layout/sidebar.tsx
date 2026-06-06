'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, Menu, X } from 'lucide-react';
import { NAV_CONFIG } from '@/lib/navigation';
import { Role } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getEmpresa, getUsuarioByEmail } from '@/lib/mock-data';

import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';

const ROUTE_TO_MODULE_MAP: Record<string, string> = {
  '/dashboard/admin/agenda': 'agenda',
  '/dashboard/asesor/agenda': 'agenda',
  '/dashboard/optometra': 'agenda',
  
  '/dashboard/admin/pacientes': 'pacientes',
  '/dashboard/asesor/pacientes': 'pacientes',
  '/dashboard/optometra/pacientes': 'pacientes',
  
  '/dashboard/optometra/historia-clinica': 'historiaClinica',
  '/dashboard/optometra/formulas': 'historiaClinica',
  '/dashboard/optometra/adaptacion-lc': 'historiaClinica',
  '/dashboard/optometra/calidad': 'historiaClinica',
  
  '/dashboard/admin/ventas': 'ventasPOS',
  '/dashboard/asesor/ventas': 'ventasPOS',
  '/dashboard/asesor/cotizaciones': 'ventasPOS',
  '/dashboard/asesor/entregas': 'ventasPOS',
  
  '/dashboard/admin/promociones': 'promocionesMarketing'
};

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const { empresas } = useClinicStore();
  
  if (!session?.user) return null;

  const role = session.user.role as Role;
  const rawNavItems = NAV_CONFIG[role] || [];
  
  const usuario = getUsuarioByEmail(session.user.email as string);
  const empresa = empresas.find(e => e.id === session.user.empresaId);

  // Filter items based on SaaS limits and overrides
  const navItems = rawNavItems.filter(item => {
    if (role === 'owner') return true;
    if (!empresa) return true;

    // Custom check for WhatsApp CRM
    if (item.href === '/dashboard/asesor/whatsapp') {
      return empresa.whatsappHabilitado !== false;
    }

    const moduleKey = ROUTE_TO_MODULE_MAP[item.href];
    if (!moduleKey) return true;

    const planDefault = PLANES_CONFIG[empresa.plan]?.modules[moduleKey as keyof typeof PLANES_CONFIG['basico']['modules']];
    const override = empresa.customModulesOverride?.[moduleKey as keyof typeof empresa.customModulesOverride];
    const isEnabled = override !== undefined ? override : planDefault;

    return !!isEnabled;
  });


  const sidebarContent = (
    <>
      <div className="py-2 px-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <div className="text-primary font-extrabold text-[18px]">
            OptiSaaS <span className="font-normal text-[12px] text-muted-foreground">v3.0</span>
          </div>
        </div>
        {/* Close button on mobile */}
        <button 
          className="md:hidden p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {empresa && (
        <div className="px-3 mb-4 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
          {empresa.nombre}
        </div>
      )}

      {role === 'owner' && (
        <div className="px-3 mb-4 text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Plataforma OptiSaaS
        </div>
      )}

      <nav className="flex flex-col gap-0.5 relative">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== `/dashboard/${role}`);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
            >
              <Link 
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative z-10 flex items-center gap-[10px] py-2.5 px-3 rounded-lg text-[13px] font-medium transition-all duration-200",
                  isActive 
                    ? "text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 bg-sidebar-accent rounded-lg -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
      
      <div className="mt-auto p-3 text-[11px] border-t border-sidebar-accent/50 text-sidebar-foreground/60 flex flex-col gap-1">
        <div className="font-semibold text-sidebar-foreground">{session.user.name}</div>
        <div className="uppercase tracking-wider">{role}</div>
        {usuario?.registroMedico && <div>Reg: {usuario.registroMedico}</div>}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn("p-3 flex flex-col gap-1 scrollbar-hide overflow-y-auto", className)}>
        {sidebarContent}
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 bg-sidebar-bg text-sidebar-foreground p-2 rounded-lg shadow-lg border border-sidebar-accent"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-[260px] bg-sidebar-bg text-sidebar-foreground z-50 p-3 flex flex-col gap-1 shadow-2xl overflow-y-auto scrollbar-hide"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
