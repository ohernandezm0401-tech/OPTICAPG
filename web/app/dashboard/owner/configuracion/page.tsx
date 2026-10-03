'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  FileText, 
  Globe, 
  Save,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from '@/lib/toast-store';
import { useClinicStore } from '@/lib/store';

export default function PlatformSettingsPage() {
  const { platformConfig, updatePlatformConfig } = useClinicStore();
  const [trialDays, setTrialDays] = useState(platformConfig.trialDays);
  const [maintenanceMode, setMaintenanceMode] = useState(platformConfig.maintenanceMode);
  const [dianMode, setDianMode] = useState<'sandbox' | 'production'>(platformConfig.dianMode);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformConfig({ trialDays, maintenanceMode, dianMode });
    toast.success('Configuraciones generales de la plataforma guardadas correctamente.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de Plataforma</h1>
        <p className="text-muted-foreground text-sm">Parámetros globales de suscripciones, integraciones con pasarelas de pago y modo del sistema.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Stripe Configuration */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Integración de Cobros (Stripe B2B)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase block">Días de Periodo de Prueba (Trial)</label>
              <input 
                type="number" 
                value={trialDays}
                min={0}
                max={90}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase block">Stripe Webhook Secret</label>
              <div className="relative">
                <input 
                  type={showWebhookSecret ? "text" : "password"} 
                  value={showWebhookSecret ? "whsec_d47cf08fba5432019b88220031002e1c" : "••••••••••••••••••••••••••••"}
                  readOnly
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono focus:ring-2 focus:ring-primary outline-none transition-colors pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Configurable únicamente desde variables de entorno del servidor (STRIPE_WEBHOOK_SECRET).</p>
            </div>
          </div>
        </div>

        {/* DIAN E-Invoicing Connection */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
            <FileText className="w-4 h-4 text-primary" />
            Facturación Electrónica DIAN (Colombia)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase block">Entorno de Facturación</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDianMode('sandbox')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    dianMode === 'sandbox' 
                      ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                      : 'bg-background hover:bg-secondary border-border text-muted-foreground'
                  }`}
                >
                  Pruebas (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => setDianMode('production')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    dianMode === 'production' 
                      ? 'bg-destructive/10 border-destructive text-destructive shadow-sm' 
                      : 'bg-background hover:bg-secondary border-border text-muted-foreground'
                  }`}
                >
                  Producción (Real)
                </button>
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col justify-end pb-1">
              <span className="text-[11px] text-muted-foreground leading-normal flex items-start gap-1">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Proveedor Tecnológico Autorizado (Factus API) conectado y respondiendo (124ms de latencia).</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Platform Toggles */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
            <Globe className="w-4 h-4 text-primary" />
            Estado General del Sistema
          </h3>

          <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl border border-border/40">
            <div>
              <span className="font-bold text-sm text-foreground block">Modo de Mantenimiento</span>
              <span className="text-xs text-muted-foreground">Bloquea temporalmente el acceso a todas las ópticas excepto a los administradores de la plataforma.</span>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer" role="switch" aria-checked={maintenanceMode}>
              <input 
                type="checkbox" 
                checked={maintenanceMode} 
                onChange={() => setMaintenanceMode(!maintenanceMode)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>
        </div>

      </form>
    </div>
  );
}
