'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  CreditCard, 
  PenTool, 
  FileCheck,
  Receipt,
  AlertCircle,
  Truck,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Printer,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { OrdenTrabajo, OrderStatus } from '@/lib/types';
import { FacturaModal } from '@/components/pos/factura-modal';

export default function EntregasPage() {
  const { ordenesTrabajo, pacientes, citas, updateCitaStatus, aprobarCalidadOptometra, aprobarCalidadAsesor, completarEntrega } = useClinicStore();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'lab' | 'qa' | 'ready' | 'delivered'>('lab');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Actions
  const [selectedOrder, setSelectedOrder] = useState<OrdenTrabajo | null>(null);
  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // QA Forms State
  const [qaObservations, setQaObservations] = useState('');
  const [optometraVerificado, setOptometraVerificado] = useState(false);
  const [asesorAlineado, setAsesorAlineado] = useState(false);

  // Detailed QA Checklist Items (Optometra)
  const [optCheck1, setOptCheck1] = useState(false);
  const [optCheck2, setOptCheck2] = useState(false);
  const [optCheck3, setOptCheck3] = useState(false);
  const [optCheck4, setOptCheck4] = useState(false);
  const [optCheck5, setOptCheck5] = useState(false);
  const [optCheck6, setOptCheck6] = useState(false);

  // Detailed QA Checklist Items (Asesor)
  const [aseCheck1, setAseCheck1] = useState(false);
  const [aseCheck2, setAseCheck2] = useState(false);
  const [aseCheck3, setAseCheck3] = useState(false);
  const [aseCheck4, setAseCheck4] = useState(false);
  const [aseCheck5, setAseCheck5] = useState(false);

  // Delivery Form State
  const [deliveryComments, setDeliveryComments] = useState('');
  const [metodoPago, setMetodoPago] = useState('TARJETA');
  const [dianModalOpen, setDianModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Canvas Ref for Signature Pad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return ordenesTrabajo.filter(ord => {
      const matchesSearch = ord.pacienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) || ord.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesTab = false;
      if (activeTab === 'lab') {
        matchesTab = ord.estado === 'enviado-laboratorio';
      } else if (activeTab === 'qa') {
        matchesTab = ord.estado === 'recibido-laboratorio' || ord.estado === 'calidad-asesor' || ord.estado === 'calidad-optometra';
      } else if (activeTab === 'ready') {
        matchesTab = ord.estado === 'listo-entrega';
      } else if (activeTab === 'delivered') {
        matchesTab = ord.estado === 'entregado';
      }

      return matchesSearch && matchesTab;
    });
  }, [ordenesTrabajo, searchQuery, activeTab]);

  // Order Counts
  const counts = useMemo(() => {
    return {
      lab: ordenesTrabajo.filter(o => o.estado === 'enviado-laboratorio').length,
      qa: ordenesTrabajo.filter(o => o.estado === 'recibido-laboratorio' || o.estado === 'calidad-asesor' || o.estado === 'calidad-optometra').length,
      ready: ordenesTrabajo.filter(o => o.estado === 'listo-entrega').length,
      delivered: ordenesTrabajo.filter(o => o.estado === 'entregado').length,
    };
  }, [ordenesTrabajo]);

  // Signature Pad Event Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2563eb'; // Primary blue
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Save signature data URL
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // State transitions
  const handleRecibirLaboratorio = (orderId: string) => {
    const { updateOrdenStatus } = useClinicStore.getState();
    updateOrdenStatus(orderId, 'recibido-laboratorio');
    toast.success(`Trabajo ${orderId} recibido del laboratorio. Ingresa al control de calidad clínico.`);
  };

  const handleOpenQa = (order: OrdenTrabajo) => {
    setSelectedOrder(order);
    setQaObservations('');
    setOptometraVerificado(false);
    setAsesorAlineado(false);
    // Reset individual checklist items
    setOptCheck1(false);
    setOptCheck2(false);
    setOptCheck3(false);
    setOptCheck4(false);
    setOptCheck5(false);
    setOptCheck6(false);
    setAseCheck1(false);
    setAseCheck2(false);
    setAseCheck3(false);
    setAseCheck4(false);
    setAseCheck5(false);
    setIsQaModalOpen(true);
  };

  const handleGuardarQa = () => {
    if (!selectedOrder) return;

    if (selectedOrder.estado === 'recibido-laboratorio') {
      const allAseChecked = aseCheck1 && aseCheck2 && aseCheck3 && aseCheck4 && aseCheck5;
      if (!allAseChecked) {
        toast.warning('Por favor verifique y marque todos los ítems de la lista de chequeo estético del asesor.');
        return;
      }
      aprobarCalidadAsesor(selectedOrder.id, qaObservations, 'usr2'); // Carlos Asesor
      toast.success('Paso 1/2: Calidad superficial aprobada por el Asesor. Pasa a control de calidad clínico (Optometría).');
    } else if (selectedOrder.estado === 'calidad-asesor') {
      const allOptChecked = optCheck1 && optCheck2 && optCheck3 && optCheck4 && optCheck5 && optCheck6;
      if (!allOptChecked) {
        toast.warning('Por favor verifique y marque todos los ítems de la lista de chequeo de lensometría del optómetra.');
        return;
      }
      aprobarCalidadOptometra(selectedOrder.id, qaObservations, 'usr3'); // Dra Silva
      toast.success('Paso 2/2: Control clínico y de lensometría aprobado por Optometría. Trabajo listo para entrega.');
    }

    setIsQaModalOpen(false);
    setSelectedOrder(null);
  };

  const handleOpenDelivery = (order: OrdenTrabajo) => {
    setSelectedOrder(order);
    setDeliveryComments('');
    setSignatureData(null);
    setIsDeliveryModalOpen(true);
  };

  // Initialize Canvas events when Delivery Modal opens
  useEffect(() => {
    if (isDeliveryModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = 120;
    }
  }, [isDeliveryModalOpen]);

  const handleRegistrarEntrega = () => {
    if (!selectedOrder) return;
    if (!signatureData) {
      toast.warning('El paciente debe firmar la entrega a satisfacción en la tableta.');
      return;
    }

    // Si tiene saldo pendiente, abrimos el modal de facturación DIAN
    const saldo = (selectedOrder.totalFinal || 0) - (selectedOrder.abono || 0);
    if (saldo > 0) {
      setDianModalOpen(true);
    } else {
      // Si ya estaba saldado, completamos la entrega directamente
      completarEntrega(selectedOrder.id, deliveryComments, signatureData);
      toast.success(`Trabajo ${selectedOrder.id} entregado y firmado a satisfacción.`);
      setIsDeliveryModalOpen(false);
      setSelectedOrder(null);
    }
  };

  const handleDianFacturado = () => {
    if (!selectedOrder || !signatureData) return;
    
    completarEntrega(selectedOrder.id, deliveryComments, signatureData);
    toast.success(`Trabajo ${selectedOrder.id} saldado, facturado y entregado con recibo de satisfacción.`);
    setDianModalOpen(false);
    setIsDeliveryModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de Trabajo & Entregas</h1>
          <p className="text-muted-foreground text-sm">Monitorea el estado de fabricación de lentes y realiza controles de calidad antes de la entrega final.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por código u orden..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-secondary/20 p-1.5 rounded-2xl border border-border/40">
        <button
          onClick={() => setActiveTab('lab')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${activeTab === 'lab' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Truck className="w-5 h-5 text-primary" />
          <span>En Laboratorio</span>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black mt-1">{counts.lab}</span>
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${activeTab === 'qa' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldCheck className="w-5 h-5 text-warning" />
          <span>Control de Calidad (QA)</span>
          <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-black mt-1">{counts.qa}</span>
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${activeTab === 'ready' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CheckCircle2 className="w-5 h-5 text-success" />
          <span>Listo para Entrega</span>
          <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-black mt-1">{counts.ready}</span>
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${activeTab === 'delivered' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileCheck className="w-5 h-5 text-purple-600" />
          <span>Entregados</span>
          <span className="text-[10px] bg-purple-600/10 text-purple-600 px-2 py-0.5 rounded-full font-black mt-1">{counts.delivered}</span>
        </button>
      </div>

      {/* Pipeline Content */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[300px]">
        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((ord, idx) => {
              const saldo = (ord.totalFinal || 0) - (ord.abono || 0);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={ord.id}
                  className="border border-border rounded-xl p-4 bg-background shadow-sm hover:border-primary/45 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-border/50 pb-2">
                      <div>
                        <span className="text-[9px] font-bold text-muted-foreground tracking-wider font-mono">CÓDIGO: {ord.id}</span>
                        <h4 className="font-bold text-sm text-foreground mt-0.5">{ord.pacienteNombre}</h4>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        ord.estado === 'enviado-laboratorio' ? 'bg-primary/10 text-primary border border-primary/20' :
                        ord.estado === 'recibido-laboratorio' ? 'bg-warning/10 text-warning border border-warning/20' :
                        ord.estado === 'calidad-asesor' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        ord.estado === 'calidad-optometra' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                        ord.estado === 'listo-entrega' ? 'bg-success/10 text-success border border-success/20 animate-pulse' :
                        'bg-purple-600/10 text-purple-600 border border-purple-600/20'
                      }`}>
                        {ord.estado.replace('-', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p><span className="font-semibold text-foreground">Laboratorio:</span> {ord.laboratorio}</p>
                      <p><span className="font-semibold text-foreground">Montura:</span> {ord.monturaDetalle}</p>
                      <p><span className="font-semibold text-foreground">Lente:</span> {ord.lenteDiseno} ({ord.lenteMaterial})</p>
                    </div>

                    {/* Prescripción enmascarada para evitar fuga de fórmula al paciente */}
                    <div className="bg-secondary/25 border border-border/50 rounded-lg p-2.5 text-[10px] space-y-1">
                      <p className="font-bold text-foreground">Información Técnica Resolutiva</p>
                      <p><span className="font-semibold">Ojo Derecho:</span> {ord.receta.od}</p>
                      <p><span className="font-semibold">Ojo Izquierdo:</span> {ord.receta.oi}</p>
                      {ord.receta.adicion && <p><span className="font-semibold">Adición / Aditamentos:</span> {ord.receta.adicion}</p>}
                    </div>

                    {/* Cobros y saldos */}
                    <div className="bg-secondary/15 rounded-lg p-2.5 flex justify-between items-center text-xs border border-border/30">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase">Saldo abono</span>
                        <span className="font-mono text-success font-bold">$ {ord.abono?.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase">Pendiente</span>
                        <span className={`font-mono font-black ${saldo > 0 ? 'text-primary' : 'text-success'}`}>
                          $ {saldo.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>

                    {/* QA logs details if checked */}
                    <div className="space-y-1">
                      {ord.estado === 'calidad-asesor' && (
                        <div className="text-[10px] text-amber-600 bg-amber-500/5 px-2 py-1 rounded font-bold border border-amber-500/10">
                          Pendiente de Optómetra (QA Clínico)
                        </div>
                      )}
                      {ord.estado === 'calidad-optometra' && (
                        <div className="text-[10px] text-blue-600 bg-blue-500/5 px-2 py-1 rounded font-bold border border-blue-500/10">
                          Pendiente de Asesor (QA Estético)
                        </div>
                      )}
                      {ord.checkOptometra && (
                        <div className="text-[10px] text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          <span>QA Clínico verificado (Dr. Vega)</span>
                        </div>
                      )}
                      {ord.checkAsesor && (
                        <div className="text-[10px] text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          <span>QA Estético verificado (Carlos)</span>
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
                    {ord.estado === 'enviado-laboratorio' && (
                      <button
                        onClick={() => handleRecibirLaboratorio(ord.id)}
                        className="bg-primary hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Recibir de Lab
                      </button>
                    )}

                    {(ord.estado === 'recibido-laboratorio' || ord.estado === 'calidad-optometra') && (
                      <button
                        onClick={() => handleOpenQa(ord)}
                        className="bg-warning hover:bg-yellow-600 text-warning-foreground font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Hacer QA Superficial
                      </button>
                    )}

                    {ord.estado === 'listo-entrega' && (
                      <button
                        onClick={() => handleOpenDelivery(ord)}
                        className="bg-success hover:bg-green-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        Cobrar & Entregar
                      </button>
                    )}

                    {ord.estado === 'entregado' && ord.reciboSatisfaccion?.firmado && (
                      <div className="flex gap-2 w-full">
                        <span className="text-[10px] text-muted-foreground flex-1 flex items-center italic gap-1">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          Entregado conforme
                        </span>
                        <button
                          onClick={() => {
                            toast.info('Recibo de entrega a satisfacción reimpreso.');
                          }}
                          className="p-1.5 bg-secondary border border-border text-foreground hover:bg-secondary/80 rounded-lg text-xs"
                          title="Imprimir Recibo de Satisfacción"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
            <Package className="w-12 h-12 mb-2 opacity-20 text-primary" />
            <p className="font-semibold text-sm">No hay trabajos en este estado de la cola</p>
            <p className="text-xs text-muted-foreground">Utiliza los buscadores o cambia de pestaña para monitorear el flujo.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: CONTROL DE CALIDAD (QA) */}
      {isQaModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-warning" />
                Control de Calidad - {selectedOrder.id}
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

              {/* ASESOR QA (Estético/Visual) */}
              <div className="space-y-3.5">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-success block">Lista de Chequeo Estético e Inspección Superficial (Asesor):</p>
                  <div className="space-y-1.5 bg-secondary/40 p-3 rounded-xl border border-border">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                      <input type="checkbox" checked={aseCheck1} onChange={e => setAseCheck1(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                      <span>Montura planchada, nivelada y alineada</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                      <input type="checkbox" checked={aseCheck2} onChange={e => setAseCheck2(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                      <span>Lentes sin rayones, fisuras o desportillados</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                      <input type="checkbox" checked={aseCheck3} onChange={e => setAseCheck3(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                      <span>Tornillos ajustados y plaquetas correctamente posicionadas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                      <input type="checkbox" checked={aseCheck4} onChange={e => setAseCheck4(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                      <span>Bisagras fluidas (apertura y cierre suave)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                      <input type="checkbox" checked={aseCheck5} onChange={e => setAseCheck5(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                      <span>Accesorios incluidos (estuche y paño de limpieza)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Observaciones / Bitácora</label>
                <textarea 
                  placeholder="Digita detalles del control (ej: 'Dioptrías verificadas con lensómetro Zeiss, ejes en 90° conforme'...) "
                  value={qaObservations}
                  onChange={e => setQaObservations(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
                <button
                  onClick={() => setIsQaModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarQa}
                  className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                >
                  Confirmar Aprobación
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: COBRAR SALDO Y ENTREGA A SATISFACCIÓN */}
      {isDeliveryModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full my-8"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
              <h3 className="font-bold text-lg flex items-center gap-1.5">
                <PenTool className="w-5 h-5 text-success" />
                Entrega a Satisfacción - {selectedOrder.id}
              </h3>
              <button 
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-secondary/20 p-3 rounded-xl border border-border/50 text-xs space-y-1.5">
                <p><span className="font-bold text-foreground">Paciente:</span> {selectedOrder.pacienteNombre}</p>
                <p><span className="font-bold text-foreground">Montura + Lentes:</span> {selectedOrder.monturaDetalle} con {selectedOrder.lenteDiseno}</p>
                <div className="pt-1.5 border-t border-border/40 flex justify-between font-bold text-foreground">
                  <span>Saldo a Facturar:</span>
                  <span className="font-mono text-primary text-sm">$ {((selectedOrder.totalFinal || 0) - (selectedOrder.abono || 0)).toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Legal confirmation terms */}
              <div className="bg-warning/5 border border-warning/15 p-3 rounded-xl text-[10px] text-muted-foreground leading-relaxed">
                <p className="font-bold text-warning-foreground flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Blindaje y Acta de Entrega Conforme:
                </p>
                El firmante declara que recibe sus anteojos de conformidad en cuanto a alineación, adaptabilidad inicial y nitidez visual. Así mismo, certifica que se le informaron las políticas de cuidados y garantías del lente.
              </div>

              {/* Digital signature pad (HTML5 Canvas) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Firma Digital del Paciente (en Pantalla) *</label>
                  <button 
                    type="button" 
                    onClick={clearSignature}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Borrar firma
                  </button>
                </div>
                
                <div className="border border-input rounded-xl bg-background overflow-hidden relative">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair h-[120px]"
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/35 text-[11px] font-semibold uppercase tracking-wider">
                      Dibuje la firma aquí
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground block mb-1">Comentarios del Paciente (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 'Todo perfecto, veo excelente con los progresivos'..."
                  value={deliveryComments}
                  onChange={e => setDeliveryComments(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Si hay saldo, mostrar el selector de pago */}
              {((selectedOrder.totalFinal || 0) - (selectedOrder.abono || 0)) > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Método de Pago para Saldo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setMetodoPago('TARJETA')}
                      className={`p-2.5 border rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${metodoPago === 'TARJETA' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}
                    >
                      <CreditCard className="w-4 h-4" /> Tarjeta POS
                    </button>
                    <button 
                      type="button"
                      onClick={() => setMetodoPago('EFECTIVO')}
                      className={`p-2.5 border rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${metodoPago === 'EFECTIVO' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}
                    >
                      <span className="font-bold">$</span> Efectivo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-3">
                <button
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarEntrega}
                  className="bg-success hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  {((selectedOrder.totalFinal || 0) - (selectedOrder.abono || 0)) > 0 ? 'Facturar & Entregar' : 'Entregar Conforme'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DIAN checkout modal for remaining balance */}
      {dianModalOpen && selectedOrder && (
        <FacturaModal
          isOpen={dianModalOpen}
          onClose={() => setDianModalOpen(false)}
          citaId={selectedOrder.citaId}
          pacienteInfo={{
            nombre: selectedOrder.pacienteNombre.split(' ')[0],
            apellido: selectedOrder.pacienteNombre.split(' ').slice(1).join(' '),
            documento: pacientes.find(p => p.id === selectedOrder.pacienteId)?.documento || ''
          }}
          cartItems={selectedOrder.cartItems || []}
          subtotal={selectedOrder.subtotal || 0}
          promoId={selectedOrder.promoId || ''}
          descuentoCalculado={selectedOrder.descuentoCalculado || 0}
          totalFinal={(selectedOrder.totalFinal || 0) - (selectedOrder.abono || 0)} // Cobramos solo el saldo restante
          recomendacion={citas.find(c => c.id === selectedOrder.citaId)?.recomendacion}
          onSuccess={handleDianFacturado} // Callback upon successful DIAN response
        />
      )}

    </div>
  );
}
