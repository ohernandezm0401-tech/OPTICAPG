'use client';

import React, { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/lib/toast-store';
import { DollarSign, Users, AlertTriangle, CheckCircle, Package, Calendar, Award, ShieldAlert, BadgePercent, Coins, X, Clock, Lock, Unlock, Receipt, MessageSquare, UserPlus, Activity, Tag } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { CajaSesion } from '@/lib/types';

export default function AdminDashboardPage() {
  const { citas, pacientes, cajaSesiones, cajaSesionActiva, whatsappSedesConectadas, setSedeWhatsappConnected } = useClinicStore();
  const [activeTab, setActiveTab] = useState<'agenda' | 'caja' | 'whatsapp'>('agenda');
  const [selectedSession, setSelectedSession] = useState<CajaSesion | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'gafas' | 'primer-contacto' | 'confirmacion-cita' | 'alerta-clinica' | 'crm'>('all');

  const toggleSedeConnection = (sedeId: string) => {
    const isCon = whatsappSedesConectadas[sedeId];
    setSedeWhatsappConnected(sedeId, !isCon);
  };

  // Filter for active sede (sede1)
  const citasSede = citas.filter(c => c.sedeId === 'sede1');
  const citasPagadas = citasSede.filter(c => c.estadoComercial === 'pagado');
  const citasAtendidas = citasSede.filter(c => ['en-consulta', 'cotizando', 'pagado'].includes(c.estadoComercial));
  const citasConHc = citasSede.filter(c => c.historiaClinica !== undefined);

  // Dynamic KPI Calculations
  const totalVentas = citasPagadas.reduce((sum, c) => sum + (c.montoCobrado || 0), 0);
  const totalPacientesAtendidos = citasAtendidas.length;
  
  // RIPS closing rate: % of attended patients that have a locked clinical history
  const ripsCompliance = totalPacientesAtendidos > 0 
    ? Math.round((citasConHc.length / totalPacientesAtendidos) * 100)
    : 100;

  // Tax and Billing breakdown
  const consultasExentas = citasPagadas.length * 150000; // $150k fixed per consult
  const dispositivosGravados = Math.max(0, totalVentas - consultasExentas);

  // Count alerts
  const totalAlertas = 3;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard General</h1>
          <p className="text-muted-foreground text-sm">Resumen en tiempo real y cumplimiento de la Sede Norte.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Ventas del Día" 
          value={`$ ${totalVentas.toLocaleString('es-CO')}`} 
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          trend={{ value: "+12% vs Promedio", isPositive: true }}
          delay={0.1}
        />
        <StatCard 
          title="Pacientes Atendidos" 
          value={totalPacientesAtendidos.toString()} 
          icon={<Users className="w-5 h-5 text-primary" />}
          trend={{ value: `${citasSede.filter(c => c.estadoComercial === 'por-llegar').length} por llegar`, isPositive: true }}
          delay={0.2}
        />
        <StatCard 
          title="Cumplimiento RIPS" 
          value={`${ripsCompliance}%`} 
          icon={<CheckCircle className="w-5 h-5 text-success" />}
          subtitle={`${citasConHc.length} de ${totalPacientesAtendidos} historias firmadas`}
          delay={0.3}
        />
        <StatCard 
          title="Alertas Activas" 
          value={totalAlertas.toString()} 
          icon={<AlertTriangle className="w-5 h-5 text-warning" />}
          trend={{ value: "1 crítica de ayer", isPositive: false }}
          delay={0.4}
        />
      </div>

      {/* Agenda Global and Financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agenda Global de la Sede o Control de Caja */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-2 border-b border-border/50">
              <div className="flex bg-secondary/50 p-1 rounded-xl border border-border">
                <button
                  onClick={() => setActiveTab('agenda')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'agenda' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-primary" />
                  Agenda Global ({citasSede.length})
                </button>
                <button
                  onClick={() => setActiveTab('caja')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'caja' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Coins className="w-4 h-4 text-primary" />
                  Control de Caja ({cajaSesiones.length})
                </button>
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'whatsapp' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  Supervisión WhatsApp
                </button>
              </div>
              {activeTab === 'agenda' ? (
                <span className="text-xs font-semibold px-2.5 py-1 bg-secondary rounded-full text-muted-foreground">
                  HOY: {citasSede.length} PACIENTES
                </span>
              ) : activeTab === 'caja' ? (
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cajaSesionActiva ? 'bg-success/15 text-success border border-success/20' : 'bg-destructive/15 text-destructive border border-destructive/20'
                  }`}>
                    {cajaSesionActiva ? '● Caja Abierta' : '○ Caja Cerrada'}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full flex items-center gap-1.5 border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  MONITOREO MULTI-SEDE
                </span>
              )}
            </div>
            
            {activeTab === 'agenda' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Hora</th>
                      <th className="px-4 py-3">Profesional</th>
                      <th className="px-4 py-3">Paciente</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {citasSede.map((cita) => {
                      const pac = pacientes.find(p => p.id === cita.pacienteId);
                      const formattedHora = new Date(cita.fechaHora).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <tr key={cita.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3.5 font-semibold font-mono text-foreground">{formattedHora}</td>
                          <td className="px-4 py-3.5 text-foreground font-medium">Dra. Silva</td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-foreground">{pac?.apellido}, {pac?.nombre}</div>
                            <span className="text-[10px] text-muted-foreground font-mono">CC {pac?.documento}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={cita.estadoComercial} />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              cita.prioridad === 'urgente' ? 'bg-destructive/15 text-destructive' :
                              cita.prioridad === 'alta' ? 'bg-warning/15 text-warning' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {cita.prioridad}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'caja' ? (
              <div className="space-y-4">
                {/* Active Session info */}
                {cajaSesionActiva ? (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Sesión Activa en Turno</span>
                      <span className="font-bold text-foreground text-sm">{cajaSesionActiva.usuarioNombre}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Apertura: {new Date(cajaSesionActiva.fechaApertura).toLocaleTimeString('es-CO')} (Desde: {new Date(cajaSesionActiva.fechaApertura).toLocaleDateString('es-CO')})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Efectivo Esperado</span>
                      <span className="font-mono font-black text-primary text-lg">
                        $ {(cajaSesionActiva.montoCierreCalculado || 0).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary/20 border border-border p-4 rounded-xl text-center text-xs text-muted-foreground font-medium">
                    No hay ningún turno de caja abierto en este momento en la sucursal.
                  </div>
                )}

                {/* History table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/40">
                      <tr>
                        <th className="px-4 py-2.5 rounded-l-xl">Asesor / Turno</th>
                        <th className="px-4 py-2.5">Base</th>
                        <th className="px-4 py-2.5 text-right">Esperado</th>
                        <th className="px-4 py-2.5 text-right">Declarado</th>
                        <th className="px-4 py-2.5 text-center">Diferencia</th>
                        <th className="px-4 py-2.5 text-right rounded-r-xl">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {cajaSesiones.map((sesion) => {
                        const diff = sesion.diferencia || 0;
                        return (
                          <tr key={sesion.id} className="hover:bg-secondary/20 transition-colors text-xs">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground">{sesion.usuarioNombre}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {new Date(sesion.fechaApertura).toLocaleDateString('es-CO')} {new Date(sesion.fechaApertura).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium">$ {sesion.montoApertura.toLocaleString('es-CO')}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">$ {sesion.montoCierreCalculado?.toLocaleString('es-CO')}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">$ {sesion.montoCierreDeclarado?.toLocaleString('es-CO')}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[9px] border ${
                                diff === 0 ? 'bg-success/15 text-success border-success/20' :
                                diff > 0 ? 'bg-warning/15 text-warning border-warning/20' :
                                'bg-destructive/15 text-destructive border-destructive/20'
                              }`}>
                                {diff === 0 ? 'Conforme' : diff > 0 ? `+$ ${diff.toLocaleString('es-CO')}` : `-$ ${Math.abs(diff).toLocaleString('es-CO')}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setSelectedSession(sesion)}
                                className="bg-secondary hover:bg-secondary/80 text-foreground border border-border px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Ver Detalle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {cajaSesiones.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">
                            No hay cierres de caja históricos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Supervisión de WhatsApp Multi-Sede */}
                <div className="bg-secondary/15 p-4 rounded-2xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Control Central de Instancias WhatsApp Business</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supervise la conexión del canal de comunicación en cada una de las sedes de la empresa para garantizar la entrega de RIPS, citas y alertas.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground font-mono flex items-center gap-1.5 bg-background border border-border/80 px-3 py-1.5 rounded-xl shrink-0">
                    <span className="w-2 h-2 bg-success rounded-full animate-ping"></span>
                    Gateway Status: ONLINE (3002)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sede Norte Sede 1 */}
                  {(() => {
                    const isCon = whatsappSedesConectadas['sede1'];
                    const activeSession = cajaSesionActiva && cajaSesionActiva.sedeId === 'sede1' ? cajaSesionActiva : null;
                    const comms = activeSession?.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0 };
                    const lastLog = activeSession?.comunicaciones?.mensajesLogs?.[activeSession?.comunicaciones?.mensajesLogs?.length - 1];

                    return (
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-border/80 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start border-b border-border/50 pb-2">
                            <div>
                              <h4 className="font-bold text-foreground text-base">Sucursal Norte (Bogotá)</h4>
                              <span className="text-[10px] text-muted-foreground font-mono">ID: sede1 | Calle 127 # 14-54</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                              isCon
                                ? 'bg-success/15 text-success border-success/30'
                                : 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
                            }`}>
                              {isCon ? '✓ Conectado' : '○ Desconectado'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">Gafas</span>
                              <strong className="text-primary text-xs mt-0.5 block">{comms.mensajesGafas}</strong>
                            </div>
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">1ra Vez</span>
                              <strong className="text-success text-xs mt-0.5 block">{comms.primerosContactos}</strong>
                            </div>
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">Citas</span>
                              <strong className="text-blue-500 text-xs mt-0.5 block">{comms.confirmacionesCitas}</strong>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5 border-t border-border/40 pt-2 text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Operador de Turno:</span>
                              <strong className="text-foreground">{activeSession ? activeSession.usuarioNombre : 'Sin turno activo'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Instancia WhatsApp:</span>
                              <span className="font-mono text-foreground">optica_sede_norte</span>
                            </div>
                          </div>

                          {/* Last log preview */}
                          {isCon && lastLog ? (
                            <div className="bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 space-y-1 mt-2">
                              <span className="text-[9px] font-bold text-green-600 dark:text-green-400 block uppercase font-mono">Último Mensaje Enviado:</span>
                              <p className="text-[10px] text-foreground italic line-clamp-2 font-sans">"{lastLog.mensajeText}"</p>
                              <div className="text-[8px] text-muted-foreground flex justify-between font-mono">
                                <span>Receptor: {lastLog.pacienteNombre}</span>
                                <span>{new Date(lastLog.fechaEnvio).toLocaleTimeString('es-CO')}</span>
                              </div>
                            </div>
                          ) : isCon ? (
                            <div className="bg-secondary/30 rounded-xl p-3 text-center text-[10px] text-muted-foreground italic">
                              Canal enlazado. Sin mensajes enviados en este turno.
                            </div>
                          ) : (
                            <div className="bg-destructive/5 rounded-xl p-3 text-center text-[10px] text-destructive italic border border-destructive/15">
                              Canal inactivo. El asesor debe escanear el QR en apertura de caja.
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeSession) {
                                setSelectedSession(activeSession);
                              } else {
                                toast.error('No hay un turno activo en la Sucursal Norte para inspeccionar.');
                              }
                            }}
                            className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-[10px] font-bold py-2 rounded-lg transition-all cursor-pointer"
                          >
                            Ver Bitácora CRC
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleSedeConnection('sede1');
                              toast.success(isCon ? 'Instancia Sede Norte desconectada remotamente.' : 'Instancia Sede Norte conectada.');
                            }}
                            className={`flex-1 text-[10px] font-bold py-2 rounded-lg transition-all border cursor-pointer ${
                              isCon
                                ? 'bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border-destructive/20'
                                : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                            }`}
                          >
                            {isCon ? 'Desconectar Instancia' : 'Reconectar'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sede Sur Sede 2 */}
                  {(() => {
                    const isCon = whatsappSedesConectadas['sede2'];
                    const comms = { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0 };

                    return (
                      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-border/80 transition-all">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start border-b border-border/50 pb-2">
                            <div>
                              <h4 className="font-bold text-foreground text-base">Sucursal Sur (Bogotá)</h4>
                              <span className="text-[10px] text-muted-foreground font-mono">ID: sede2 | Autopista Sur # 34-12</span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                              isCon
                                ? 'bg-success/15 text-success border-success/30'
                                : 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
                            }`}>
                              {isCon ? '✓ Conectado' : '○ Desconectado'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">Gafas</span>
                              <strong className="text-primary text-xs mt-0.5 block">{comms.mensajesGafas}</strong>
                            </div>
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">1ra Vez</span>
                              <strong className="text-success text-xs mt-0.5 block">{comms.primerosContactos}</strong>
                            </div>
                            <div className="bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                              <span className="text-muted-foreground block font-sans text-[8px] font-bold uppercase">Citas</span>
                              <strong className="text-blue-500 text-xs mt-0.5 block">{comms.confirmacionesCitas}</strong>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5 border-t border-border/40 pt-2 text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Operador de Turno:</span>
                              <strong className="text-foreground">Sin turno activo</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Instancia WhatsApp:</span>
                              <span className="font-mono text-foreground">optica_sede_sur</span>
                            </div>
                          </div>

                          <div className="bg-secondary/30 rounded-xl p-3 text-center text-[10px] text-muted-foreground italic">
                            Sin turno de caja activo en esta sede.
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                          <button
                            type="button"
                            disabled
                            className="flex-1 bg-secondary text-muted-foreground border border-border text-[10px] font-bold py-2 rounded-lg transition-all opacity-50 cursor-not-allowed"
                          >
                            Ver Bitácora CRC
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleSedeConnection('sede2');
                              toast.success(isCon ? 'Instancia Sede Sur desconectada.' : 'Instancia Sede Sur conectada.');
                            }}
                            className={`flex-1 text-[10px] font-bold py-2 rounded-lg transition-all border cursor-pointer ${
                              isCon
                                ? 'bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border-destructive/20'
                                : 'bg-green-500 hover:bg-green-600 text-white border-green-500'
                            }`}
                          >
                            {isCon ? 'Desconectar Instancia' : 'Reconectar'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ventas & POS Sidebar + Regulatory Alerts */}
        <div className="space-y-6">
          
          {/* Ventas detailed metrics */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Ventas & POS Sede Norte</h3>
              <div className="text-3xl font-black text-foreground">$ {totalVentas.toLocaleString('es-CO')}</div>
              <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full inline-block mt-1">
                Facturado electrónicamente
              </span>
            </div>
            
            <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border/50 pt-3.5">
              <div className="flex justify-between items-center">
                <span>Consultas (Exentas de IVA)</span>
                <span className="font-bold text-foreground font-mono">$ {consultasExentas.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Dispositivos Oculares (Gravados 19%)</span>
                <span className="font-bold text-foreground font-mono">$ {dispositivosGravados.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/20 pt-2 font-semibold">
                <span className="text-foreground">IVA Simulado (DIAN)</span>
                <span className="font-bold text-success font-mono">$ {Math.round(dispositivosGravados * 0.19).toLocaleString('es-CO')}</span>
              </div>
            </div>
          </div>

          {/* Alertas Regulatorias */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-warning" />
              Alertas del Oficial de Cumplimiento
            </h3>
            <div className="space-y-3 text-xs">
              <div className="border-l-4 border-warning pl-3 space-y-0.5">
                <p className="font-bold text-foreground">Registro INVIMA</p>
                <p className="text-[11px] text-muted-foreground">Lote de lentes de contacto LT-9982 vence en diciembre de 2026.</p>
              </div>
              <div className="border-l-4 border-destructive pl-3 space-y-0.5">
                <p className="font-bold text-foreground">Auditoría RIPS / HC</p>
                <p className="text-[11px] text-muted-foreground">
                  {citasAtendidas.length - citasConHc.length} consultoría(s) pendiente(s) de firmar digitalmente.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-3 space-y-0.5">
                <p className="font-bold text-foreground">Resolución DIAN</p>
                <p className="text-[11px] text-muted-foreground">Numeración autorizada estable. Próxima actualización en 6 meses.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Lower grid: INVIMA Devices and Resolution 3100 Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dispensa de Dispositivos (INVIMA) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Dispensa de Dispositivos (Control INVIMA)
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl"><Package className="w-4.5 h-4.5 text-primary" /></div>
                <div>
                  <div className="font-bold text-sm text-foreground">Lente Mono-focal Poly (Stock)</div>
                  <div className="text-xs text-muted-foreground">Lote: LT-9982 | Reg. INVIMA: INV-2023DM-012</div>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded-full font-bold">
                Vigente
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl"><Package className="w-4.5 h-4.5 text-primary" /></div>
                <div>
                  <div className="font-bold text-sm text-foreground">Montura Acetato Premium (Importado)</div>
                  <div className="text-xs text-muted-foreground">Trazabilidad: Manifiesto de Importación Certificado</div>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-secondary px-2.5 py-0.5 rounded-full text-muted-foreground font-semibold">
                No Aplica INVIMA
              </span>
            </div>
          </div>
        </div>

        {/* Cumplimiento Normativo (Res. 3100) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Monitoreo Normativo (Res. 3100 habilitación)
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-muted-foreground">Porcentaje de Historias Cerradas &lt; 24h</span>
                <span className="font-bold text-foreground">{ripsCompliance}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-success h-2 rounded-full transition-all duration-500" style={{ width: `${ripsCompliance}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-muted-foreground">Calibración Periódica de Equipos (Biómetro/Queratómetro)</span>
                <span className="font-bold text-foreground">100%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promociones */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/50">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-primary" />
            Campañas y Promociones Activas
          </h3>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-secondary/30 rounded-xl border border-border/50">
          <div>
            <div className="font-bold text-sm text-foreground">Mes de la Salud Visual Integral</div>
            <div className="text-xs text-muted-foreground">Exención total de costo de consulta por compra de lentes tallados digitalmente.</div>
          </div>
          <span className="text-[10px] font-bold bg-success/15 text-success border border-success/20 px-2.5 py-1 rounded-full uppercase">
            Vigente
          </span>
        </div>
      </div>

      {/* Modal Detalle de Auditoría de Caja */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                Auditoría de Turno de Caja #{selectedSession.id}
              </h3>
              <button 
                onClick={() => setSelectedSession(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Asesor Comercial:</span>
                <span className="font-bold text-foreground text-sm">{selectedSession.usuarioNombre}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Estado del Cierre:</span>
                <span className={`font-bold text-sm uppercase ${selectedSession.estado === 'abierta' ? 'text-success' : 'text-muted-foreground'}`}>
                  {selectedSession.estado}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Fecha Apertura:</span>
                <span className="font-mono text-foreground">{new Date(selectedSession.fechaApertura).toLocaleString('es-CO')}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Fecha Cierre:</span>
                <span className="font-mono text-foreground font-semibold">
                  {selectedSession.fechaCierre ? new Date(selectedSession.fechaCierre).toLocaleString('es-CO') : 'N/A (Turno activo)'}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-border py-3 my-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-secondary/30 p-2.5 rounded-xl border border-border/50">
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Base Inicial</span>
                <strong className="text-foreground font-mono text-sm block mt-1">$ {selectedSession.montoApertura.toLocaleString('es-CO')}</strong>
              </div>
              <div className="bg-secondary/30 p-2.5 rounded-xl border border-border/50">
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Esperado en Caja</span>
                <strong className="text-foreground font-mono text-sm block mt-1">$ {selectedSession.montoCierreCalculado?.toLocaleString('es-CO')}</strong>
              </div>
              <div className="bg-secondary/30 p-2.5 rounded-xl border border-border/50">
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Declarado Real</span>
                <strong className="text-foreground font-mono text-sm block mt-1">$ {selectedSession.montoCierreDeclarado?.toLocaleString('es-CO')}</strong>
              </div>
            </div>

            {selectedSession.desglose && (
              <div className="bg-secondary/25 border border-border p-3.5 rounded-xl space-y-3">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  Desglose de Caja Registrado (COP)
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  
                  {/* Billetes block */}
                  <div className="bg-background border border-border/50 rounded-lg p-2 space-y-1">
                    <span className="text-primary font-bold block border-b border-border/50 pb-0.5">Billetes</span>
                    <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground max-h-[90px] overflow-y-auto pr-0.5">
                      {Object.entries(selectedSession.desglose.billetes)
                        .filter(([_, count]) => count > 0)
                        .map(([val, count]) => (
                          <div key={val} className="flex justify-between">
                            <span>$ {Number(val).toLocaleString('es-CO')}:</span>
                            <strong className="text-foreground">{count}</strong>
                          </div>
                        ))}
                      {Object.values(selectedSession.desglose.billetes).reduce((a,b)=>a+b, 0) === 0 && (
                        <div className="text-center py-1 text-muted-foreground italic">Sin billetes</div>
                      )}
                    </div>
                  </div>

                  {/* Monedas block */}
                  <div className="bg-background border border-border/50 rounded-lg p-2 space-y-1">
                    <span className="text-amber-500 font-bold block border-b border-border/50 pb-0.5">Monedas</span>
                    <div className="space-y-0.5 font-mono text-[10px] text-muted-foreground max-h-[90px] overflow-y-auto pr-0.5">
                      {Object.entries(selectedSession.desglose.monedas)
                        .filter(([_, count]) => count > 0)
                        .map(([val, count]) => (
                          <div key={val} className="flex justify-between">
                            <span>$ {Number(val).toLocaleString('es-CO')}:</span>
                            <strong className="text-foreground">{count}</strong>
                          </div>
                        ))}
                      {Object.values(selectedSession.desglose.monedas).reduce((a,b)=>a+b, 0) === 0 && (
                        <div className="text-center py-1 text-muted-foreground italic">Sin monedas</div>
                      )}
                    </div>
                  </div>

                  {/* Vouchers block */}
                  <div className="bg-background border border-border/50 rounded-lg p-2.5 flex flex-col justify-between">
                    <div>
                      <span className="text-muted-foreground font-bold block border-b border-border/50 pb-0.5">Vouchers Card</span>
                      <div className="text-[10px] font-mono text-foreground font-bold mt-1.5">
                        $ {selectedSession.desglose.vouchers.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground block leading-tight mt-1">Recibos de tarjeta</span>
                  </div>

                  {/* Transfer block */}
                  <div className="bg-background border border-border/50 rounded-lg p-2.5 flex flex-col justify-between">
                    <div>
                      <span className="text-muted-foreground font-bold block border-b border-border/50 pb-0.5">Transferencias</span>
                      <div className="text-[10px] font-mono text-foreground font-bold mt-1.5">
                        $ {selectedSession.desglose.otros.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground block leading-tight mt-1">Nequi, Daviplata, etc.</span>
                  </div>

                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">Historial de Transacciones del Turno</div>
              <div className="max-h-[180px] overflow-y-auto pr-1 border border-border rounded-xl bg-secondary/15 divide-y divide-border/40">
                {selectedSession.transacciones.map((tx) => (
                  <div key={tx.id} className="p-3 flex justify-between items-center text-xs hover:bg-secondary/10 transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          tx.tipo === 'base' ? 'bg-primary' :
                          tx.tipo === 'egreso-gasto' ? 'bg-destructive' : 'bg-success'
                        }`}></span>
                        {tx.descripcion}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(tx.fecha).toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})} | Tipo: <strong className="text-foreground">{tx.metodoPago}</strong>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${tx.tipo === 'egreso-gasto' ? 'text-destructive' : 'text-foreground'}`}>
                      {tx.tipo === 'egreso-gasto' ? '-' : ''}$ {tx.monto.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Registro de Comunicaciones y Notificaciones (CRC) */}
            <div className="space-y-3.5 border-t border-border pt-4">
              <div className="flex justify-between items-center pb-1.5 border-b border-border/60">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                  Registro de Comunicaciones WhatsApp (CRC)
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  Canal: WhatsApp Business local
                </span>
              </div>

              {/* Grid de Contadores Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-center font-mono">
                <div className="bg-secondary/20 border border-border/50 rounded-xl p-2">
                  <span className="text-muted-foreground block font-sans text-[9px] uppercase font-bold">Gafas/Pedidos</span>
                  <strong className="text-primary text-xs mt-1 block">
                    {selectedSession.comunicaciones?.mensajesGafas || 0}
                  </strong>
                </div>
                <div className="bg-secondary/20 border border-border/50 rounded-xl p-2">
                  <span className="text-muted-foreground block font-sans text-[9px] uppercase font-bold">1ra Vez</span>
                  <strong className="text-success text-xs mt-1 block">
                    {selectedSession.comunicaciones?.primerosContactos || 0}
                  </strong>
                </div>
                <div className="bg-secondary/20 border border-border/50 rounded-xl p-2">
                  <span className="text-muted-foreground block font-sans text-[9px] uppercase font-bold">Confirmación</span>
                  <strong className="text-blue-500 text-xs mt-1 block">
                    {selectedSession.comunicaciones?.confirmacionesCitas || 0}
                  </strong>
                </div>
                <div className="bg-secondary/20 border border-border/50 rounded-xl p-2">
                  <span className="text-muted-foreground block font-sans text-[9px] uppercase font-bold">Clínico</span>
                  <strong className="text-purple-500 text-xs mt-1 block">
                    {selectedSession.comunicaciones?.alertasClinicas || 0}
                  </strong>
                </div>
                <div className="bg-secondary/20 border border-border/50 rounded-xl p-2 col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground block font-sans text-[9px] uppercase font-bold">CRM / Promos</span>
                  <strong className="text-pink-500 text-xs mt-1 block">
                    {selectedSession.comunicaciones?.crmPromociones || 0}
                  </strong>
                </div>
              </div>

              {/* Detalle de Bitácora con Filtros */}
              {(() => {
                const logs = selectedSession.comunicaciones?.mensajesLogs || [];
                const filteredLogs = logs.filter((l: any) => logFilter === 'all' || l.tipo === logFilter);
                const countLogs = (tipo: string) => logs.filter((l: any) => l.tipo === tipo).length;

                return (
                  <div className="space-y-2">
                    {/* Tabs */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setLogFilter('all')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${
                          logFilter === 'all'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Todos ({logs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('gafas')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-0.5 ${
                          logFilter === 'gafas'
                            ? 'bg-green-500 text-white border-green-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Gafas ({countLogs('gafas')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('primer-contacto')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-0.5 ${
                          logFilter === 'primer-contacto'
                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Nuevos ({countLogs('primer-contacto')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('confirmacion-cita')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-0.5 ${
                          logFilter === 'confirmacion-cita'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Citas ({countLogs('confirmacion-cita')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('alerta-clinica')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-0.5 ${
                          logFilter === 'alerta-clinica'
                            ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Clínica ({countLogs('alerta-clinica')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('crm')}
                        className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border flex items-center gap-0.5 ${
                          logFilter === 'crm'
                            ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        CRM ({countLogs('crm')})
                      </button>
                    </div>

                    {/* Viewport de Mensajes */}
                    <div className="max-h-[160px] overflow-y-auto pr-1 border border-border rounded-xl bg-secondary/15 divide-y divide-border/40 text-[11px]">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground italic text-xs bg-background/50 rounded-xl">
                          No se registraron notificaciones en esta categoría.
                        </div>
                      ) : (
                        filteredLogs.map((l: any) => (
                          <div key={l.id} className="p-2.5 space-y-1 hover:bg-secondary/10 transition-colors">
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[8px] uppercase font-extrabold px-1 rounded ${
                                  l.tipo === 'gafas' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                                  l.tipo === 'primer-contacto' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                                  l.tipo === 'confirmacion-cita' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                                  l.tipo === 'alerta-clinica' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' :
                                  'bg-pink-500/15 text-pink-600 dark:text-pink-400'
                                }`}>
                                  {l.tipo === 'gafas' ? 'Gafas' :
                                   l.tipo === 'primer-contacto' ? 'Nuevo' :
                                   l.tipo === 'confirmacion-cita' ? 'Cita' :
                                   l.tipo === 'alerta-clinica' ? 'Clínica' : 'CRM'}
                                </span>
                                <strong className="text-foreground">{l.pacienteNombre}</strong>
                                <span className="text-muted-foreground font-mono text-[9px]">({l.pacienteTelefono})</span>
                              </div>
                              <span className="font-mono text-muted-foreground text-[9px]">
                                {new Date(l.fechaEnvio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-foreground pl-2 border-l border-green-500/30 text-xs italic bg-green-500/5 py-1 rounded pr-2">
                              "{l.mensajeText}"
                            </p>
                            {l.detalleAdicional && (
                              <div className="text-[9px] text-muted-foreground flex justify-between">
                                <span>Ref: <strong className="text-foreground">{l.detalleAdicional}</strong></span>
                                <span className="text-success font-semibold flex items-center gap-0.5">✓✓ Enviado</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {selectedSession.observaciones && (
              <div className="bg-secondary/35 border border-border p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold text-foreground block">Observaciones:</span>
                <p className="text-muted-foreground italic">"{selectedSession.observaciones}"</p>
              </div>
            )}

            <button
              onClick={() => setSelectedSession(null)}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              Cerrar Auditoría
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
