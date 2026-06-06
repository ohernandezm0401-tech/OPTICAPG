'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X, Calendar, User, Phone, Mail, Award, CheckCircle } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { Paciente, Cita } from '@/lib/types';
import { toast } from '@/lib/toast-store';

interface NuevoPacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NuevoPacienteModal({ isOpen, onClose }: NuevoPacienteModalProps) {
  const { addPaciente, addCita } = useClinicStore();
  const [success, setSuccess] = useState(false);

  // Form states for Paciente
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'CC' | 'CE' | 'TI' | 'PA'>('CC');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [eps, setEps] = useState('');

  // Form states for Cita
  const [agendarHoy, setAgendarHoy] = useState(true);
  const [motivoClinico, setMotivoClinico] = useState('Valoración Inicial Optometría');
  const [prioridad, setPrioridad] = useState<'normal' | 'alta' | 'urgente'>('normal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apellido || !documento || !telefono || !fechaNacimiento) {
      toast.warning('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    const pacienteId = `pac-${Date.now()}`;
    const nuevoPaciente: Paciente = {
      id: pacienteId,
      empresaId: 'emp1', // Default empresa
      nombre,
      apellido,
      documento,
      tipoDocumento,
      telefono,
      email: email || undefined,
      fechaNacimiento,
      eps: eps || undefined,
      saldoPendiente: 0,
      fechaUltimaVisita: agendarHoy ? new Date().toISOString().split('T')[0] : undefined,
    };

    // Save paciente to store
    addPaciente(nuevoPaciente);
    toast.success(`Paciente ${nombre} ${apellido} registrado exitosamente`);

    // If checkmark active, also schedule an appointment for today
    if (agendarHoy) {
      const nuevaCita: Cita = {
        id: `cita-${Date.now()}`,
        sedeId: 'sede1', // Default sede
        fechaHora: new Date().toISOString(),
        pacienteId,
        profesionalId: 'usr3', // Dra. Silva
        motivoClinico,
        estadoComercial: 'por-llegar',
        prioridad,
      };
      addCita(nuevaCita);
      toast.info(`Consulta agendada para hoy`);
    }

    setSuccess(true);
    setTimeout(() => {
      // Reset form
      setNombre('');
      setApellido('');
      setDocumento('');
      setTelefono('');
      setEmail('');
      setFechaNacimiento('');
      setEps('');
      setAgendarHoy(true);
      setMotivoClinico('Valoración Inicial Optometría');
      setPrioridad('normal');
      setSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <UserPlus className="w-5 h-5 text-primary" />
              Registrar Nuevo Paciente
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6">
            {success ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-foreground">¡Registro Exitoso!</h4>
                  <p className="text-sm text-muted-foreground">
                    El paciente ha sido registrado {agendarHoy ? 'y su consulta agendada' : ''} correctamente.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos Básicos */}
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Datos Personales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. Maria"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Apellido *</label>
                      <input
                        type="text"
                        required
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. García"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="text-xs font-semibold block mb-1">Tipo *</label>
                        <select
                          value={tipoDocumento}
                          onChange={(e) => setTipoDocumento(e.target.value as any)}
                          className="w-full px-2 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="CC">C.C.</option>
                          <option value="CE">C.E.</option>
                          <option value="TI">T.I.</option>
                          <option value="PA">P.A.</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold block mb-1">Nº Documento *</label>
                        <input
                          type="text"
                          required
                          value={documento}
                          onChange={(e) => setDocumento(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Ej. 10203040"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        required
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Información de Contacto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Teléfono *</label>
                      <input
                        type="tel"
                        required
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. 3001234567"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. maria@correo.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">EPS / Aseguradora</label>
                      <input
                        type="text"
                        value={eps}
                        onChange={(e) => setEps(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ej. Sanitas"
                      />
                    </div>
                  </div>
                </div>

                {/* Agendamiento Express */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-bold text-sm text-foreground">Agendar consulta para HOY</h4>
                        <p className="text-xs text-muted-foreground">Crea un registro de cita en estado "Por Llegar".</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agendarHoy}
                        onChange={(e) => setAgendarHoy(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {agendarHoy && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-primary/10 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="text-xs font-semibold block mb-1 text-foreground">Motivo Clínico</label>
                        <select
                          value={motivoClinico}
                          onChange={(e) => setMotivoClinico(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Valoración Inicial Optometría">Valoración Inicial Optometría</option>
                          <option value="Control Anual">Control Anual</option>
                          <option value="Control Post-Queratocono">Control Post-Queratocono</option>
                          <option value="Valoración Lentes de Contacto">Valoración Lentes de Contacto</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1 text-foreground">Prioridad</label>
                        <select
                          value={prioridad}
                          onChange={(e) => setPrioridad(e.target.value as any)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="normal">Normal</option>
                          <option value="alta">Alta</option>
                          <option value="urgente">Urgente</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Guardar Paciente
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
