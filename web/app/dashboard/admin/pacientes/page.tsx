'use client';

import React, { useState } from 'react';
import { Search, Plus, Filter, FileText, Download } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { NuevoPacienteModal } from '@/components/shared/nuevo-paciente-modal';
import { HistoriaClinicaViewModal } from '@/components/shared/historia-clinica-view-modal';
import { Paciente } from '@/lib/types';
import { motion } from 'motion/react';

export default function PacientesGlobalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { pacientes: storePacientes, citas } = useClinicStore();
  const [isNuevoPacienteOpen, setIsNuevoPacienteOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const pacientes = storePacientes.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.documento.includes(searchTerm)
  );

  const getUltimaVisitaText = (pacienteId: string, fallback?: string) => {
    const pacienteCitas = citas.filter(c => c.pacienteId === pacienteId);
    if (pacienteCitas.length === 0) {
      return fallback ? new Date(fallback).toLocaleDateString() : 'Sin visitas';
    }
    const masReciente = pacienteCitas.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())[0];
    return new Date(masReciente.fechaHora).toLocaleDateString();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pacientes & Historias Clínicas</h1>
          <p className="text-muted-foreground text-sm">Administración global de pacientes de la sede.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-background text-foreground border border-input px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button 
            onClick={() => setIsNuevoPacienteOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Paciente
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        {/* Filters and Search */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, apellido o documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors w-full sm:w-auto">
            <Filter className="w-4 h-4" /> Filtros Avanzados
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Paciente / Documento</th>
                <th className="px-6 py-3 font-semibold">Contacto</th>
                <th className="px-6 py-3 font-semibold">Última Visita</th>
                <th className="px-6 py-3 font-semibold">Estado de Cuenta</th>
                <th className="px-6 py-3 text-right font-semibold">Acciones Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pacientes.length > 0 ? (
                pacientes.map((paciente, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={paciente.id} 
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{paciente.apellido}, {paciente.nombre}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{paciente.tipoDocumento} {paciente.documento}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground">{paciente.telefono}</div>
                      <div className="text-xs text-muted-foreground">{paciente.email || 'Sin correo'}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {getUltimaVisitaText(paciente.id, paciente.fechaUltimaVisita)}
                    </td>
                    <td className="px-6 py-4">
                      {paciente.saldoPendiente > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning-foreground border border-warning/20">
                          Deuda: $ {paciente.saldoPendiente.toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-success/10 text-success-foreground border border-success/20">
                          Paz y Salvo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setSelectedPaciente(paciente);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Auditar Historia Clínica"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No se encontraron pacientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevoPacienteModal
        isOpen={isNuevoPacienteOpen}
        onClose={() => setIsNuevoPacienteOpen(false)}
      />

      {selectedPaciente && (
        <HistoriaClinicaViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedPaciente(null);
          }}
          pacienteInfo={selectedPaciente}
          hc={citas.find(c => c.pacienteId === selectedPaciente.id && c.historiaClinica)?.historiaClinica}
        />
      )}
    </div>
  );
}
