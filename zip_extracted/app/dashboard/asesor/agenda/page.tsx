'use client';

import React from 'react';
import { Calendar, Clock, User, FileText, CheckCircle } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/lib/toast-store';
import { motion } from 'motion/react';

export default function AgendaPage() {
  const { citas, pacientes, updateCitaStatus } = useClinicStore();
  
  // Enriquecer citas con datos del paciente
  const citasHoy = citas.map(cita => ({
    ...cita,
    paciente: pacientes.find(p => p.id === cita.pacienteId)
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda Comercial</h1>
          <p className="text-muted-foreground text-sm">Control de citas, llegadas y asignación a consultorio.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-background text-foreground border border-input px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors shadow-sm">
            Ver Calendario
          </button>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm">
            Agendar Cita
          </button>
        </div>
      </div>

      {/* Kanban Board / Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Por Llegar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Por Llegar
            </h3>
            <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {citasHoy.filter(c => c.estadoComercial === 'por-llegar').length}
            </span>
          </div>
          
          <div className="space-y-3">
            {citasHoy.filter(c => c.estadoComercial === 'por-llegar').map((cita, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={cita.id} 
                className="bg-card border border-border p-4 rounded-xl shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <StatusBadge status={cita.estadoComercial} />
                </div>
                <div className="font-bold mb-1">
                  {cita.paciente?.apellido}, {cita.paciente?.nombre}
                </div>
                <div className="text-xs text-muted-foreground mb-3 line-clamp-1">
                  Motivo: {cita.motivoClinico}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-secondary hover:bg-secondary/80 text-xs font-medium py-1.5 rounded-md transition-colors">
                    Llamar
                  </button>
                  <button 
                    onClick={() => {
                      updateCitaStatus(cita.id, 'en-sala');
                      toast.success('✓ Paciente pasado a Sala');
                    }}
                    className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold py-1.5 rounded-md transition-colors"
                  >
                    Marcar Llegada
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 2: En Sala de Espera */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-primary/30 pb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              En Sala
            </h3>
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {citasHoy.filter(c => c.estadoComercial === 'en-sala').length}
            </span>
          </div>

          <div className="space-y-3">
            {citasHoy.filter(c => c.estadoComercial === 'en-sala').map((cita, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={cita.id} 
                className="bg-card border-2 border-primary/20 p-4 rounded-xl shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Esperando
                  </span>
                </div>
                <div className="font-bold mb-1">
                  {cita.paciente?.apellido}, {cita.paciente?.nombre}
                </div>
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <User className="w-3 h-3" /> Dr. Vega (Consultorio 1)
                </div>
                <button 
                  onClick={() => {
                    updateCitaStatus(cita.id, 'en-consulta');
                    toast.success('✓ Paciente ingresado a Consulta');
                  }}
                  className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-md hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Pasar a Consulta
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 3: En Consulta o Cotizando */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              En Consulta / Preparando Orden
            </h3>
            <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {citasHoy.filter(c => c.estadoComercial === 'en-consulta' || c.estadoComercial === 'cotizando').length}
            </span>
          </div>

          <div className="space-y-3">
            {citasHoy.filter(c => c.estadoComercial === 'en-consulta' || c.estadoComercial === 'cotizando').map((cita, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={cita.id} 
                className="bg-card border border-border p-4 rounded-xl shadow-sm opacity-80"
              >
                 <div className="flex justify-between items-start mb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <StatusBadge status={cita.estadoComercial} />
                </div>
                <div className="font-bold mb-1">
                  {cita.paciente?.apellido}, {cita.paciente?.nombre}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {cita.estadoComercial === 'en-consulta' ? 'En Consultorio 1' : 'En Mesa de Ventas'}
                </div>
              </motion.div>
            ))}
            
            {citasHoy.filter(c => c.estadoComercial === 'en-consulta' || c.estadoComercial === 'cotizando').length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                No hay pacientes en esta etapa.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
