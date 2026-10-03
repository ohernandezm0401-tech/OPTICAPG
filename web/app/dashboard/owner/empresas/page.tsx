'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Plus, 
  Building2, 
  MapPin, 
  Users, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Ban, 
  X, 
  CreditCard, 
  Calendar, 
  Settings, 
  AlertCircle, 
  Activity, 
  CheckCircle2, 
  ShieldAlert,
  Zap,
  Globe,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { toast } from '@/lib/toast-store';
import { Empresa } from '@/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { IVA_RATE } from '@/lib/constants';

function EmpresasPageContent() {
  const { empresas, sedes, usuarios, addEmpresa, updateEmpresa } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('onboarding') === 'true') {
      setShowOnboardingModal(true);
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);


  // Stripe Syncing Animation State
  const [isSyncingStripe, setIsSyncingStripe] = useState(false);

  // Form states for onboarding (Colombia-focused)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoNit, setNuevoNit] = useState('');
  const [nuevoPlan, setNuevoPlan] = useState<'basico' | 'premium' | 'enterprise'>('basico');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoCiudad, setNuevoCiudad] = useState('Bogotá');
  const [nuevoReps, setNuevoReps] = useState('');
  const [nuevoTrialDays, setNuevoTrialDays] = useState(15);
  const [nuevoOverrides, setNuevoOverrides] = useState<Record<string, boolean>>({});
  const [customMaxSedesInput, setCustomMaxSedesInput] = useState<number | ''>('');
  const [customMaxUsuariosInput, setCustomMaxUsuariosInput] = useState<number | ''>('');

  // Search filtering
  const empresasFiltered = empresas.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.nit.includes(searchTerm)
  );

  const handleCrearEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoNit) {
      toast.warning('Razón Social y NIT son requeridos.');
      return;
    }

    const companyId = `emp-${Date.now()}`;
    const newCompany: Empresa = {
      id: companyId,
      nombre: nuevoNombre,
      nit: nuevoNit,
      plan: nuevoPlan,
      stripeCustomerId: `cus_${Math.random().toString(36).substring(2, 10)}`,
      stripeSubscriptionId: `sub_${Math.random().toString(36).substring(2, 10)}`,
      subscriptionStatus: 'trialing',
      nextBillingDate: new Date(Date.now() + nuevoTrialDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customMaxSedes: customMaxSedesInput !== '' ? customMaxSedesInput : undefined,
      customMaxUsuarios: customMaxUsuariosInput !== '' ? customMaxUsuariosInput : undefined,
      customModulesOverride: Object.keys(nuevoOverrides).length > 0 ? nuevoOverrides : undefined,
      estadoCuenta: 'onboarding'
    };

    addEmpresa(newCompany);
    toast.success(`Setup de Onboarding iniciado para "${nuevoNombre}"`);
    setNuevoNombre('');
    setNuevoNit('');
    setNuevoPlan('basico');
    setNuevoEmail('');
    setNuevoTelefono('');
    setNuevoReps('');
    setNuevoTrialDays(15);
    setNuevoOverrides({});
    setCustomMaxSedesInput('');
    setCustomMaxUsuariosInput('');
    setOnboardingStep(1);
    setShowOnboardingModal(false);
  };

  const handleUpdatePlan = (plan: 'basico' | 'premium' | 'enterprise') => {
    if (!selectedEmpresa) return;
    
    updateEmpresa(selectedEmpresa.id, { plan });
    setSelectedEmpresa(prev => prev ? { ...prev, plan } : null);
    toast.success(`Plan SaaS cambiado a ${plan.toUpperCase()}`);
  };

  const handleToggleEstadoCuenta = () => {
    if (!selectedEmpresa) return;
    
    const nuevoEstado = selectedEmpresa.estadoCuenta === 'suspendido' ? 'activo' : 'suspendido';
    updateEmpresa(selectedEmpresa.id, { estadoCuenta: nuevoEstado });
    setSelectedEmpresa(prev => prev ? { ...prev, estadoCuenta: nuevoEstado } : null);
    
    if (nuevoEstado === 'suspendido') {
      toast.error('Cuenta suspendida. Accesos inhabilitados temporalmente.');
    } else {
      toast.success('Cuenta reactivada satisfactoriamente.');
    }
  };

  const handleSyncStripe = async () => {
    if (!selectedEmpresa) return;
    
    setIsSyncingStripe(true);
    // Simulate API webhook polling from Stripe B2B Billing API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    updateEmpresa(selectedEmpresa.id, { 
      subscriptionStatus: 'active',
      estadoCuenta: 'activo',
      nextBillingDate: formattedNextDate
    });

    setSelectedEmpresa(prev => prev ? { 
      ...prev, 
      subscriptionStatus: 'active', 
      estadoCuenta: 'activo',
      nextBillingDate: formattedNextDate 
    } : null);

    setIsSyncingStripe(false);
    toast.success('Suscripción sincronizada con Stripe. Estado: AL DÍA (active)');
  };

  const handleUpdateLimits = (field: 'customMaxSedes' | 'customMaxUsuarios', val: number) => {
    if (!selectedEmpresa) return;
    
    const updateObj = { [field]: val > 0 ? val : undefined };
    updateEmpresa(selectedEmpresa.id, updateObj);
    setSelectedEmpresa(prev => prev ? { ...prev, ...updateObj } : null);
    toast.success('Límites personalizados actualizados');
  };

  const handleToggleModuleOverride = (moduleName: string, currentVal: boolean) => {
    if (!selectedEmpresa) return;
    
    const prevOverrides = selectedEmpresa.customModulesOverride || {};
    const newOverrides = {
      ...prevOverrides,
      [moduleName]: !currentVal
    };

    updateEmpresa(selectedEmpresa.id, { customModulesOverride: newOverrides });
    setSelectedEmpresa(prev => prev ? { ...prev, customModulesOverride: newOverrides } : null);
    toast.info(`Override de módulo actualizado: ${moduleName}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Clientes (Tenants)</h1>
          <p className="text-muted-foreground text-sm">Administra la facturación, los límites del sistema y los módulos activos para las ópticas registradas.</p>
        </div>
        <button 
          onClick={() => setShowOnboardingModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Empresa (Onboarding)
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20 rounded-t-2xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por razón social o NIT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors w-full sm:w-auto font-medium">
            <Filter className="w-4 h-4" /> Filtrar por Plan
          </button>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-3.5 font-bold">Razón Social / NIT</th>
                <th className="px-6 py-3.5 font-bold">Infraestructura</th>
                <th className="px-6 py-3.5 font-bold">Plan SaaS</th>
                <th className="px-6 py-3.5 font-bold">Estado Cuenta</th>
                <th className="px-6 py-3.5 text-right font-bold">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {empresasFiltered.map((empresa, idx) => {
                const sedesEmpresa = sedes.filter(s => s.empresaId === empresa.id);
                const usuariosEmpresa = usuarios.filter(u => u.empresaId === empresa.id);
                const pConfig = PLANES_CONFIG[empresa.plan];

                // Calculate active usage vs cap
                const maxSedes = empresa.customMaxSedes ?? pConfig.maxSedes;
                const maxUsuarios = empresa.customMaxUsuarios ?? pConfig.maxUsuarios;

                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={empresa.id} 
                    className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                    onClick={() => setSelectedEmpresa(empresa)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">{empresa.nombre}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">NIT: {empresa.nit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground" /> 
                          Sedes: {sedesEmpresa.length} / {maxSedes === 999 ? '∞' : maxSedes}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Users className="w-3 h-3 text-muted-foreground" /> 
                          Usuarios: {usuariosEmpresa.length} / {maxUsuarios === 999 ? '∞' : maxUsuarios}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        empresa.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                        empresa.plan === 'premium' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      }`}>
                        {empresa.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        empresa.estadoCuenta === 'activo' || empresa.subscriptionStatus === 'active'
                          ? 'bg-success/10 text-success border-success/20'
                          : empresa.estadoCuenta === 'suspendido'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          empresa.estadoCuenta === 'activo' || empresa.subscriptionStatus === 'active' ? 'bg-success' :
                          empresa.estadoCuenta === 'suspendido' ? 'bg-destructive' : 'bg-warning'
                        }`}></span> 
                        {empresa.estadoCuenta === 'activo' ? 'Al día (Active)' :
                         empresa.estadoCuenta === 'suspendido' ? 'Suspendido' : 'Onboarding'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedEmpresa(empresa)}
                          className="p-2 bg-secondary/80 border border-border text-foreground hover:text-primary hover:border-primary/30 rounded-xl transition-all font-semibold text-xs flex items-center gap-1"
                          title="Gestionar Límites y Módulos"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Gestionar
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: GESTIONAR TENANT (Límites, Módulos, Stripe Billing) */}
      <AnimatePresence>
        {selectedEmpresa && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-border my-8 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">{selectedEmpresa.nombre}</h2>
                    <p className="text-xs text-muted-foreground font-mono">ID Tenant: {selectedEmpresa.id} • NIT: {selectedEmpresa.nit}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmpresa(null)}
                  className="text-muted-foreground hover:text-foreground p-1.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-6 space-y-6 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
                
                {/* 1. Plan Config & Stripe Billing Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3">
                    <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      Plan de Suscripción SaaS
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['basico', 'premium', 'enterprise'] as const).map(tier => (
                        <button
                          key={tier}
                          onClick={() => handleUpdatePlan(tier)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border uppercase transition-all ${
                            selectedEmpresa.plan === tier 
                              ? 'bg-primary/15 border-primary text-primary shadow-sm' 
                              : 'bg-background hover:bg-secondary border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-normal">
                      Precio mensual: <strong className="text-foreground">$ {PLANES_CONFIG[selectedEmpresa.plan].priceCOP.toLocaleString('es-CO')} COP</strong>. Modificar el plan recalcula las cuotas en Stripe.
                    </div>
                  </div>

                  <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3">
                    <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Pasarela de Pagos (Stripe Billing)
                    </h3>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-muted-foreground">Stripe ID:</span> <span className="font-mono font-semibold text-foreground">{selectedEmpresa.stripeCustomerId || 'No enlazado'}</span></p>
                      <p><span className="text-muted-foreground">Suscripción:</span> <span className="font-mono font-semibold text-foreground">{selectedEmpresa.stripeSubscriptionId || 'No enlazada'}</span></p>
                      <p className="flex justify-between items-center pt-1.5">
                        <span className="text-muted-foreground">Stripe Status:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          selectedEmpresa.subscriptionStatus === 'active' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                        }`}>
                          {selectedEmpresa.subscriptionStatus || 'Inactivo'}
                        </span>
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                      <button
                        onClick={handleSyncStripe}
                        disabled={isSyncingStripe}
                        className="bg-primary hover:bg-blue-600 text-white font-bold text-[10px] py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {isSyncingStripe ? 'Sincronizando...' : 'Sincronizar Stripe'}
                      </button>
                      <button
                        onClick={() => {
                          toast.info('Redirigiendo al Customer Portal de Stripe...');
                        }}
                        className="bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[10px] py-1.5 rounded-lg border border-border/50 transition-colors flex items-center justify-center gap-1"
                      >
                        Ver Portal Stripe
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Modules Activation / Overrides */}
                <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <h3 className="text-xs font-black uppercase text-muted-foreground">
                      Módulos y Licencias Activas
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      (Configurable por Plan con Overrides Manuales)
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {Object.keys(PLANES_CONFIG[selectedEmpresa.plan].modules).map(moduleKey => {
                      // Defaults based on selected plan
                      const planDefault = PLANES_CONFIG[selectedEmpresa.plan].modules[moduleKey as keyof typeof PLANES_CONFIG['basico']['modules']];
                      // Checks if there is a custom override for this tenant
                      const isOverridden = selectedEmpresa.customModulesOverride?.[moduleKey as keyof typeof selectedEmpresa.customModulesOverride] !== undefined;
                      const activeValue = isOverridden 
                        ? selectedEmpresa.customModulesOverride?.[moduleKey as keyof typeof selectedEmpresa.customModulesOverride] 
                        : planDefault;

                      return (
                        <div key={moduleKey} className="flex justify-between items-center p-2.5 bg-background border border-border/30 rounded-xl hover:border-border/60 transition-colors">
                          <div>
                            <span className="font-semibold text-foreground block capitalize">
                              {moduleKey.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-medium">
                              {isOverridden ? '⚠️ Override Manual Activo' : 'Predeterminado del Plan'}
                            </span>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!activeValue} 
                              onChange={() => handleToggleModuleOverride(moduleKey, !!activeValue)}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* WhatsApp Service Config */}
                <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" />
                    Servicio de WhatsApp
                  </h3>
                  <div className="flex justify-between items-center p-2.5 bg-background border border-border/30 rounded-xl hover:border-border/60 transition-colors">
                    <div className="text-left">
                      <span className="font-semibold text-foreground block text-xs">
                        Mensajes y Alertas Automatizados
                      </span>
                      <span className="text-[9px] text-muted-foreground font-medium block mt-0.5">
                        Habilita o deshabilita el envío automático de notificaciones de citas y laboratorio.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedEmpresa.whatsappHabilitado !== false} 
                        onChange={() => {
                          const newVal = selectedEmpresa.whatsappHabilitado === false ? true : false;
                          updateEmpresa(selectedEmpresa.id, { whatsappHabilitado: newVal });
                          setSelectedEmpresa(prev => prev ? { ...prev, whatsappHabilitado: newVal } : null);
                          toast.success(`Servicio de WhatsApp ${newVal ? 'habilitado' : 'deshabilitado'} para la empresa.`);
                        }}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* 3. Resource Limits Config */}
                <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-muted-foreground border-b border-border/40 pb-2">
                    Límites de Uso e Infraestructura
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Sedes Creadas:</span>
                        <span className="font-bold font-mono">{sedes.filter(s => s.empresaId === selectedEmpresa.id).length}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Límite Máximo de Sedes</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-mono w-24 outline-none"
                            value={selectedEmpresa.customMaxSedes ?? PLANES_CONFIG[selectedEmpresa.plan].maxSedes}
                            onChange={(e) => handleUpdateLimits('customMaxSedes', Number(e.target.value))}
                          />
                          <button
                            onClick={() => handleUpdateLimits('customMaxSedes', 0)}
                            className="text-[10px] text-primary font-bold hover:underline"
                          >
                            Restaurar Plan
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Usuarios Creados:</span>
                        <span className="font-bold font-mono">{usuarios.filter(u => u.empresaId === selectedEmpresa.id).length}</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">Límite Máximo de Usuarios</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs font-mono w-24 outline-none"
                            value={selectedEmpresa.customMaxUsuarios ?? PLANES_CONFIG[selectedEmpresa.plan].maxUsuarios}
                            onChange={(e) => handleUpdateLimits('customMaxUsuarios', Number(e.target.value))}
                          />
                          <button
                            onClick={() => handleUpdateLimits('customMaxUsuarios', 0)}
                            className="text-[10px] text-primary font-bold hover:underline"
                          >
                            Restaurar Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Action Banner */}
                <div className="bg-destructive/5 rounded-2xl border border-destructive/20 p-4 flex justify-between items-center">
                  <div className="flex gap-2.5 items-start">
                    <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-destructive-foreground">Zona de Peligro / Suspensiones</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Suspende inmediatamente la cuenta por falta de pago o violaciones a los términos de servicio.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleEstadoCuenta}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                      selectedEmpresa.estadoCuenta === 'suspendido'
                        ? 'bg-success hover:bg-green-600 text-white'
                        : 'bg-destructive hover:bg-red-600 text-white'
                    }`}
                  >
                    {selectedEmpresa.estadoCuenta === 'suspendido' ? 'Reactivar Óptica' : 'Suspender Óptica'}
                  </button>
                </div>

              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-border gap-2">
                <button
                  onClick={() => setSelectedEmpresa(null)}
                  className="bg-secondary hover:bg-secondary/80 text-foreground px-5 py-2.5 rounded-xl text-xs font-bold transition-all border border-border"
                >
                  Cerrar Configuración
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE MODAL: ONBOARDING */}
      <AnimatePresence>
        {showOnboardingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-border my-8"
              onClick={e => e.stopPropagation()}
            >
              {/* Wizard Header */}
              <div className="flex justify-between items-center pb-3 border-b border-border mb-5">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Asistente de Onboarding - Nueva Óptica
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Creación de Tenant e Integración de Recaudo COP</p>
                </div>
                <button 
                  onClick={() => {
                    setShowOnboardingModal(false);
                    setOnboardingStep(1);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Indicator */}
              <div className="flex justify-between items-center mb-6 bg-secondary/35 p-3 rounded-xl border border-border/50">
                {[1, 2, 3].map(st => (
                  <div key={st} className="flex items-center gap-2 flex-1 justify-center last:flex-initial">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                      onboardingStep === st 
                        ? 'bg-primary border-primary text-primary-foreground shadow-sm ring-4 ring-primary/10' 
                        : onboardingStep > st
                          ? 'bg-success/15 border-success text-success'
                          : 'bg-background border-border text-muted-foreground'
                    }`}>
                      {onboardingStep > st ? <CheckCircle2 className="w-4 h-4" /> : st}
                    </div>
                    <span className={`text-xs font-semibold ${onboardingStep === st ? 'text-foreground' : 'text-muted-foreground'} hidden sm:inline`}>
                      {st === 1 ? 'Identificación' : st === 2 ? 'Plan & Módulos' : 'Stripe Colombia'}
                    </span>
                    {st < 3 && <div className="hidden sm:block h-px bg-border flex-1 mx-2" />}
                  </div>
                ))}
              </div>

              <form onSubmit={e => e.preventDefault()} className="space-y-5">
                
                {/* STEP 1: IDENTIFICACIÓN Y DATOS CLÍNICOS */}
                {onboardingStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                    <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/10 mb-2">
                      <p className="text-[11px] text-muted-foreground leading-normal font-medium">
                        Ingrese la información legal de la óptica. El NIT y la habilitación de salud son indispensables para el cumplimiento normativo en Colombia (Secretaría de Salud).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground block">Razón Social *</label>
                      <input 
                        type="text" 
                        required 
                        value={nuevoNombre} 
                        onChange={(e) => setNuevoNombre(e.target.value)} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors" 
                        placeholder="Ej: Óptica Visión Total S.A.S" 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">NIT (Identificación Tributaria Colombia) *</label>
                        <input 
                          type="text" 
                          required 
                          value={nuevoNit} 
                          onChange={(e) => setNuevoNit(e.target.value)} 
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors font-mono" 
                          placeholder="901.123.456-7" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">Código REPS (Habilitación Minsalud)</label>
                        <input 
                          type="text" 
                          value={nuevoReps} 
                          onChange={(e) => setNuevoReps(e.target.value)} 
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors font-mono" 
                          placeholder="110010987601 (Opcional)" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">Email Administrador Principal *</label>
                        <input 
                          type="email" 
                          required
                          value={nuevoEmail} 
                          onChange={(e) => setNuevoEmail(e.target.value)} 
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors" 
                          placeholder="administrador@visiontotal.co" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">Teléfono Móvil</label>
                        <input 
                          type="tel" 
                          value={nuevoTelefono} 
                          onChange={(e) => setNuevoTelefono(e.target.value)} 
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors" 
                          placeholder="3001234567" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground block">Ciudad Principal</label>
                      <select 
                        value={nuevoCiudad} 
                        onChange={(e) => setNuevoCiudad(e.target.value)} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                      >
                        <option value="Bogotá">Bogotá D.C. (Principal)</option>
                        <option value="Medellín">Medellín</option>
                        <option value="Cali">Cali</option>
                        <option value="Barranquilla">Barranquilla</option>
                        <option value="Bucaramanga">Bucaramanga</option>
                        <option value="Otro">Otras Ciudades</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
                      <button 
                        type="button" 
                        onClick={() => setShowOnboardingModal(false)} 
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (!nuevoNombre || !nuevoNit || !nuevoEmail) {
                            toast.warning('Por favor complete todos los campos obligatorios (*)');
                            return;
                          }
                          setOnboardingStep(2);
                        }}
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center gap-1"
                      >
                        Siguiente: Configurar Plan <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: SELECCIÓN DE PLAN Y LÍMITES / OVERRIDES */}
                {onboardingStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                    <span className="text-xs font-bold uppercase text-muted-foreground block">Seleccione el Plan Comercial</span>
                    
                    {/* Plan Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['basico', 'premium', 'enterprise'] as const).map(tier => {
                        const conf = PLANES_CONFIG[tier];
                        const isSelected = nuevoPlan === tier;
                        return (
                          <div
                            key={tier}
                            onClick={() => {
                              setNuevoPlan(tier);
                              // Clear limits when plan is changed
                              setCustomMaxSedesInput('');
                              setCustomMaxUsuariosInput('');
                            }}
                            className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected 
                                ? 'border-primary bg-primary/5 shadow-md scale-[1.02] ring-2 ring-primary/10' 
                                : 'border-border bg-background hover:bg-secondary/40'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-xs uppercase text-foreground">{conf.name}</span>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                              </div>
                              <div className="text-sm font-black text-foreground font-mono">$ {(conf.priceCOP/1000).toFixed(0)}K <span className="text-[10px] font-normal text-muted-foreground">COP/m</span></div>
                              <ul className="text-[10px] text-muted-foreground space-y-1 mt-3">
                                <li>Sedes: {conf.maxSedes === 999 ? 'Ilimitadas' : conf.maxSedes}</li>
                                <li>Usuarios: {conf.maxUsuarios === 999 ? 'Ilimitados' : conf.maxUsuarios}</li>
                              </ul>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Override resource limits */}
                    <div className="bg-secondary/20 rounded-xl border border-border/40 p-4 space-y-3">
                      <span className="text-xs font-bold text-foreground block">Personalización de Límites del Plan</span>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground block">Límite Sedes (Defecto: {PLANES_CONFIG[nuevoPlan].maxSedes === 999 ? 'Ilimitadas' : PLANES_CONFIG[nuevoPlan].maxSedes})</label>
                          <input 
                            type="number"
                            value={customMaxSedesInput}
                            onChange={e => setCustomMaxSedesInput(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="Personalizado" 
                            className="w-full px-3 py-1.5 bg-background border border-input rounded-lg font-mono outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted-foreground block">Límite Usuarios (Defecto: {PLANES_CONFIG[nuevoPlan].maxUsuarios === 999 ? 'Ilimitados' : PLANES_CONFIG[nuevoPlan].maxUsuarios})</label>
                          <input 
                            type="number"
                            value={customMaxUsuariosInput}
                            onChange={e => setCustomMaxUsuariosInput(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder="Personalizado" 
                            className="w-full px-3 py-1.5 bg-background border border-input rounded-lg font-mono outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Module Checkboxes with Overrides */}
                    <div className="bg-secondary/20 rounded-xl border border-border/40 p-4 space-y-2">
                      <span className="text-xs font-bold text-foreground block">Módulos Habilitados (Personalizado)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {Object.keys(PLANES_CONFIG[nuevoPlan].modules).map(moduleKey => {
                          const planDefault = PLANES_CONFIG[nuevoPlan].modules[moduleKey as keyof typeof PLANES_CONFIG['basico']['modules']];
                          const isOverridden = nuevoOverrides[moduleKey] !== undefined;
                          const activeValue = isOverridden ? nuevoOverrides[moduleKey] : planDefault;

                          return (
                            <label 
                              key={moduleKey}
                              className={`flex items-center justify-between p-2 rounded-lg border transition-all select-none cursor-pointer ${
                                activeValue 
                                  ? 'bg-background border-primary/20 text-foreground font-semibold' 
                                  : 'bg-background/45 border-border/50 text-muted-foreground'
                              }`}
                            >
                              <span className="capitalize">{moduleKey.replace(/([A-Z])/g, ' $1')}</span>
                              <input 
                                type="checkbox" 
                                checked={!!activeValue} 
                                onChange={() => {
                                  setNuevoOverrides(prev => ({
                                    ...prev,
                                    [moduleKey]: !activeValue
                                  }));
                                }}
                                className="rounded text-primary focus:ring-primary w-4 h-4" 
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border mt-4">
                      <button 
                        type="button" 
                        onClick={() => setOnboardingStep(1)} 
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                      >
                        Atrás
                      </button>
                      <button 
                        type="button"
                        onClick={() => setOnboardingStep(3)}
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center gap-1"
                      >
                        Siguiente: Checkout Stripe <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: RESUMEN DE COBRO Y CHECKOUT LINK */}
                {onboardingStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
                    <span className="text-xs font-bold uppercase text-muted-foreground block">Resumen de Facturación & Enlace Stripe</span>

                    <div className="bg-secondary/15 rounded-2xl border border-border/50 p-4 space-y-3.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Óptica a Registrar:</span>
                        <span className="font-bold text-foreground">{nuevoNombre}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">NIT de Facturación:</span>
                        <span className="font-mono font-bold text-foreground">{nuevoNit}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Plan Seleccionado:</span>
                        <span className="font-bold text-primary uppercase">{nuevoPlan}</span>
                      </div>
                      
                      <div className="border-t border-border/40 pt-2.5 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Tarifa Mensual (Base COP):</span>
                          <span className="font-mono text-foreground">$ {PLANES_CONFIG[nuevoPlan].priceCOP.toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Impuesto IVA (19% local):</span>
                          <span className="font-mono text-foreground">$ {Math.round(PLANES_CONFIG[nuevoPlan].priceCOP * IVA_RATE).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-black border-t border-border/40 pt-2 text-foreground">
                          <span>Total Mensual Neto (COP):</span>
                          <span className="font-mono text-primary">$ {Math.round(PLANES_CONFIG[nuevoPlan].priceCOP * (1 + IVA_RATE)).toLocaleString('es-CO')} COP</span>
                        </div>
                      </div>
                    </div>

                    {/* Trial Period Configuration */}
                    <div className="bg-secondary/20 rounded-xl border border-border/40 p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="font-semibold text-foreground">Periodo de Prueba (Días de Trial)</label>
                        <span className="font-mono font-bold text-primary">{nuevoTrialDays} Días</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="60" 
                        step="5"
                        value={nuevoTrialDays}
                        onChange={(e) => setNuevoTrialDays(Number(e.target.value))}
                        className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Stripe no cargará la tarjeta de crédito del cliente hasta que expire este periodo.</p>
                    </div>

                    {/* Stripe Visual Link Generation Preview */}
                    <div className="border border-primary/20 rounded-xl p-3 bg-primary/5 space-y-2">
                      <span className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        Stripe Checkout Link (Colombia)
                      </span>
                      <div className="bg-background border border-border/50 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground overflow-hidden">
                        <span className="truncate pr-4 select-all">
                          https://checkout.stripe.com/pay/c_opti_{nuevoPlan}_{nuevoNit.replace(/\D/g, '')}
                        </span>
                        <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded font-bold font-sans">
                          B2B COP
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border mt-4">
                      <button 
                        type="button" 
                        onClick={() => setOnboardingStep(2)} 
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                      >
                        Atrás
                      </button>
                      <button 
                        type="submit" 
                        onClick={handleCrearEmpresa}
                        className="px-5 py-2.5 bg-success hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center gap-1.5"
                      >
                        <Globe className="w-4 h-4" />
                        Iniciar Setup y Generar Link
                      </button>
                    </div>
                  </div>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmpresasPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Cargando gestión de clientes...</div>}>
      <EmpresasPageContent />
    </Suspense>
  );
}
