'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  CreditCard, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Building2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { toast } from '@/lib/toast-store';

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
  
  '/dashboard/admin/ventas': 'ventasPOS',
  '/dashboard/asesor/ventas': 'ventasPOS',
  '/dashboard/asesor/cotizaciones': 'ventasPOS',
  '/dashboard/asesor/entregas': 'ventasPOS',
  
  '/dashboard/admin/promociones': 'promocionesMarketing'
};

const MODULE_NAMES_ES: Record<string, string> = {
  agenda: 'Agenda Global y Citas',
  pacientes: 'Gestión de Pacientes',
  historiaClinica: 'Historia Clínica y Fórmulas',
  ventasPOS: 'Punto de Venta (POS) y Facturación DIAN',
  promocionesMarketing: 'Promociones, Convenios y Campañas',
  conveniosEmpresariales: 'Convenios Empresariales',
  inventoryScraping: 'Scraping de Catálogos de Lentes'
};

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { empresas, updateEmpresa } = useClinicStore();

  const [isPaying, setIsPaying] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!session?.user) return <>{children}</>;

  const role = session.user.role;
  const empresaId = session.user.empresaId;

  // Platform owner is completely exempt
  if (role === 'owner' || role === 'owner_plataforma' || role === 'soporte_plataforma') return <>{children}</>;

  const empresa = empresas.find(e => e.id === empresaId);
  if (!empresa) return <>{children}</>;

  // 1. Suspension Check
  if (empresa.estadoCuenta === 'suspendido') {
    const handlePaySimulator = async () => {
      setIsPaying(true);
      toast.info('Iniciando pasarela de pago simulada...');
      
      // Simulate Stripe billing renewal
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      
      updateEmpresa(empresa.id, { 
        estadoCuenta: 'activo',
        subscriptionStatus: 'active',
        nextBillingDate: nextDate.toISOString().split('T')[0]
      });
      
      setIsPaying(false);
      toast.success('¡Pago Procesado Exitosamente con Stripe! Cuenta Reactivada.');
    };

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card max-w-lg w-full rounded-2xl border border-destructive/20 shadow-2xl p-8 relative overflow-hidden text-center"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-destructive via-red-500 to-destructive" />
          
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-foreground mb-3">Servicio Suspendido</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Detectamos que el pago de la suscripción de <strong className="text-foreground">{empresa.nombre}</strong> no se ha procesado correctamente en Stripe o la cuenta fue suspendida manualmente por administración.
          </p>

          <div className="bg-secondary/40 rounded-xl p-4 mb-8 text-left border border-border/50 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Razón Social:</span>
              <span className="font-semibold text-foreground">{empresa.nombre}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">NIT:</span>
              <span className="font-mono text-foreground">{empresa.nit}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Estado en Stripe:</span>
              <span className="font-bold text-destructive uppercase tracking-wider">{empresa.subscriptionStatus || 'unpaid'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handlePaySimulator}
              disabled={isPaying}
              className="bg-destructive hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Procesando Pago...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pagar Factura Pendiente
                </>
              )}
            </button>
            <button
              onClick={() => toast.info('Soporte notificado. Nos comunicaremos pronto.')}
              className="bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold px-6 py-3 rounded-xl transition-all"
            >
              Contactar Soporte
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Module / Feature Permissions Check
  const moduleKey = ROUTE_TO_MODULE_MAP[pathname];
  if (moduleKey) {
    const planDefault = PLANES_CONFIG[empresa.plan].modules[moduleKey as keyof typeof PLANES_CONFIG['basico']['modules']];
    const override = empresa.customModulesOverride?.[moduleKey as keyof typeof empresa.customModulesOverride];
    const isEnabled = override !== undefined ? override : planDefault;

    if (!isEnabled) {
      // Determine what plan unlocks this module
      let requiredPlan: 'premium' | 'enterprise' = 'premium';
      if (moduleKey === 'promocionesMarketing' || moduleKey === 'inventoryScraping') {
        requiredPlan = 'enterprise';
      }

      const handleUpgradeSimulator = async () => {
        setIsUpgrading(true);
        toast.info(`Iniciando upgrade a Plan ${requiredPlan.toUpperCase()}...`);
        
        // Simulate Stripe Checkout session initialization
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        updateEmpresa(empresa.id, { 
          plan: requiredPlan,
          subscriptionStatus: 'active'
        });
        
        setIsUpgrading(false);
        toast.success(`¡Felicidades! Tu plan ha sido actualizado a ${requiredPlan.toUpperCase()}. Módulo desbloqueado.`);
      };

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card max-w-lg w-full rounded-2xl border border-border shadow-2xl p-8 relative overflow-hidden text-center"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-primary to-purple-500" />
            
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-black text-foreground mb-2">Módulo Restringido</h2>
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-4">
              Plan {empresa.plan.toUpperCase()} no calificado
            </p>
            
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              El módulo <strong className="text-foreground">{MODULE_NAMES_ES[moduleKey]}</strong> no está incluido en tu plan actual o ha sido deshabilitado para esta sucursal.
            </p>

            <div className="bg-secondary/40 rounded-xl p-4 mb-8 text-left border border-border/50 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Tu Plan:</span>
                <span className="font-bold px-2 py-0.5 bg-slate-500/10 text-slate-600 rounded uppercase text-[10px]">{empresa.plan}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Plan Requerido:</span>
                <span className="font-black px-2 py-0.5 bg-primary/15 text-primary rounded uppercase text-[10px]">{requiredPlan}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border/30 pt-2">
                <span className="text-muted-foreground">Precio del Plan Requerido:</span>
                <span className="font-bold text-foreground font-mono">$ {PLANES_CONFIG[requiredPlan].priceCOP.toLocaleString('es-CO')} COP/mes</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleUpgradeSimulator}
                disabled={isUpgrading}
                className="bg-primary hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUpgrading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Mejorar Plan (Simulación Stripe)
                  </>
                )}
              </button>
              <button
                onClick={() => router.push(`/dashboard/${role}`)}
                className="bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                Regresar al Inicio
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
