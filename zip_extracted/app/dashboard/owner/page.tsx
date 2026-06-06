'use client';

import React from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { useRouter } from 'next/navigation';
import { Building2, Users, CreditCard, Shield, Plus, MapPin, ChevronRight, Activity, Percent } from 'lucide-react';
import { motion } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';

export default function OwnerDashboardPage() {
  const { empresas, sedes, usuarios } = useClinicStore();
  const router = useRouter();

  const totalSedes = sedes.length;
  const totalUsuarios = usuarios.filter(u => u.role !== 'owner').length;

  // Dynamic MRR — only count active subscriptions
  const mrr = empresas.reduce((sum, e) => {
    if (e.estadoCuenta === 'suspendido' || e.estadoCuenta === 'onboarding') return sum;
    const planConfig = PLANES_CONFIG[e.plan];
    return sum + (planConfig?.priceCOP || 0);
  }, 0);

  // Conversion rate: activo / total
  const activeEmpresas = empresas.filter(e => e.estadoCuenta === 'activo').length;
  const conversionRate = empresas.length > 0 ? Math.round((activeEmpresas / empresas.length) * 1000) / 10 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Plataforma</h1>
          <p className="text-muted-foreground text-sm">Administración global de OptiSaaS — Empresas, usuarios y métricas.</p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/owner/empresas?onboarding=true')}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Empresa (Onboarding)
        </button>
      </div>

      {/* Platform Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Empresas Activas" 
          value={empresas.length}
          icon={<Building2 className="w-5 h-5 text-primary" />}
          trend={{ value: `${activeEmpresas} activas`, isPositive: activeEmpresas > 0 }}
          delay={0.1}
        />
        <StatCard 
          title="Sedes Totales" 
          value={totalSedes}
          icon={<MapPin className="w-5 h-5 text-blue-500" />}
          subtitle="En todas las empresas"
          delay={0.2}
        />
        <StatCard 
          title="Usuarios Registrados" 
          value={totalUsuarios}
          icon={<Users className="w-5 h-5 text-emerald-500" />}
          subtitle="Excluyendo owner"
          delay={0.3}
        />
        <StatCard 
          title="Conversión de Trials" 
          value={`${conversionRate}%`}
          icon={<Percent className="w-5 h-5 text-amber-500" />}
          subtitle="De demo sin tarjeta a pago"
          delay={0.4}
        />
        <StatCard 
          title="MRR Plataforma" 
          value={`$ ${mrr.toLocaleString('es-CO')} COP`}
          icon={<CreditCard className="w-5 h-5 text-purple-500" />}
          trend={empresas.length > 0 ? { value: `${empresas.length} planes activos`, isPositive: true } : undefined}
          delay={0.5}
        />
      </div>

      {/* Empresas List */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold">Empresas / Ópticas Registradas</h3>
          <span className="text-xs text-muted-foreground font-medium">{empresas.length} EMPRESAS</span>
        </div>
        <div className="space-y-4">
          {empresas.map((empresa) => {
            const sedesEmpresa = sedes.filter(s => s.empresaId === empresa.id);
            const usersEmpresa = usuarios.filter(u => u.empresaId === empresa.id);
            return (
              <motion.div 
                key={empresa.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push('/dashboard/owner/empresas')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-base">{empresa.nombre}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span>NIT: {empresa.nit}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sedesEmpresa.length} sedes</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {usersEmpresa.length} usuarios</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                      empresa.plan === 'enterprise' 
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' 
                        : empresa.plan === 'premium' 
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                          : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    }`}>
                      {empresa.plan}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                
                {/* Sedes list */}
                <div className="mt-3 ml-[60px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sedesEmpresa.map((sede) => (
                    <div key={sede.id} className="text-xs flex items-center gap-2 text-muted-foreground bg-background/50 px-3 py-2 rounded-md border border-border/30">
                      <div className={`w-2 h-2 rounded-full ${sede.estado === 'activa' ? 'bg-success' : 'bg-muted-foreground'}`}></div>
                      <span className="font-medium text-foreground">{sede.nombre}</span>
                      <span>— {sede.ciudad}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-success" />
            <h3 className="text-lg font-semibold">Salud de la Plataforma</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Empresas Activas</span>
                <span className="font-bold text-success">{activeEmpresas} / {empresas.length}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: `${empresas.length > 0 ? (activeEmpresas / empresas.length) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Capacidad de Tenants</span>
                <span className="font-bold">{Math.round((empresas.length / 50) * 100)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.round((empresas.length / 50) * 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Usuarios Registrados</span>
                <span className="font-bold text-success">{totalUsuarios} usuarios</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: `${Math.min(100, Math.round((totalUsuarios / 100) * 100))}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-lg font-semibold">Seguridad & Logs Recientes</h3>
          </div>
          <div className="space-y-3">
            {empresas.slice(0, 4).map((emp, idx) => {
              const borderColor = emp.estadoCuenta === 'activo' ? 'border-success' : emp.estadoCuenta === 'suspendido' ? 'border-warning' : 'border-primary';
              const label = emp.estadoCuenta === 'activo' ? 'Suscripción activa' : emp.estadoCuenta === 'suspendido' ? 'Cuenta suspendida' : 'En periodo de prueba';
              return (
                <div key={emp.id} className={`border-l-4 ${borderColor} pl-3 py-1`}>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.nombre} — Plan {emp.plan.toUpperCase()}</p>
                </div>
              );
            })}
            {empresas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No hay actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

