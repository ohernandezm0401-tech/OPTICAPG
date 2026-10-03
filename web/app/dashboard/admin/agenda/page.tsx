'use client';

import React from 'react';
import { Calendar as CalendarIcon, User, Clock, FileText, Filter } from 'lucide-react';
import { mockUsuarios } from '@/lib/mock-data';
import { useClinicStore } from '@/lib/store';
import { StatusBadge } from '@/components/ui/status-badge';
import { motion } from 'motion/react';

export default function AgendaPage() {
  const { citas, pacientes } = useClinicStore();

  // Enriquecer citas
  const citasFull = citas.map(cita => ({
    ...cita,
    paciente: pacientes.find(p => p.id === cita.pacienteId),
    profesional: mockUsuarios.find(u => u.id === cita.profesionalId)
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda Global de la Sede</h1>
          <p className="text-muted-foreground text-sm">Vista consolidada de todos los profesionales y consultorios.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
            <input type="date" className="bg-background border border-input px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm">
            Asignar Cita
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="flex gap-2 w-full sm:w-auto">
            <select className="bg-background border border-input text-sm rounded-lg px-3 py-2 w-full sm:w-[200px] outline-none focus:ring-2 focus:ring-primary">
              <option value="todos">Todos los Profesionales</option>
              {mockUsuarios.filter(u => u.role === 'optometra' || u.role === 'admin').map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto text-sm">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success"></span> En Sala</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> En Consulta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground"></span> Por Llegar</span>
          </div>
        </div>

        {/* Table / Timeline */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold w-24">Hora</th>
                <th className="px-6 py-3 font-semibold">Profesional</th>
                <th className="px-6 py-3 font-semibold">Paciente</th>
                <th className="px-6 py-3 font-semibold">Motivo</th>
                <th className="px-6 py-3 font-semibold">Estado Clínico/Comercial</th>
                <th className="px-6 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {citasFull.length > 0 ? (
                citasFull.map((cita, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={cita.id} 
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-foreground">
                      {new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{cita.profesional?.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {cita.paciente?.apellido}, {cita.paciente?.nombre}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cita.motivoClinico}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={cita.estadoComercial} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary text-xs font-semibold hover:underline">Gestionar</button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No hay citas programadas para este día.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
