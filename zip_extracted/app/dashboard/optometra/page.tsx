'use client';

import React from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ClipboardList, Clock, FileWarning, Stethoscope } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-store';

export default function OptometraDashboardPage() {
  const router = useRouter();
  const { citas, pacientes, updateCitaStatus } = useClinicStore();

  const citasDelDia = citas.map(cita => ({
    ...cita,
    paciente: pacientes.find(p => p.id === cita.pacienteId)
  })).filter(c => c.estadoComercial !== 'pagado' && c.estadoComercial !== 'no-asistio');

  // Dynamic metrics from store
  const hcPendientesFirma = citas.filter(c => c.historiaClinica && !c.historiaClinica.diagnosticoPlan.firmaDigitalConfirmada).length;
  const formulasEmitidas = citas.filter(c => c.historiaClinica?.diagnosticoPlan.firmaDigitalConfirmada).length;
  const formulasAyer = 0; // Would come from historical data

  const handleIniciarConsulta = (id: string) => {
    updateCitaStatus(id, 'en-consulta');
    toast.info('Consulta iniciada — Cargando historia clínica');
    router.push('/dashboard/optometra/historia-clinica');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi Agenda Clínica</h1>
          <p className="text-muted-foreground text-sm">Consultas programadas para hoy.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm">
          <Stethoscope className="w-4 h-4" />
          Nueva Consulta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Consultas Hoy" 
          value={citasDelDia.length.toString()} 
          icon={<ClipboardList className="w-5 h-5" />}
          subtitle="Agendadas en total"
          delay={0.1}
        />
        <StatCard 
          title="Pacientes en Sala" 
          value={citasDelDia.filter(c => c.estadoComercial === 'en-sala').length.toString()} 
          icon={<Clock className="w-5 h-5" />}
          subtitle="Esperando atención"
          delay={0.2}
        />
        <StatCard 
          title="HC Pendientes Firma" 
          value={hcPendientesFirma.toString()} 
          icon={<FileWarning className="w-5 h-5 text-warning" />}
          subtitle={hcPendientesFirma > 0 ? 'Requiere atención' : 'Todo al día'}
          delay={0.3}
        />
        <StatCard 
          title="Fórmulas Emitidas" 
          value={formulasEmitidas.toString()} 
          icon={<Stethoscope className="w-5 h-5 text-primary" />}
          trend={formulasEmitidas > formulasAyer ? { value: `+${formulasEmitidas - formulasAyer} vs Ayer`, isPositive: true } : undefined}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda del día */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Agenda del Día</h3>
            <span className="text-xs text-muted-foreground font-medium">{citasDelDia.length} CONSULTAS</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-md">Hora</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right rounded-r-md">Acción</th>
                </tr>
              </thead>
              <tbody>
                {citasDelDia.map(cita => (
                  <tr key={cita.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 font-semibold">{cita.paciente?.apellido}, {cita.paciente?.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground line-clamp-1">{cita.motivoClinico}</td>
                    <td className="px-4 py-3"><StatusBadge status={cita.estadoComercial} /></td>
                    <td className="px-4 py-3 text-right">
                      {cita.estadoComercial === 'en-sala' ? (
                        <button 
                          onClick={() => handleIniciarConsulta(cita.id)}
                          className="bg-primary text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-blue-600 transition-colors"
                        >
                          Iniciar HC
                        </button>
                      ) : cita.estadoComercial === 'en-consulta' ? (
                        <button 
                          onClick={() => router.push('/dashboard/optometra/historia-clinica')}
                          className="bg-secondary text-foreground px-3 py-1 rounded-md text-xs font-semibold hover:bg-secondary/80 transition-colors"
                        >
                          Continuar HC
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Esperando</span>
                      )}
                    </td>
                  </tr>
                ))}
                {citasDelDia.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay consultas programadas para hoy.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* HC Pendientes */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">HC Pendientes de Firma</h3>
            <div className="space-y-3">
              <div className="border-l-4 border-destructive pl-3">
                <p className="text-xs font-semibold">Auditoría HC</p>
                <p className="text-[11px] text-muted-foreground">1 Historia de ayer sin firma digital. Debe firmarse antes de las 24h para cumplir Res. 3100.</p>
              </div>
            </div>
            <button className="mt-3 w-full bg-destructive/10 text-destructive border border-destructive/20 px-3 py-2 rounded-md text-xs font-semibold hover:bg-destructive/20 transition-colors">
              Firmar Pendientes
            </button>
          </div>

          {/* Últimas Fórmulas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Últimas Fórmulas</h3>
            <div className="space-y-3">
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold">RX #2341</span>
                  <span className="text-[10px] text-muted-foreground">Hace 2h</span>
                </div>
                <p className="text-[11px] text-muted-foreground">García, M.I. - Progresivos Free-Form</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">OD: -2.25 -0.75 x 180 | OI: -1.75 -0.50 x 175</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold">RX #2340</span>
                  <span className="text-[10px] text-muted-foreground">Hace 4h</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Díaz, Roberto - Monofocal Transitions</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">OD: +1.00 | OI: +1.25</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
