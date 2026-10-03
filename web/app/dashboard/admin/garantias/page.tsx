'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Send, 
  Layers, 
  User, 
  FileText,
  X,
  RefreshCw,
  Truck,
  Receipt,
  Printer
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { Garantia } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';


export default function AdminGarantiasPage() {
  const { garantias, updateGarantia, resolverGarantia } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedGarantia, setSelectedGarantia] = useState<Garantia | null>(null);

  // Resolution Document Modals
  const [showZeroInvoice, setShowZeroInvoice] = useState(false);
  const [showRejectionDoc, setShowRejectionDoc] = useState(false);
  const [completedGarantia, setCompletedGarantia] = useState<Garantia | null>(null);

  // Manage states
  const [isResolving, setIsResolving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [resolDetail, setResolDetail] = useState('');
  const [resolType, setResolType] = useState<Garantia['resolucionTipo']>('cambio-montura-stock');
  const [costOptica, setCostOptica] = useState(0);
  const [costPaciente, setCostPaciente] = useState(0);
  
  // Laboratory dispatch states
  const [guiaEnvio, setGuiaEnvio] = useState('');
  const [obsLab, setObsLab] = useState('');


  // Active filters
  const filteredGarantias = garantias.filter(g => {
    const matchesSearch = g.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.productoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.estado === statusFilter;
    const matchesType = typeFilter === 'all' || g.tipoGarantia === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // KPI calculations
  const totalCasos = filteredGarantias.length;
  const pendientesEval = filteredGarantias.filter(g => g.estado === 'bajo-evaluacion').length;
  const costoTotal = filteredGarantias.reduce((sum, g) => sum + g.costoOptica, 0);
  const tasaAprobacion = totalCasos > 0 
    ? Math.round((filteredGarantias.filter(g => g.estado !== 'rechazada').length / totalCasos) * 100)
    : 100;

  const handleUpdateStatus = (id: string, nuevoEstado: Garantia['estado'], additionalInfo?: Partial<Garantia>) => {
    updateGarantia(id, { estado: nuevoEstado, ...additionalInfo });
    setSelectedGarantia(prev => prev ? { ...prev, estado: nuevoEstado, ...additionalInfo } : null);
    toast.success(`Estado de garantía actualizado a: ${nuevoEstado.toUpperCase()}`);
  };

  const handleDispatchToLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarantia || !guiaEnvio) {
      toast.warning('Debe ingresar un número de guía de envío.');
      return;
    }

    const checkLaboratorio = {
      aceptada: true,
      guiaEnvio,
      fechaEnvio: new Date().toISOString(),
      observaciones: obsLab
    };

    updateGarantia(selectedGarantia.id, { 
      estado: 'aprobada-laboratorio',
      checkLaboratorio 
    });

    setSelectedGarantia(prev => prev ? { 
      ...prev, 
      estado: 'aprobada-laboratorio',
      checkLaboratorio 
    } : null);

    setGuiaEnvio('');
    setObsLab('');
    toast.success('Garantía despachada a laboratorio con éxito.');
  };

  const handleResolveGarantia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarantia || !resolDetail) {
      toast.warning('Debe ingresar el detalle de la resolución.');
      return;
    }

    const updatedData = {
      resolucionTipo: resolType,
      resolucionDetalle: resolDetail,
      costoOptica: costOptica,
      costoPaciente: costPaciente,
      estado: 'resuelta-entregada' as const,
      fechaResolucion: new Date().toISOString()
    };

    resolverGarantia(selectedGarantia.id, updatedData);

    const tempGarantia = { ...selectedGarantia, ...updatedData };
    setCompletedGarantia(tempGarantia);

    // Open $0 Invoice modal if resolution is a replacement or repair
    if (resolType === 'cambio-lente-laboratorio' || resolType === 'cambio-montura-stock' || resolType === 'reparacion') {
      setShowZeroInvoice(true);
    } else {
      toast.success('Garantía finalizada y cerrada.');
    }

    setSelectedGarantia(null);
    setResolDetail('');
    setCostOptica(0);
    setCostPaciente(0);
    setIsResolving(false);
  };


  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garantías & Reclamaciones</h1>
        <p className="text-muted-foreground text-sm">Gestiona desadaptaciones clínicas, fallos de tratamientos en lentes o roturas de monturas.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Casos en Evaluación" 
          value={pendientesEval.toString()} 
          icon={<Clock className="w-5 h-5 text-warning" />}
          trend={{ value: "Requieren revisión", isPositive: false }}
          delay={0.1}
        />
        <StatCard 
          title="Total Reclamaciones" 
          value={totalCasos.toString()} 
          icon={<Layers className="w-5 h-5 text-primary" />}
          delay={0.2}
        />
        <StatCard 
          title="Tasa de Aprobación" 
          value={`${tasaAprobacion}%`} 
          icon={<ShieldCheck className="w-5 h-5 text-success" />}
          subtitle="Garantías aprobadas"
          delay={0.3}
        />
        <StatCard 
          title="Costo Reposición Óptica" 
          value={`$ ${costoTotal.toLocaleString('es-CO')}`} 
          icon={<DollarSign className="w-5 h-5 text-destructive" />}
          subtitle="Pérdidas asumidas"
          delay={0.4}
        />
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/15 rounded-t-xl">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por paciente, producto o ID reclamación..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">Todos los Estados</option>
            <option value="bajo-evaluacion">Bajo Evaluación</option>
            <option value="aprobada-laboratorio">En Laboratorio</option>
            <option value="aprobada-reemplazo-interno">Aprobada (Stock)</option>
            <option value="rechazada">Rechazada</option>
            <option value="resuelta-entregada">Resuelta</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="all">Todos los Motivos</option>
            <option value="adaptacion-receta">Desadaptación Fórmula</option>
            <option value="defecto-montura">Defecto Montura</option>
            <option value="tratamiento-lente">Tratamiento Lente</option>
            <option value="rotura">Rotura/Daño</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-6 py-3.5">ID / Paciente</th>
                <th className="px-6 py-3.5">Producto Afectado</th>
                <th className="px-6 py-3.5">Motivo Reclamación</th>
                <th className="px-6 py-3.5">Costo Asumido</th>
                <th className="px-6 py-3.5">Estado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {filteredGarantias.map((gar) => (
                <tr key={gar.id} className="hover:bg-secondary/15 transition-colors cursor-pointer" onClick={() => setSelectedGarantia(gar)}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{gar.pacienteNombre}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{gar.id} • Recibido: {new Date(gar.fechaReclamacion).toLocaleDateString('es-CO')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{gar.productoNombre}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                      gar.tipoGarantia === 'adaptacion-receta' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      gar.tipoGarantia === 'defecto-montura' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      gar.tipoGarantia === 'tratamiento-lente' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    }`}>
                      {gar.tipoGarantia.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    $ {gar.costoOptica.toLocaleString('es-CO')} COP
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      gar.estado === 'resuelta-entregada' ? 'bg-success/10 text-success border-success/20' :
                      gar.estado === 'rechazada' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      gar.estado === 'bajo-evaluacion' ? 'bg-warning/10 text-warning border-warning/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {gar.estado.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setSelectedGarantia(gar)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Evaluar Caso
                    </button>
                  </td>
                </tr>
              ))}
              {filteredGarantias.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground font-medium">
                    No se encontraron reclamaciones de garantía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedGarantia && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-border my-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Evaluación de Reclamación</h2>
                    <p className="text-xs text-muted-foreground font-mono">{selectedGarantia.id} • Paciente: {selectedGarantia.pacienteNombre}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedGarantia(null);
                    setIsResolving(false);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 hover:bg-secondary rounded-lg border border-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="py-5 space-y-6">
                
                {/* 1. Complaint Details */}
                <div className="bg-secondary/15 rounded-xl border border-border p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Producto Afectado:</span>
                      <strong className="text-foreground text-sm">{selectedGarantia.productoNombre}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Tipo de Reclamación:</span>
                      <span className="font-bold text-primary uppercase text-[10px] tracking-wider">{selectedGarantia.tipoGarantia}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/30 mt-2 text-xs">
                    <span className="text-muted-foreground block">Detalle de Reclamo (Asesor):</span>
                    <p className="text-foreground leading-normal mt-1">{selectedGarantia.motivoDetalle}</p>
                  </div>
                </div>

                {/* 2. Clinical Validation (Optometrist) */}
                {selectedGarantia.tipoGarantia === 'adaptacion-receta' && (
                  <div className="bg-purple-500/5 rounded-xl border border-purple-500/20 p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase text-purple-700 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      Validación Clínica (Optómetra)
                    </h4>
                    {selectedGarantia.checkOptometra ? (
                      <div className="text-xs space-y-3">
                        <div className="flex justify-between items-center bg-purple-500/10 p-2 rounded-lg text-purple-800 font-semibold">
                          <span>Rechequeo Clínico Concluido</span>
                          <span className="text-[10px] font-black uppercase border border-purple-600/20 px-2 py-0.5 rounded">
                            {selectedGarantia.checkOptometra.aprobado ? 'Aprobada Médicamente' : 'Rechazada Médicamente'}
                          </span>
                        </div>

                        {/* 1. Difference Alert Banner & Formula Warranty Badge */}
                        {selectedGarantia.checkOptometra.esDiferenteFormula ? (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 rounded-xl leading-relaxed flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold block mb-0.5">DIFERENCIA EN PRESCRIPCIÓN DETECTADA:</strong>
                              La nueva refracción difiere de la fórmula original de la orden de trabajo.
                              {selectedGarantia.checkOptometra.esGarantiaPorFormula && (
                                <span className="block mt-2 bg-red-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded w-max tracking-wider shadow-sm animate-gentle-pulse">
                                  Garantía por Fórmula (Error de Clínica)
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl leading-relaxed flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold block mb-0.5">FÓRMULAS IDÉNTICAS:</strong>
                              La refracción clínica no arrojó cambios. La desadaptación es de origen no refractivo (centrado, altura o adaptación física).
                            </div>
                          </div>
                        )}

                        {/* 2. Documented Symptoms Checklist */}
                        {selectedGarantia.checkOptometra.sintomasChecklist && selectedGarantia.checkOptometra.sintomasChecklist.length > 0 && (
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-border">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Síntomas Clínicos Documentados:</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {selectedGarantia.checkOptometra.sintomasChecklist.map((s, i) => (
                                <span key={i} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-semibold border border-slate-300/30">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="italic text-muted-foreground bg-slate-50 dark:bg-slate-900/10 p-2.5 rounded border border-border/50">
                          &quot; {selectedGarantia.checkOptometra.observaciones} &quot;
                        </p>

                        {/* 3. Structured Prescription or raw refraccion */}
                        {selectedGarantia.checkOptometra.nuevaRefraccionEstructurada ? (
                          <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-purple-500/10 space-y-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block border-b border-slate-100 dark:border-slate-850 pb-1">Nueva Refracción Estructurada:</span>
                            <div className="overflow-x-auto scrollbar-hide">
                              <table className="w-full text-[10px] font-mono text-left">
                                <thead>
                                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-850">
                                    <th className="pb-1">Ojo</th>
                                    <th className="pb-1">Esfera</th>
                                    <th className="pb-1">Cil</th>
                                    <th className="pb-1">Eje</th>
                                    <th className="pb-1">Add</th>
                                    <th className="pb-1">AV Lejos</th>
                                    <th className="pb-1">AV Cerca</th>
                                  </tr>
                                </thead>
                                <tbody className="text-slate-800 dark:text-slate-200 font-semibold">
                                  <tr className="border-b border-slate-50 dark:border-slate-900">
                                    <td className="py-1 text-purple-600 font-bold">OD</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.esfera}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.cilindro}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.eje}°</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.adicion}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.avLejos}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.od.avCerca}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-1 text-purple-600 font-bold">OI</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.esfera}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.cilindro}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.eje}°</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.adicion}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.avLejos}</td>
                                    <td>{selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.oi.avCerca}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-100 dark:border-slate-850">
                              Distancia Pupilar (DP): {selectedGarantia.checkOptometra.nuevaRefraccionEstructurada.dp}
                            </div>
                          </div>
                        ) : selectedGarantia.checkOptometra.nuevaRefraccion && (
                          <div className="grid grid-cols-2 gap-2 bg-background p-2 rounded border border-purple-500/20 font-mono text-[10px]">
                            <div><strong>OD:</strong> {selectedGarantia.checkOptometra.nuevaRefraccion.od}</div>
                            <div><strong>OI:</strong> {selectedGarantia.checkOptometra.nuevaRefraccion.oi}</div>
                          </div>
                        )}

                        <div className="text-[10px] text-purple-800 font-semibold pt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                          Firmado digitalmente por: {selectedGarantia.checkOptometra.profesionalNombre}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-purple-800 bg-purple-500/10 p-3 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-purple-700 shrink-0 mt-0.5" />
                        <div>
                          <strong>Falta Rechequeo Clínico:</strong> Este caso requiere que el optómetra examine al paciente y registre la adaptación de fórmula antes de tomar una resolución final.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Dispatch to Lab Form */}
                {selectedGarantia.estado === 'bajo-evaluacion' && (
                  <div className="bg-secondary/10 rounded-xl border border-border p-4 space-y-3">
                    <h4 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-primary" />
                      Despachar a Laboratorio Externo (Tallado/Tratamientos)
                    </h4>
                    <form onSubmit={handleDispatchToLab} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1.5">
                          <label className="text-muted-foreground font-bold">Número de Guía o Tracking *</label>
                          <input 
                            type="text" 
                            required
                            value={guiaEnvio}
                            onChange={(e) => setGuiaEnvio(e.target.value)}
                            placeholder="Ej: ENV-998234-CO"
                            className="w-full px-3 py-1.5 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-muted-foreground font-bold">Observaciones para Lab</label>
                          <input 
                            type="text" 
                            value={obsLab}
                            onChange={(e) => setObsLab(e.target.value)}
                            placeholder="Detalle de fallas en AR/filtro..."
                            className="w-full px-3 py-1.5 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-primary hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Registrar Envío a Laboratorio
                      </button>
                    </form>
                  </div>
                )}

                {/* 4. Operations & Actions */}
                {!isResolving ? (
                  <div className="flex gap-2 justify-center pt-2">
                    {selectedGarantia.estado === 'bajo-evaluacion' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedGarantia.id, 'aprobada-reemplazo-interno')}
                        className="bg-success text-white hover:bg-green-600 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprobar Reemplazo Interno (Stock)
                      </button>
                    )}
                    {selectedGarantia.estado !== 'resuelta-entregada' && selectedGarantia.estado !== 'rechazada' && (
                      <button
                        onClick={() => setIsResolving(true)}
                        className="bg-primary text-white hover:bg-blue-600 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Resolver y Cerrar Caso
                      </button>
                    )}
                    {selectedGarantia.estado === 'bajo-evaluacion' && (
                      <button
                        onClick={() => {
                          const reason = prompt('Ingrese el motivo y justificación de rechazo de la garantía:');
                          if (reason) {
                            const updatedData = { 
                              estado: 'rechazada' as const,
                              resolucionDetalle: reason,
                              fechaResolucion: new Date().toISOString()
                            };
                            updateGarantia(selectedGarantia.id, updatedData);
                            
                            const tempGarantia = { ...selectedGarantia, ...updatedData };
                            setCompletedGarantia(tempGarantia);
                            setShowRejectionDoc(true);
                            
                            setSelectedGarantia(null);
                            toast.error('Reclamación de garantía rechazada.');
                          }
                        }}
                        className="bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold px-4 py-2.5 rounded-xl text-xs transition-colors"
                      >
                        Rechazar Garantía
                      </button>
                    )}

                  </div>
                ) : (
                  <form onSubmit={handleResolveGarantia} className="bg-secondary/15 rounded-xl border border-border p-4 space-y-4">
                    <h3 className="text-xs font-black uppercase text-muted-foreground border-b border-border/40 pb-2">
                      Resolución y Cierre de Reclamación
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-muted-foreground font-bold">Tipo de Resolución</label>
                        <select
                          value={resolType}
                          onChange={(e) => setResolType(e.target.value as Garantia['resolucionTipo'])}
                          className="w-full px-3 py-1.5 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="cambio-lente-laboratorio">Cambio de Lentes (Lab)</option>
                          <option value="cambio-montura-stock">Cambio de Montura (Stock)</option>
                          <option value="reparacion">Reparación / Ajuste Físico</option>
                          <option value="devolucion-dinero">Devolución de Dinero</option>
                          <option value="sin-garantia">Rechazo Final sin Cobertura</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-muted-foreground font-bold">Costo Asumido Óptica (COP)</label>
                        <input 
                          type="number" 
                          value={costOptica}
                          onChange={(e) => setCostOptica(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-muted-foreground font-bold">Cobro Excedente Paciente (COP)</label>
                        <input 
                          type="number" 
                          value={costPaciente}
                          onChange={(e) => setCostPaciente(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="text-muted-foreground font-bold">Descripción Final de Resolución *</label>
                      <textarea
                        required
                        rows={3}
                        value={resolDetail}
                        onChange={(e) => setResolDetail(e.target.value)}
                        placeholder="Describa el trabajo realizado, materiales cambiados o motivos del cierre..."
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsResolving(false)}
                        className="px-4 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 font-bold rounded-xl text-xs transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-success text-white hover:bg-green-600 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Finalizar Garantía
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}

        {/* DIAN ZERO-INVOICE MODAL */}
        {showZeroInvoice && completedGarantia && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-border text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                  <Receipt className="w-5 h-5 text-success" />
                  Factura Electrónica DIAN a $0 COP (Garantía)
                </h3>
                <button 
                  onClick={() => setShowZeroInvoice(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* DIAN invoice mockup */}
              <div className="border border-border/80 rounded-xl p-5 text-left bg-background space-y-4 font-mono text-xs text-foreground">
                <div className="text-center border-b border-border/50 pb-3">
                  <h4 className="font-bold text-sm uppercase">OptiSaaS Colombia S.A.S</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">NIT: 900.123.456-7 • Autorización DIAN #187640</p>
                  <p className="text-[10px] text-muted-foreground">Factura Electrónica de Venta N° G-FAC-{completedGarantia.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-border/30 pb-2">
                  <div>
                    <span className="text-muted-foreground block font-sans">ADQUIRIENTE:</span>
                    <strong>{completedGarantia.pacienteNombre}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-sans">CONCEPTO DIAN:</span>
                    <strong>Sustitución de Bienes (Garantía)</strong>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold border-b border-border/20 pb-1">
                    <span>Ítem / Concepto</span>
                    <span>Subtotal</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span className="truncate max-w-[280px]">1 x Reemplazo: {completedGarantia.productoNombre}</span>
                    <span>$ {completedGarantia.costoOptica.toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>Descuento de Garantía (100%)</span>
                    <span>-$ {completedGarantia.costoOptica.toLocaleString('es-CO')}</span>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-2 flex justify-between font-bold text-sm">
                  <span>TOTAL FACTURADO DIAN:</span>
                  <span className="text-success">$ 0 COP</span>
                </div>

                <div className="bg-secondary/30 p-2.5 rounded-lg text-[9px] leading-relaxed text-muted-foreground font-sans">
                  <p className="font-bold text-foreground">CUFE (Código Único de Factura Electrónica):</p>
                  <p className="break-all font-mono text-[9px]">f8a9b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6</p>
                  <p className="mt-1 text-success flex items-center gap-1 font-bold">
                    ✓ Transmisión exitosa y autorizada por la DIAN en ambiente oficial.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-5">
                <button 
                  onClick={() => {
                    toast.success('Factura DIAN a $0 COP enviada por correo al paciente.');
                    setShowZeroInvoice(false);
                  }}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center gap-1 mx-auto"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Factura $0
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* REJECTION CERTIFICATE MODAL */}
        {showRejectionDoc && completedGarantia && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-border text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Acta de Denegación de Garantía
                </h3>
                <button 
                  onClick={() => setShowRejectionDoc(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legal Certificate mockup */}
              <div className="border border-border/80 rounded-xl p-5 text-left bg-background space-y-4 text-xs text-foreground leading-relaxed">
                <div className="text-center border-b border-border/50 pb-3">
                  <h4 className="font-bold text-sm uppercase">ACTA OFICIAL DE EXCLUSIÓN DE COBERTURA</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Óptica del Norte • Departamento de Control de Calidad</p>
                  <p className="text-[10px] text-muted-foreground font-mono">Radicado Reclamación: N° {completedGarantia.id}</p>
                </div>

                <div className="space-y-2">
                  <p>
                    En la ciudad de Bogotá, el día <strong className="font-sans text-[11px]">{new Date().toLocaleDateString('es-CO')}</strong>, el comité técnico y administrativo de la óptica revisó la solicitud de garantía presentada por el/la paciente <strong>{completedGarantia.pacienteNombre}</strong> sobre el producto <strong>{completedGarantia.productoNombre}</strong>.
                  </p>
                  
                  <div className="bg-secondary/40 p-3 rounded-lg border border-border/50 space-y-1">
                    <span className="text-[10px] text-muted-foreground block font-bold">MOTIVO Y JUSTIFICACIÓN TÉCNICA DEL RECHAZO:</span>
                    <p className="text-foreground italic font-sans font-bold">&quot;{completedGarantia.resolucionDetalle}&quot;</p>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-normal mt-2">
                    <strong>Fundamento de Exclusión:</strong> De acuerdo con el contrato de compra y políticas de blindaje de la óptica, se excluyen de la garantía:
                  </p>
                  <ul className="list-disc pl-4 text-[10px] text-muted-foreground space-y-0.5 font-sans">
                    <li>Daños por impacto físico, aplastamiento, rayaduras por mala limpieza o negligencia en el uso.</li>
                    <li>Desadaptaciones clínicas reportadas con posterioridad a los 30 días reglamentarios de adaptación.</li>
                    <li>Prescripciones ópticas provenientes de profesionales externos una vez cortado el cristal conforme a receta.</li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-border/30 grid grid-cols-2 gap-4 text-center text-[10px] font-sans">
                  <div className="space-y-1">
                    <div className="border-t border-muted-foreground/40 pt-1">Firma Director Administrativo</div>
                    <span className="text-muted-foreground text-[8px] font-mono">CC. 80.123.456</span>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-muted-foreground/40 pt-1">Firma Optómetra Verificador</div>
                    <span className="text-muted-foreground text-[8px] font-mono">Reg. Médico: RM-98234-CO</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border mt-5">
                <button 
                  onClick={() => {
                    toast.success('Acta de rechazo de garantía impresa y enviada por correo.');
                    setShowRejectionDoc(false);
                  }}
                  className="px-4 py-2 bg-destructive text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md flex items-center gap-1 mx-auto"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Acta de Rechazo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

