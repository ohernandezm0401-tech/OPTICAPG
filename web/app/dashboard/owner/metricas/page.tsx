'use client';

import React from 'react';
import { 
  TrendingUp, 
  Activity, 
  Coins, 
  Percent, 
  DollarSign 
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { motion } from 'motion/react';

export default function PlatformMetricsPage() {
  const { empresas } = useClinicStore();

  // Dynamic MRR — only active subscriptions (exclude suspended + onboarding)
  const currentMrr = empresas.reduce((sum, e) => {
    if (e.estadoCuenta === 'suspendido' || e.estadoCuenta === 'onboarding') return sum;
    const planConfig = PLANES_CONFIG[e.plan];
    return sum + (planConfig?.priceCOP || 0);
  }, 0);
  
  // Calculate ARR
  const currentArr = currentMrr * 12;

  // Dynamic trial and churn metrics from store data
  const activeTrials = empresas.filter(e => e.estadoCuenta === 'onboarding' || e.subscriptionStatus === 'trialing').length;
  const suspendedCount = empresas.filter(e => e.estadoCuenta === 'suspendido').length;
  const churnRate = empresas.length > 0 ? Math.round((suspendedCount / empresas.length) * 1000) / 10 : 0;
  const arpu = currentMrr / (empresas.filter(e => e.estadoCuenta === 'activo').length || 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Métricas Globales</h1>
          <p className="text-muted-foreground text-sm">Monitoreo de ingresos recurrentes, uso del sistema y salud financiera de la plataforma.</p>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="MRR (Ingreso Mensual Recurrente)" 
          value={`$ ${currentMrr.toLocaleString('es-CO')} COP`} 
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          trend={{ value: `${empresas.filter(e => e.estadoCuenta === 'activo').length} empresas activas`, isPositive: true }}
          delay={0.1}
        />
        <StatCard 
          title="ARR (Ingreso Anual Proyectado)" 
          value={`$ ${currentArr.toLocaleString('es-CO')} COP`} 
          icon={<Coins className="w-5 h-5 text-success" />}
          trend={{ value: "Basado en MRR actual", isPositive: true }}
          delay={0.2}
        />
        <StatCard 
          title="ARPU (Ingreso Promedio por Óptica)" 
          value={`$ ${Math.round(arpu).toLocaleString('es-CO')} COP`} 
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          subtitle="Ticket promedio mensual (solo activas)"
          delay={0.3}
        />
        <StatCard 
          title="Tasa de Churn" 
          value={`${churnRate}%`} 
          icon={<Percent className="w-5 h-5 text-warning" />}
          trend={{ value: `${suspendedCount} suspendidas`, isPositive: churnRate === 0 }}
          delay={0.4}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Analytics Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Distribución de Ingresos por Plan
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 bg-success/10 text-success rounded-full">
              MRR Actual: $ {currentMrr.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {/* Revenue bars per plan type */}
            {(['enterprise', 'premium', 'basico'] as const).map((plan, idx) => {
              const planConfig = PLANES_CONFIG[plan];
              const count = empresas.filter(e => e.plan === plan && e.estadoCuenta === 'activo').length;
              const planRevenue = count * planConfig.priceCOP;
              const percentage = currentMrr > 0 ? Math.round((planRevenue / currentMrr) * 100) : 0;
              
              return (
                <div key={plan} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Plan {plan.charAt(0).toUpperCase() + plan.slice(1)} ({count} empresas)</span>
                    <span className="text-foreground font-mono font-bold">$ {planRevenue.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${
                        plan === 'enterprise' ? 'bg-gradient-to-r from-purple-600 to-purple-400' :
                        plan === 'premium' ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                        'bg-gradient-to-r from-slate-500 to-slate-400'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tenant Plan Distribution */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-foreground border-b border-border/40 pb-2">
            Distribución de Cuentas por Plan
          </h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-secondary/20 rounded-lg border border-border/30 flex justify-between items-center">
              <div>
                <span className="font-bold text-xs text-foreground block">Plan Enterprise</span>
                <span className="text-[10px] text-muted-foreground">Valor: ${PLANES_CONFIG.enterprise.priceCOP.toLocaleString('es-CO')} COP / mes</span>
              </div>
              <span className="font-mono text-lg font-black text-purple-600">
                {empresas.filter(e => e.plan === 'enterprise').length}
              </span>
            </div>

            <div className="p-3 bg-secondary/20 rounded-lg border border-border/30 flex justify-between items-center">
              <div>
                <span className="font-bold text-xs text-foreground block">Plan Premium</span>
                <span className="text-[10px] text-muted-foreground">Valor: ${PLANES_CONFIG.premium.priceCOP.toLocaleString('es-CO')} COP / mes</span>
              </div>
              <span className="font-mono text-lg font-black text-blue-500">
                {empresas.filter(e => e.plan === 'premium').length}
              </span>
            </div>

            <div className="p-3 bg-secondary/20 rounded-lg border border-border/30 flex justify-between items-center">
              <div>
                <span className="font-bold text-xs text-foreground block">Plan Básico</span>
                <span className="text-[10px] text-muted-foreground">Valor: ${PLANES_CONFIG.basico.priceCOP.toLocaleString('es-CO')} COP / mes</span>
              </div>
              <span className="font-mono text-lg font-black text-slate-500">
                {empresas.filter(e => e.plan === 'basico').length}
              </span>
            </div>

            <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 text-center text-xs">
              <span className="font-bold text-primary block">En periodo de Trial:</span>
              <strong className="text-foreground text-base block mt-0.5">{activeTrials} Ópticas Nuevas</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
