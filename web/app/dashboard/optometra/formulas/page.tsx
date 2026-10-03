'use client';

import React, { useState } from 'react';
import { Search, Printer, FileDown, Eye, Filter } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { HistoriaClinicaViewModal } from '@/components/shared/historia-clinica-view-modal';
import { Cita } from '@/lib/types';
import { motion } from 'motion/react';

export default function FormulasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { citas, pacientes } = useClinicStore();
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Get appointments that have a clinical history (meaning they have been completed and signed)
  const formulasRaw = citas.filter(c => c.historiaClinica);

  const formulas = formulasRaw.map(cita => {
    const paciente = pacientes.find(p => p.id === cita.pacienteId);
    const nombrePaciente = paciente ? `${paciente.apellido}, ${paciente.nombre}` : 'Paciente Desconocido';
    const tipo = cita.recomendacion?.diseno || cita.historiaClinica?.recomendacion?.diseno || 'Gafas';
    
    // Calculate if prescription is expired (more than 1 year old)
    const fechaEmision = new Date(cita.fechaHora);
    const unAnoFwd = new Date(fechaEmision);
    unAnoFwd.setFullYear(fechaEmision.getFullYear() + 1);
    const esVigente = new Date() < unAnoFwd;

    return {
      id: `RX-${cita.id.replace('cita', '')}`,
      fecha: fechaEmision.toISOString().split('T')[0],
      paciente: nombrePaciente,
      tipo: tipo,
      estado: esVigente ? 'Vigente' : 'Vencida',
      rawCita: cita,
      rawPaciente: paciente
    };
  }).filter(rx => 
    rx.paciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rx.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fórmulas Ópticas</h1>
          <p className="text-muted-foreground text-sm">Historial de recetas emitidas para gafas y lentes de contacto.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        {/* Filters and Search */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por paciente o N° de RX..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors flex-1 sm:flex-none">
              <Filter className="w-4 h-4" /> Tipo
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors flex-1 sm:flex-none">
              <Filter className="w-4 h-4" /> Estado
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">N° RX</th>
                <th className="px-6 py-3 font-semibold">Fecha Emisión</th>
                <th className="px-6 py-3 font-semibold">Paciente</th>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Estado</th>
                <th className="px-6 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {formulas.length > 0 ? (
                formulas.map((rx, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={rx.id} 
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-foreground">
                      {rx.id}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {rx.fecha}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {rx.paciente}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {rx.tipo}
                    </td>
                    <td className="px-6 py-4">
                      {rx.estado === 'Vigente' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success uppercase tracking-wider">
                          Vigente
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive uppercase tracking-wider">
                          Vencida
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedCita(rx.rawCita);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Ver Detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedCita(rx.rawCita);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No se encontraron fórmulas emitidas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCita && selectedCita.historiaClinica && (
        <HistoriaClinicaViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedCita(null);
          }}
          pacienteInfo={pacientes.find(p => p.id === selectedCita.pacienteId)!}
          hc={selectedCita.historiaClinica}
        />
      )}
    </div>
  );
}
