'use client';

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Receipt, 
  Terminal, 
  Play, 
  BookOpen, 
  Info,
  Activity
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { IVA_RATE } from '@/lib/constants';

interface StripeWebhookLog {
  timestamp: string;
  event: string;
  companyName: string;
  status: 'success' | 'warning' | 'error';
  payload: string;
}

export default function FacturacionPage() {
  const { empresas, updateEmpresa } = useClinicStore();
  const [activeSubTab, setActiveSubTab] = useState<'suscripciones' | 'simulador' | 'guia'>('suscripciones');
  
  // Webhook Simulator State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [simulatedLogs, setSimulatedLogs] = useState<StripeWebhookLog[]>([]);
  const [consolePayload, setConsolePayload] = useState('// Selecciona una óptica y dispara un evento para ver el log de Stripe Colombia...');

  const selectedCompany = useMemo(() => {
    return empresas.find(e => e.id === selectedCompanyId) || null;
  }, [selectedCompanyId, empresas]);

  // Projections & Calculations
  const mrr = useMemo(() => {
    return empresas.reduce((sum, e) => {
      if (e.estadoCuenta === 'suspendido' || e.estadoCuenta === 'onboarding') return sum;
      const planConfig = PLANES_CONFIG[e.plan];
      return sum + (planConfig?.priceCOP || 0);
    }, 0);
  }, [empresas]);

  const arr = mrr * 12;

  // Active vs Suspendido vs Trialing
  const counts = useMemo(() => {
    let active = 0;
    let suspended = 0;
    let trial = 0;
    
    empresas.forEach(e => {
      if (e.estadoCuenta === 'activo') active++;
      else if (e.estadoCuenta === 'suspendido') suspended++;
      else trial++;
    });

    return { active, suspended, trial };
  }, [empresas]);

  // Webhook event handlers
  const handleCheckoutCompleted = (company: typeof selectedCompany, stripeCustId: string, stripeSubId: string, total: number) => {
    if (!company) return { eventPayload: {}, statusText: '', logStatus: 'error' as const };
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    updateEmpresa(company.id, {
      estadoCuenta: 'activo',
      subscriptionStatus: 'active',
      nextBillingDate: formattedNextDate,
      stripeCustomerId: stripeCustId,
      stripeSubscriptionId: stripeSubId
    });

    const eventPayload = {
      id: `evt_chk_${Math.random().toString(36).substring(2, 10)}`,
      object: "event",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_test_${Math.random().toString(36).substring(2, 12)}`,
          customer: stripeCustId,
          subscription: stripeSubId,
          payment_status: "paid",
          amount_total: total,
          currency: "cop",
          customer_details: {
            email: `${company.nombre.toLowerCase().replace(/\s/g, '')}@admin.com`,
            name: company.nombre
          },
          metadata: {
            nit: company.nit,
            companyId: company.id,
            trial_conversion: "true"
          }
        }
      }
    };

    const statusText = `Webhook checkout.session.completed procesado. Conversión exitosa. Óptica "${company.nombre}" convertida de Trial a Suscripción Activa. Facturando en COP y enlazado a Stripe ID: ${stripeCustId}.`;
    toast.success(`Stripe: ¡Conversión exitosa! Suscripción iniciada para ${company.nombre}`);

    return { eventPayload, statusText, logStatus: 'success' as const };
  };

  const handleInvoicePaid = (company: typeof selectedCompany, stripeCustId: string, stripeSubId: string, total: number, iva: number) => {
    if (!company) return { eventPayload: {}, statusText: '', logStatus: 'error' as const };
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    updateEmpresa(company.id, {
      estadoCuenta: 'activo',
      subscriptionStatus: 'active',
      nextBillingDate: formattedNextDate
    });

    const eventPayload = {
      id: `evt_paid_${Math.random().toString(36).substring(2, 10)}`,
      object: "event",
      type: "invoice.paid",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `in_paid_${Math.random().toString(36).substring(2, 8)}`,
          customer: stripeCustId,
          subscription: stripeSubId,
          amount_paid: total,
          currency: "cop",
          tax: iva,
          status: "paid",
          customer_email: `${company.nombre.toLowerCase().replace(/\s/g, '')}@admin.com`,
          metadata: {
            nit: company.nit,
            pago_mes: new Date().toLocaleString('es-CO', { month: 'long' }),
            dian_einvoice_required: "true"
          }
        }
      }
    };

    const statusText = `Webhook invoice.paid procesado. Óptica "${company.nombre}" marcada como ACTIVA. Próximo cobro: ${formattedNextDate}. Generando XML legal DIAN.`;
    toast.success(`Stripe: Pago de suscripción verificado para ${company.nombre}`);

    return { eventPayload, statusText, logStatus: 'success' as const };
  };

  const handlePaymentFailed = (company: typeof selectedCompany, stripeCustId: string, stripeSubId: string, total: number) => {
    if (!company) return { eventPayload: {}, statusText: '', logStatus: 'error' as const };
    updateEmpresa(company.id, {
      estadoCuenta: 'suspendido',
      subscriptionStatus: 'past_due'
    });

    const eventPayload = {
      id: `evt_failed_${Math.random().toString(36).substring(2, 10)}`,
      object: "event",
      type: "invoice.payment_failed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `in_fail_${Math.random().toString(36).substring(2, 8)}`,
          customer: stripeCustId,
          subscription: stripeSubId,
          amount_due: total,
          currency: "cop",
          attempt_count: 2,
          next_payment_attempt: Math.floor(Date.now() / 1000) + 48 * 3600, // 48h retry
          status: "open",
          billing_reason: "subscription_cycle"
        }
      }
    };

    const statusText = `Webhook invoice.payment_failed procesado. Óptica "${company.nombre}" SUSPENDIDA por fallo de pago. Reintentos de cobro programados en Stripe.`;
    toast.error(`Stripe: Fallo de cobro registrado para ${company.nombre}`);

    return { eventPayload, statusText, logStatus: 'warning' as const };
  };

  const handleSubscriptionDeleted = (company: typeof selectedCompany, stripeCustId: string, stripeSubId: string, price: number) => {
    if (!company) return { eventPayload: {}, statusText: '', logStatus: 'error' as const };
    updateEmpresa(company.id, {
      estadoCuenta: 'suspendido',
      subscriptionStatus: 'canceled',
      nextBillingDate: undefined
    });

    const eventPayload = {
      id: `evt_deleted_${Math.random().toString(36).substring(2, 10)}`,
      object: "event",
      type: "customer.subscription.deleted",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustId,
          status: "canceled",
          canceled_at: Math.floor(Date.now() / 1000),
          plan: {
            id: PLANES_CONFIG[company.plan].stripePriceId,
            amount: price,
            currency: "cop"
          }
        }
      }
    };

    const statusText = `Webhook customer.subscription.deleted procesado. Óptica "${company.nombre}" SUSPENDIDA permanentemente. Suscripción cancelada en Stripe.`;
    toast.error(`Stripe: Suscripción Cancelada para ${company.nombre}`);

    return { eventPayload, statusText, logStatus: 'error' as const };
  };

  // Trigger Stripe Webhook Events
  const triggerStripeWebhook = (eventType: 'invoice.paid' | 'invoice.payment_failed' | 'customer.subscription.deleted' | 'checkout.session.completed') => {
    if (!selectedCompanyId || !selectedCompany) {
      toast.warning('Por favor seleccione una óptica para simular el evento.');
      return;
    }

    const price = PLANES_CONFIG[selectedCompany.plan].priceCOP;
    const iva = Math.round(price * IVA_RATE);
    const total = price + iva;
    const stripeCustId = selectedCompany.stripeCustomerId || `cus_${Math.random().toString(36).substring(2, 9)}`;
    const stripeSubId = selectedCompany.stripeSubscriptionId || `sub_${Math.random().toString(36).substring(2, 9)}`;

    let result;
    if (eventType === 'checkout.session.completed') {
      result = handleCheckoutCompleted(selectedCompany, stripeCustId, stripeSubId, total);
    } else if (eventType === 'invoice.paid') {
      result = handleInvoicePaid(selectedCompany, stripeCustId, stripeSubId, total, iva);
    } else if (eventType === 'invoice.payment_failed') {
      result = handlePaymentFailed(selectedCompany, stripeCustId, stripeSubId, total);
    } else {
      result = handleSubscriptionDeleted(selectedCompany, stripeCustId, stripeSubId, price);
    }

    const { eventPayload, statusText, logStatus } = result;

    const formattedPayload = JSON.stringify(eventPayload, null, 2);
    setConsolePayload(formattedPayload);

    // Append to log table
    setSimulatedLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        event: eventType,
        companyName: selectedCompany.nombre,
        status: logStatus,
        payload: statusText
      },
      ...prev
    ]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturación SaaS & Stripe Colombia</h1>
          <p className="text-muted-foreground text-sm">Monitorea los ingresos de la plataforma, configura la pasarela B2B y simula eventos de cobro fiscal (DIAN).</p>
        </div>
        <button 
          onClick={() => {
            const blob = new Blob([JSON.stringify({ mrr, arr, empresas: empresas.map(e => ({ nombre: e.nombre, plan: e.plan, estado: e.estadoCuenta })) }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `optisaas-reporte-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Reporte mensual exportado correctamente.');
          }}
          className="bg-background text-foreground border border-input px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar Reporte Mensual
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="MRR (Ingresos Recurrentes)" 
          value={`$ ${mrr.toLocaleString('es-CO')} COP`} 
          icon={<CreditCard className="w-5 h-5 text-primary" />}
          trend={{ value: `${empresas.filter(e => e.estadoCuenta === 'activo').length} empresas facturando`, isPositive: true }}
          delay={0.1}
        />
        <StatCard 
          title="ARR (Proyección Anual)" 
          value={`$ ${arr.toLocaleString('es-CO')} COP`} 
          icon={<ArrowUpRight className="w-5 h-5 text-success" />}
          subtitle="Basado en MRR actual"
          delay={0.2}
        />
        <StatCard 
          title="Clientes Al Día" 
          value={counts.active} 
          icon={<CheckCircle2 className="w-5 h-5 text-success" />}
          subtitle="Suscripciones activas"
          delay={0.3}
        />
        <StatCard 
          title="Clientes Suspendidos" 
          value={counts.suspended} 
          icon={<AlertTriangle className="w-5 h-5 text-destructive" />}
          subtitle="Por impago o manual"
          delay={0.4}
        />
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 bg-secondary/35 p-1 rounded-xl border border-border w-max">
        <button
          onClick={() => setActiveSubTab('suscripciones')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'suscripciones' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4 text-primary" />
          Control de Suscripciones
        </button>
        <button
          onClick={() => setActiveSubTab('simulador')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'simulador' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Terminal className="w-4 h-4 text-primary" />
          Simulador de Webhooks
        </button>
        <button
          onClick={() => setActiveSubTab('guia')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'guia' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4 text-primary" />
          Guía Stripe Colombia (DIAN)
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: SUSCRIPCIONES Y FACTURACIÓN ACTIVA */}
        {activeSubTab === 'suscripciones' && (
          <motion.div
            key="sub-tab-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Table */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border bg-secondary/20 font-bold text-foreground">
                Estado de Cuentas B2B
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border">
                    <tr>
                      <th className="px-6 py-3">Razón Social</th>
                      <th className="px-6 py-3">Plan</th>
                      <th className="px-6 py-3">Próximo Cobro</th>
                      <th className="px-6 py-3 text-right">Tarifa + IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {empresas.map(emp => {
                      const conf = PLANES_CONFIG[emp.plan];
                      const totalConIva = Math.round(conf.priceCOP * (1 + IVA_RATE));
                      return (
                        <tr key={emp.id} className="hover:bg-secondary/15 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground">{emp.nombre}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">NIT: {emp.nit}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                              emp.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                              emp.plan === 'premium' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                              'bg-slate-500/10 text-slate-600 border-slate-500/20'
                            }`}>
                              {emp.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {emp.nextBillingDate ? (
                              <span className="font-mono">{emp.nextBillingDate}</span>
                            ) : (
                              <span className="italic text-xs">Sin cobro (Suspendido)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-foreground">
                            $ {totalConIva.toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right area: Stripe Settlement and Billing Warnings */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <h3 className="font-bold text-foreground">Liquidación de Stripe</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Los fondos recaudados a través de las pasarelas de pago se liquidan automáticamente a la cuenta bancaria corporativa en Colombia cada 3 días hábiles.
                </p>
                <div className="bg-secondary/40 border border-border/50 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Último depósito:</span>
                    <span className="font-bold font-mono text-foreground">$ {mrr.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-mono">Último periodo</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Banco Destino:</span>
                    <span className="font-semibold">Cuenta Bancaria •••• (Configurada en Stripe)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: INTERACTIVE WEBHOOK SIMULATOR */}
        {activeSubTab === 'simulador' && (
          <motion.div
            key="sub-tab-simulador"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Controls */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  Simulador de Eventos de Stripe (B2B Sandbox)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Dispare eventos simulados en Stripe Colombia para probar la respuesta automática en las licencias del cliente y logs.</p>
              </div>

              {/* Company Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground block">1. Selecciona la Óptica Cliente</label>
                <select
                  value={selectedCompanyId}
                  onChange={e => {
                    setSelectedCompanyId(e.target.value);
                    setConsolePayload('// Empresa cambiada. Listo para simular webhook.');
                  }}
                  className="w-full bg-background border border-input rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Selecciona una empresa registrada...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} (Plan: {e.plan.toUpperCase()} • Estado: {(e.estadoCuenta || 'onboarding').toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Event trigger buttons */}
              <div className="space-y-3 pt-3 border-t border-border/40">
                <label className="text-xs font-bold uppercase text-muted-foreground block">2. Disparar Evento del Webhook</label>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => triggerStripeWebhook('checkout.session.completed')}
                    disabled={!selectedCompanyId}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs p-3 rounded-xl transition-all shadow-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Conversión de Trial (checkout.session.completed)</span>
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-black font-mono">200 OK</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground -mt-1 ml-1 mb-2">Simula que el cliente en Trial ingresa su tarjeta/PSE. Transiciona la cuenta a activa y crea la suscripción en Stripe.</p>

                  <button
                    onClick={() => triggerStripeWebhook('invoice.paid')}
                    disabled={!selectedCompanyId}
                    className="w-full bg-success hover:bg-green-600 text-white font-bold text-xs p-3 rounded-xl transition-all shadow-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Pago Exitoso (invoice.paid)</span>
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-black font-mono">200 OK</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground -mt-1 ml-1">Simula que el cobro mensual se cobró con éxito. Activa la cuenta por 30 días y prepara la factura DIAN.</p>
                  
                  <button
                    onClick={() => triggerStripeWebhook('invoice.payment_failed')}
                    disabled={!selectedCompanyId}
                    className="w-full bg-warning hover:bg-yellow-600 text-warning-foreground font-bold text-xs p-3 rounded-xl transition-all shadow-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Pago Rechazado (invoice.payment_failed)</span>
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-black font-mono">402 PAST_DUE</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground -mt-1 ml-1">Simula tarjeta de crédito rechazada/sin fondos. Suspende temporalmente la óptica y marca estado &apos;past_due&apos;.</p>

                  <button
                    onClick={() => triggerStripeWebhook('customer.subscription.deleted')}
                    disabled={!selectedCompanyId}
                    className="w-full bg-destructive hover:bg-red-600 text-white font-bold text-xs p-3 rounded-xl transition-all shadow-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Suscripción Cancelada (subscription.deleted)</span>
                    <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded font-black font-mono">403 SUSPENDED</span>
                  </button>
                  <p className="text-[10px] text-muted-foreground -mt-1 ml-1">Simula la cancelación de la suscripción. Bloquea de inmediato el ingreso a todo el personal de la óptica.</p>
                </div>
              </div>
            </div>

            {/* Terminal Console Output */}
            <div className="flex flex-col gap-6">
              
              {/* Terminal code preview */}
              <div className="bg-neutral-950 text-emerald-400 font-mono text-[11px] rounded-2xl p-4 border border-neutral-800 shadow-2xl relative min-h-[220px] flex flex-col">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-900 mb-2.5 text-neutral-400">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider font-sans"><Terminal className="w-3.5 h-3.5 text-primary" /> STRIPE_COLOMBIA_WEBHOOK_LOGS</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                </div>
                <pre className="flex-1 overflow-x-auto max-h-[160px] whitespace-pre scrollbar-thin scrollbar-thumb-neutral-800">
                  <code>{consolePayload}</code>
                </pre>
              </div>

              {/* Log Event history list */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground border-b border-border/40 pb-2 mb-3">Historial de Webhooks Recibidos</h4>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                    {simulatedLogs.length > 0 ? (
                      simulatedLogs.map((log, index) => (
                        <div key={index} className="flex justify-between items-start text-xs border-b border-border/30 pb-2 last:border-b-0 first:pt-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground text-[10px]">{log.timestamp}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono border ${
                                log.status === 'success' ? 'bg-success/10 text-success border-success/20' :
                                log.status === 'warning' ? 'bg-warning/10 text-warning-foreground border-warning/20' :
                                'bg-destructive/10 text-destructive border-destructive/20'
                              }`}>
                                {log.event}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-normal font-medium">{log.payload}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-foreground shrink-0">{log.companyName.split(' ')[0]}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-center">
                        <Terminal className="w-8 h-8 mb-2 opacity-20 text-primary" />
                        <p className="font-semibold text-xs">Sin logs en la sesión actual</p>
                        <p className="text-[10px] text-muted-foreground">Dispare un webhook de prueba a la izquierda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3: STRIPE COLOMBIA INTEGRATION GUIDE */}
        {activeSubTab === 'guia' && (
          <motion.div
            key="sub-tab-guia"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Guía de Configuración Técnica: Stripe Colombia & Trial
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Lógica de integración de Stripe Billing B2B, PSE, periodos de gracia sin tarjeta y cumplimiento de facturación electrónica (DIAN).</p>
            </div>

            {/* Trial Architecture Diagram */}
            <div className="bg-secondary/20 border border-border/50 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black uppercase text-foreground tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-2">
                <Activity className="w-4 h-4 text-primary" />
                Ciclo de Vida: Demo de 15 Días sin Tarjeta (Card-Free Trial)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-background border border-border/40 p-3.5 rounded-xl space-y-1.5">
                  <span className="font-bold text-primary block">1. Registro Rápido</span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">La óptica se registra con NIT y Razón Social. No se crea registro en Stripe. Estado local: `trialing` y `Onboarding` activo por 15 días.</p>
                </div>
                <div className="bg-background border border-border/40 p-3.5 rounded-xl space-y-1.5">
                  <span className="font-bold text-amber-500 block">2. Nudges en la App</span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">Desde el día 12, se despliega un banner superior advirtiendo de la expiración del trial e incitando a añadir su tarjeta o PSE.</p>
                </div>
                <div className="bg-background border border-border/40 p-3.5 rounded-xl space-y-1.5">
                  <span className="font-bold text-destructive block">3. Expiración y Bloqueo</span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">Al día 16, el middleware redirige al administrador a la vista de pago. Las sedes y el portal de los asesores/optómetras quedan suspendidos.</p>
                </div>
                <div className="bg-background border border-border/40 p-3.5 rounded-xl space-y-1.5">
                  <span className="font-bold text-success block">4. Stripe & PSE Checkout</span>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">El cliente realiza el pago. Webhook detecta `checkout.session.completed`, actualiza el estado a `active` y reactiva el software en 1 segundo.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Architecture & Payment Methods */}
              <div className="space-y-4">
                
                {/* Moneda y cobros */}
                <div className="bg-secondary/15 border border-border/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    1. Moneda Local (COP) y Evitar Conversión
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Stripe Colombia permite procesar cobros directamente en **Pesos Colombianos (COP)**. Configurar la moneda en COP es indispensable para evitar que los bancos locales cobren comisiones de conversión de moneda extranjera (DCC) o consideren las suscripciones B2B como compras internacionales en dólares.
                  </p>
                </div>

                {/* PSE & Tarjetas */}
                <div className="bg-secondary/15 border border-border/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    2. Soporte PSE (Pagos Seguros del Estado)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    En Colombia, muchas ópticas independientes y PYMES no cuentan con tarjetas de crédito corporativas. Es mandatorio habilitar **PSE (débito a cuentas de ahorro y corrientes)** a través del Payment Element de Stripe. Las webhooks del sistema gestionan de forma nativa la espera del pago de PSE que suele tardar de 1 a 6 horas en conciliarse.
                  </p>
                </div>

              </div>

              {/* DIAN & Invoicing */}
              <div className="space-y-4">
                
                {/* Facturacion Electronica */}
                <div className="bg-secondary/15 border border-border/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    3. Cumplimiento Fiscal DIAN (XML Legal)
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    El SaaS en Colombia está sujeto a impuestos locales (19% de IVA). Las webhooks del sistema interceptan el evento de pago exitoso de Stripe (`invoice.paid`) y envían la información legal (Razón social, NIT, email, base imponible e IVA) a la API de **Factus** (Proveedor Tecnológico Autorizado) para emitir la factura electrónica oficial, generar el código QR con el CUFE y enviarla directamente al correo Dian del adquirente.
                  </p>
                </div>

                {/* API Webhooks configuration */}
                <div className="bg-secondary/15 border border-border/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    4. Configuración del Endpoint de Webhooks
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    En la consola de Stripe, se debe apuntar el webhook a:
                    <code className="block bg-neutral-900 text-emerald-400 p-2 rounded text-[10px] font-mono mt-1 text-center">
                      https://api.optisaas.co/api/v1/stripe/webhook
                    </code>
                    Habilitando exclusivamente los eventos: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` y `checkout.session.completed`.
                  </p>
                </div>

              </div>
            </div>

            {/* Code Snippets Section */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold text-foreground">Implementación de Código (Next.js & Stripe Node SDK)</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-[11px]">
                {/* Checkout session creation snippet */}
                <div className="bg-neutral-950 text-neutral-300 rounded-xl p-4 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-neutral-500 border-b border-neutral-900 pb-1.5 text-[10px] font-sans font-bold">
                    <span>CREATE CHECKOUT SESSION (COP & PSE)</span>
                    <span>app/api/stripe/checkout/route.ts</span>
                  </div>
                  <pre className="overflow-x-auto max-h-[350px] scrollbar-thin">
                    <code>{`import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { companyId, plan, email, nit } = await req.json();
  const prices = { 
    basico: 'price_1Qbasic_500k', 
    premium: 'price_1Qpremium_15m', 
    enterprise: 'price_1Qenterprise_45m' 
  };
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pse'], // Obligatorio PSE en Colombia
      payment_method_options: {
        pse: { setup_future_usage: 'none' } // PSE no es recurrente directo
      },
      customer_email: email,
      line_items: [{ price: prices[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success\`,
      cancel_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=cancel\`,
      metadata: { companyId, nit }
    });
    
    return Response.json({ url: session.url });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}`}</code>
                  </pre>
                </div>

                {/* Webhook endpoint controller snippet */}
                <div className="bg-neutral-950 text-neutral-300 rounded-xl p-4 border border-neutral-800 space-y-2">
                  <div className="flex justify-between text-neutral-500 border-b border-neutral-900 pb-1.5 text-[10px] font-sans font-bold">
                    <span>WEBHOOK HANDLER (TRIAL CONVERSION & DIAN)</span>
                    <span>app/api/stripe/webhook/route.ts</span>
                  </div>
                  <pre className="overflow-x-auto max-h-[350px] scrollbar-thin">
                    <code>{`import Stripe from 'stripe';
import { db } from '@/lib/db';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  // 1. Conversión del Trial a Suscripción Activa
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { companyId } = session.metadata;

    await db.empresa.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: 'active',
        estadoCuenta: 'activo',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        nextBillingDate: new Date(Date.now() + 30*24*60*60*1000)
      }
    });
  }

  // 2. Factura Cobrada -> Emitir Facturación Electrónica DIAN
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const { nit } = invoice.metadata;

    // Llamado al proveedor tecnológico local en Colombia (ej: Factus API)
    await fetch('https://api.factus.co/v1/bills', {
      method: 'POST',
      headers: { 
        'Authorization': \`Bearer \${process.env.FACTUS_API_KEY}\`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        customer: { nit, email: invoice.customer_email },
        items: [{ 
          name: "Suscripción Mensual SaaS OptiSaaS", 
          price: invoice.amount_paid - invoice.tax, 
          tax: invoice.tax // IVA 19%
        }]
      })
    });
  }

  return Response.json({ received: true });
}`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Portal Stripe shortcut info */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-foreground block">Customer Portal Autogestionable</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  El sistema se integra con el Customer Portal de Stripe. Esto permite que las ópticas clientes actualicen su tarjeta de crédito, descarguen sus certificados de retención ICA/Retefuente, cambien de plan o cancelen su suscripción por su cuenta sin intervención de soporte técnico.
                </p>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
