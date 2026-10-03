'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Building2, 
  Users, 
  MapPin, 
  Clock, 
  X, 
  PlusCircle, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { Garantia } from '@/lib/types';
import { useSessionUser } from '@/hooks/use-session-user';

export default function AsesorGarantiasPage() {
  const { garantias, pacientes, ordenesTrabajo, addGarantia } = useClinicStore();
  const { sedeId, empresaId } = useSessionUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new warranty
  const [pacienteDoc, setPacienteDoc] = useState('');
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [selectedPacienteNombre, setSelectedPacienteNombre] = useState('');
  const [selectedOrdenId, setSelectedOrdenId] = useState('');
  const [tipoGarantia, setTipoGarantia] = useState<'adaptacion-receta' | 'defecto-montura' | 'tratamiento-lente' | 'rotura' | 'otro'>('defecto-montura');
  const [productoNombre, setProductoNombre] = useState('');
  const [motivoDetalle, setMotivoDetalle] = useState('');

  // Search paciente by document
  const handleBuscarPaciente = () => {
    if (!pacienteDoc) {
      toast.warning('Ingrese un número de documento.');
      return;
    }
    const pac = pacientes.find(p => p.documento === pacienteDoc);
    if (!pac) {
      toast.error('Paciente no encontrado en el sistema.');
      setSelectedPacienteId('');
      setSelectedPacienteNombre('');
      return;
    }
    setSelectedPacienteId(pac.id);
    setSelectedPacienteNombre(`${pac.nombre} ${pac.apellido}`);
    toast.success(`Paciente seleccionado: ${pac.nombre} ${pac.apellido}`);
  };

  // Filter orders for the selected patient
  const ordenesPaciente = ordenesTrabajo.filter(o => o.pacienteId === selectedPacienteId);

  const handleCreateGarantia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPacienteId || !productoNombre || !motivoDetalle) {
      toast.warning('Debe completar los campos obligatorios (*).');
      return;
    }

    const newWarranty: Garantia = {
      id: `GAR-${Date.now().toString().slice(-4)}`,
      empresaId: empresaId || 'emp1',
      sedeId,
      pacienteId: selectedPacienteId,
      pacienteNombre: selectedPacienteNombre,
      ordenTrabajoId: selectedOrdenId || undefined,
      productoNombre,
      tipoGarantia,
      fechaReclamacion: new Date().toISOString(),
      motivoDetalle,
      estado: 'bajo-evaluacion',
      costoOptica: 0,
      costoPaciente: 0
    };

    addGarantia(newWarranty);
    toast.success(`Garantía ${newWarranty.id} registrada. Enviada a evaluación.`);
    
    // Reset form
    setPacienteDoc('');
    setSelectedPacienteId('');
    setSelectedPacienteNombre('');
    setSelectedOrdenId('');
    setProductoNombre('');
    setMotivoDetalle('');
    setTipoGarantia('defecto-montura');
    setShowAddModal(false);
  };

  // Filter warranties for this branch (sede1)
  const branchWarranties = garantias.filter(g => g.sedeId === sedeId);

  // Filter search list
  const filteredWarranties = branchWarranties.filter(g => 
    g.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.productoNombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registro de Garantías</h1>
          <p className="text-muted-foreground text-sm">Gestiona reclamaciones, averías y coordina rechequeos clínicos con el optómetra.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Reclamación (Garantía)
        </button>
      </div>

      {/* Main Panel Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/15 rounded-t-xl">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por paciente o producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Warranties List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-6 py-3.5">ID / Paciente</th>
                <th className="px-6 py-3.5">Producto Afectado</th>
                <th className="px-6 py-3.5">Motivo Reclamación</th>
                <th className="px-6 py-3.5">Estado actual</th>
                <th className="px-6 py-3.5 text-right font-bold">Detalles de Resolución</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {filteredWarranties.map((gar) => (
                <tr key={gar.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{gar.pacienteNombre}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{gar.id} • {new Date(gar.fechaReclamacion).toLocaleDateString('es-CO')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{gar.productoNombre}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-muted-foreground font-semibold uppercase">{gar.tipoGarantia}</span>
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
                  <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                    {gar.resolucionDetalle ? (
                      <span className="italic block max-w-xs truncate text-right float-right">&quot;{gar.resolucionDetalle}&quot;</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-warning-foreground bg-warning/15 px-2 py-0.5 rounded">En trámite</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredWarranties.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground font-medium">
                    No hay reclamaciones de garantía registradas en esta sucursal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RECLAMATION MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h2 className="text-lg font-black flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Registrar Reclamación (Garantía)
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateGarantia}>
                
                {/* Search Patient */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Buscar Paciente por Cédula / Documento *</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={pacienteDoc} 
                      onChange={(e) => setPacienteDoc(e.target.value)} 
                      className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                      placeholder="Cédula del paciente (Ej: 52483123)" 
                    />
                    <button
                      type="button"
                      onClick={handleBuscarPaciente}
                      className="px-4 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 font-bold rounded-xl text-xs"
                    >
                      Buscar
                    </button>
                  </div>
                </div>

                {selectedPacienteId && (
                  <>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-xs flex justify-between items-center">
                      <div>
                        <span className="text-muted-foreground block">Paciente Seleccionado:</span>
                        <strong className="text-foreground text-sm">{selectedPacienteNombre}</strong>
                      </div>
                      <Check className="w-5 h-5 text-success" />
                    </div>

                    {/* Link to previous orders */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground block">Enlazar a Orden de Trabajo Previa (Opcional)</label>
                      <select
                        value={selectedOrdenId}
                        onChange={(e) => {
                          const orderId = e.target.value;
                          setSelectedOrdenId(orderId);
                          const matchingOrder = ordenesPaciente.find(o => o.id === orderId);
                          if (matchingOrder) {
                            setProductoNombre(`${matchingOrder.monturaDetalle} + Lentes ${matchingOrder.lenteMaterial}`);
                          }
                        }}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="">Seleccione una orden previa</option>
                        {ordenesPaciente.map(ord => (
                          <option key={ord.id} value={ord.id}>{ord.id} — {ord.monturaDetalle} ({new Date(ord.fechaCreacion).toLocaleDateString('es-CO')})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">Motivo / Tipo Garantía</label>
                        <select
                          value={tipoGarantia}
                          onChange={(e) => setTipoGarantia(e.target.value as any)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="defecto-montura">Defecto en Montura</option>
                          <option value="adaptacion-receta">Desadaptación Fórmula</option>
                          <option value="tratamiento-lente">Daño en Tratamiento Lente</option>
                          <option value="rotura">Rotura / Daño Accidental</option>
                          <option value="otro">Otro Motivo</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground block">Nombre del Producto Afectado *</label>
                        <input 
                          type="text" 
                          required 
                          value={productoNombre}
                          onChange={(e) => setProductoNombre(e.target.value)}
                          placeholder="Ej: Ray-Ban Aviator Classic"
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground block">Detalles del Defecto / Queja del Paciente *</label>
                      <textarea
                        required
                        rows={3}
                        value={motivoDetalle}
                        onChange={(e) => setMotivoDetalle(e.target.value)}
                        placeholder="Paciente informa dolor de cabeza... o tratamiento antirreflejo desprendido..."
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                      <button 
                        type="button" 
                        onClick={() => setShowAddModal(false)} 
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                      >
                        Registrar Garantía
                      </button>
                    </div>
                  </>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
