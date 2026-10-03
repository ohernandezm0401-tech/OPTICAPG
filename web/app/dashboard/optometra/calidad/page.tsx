'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  Search,
  Check,
  X,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { OrdenTrabajo } from '@/lib/types';

export default function OptometraCalidadPage() {
  const { ordenesTrabajo, empresas, aprobarCalidadOptometra } = useClinicStore();
  const empresa = empresas[0];
  const brandColor = empresa?.colorCorporativo || '#2563eb';

  // Filters & Tabs for Optometrist
  // 'pending': order has passed advisor aesthetic QA (estado === 'calidad-asesor')
  // 'incoming': order is still at lab or advisor check (estado === 'enviado-laboratorio' || estado === 'recibido-laboratorio')
  // 'approved': clinical QA completed (estado === 'listo-entrega' || estado === 'entregado')
  const [activeTab, setActiveTab] = useState<'pending' | 'incoming' | 'approved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Actions
  const [selectedOrder, setSelectedOrder] = useState<OrdenTrabajo | null>(null);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);

  // QA Forms State
  const [qaObservations, setQaObservations] = useState('');

  // Detailed QA Checklist Items (Optometra)
  const [optCheck1, setOptCheck1] = useState(false);
  const [optCheck2, setOptCheck2] = useState(false);
  const [optCheck3, setOptCheck3] = useState(false);
  const [optCheck4, setOptCheck4] = useState(false);
  const [optCheck5, setOptCheck5] = useState(false);
  const [optCheck6, setOptCheck6] = useState(false);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return ordenesTrabajo.filter(ord => {
      const matchesSearch = 
        ord.pacienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ord.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesTab = false;
      if (activeTab === 'pending') {
        matchesTab = (ord.estado === 'recibido-laboratorio' || ord.estado === 'calidad-asesor') && !ord.checkOptometra?.aprobado;
      } else if (activeTab === 'incoming') {
        matchesTab = ord.estado === 'enviado-laboratorio';
      } else if (activeTab === 'approved') {
        matchesTab = !!ord.checkOptometra?.aprobado || ord.estado === 'listo-entrega' || ord.estado === 'entregado';
      }

      return matchesSearch && matchesTab;
    });
  }, [ordenesTrabajo, searchQuery, activeTab]);

  // Order Counts
  const counts = useMemo(() => {
    return {
      pending: ordenesTrabajo.filter(o => (o.estado === 'recibido-laboratorio' || o.estado === 'calidad-asesor') && !o.checkOptometra?.aprobado).length,
      incoming: ordenesTrabajo.filter(o => o.estado === 'enviado-laboratorio').length,
      approved: ordenesTrabajo.filter(o => !!o.checkOptometra?.aprobado || o.estado === 'listo-entrega' || o.estado === 'entregado').length,
    };
  }, [ordenesTrabajo]);

  const handleOpenQa = (order: OrdenTrabajo) => {
    setSelectedOrder(order);
    setQaObservations('');
    setOptCheck1(false);
    setOptCheck2(false);
    setOptCheck3(false);
    setOptCheck4(false);
    setOptCheck5(false);
    setOptCheck6(false);
    setIsQaModalOpen(true);
  };

  const handleGuardarQa = () => {
    if (!selectedOrder) return;

    const allOptChecked = optCheck1 && optCheck2 && optCheck3 && optCheck4 && optCheck5 && optCheck6;
    if (!allOptChecked) {
      toast.warning('Por favor verifique y marque todos los ítems de la lista de chequeo de lensometría clínica.');
      return;
    }

    aprobarCalidadOptometra(selectedOrder.id, qaObservations, 'usr3'); // Dra. Silva
    toast.success(`Trabajo ${selectedOrder.id} aprobado clínicamente. Listo para entrega y facturación.`);
    setIsQaModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inspección de Calidad Clínica</h1>
          <p className="text-muted-foreground text-sm">Realiza lensometría y verificación de recetas ópticas antes de la entrega al paciente.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por código o paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2"
            style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-secondary/20 p-1.5 rounded-2xl border border-border/40 font-semibold">
        <button
          onClick={() => setActiveTab('pending')}
          className={`py-3 px-4 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${activeTab === 'pending' ? 'bg-background text-foreground shadow-sm animate-fade-in' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldCheck className="w-5 h-5" style={{ color: activeTab === 'pending' ? brandColor : 'inherit' }} />
          <span>Pendientes de QA Clínico</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-black mt-1" style={{ backgroundColor: `${brandColor}1A`, color: brandColor }}>{counts.pending}</span>
        </button>
        
        <button
          onClick={() => setActiveTab('incoming')}
          className={`py-3 px-4 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${activeTab === 'incoming' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Clock className="w-5 h-5 text-warning" />
          <span>Lentes en Laboratorio / Cola</span>
          <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-black mt-1">{counts.incoming}</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`py-3 px-4 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${activeTab === 'approved' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span>QA Clínico Aprobado</span>
          <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-black mt-1">{counts.approved}</span>
        </button>
      </div>

      {/* Pipeline Content */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[300px]">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((ord, idx) => {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={ord.id}
                  className="border border-border rounded-xl p-4 bg-background shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  style={{ borderTopColor: ord.estado === 'calidad-asesor' ? brandColor : 'var(--border)' }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-border/50 pb-2">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground tracking-wider font-mono">CÓDIGO: {ord.id}</span>
                        <h4 className="font-bold text-sm text-foreground mt-0.5">{ord.pacienteNombre}</h4>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        ord.estado === 'calidad-asesor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        ord.estado === 'calidad-optometra' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        ord.estado === 'enviado-laboratorio' ? 'bg-primary/10 text-primary border border-primary/20' :
                        ord.estado === 'recibido-laboratorio' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-success/10 text-success border border-success/20'
                      }`}>
                        {ord.estado === 'calidad-asesor' ? 'Aprobado Asesor (Paso 1)' : (ord.estado === 'calidad-optometra' ? 'Aprobado Optómetra (Paso 1)' : ord.estado.replace('-', ' '))}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p><span className="font-semibold text-foreground">Laboratorio:</span> {ord.laboratorio}</p>
                      <p><span className="font-semibold text-foreground">Montura:</span> {ord.monturaDetalle}</p>
                      <p><span className="font-semibold text-foreground">Lente:</span> {ord.lenteDiseno} ({ord.lenteMaterial})</p>
                    </div>

                    {/* Prescription Details (Safe and visible for the Optometrist) */}
                    <div className="bg-secondary/25 border border-border/50 rounded-lg p-2.5 text-[11px] space-y-1">
                      <p className="font-bold text-foreground">Prescripción de la Orden</p>
                      <p className="font-mono"><span className="font-semibold font-sans">OD:</span> {ord.receta.od}</p>
                      <p className="font-mono"><span className="font-semibold font-sans">OI:</span> {ord.receta.oi}</p>
                      {ord.receta.adicion && <p className="font-mono"><span className="font-semibold font-sans">ADD:</span> {ord.receta.adicion}</p>}
                      {ord.receta.dp && <p className="font-mono"><span className="font-semibold font-sans">DP:</span> {ord.receta.dp}</p>}
                    </div>

                    {/* Check status logs */}
                    <div className="space-y-1 pt-1">
                      {ord.checkAsesor && (
                        <div className="text-[10px] text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          <span>Paso 1: Estética verificada por Asesor</span>
                        </div>
                      )}
                      {ord.checkOptometra && (
                        <div className="text-[10px] text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          <span>Paso 2: Lensometría verificada por Optómetra</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
                    {(ord.estado === 'recibido-laboratorio' || ord.estado === 'calidad-asesor') && !ord.checkOptometra?.aprobado ? (
                      <button
                        onClick={() => handleOpenQa(ord)}
                        className="text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 hover:brightness-110"
                        style={{ backgroundColor: brandColor }}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Hacer QA Clínico
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic flex items-center gap-1 py-1 font-medium">
                        {ord.estado === 'enviado-laboratorio' ? (
                          <>A la espera del Laboratorio</>
                        ) : (
                          <><Check className="w-3.5 h-3.5 text-success" /> Calidad Clínica Completada</>
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <Package className="w-12 h-12 mb-2 opacity-20" style={{ color: brandColor }} />
            <p className="font-semibold text-sm text-foreground">No hay trabajos en esta sección de la cola</p>
            <p className="text-xs text-muted-foreground mt-0.5">Todos los lentes clínicos en este estado han sido debidamente gestionados.</p>
          </div>
        )}
      </div>

      {/* MODAL: CONTROL DE CALIDAD CLÍNICO (QA) */}
      <AnimatePresence>
        {isQaModalOpen && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full"
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-bold text-lg flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="w-5 h-5" style={{ color: brandColor }} />
                  Lensometría y Centrado Clínico
                </h3>
                <button 
                  onClick={() => setIsQaModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-secondary/20 p-3 rounded-xl border border-border/50 text-xs space-y-1.5">
                  <p><span className="font-bold text-foreground">Paciente:</span> {selectedOrder.pacienteNombre}</p>
                  <p><span className="font-bold text-foreground">Lente / Filtro:</span> {selectedOrder.lenteDiseno} ({selectedOrder.lenteMaterial})</p>
                  <p><span className="font-bold text-foreground">Laboratorio:</span> {selectedOrder.laboratorio}</p>
                </div>

                {/* OPTOMETRA QA (Clínico) */}
                <div className="space-y-3.5">
                  <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: `${brandColor}0A`, borderColor: `${brandColor}33` }}>
                    <h4 className="text-xs font-bold flex items-center gap-1" style={{ color: brandColor }}>
                      <FileText className="w-4 h-4" />
                      Prescripción Médica Registrada
                    </h4>
                    <div className="text-[11px] space-y-1 font-mono text-foreground">
                      <p><span className="font-bold font-sans text-muted-foreground">OD:</span> {selectedOrder.receta.od}</p>
                      <p><span className="font-bold font-sans text-muted-foreground">OI:</span> {selectedOrder.receta.oi}</p>
                      {selectedOrder.receta.adicion && <p><span className="font-bold font-sans text-muted-foreground">ADD:</span> {selectedOrder.receta.adicion}</p>}
                      {selectedOrder.receta.dp && <p><span className="font-bold font-sans text-muted-foreground">DP:</span> {selectedOrder.receta.dp}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-foreground block">Lista de Chequeo Clínico (Lensómetro y Centrado):</p>
                    <div className="space-y-2 bg-secondary/40 p-3 rounded-xl border border-border max-h-[220px] overflow-y-auto">
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck1} onChange={e => setOptCheck1(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Lensometría Ojo Derecho coincide con fórmula</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck2} onChange={e => setOptCheck2(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Lensometría Ojo Izquierdo coincide con fórmula</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck3} onChange={e => setOptCheck3(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Distancia pupilar y altura de montaje exactas</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck4} onChange={e => setOptCheck4(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Adición verificada en lentes progresivos/bifocales</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck5} onChange={e => setOptCheck5(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Filtros solicitados validados (UV400 / Antirreflejo / Blue)</span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                        <input type="checkbox" checked={optCheck6} onChange={e => setOptCheck6(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 mt-0.5" style={{ '--tw-ring-color': brandColor } as React.CSSProperties} />
                        <span>Transparencia de cristales libre de distorsiones</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block">Registro en Bitácora Clínico-Sanitaria</label>
                  <textarea 
                    placeholder="Ej: Dioptrías y ejes verificados con lensómetro. Altura de montaje a 18mm conforme. Tratamiento antirreflejo premium validado."
                    value={qaObservations}
                    onChange={e => setQaObservations(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 min-h-[65px] text-foreground"
                    style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
                  <button
                    onClick={() => setIsQaModalOpen(false)}
                    className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarQa}
                    className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:brightness-110 transition-all"
                    style={{ backgroundColor: brandColor }}
                  >
                    Confirmar Aprobación
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
