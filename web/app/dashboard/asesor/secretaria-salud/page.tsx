'use client';

import React, { useState } from 'react';
import { 
  HeartPulse, 
  Thermometer, 
  Droplets, 
  Plus, 
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { LecturaAmbiental } from '@/lib/types';

export default function AsesorSecretariaSaludPage() {
  const { 
    lecturasAmbientales, 
    addLecturaAmbiental
  } = useClinicStore();

  const [showAddReading, setShowAddReading] = useState(false);
  const [temp, setTemp] = useState('20.0');
  const [humidity, setHumidity] = useState('55');
  const [registrador, setRegistrador] = useState('Carlos (Asesor)');
  const [ambObs, setAmbObs] = useState('');

  // Ambient statistics
  const ultimaLectura = lecturasAmbientales[0];
  const totalAlertasAmbientales = lecturasAmbientales.filter(l => 
    l.temperatura < 15 || l.temperatura > 25 || l.humedad > 70
  ).length;

  const handleCreateReading = (e: React.FormEvent) => {
    e.preventDefault();
    const tNum = parseFloat(temp);
    const hNum = parseFloat(humidity);

    if (isNaN(tNum) || isNaN(hNum)) {
      toast.error('Ingrese valores numéricos válidos.');
      return;
    }

    const newReading: LecturaAmbiental = {
      id: `LCT-${Date.now().toString().slice(-4)}`,
      fechaHora: new Date().toISOString(),
      temperatura: tNum,
      humedad: hNum,
      registradoPor: registrador,
      observaciones: ambObs || undefined
    };

    addLecturaAmbiental(newReading);

    // Detección de desviaciones
    if (tNum < 15 || tNum > 25 || hNum > 70) {
      toast.warning('Lectura registrada con ALERTA de desviación. Active plan de contingencia termohigrométrica.');
    } else {
      toast.success('Medición de temperatura y humedad registrada con éxito.');
    }

    setTemp('20.0');
    setHumidity('55');
    setAmbObs('');
    setShowAddReading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-destructive animate-pulse" />
            Control Termohigrométrico (Secretaría de Salud)
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitoreo obligatorio de temperatura y humedad del almacenamiento de dispositivos visuales.
          </p>
        </div>
        <button 
          onClick={() => setShowAddReading(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Medición Diaria
        </button>
      </div>

      {/* Dials of Current State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Temperature Display Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase block">Última Temperatura Registrada</span>
            <div className="flex items-baseline gap-1">
              <strong className="text-4xl font-black text-foreground">{ultimaLectura ? ultimaLectura.temperatura : 'N/D'}</strong>
              <span className="text-base text-muted-foreground font-bold">°C</span>
            </div>
            <span className="text-[11px] text-muted-foreground block">Rango Reglamentario: **15.0°C a 25.0°C**</span>
          </div>
          <div className={`p-5 rounded-full ${
            !ultimaLectura ? 'bg-secondary/40' :
            (ultimaLectura.temperatura >= 15 && ultimaLectura.temperatura <= 25) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            <Thermometer className="w-10 h-10" />
          </div>
        </div>

        {/* Humidity Display Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase block">Última Humedad Relativa</span>
            <div className="flex items-baseline gap-1">
              <strong className="text-4xl font-black text-foreground">{ultimaLectura ? ultimaLectura.humedad : 'N/D'}</strong>
              <span className="text-base text-muted-foreground font-bold">% H.R.</span>
            </div>
            <span className="text-[11px] text-muted-foreground block">Rango Reglamentario: **Menor a 70%**</span>
          </div>
          <div className={`p-5 rounded-full ${
            !ultimaLectura ? 'bg-secondary/40' :
            (ultimaLectura.humedad <= 70) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            <Droplets className="w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Alerta de Desviación */}
      {ultimaLectura && (ultimaLectura.temperatura < 15 || ultimaLectura.temperatura > 25 || ultimaLectura.humedad > 70) && (
        <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl flex gap-3 text-xs text-destructive items-start leading-relaxed font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0 text-destructive mt-0.5" />
          <div>
            <strong className="block font-bold">ALERTA: DESVIACIÓN DE CONDICIONES AMBIENTALES DETECTADA</strong>
            La última medición está fuera de los rangos sanitarios obligatorios. Por favor encienda el aire acondicionado, calefactor o deshumidificador según sea el caso y registre una nueva medición en 30 minutos.
          </div>
        </div>
      )}

      {/* Environmental Readings logs list */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-foreground">Bitácora Termohigrométrica Histórica</h3>
          <p className="text-muted-foreground text-xs">Historial de registros en orden cronológico inverso.</p>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Temperatura (°C)</th>
                <th className="px-4 py-3">Humedad (%)</th>
                <th className="px-4 py-3">Registrado por</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Observaciones / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {lecturasAmbientales.map((reading) => {
                const isTempDeviated = reading.temperatura < 15 || reading.temperatura > 25;
                const isHumDeviated = reading.humedad > 70;
                const hasAlert = isTempDeviated || isHumDeviated;
                
                return (
                  <tr key={reading.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-semibold">
                      {new Date(reading.fechaHora).toLocaleString('es-CO')}
                    </td>
                    <td className={`px-4 py-3 font-bold ${isTempDeviated ? 'text-destructive text-sm' : ''}`}>
                      {reading.temperatura.toFixed(1)} °C
                    </td>
                    <td className={`px-4 py-3 font-bold ${isHumDeviated ? 'text-destructive text-sm' : ''}`}>
                      {reading.humedad.toFixed(1)} %
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {reading.registradoPor}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        !hasAlert ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {!hasAlert ? 'Normal' : 'Desviado'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 italic max-w-sm truncate ${hasAlert ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {reading.observaciones || 'Sin novedades.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legal & Inspection Instructions */}
      <div className="bg-secondary/20 p-5 rounded-2xl text-[11px] leading-relaxed text-muted-foreground space-y-2">
        <span className="text-foreground font-bold uppercase block flex items-center gap-1">
          <FileCheck className="w-4 h-4 text-primary" />
          Importancia de este Registro para el Asesor de Ventas:
        </span>
        <p>1. **Frecuencia Obligatoria**: La Secretaría de Salud exige el registro de temperatura y humedad al menos **dos veces al día** (al iniciar labores por la mañana y al finalizar por la tarde).</p>
        <p>2. **Trazabilidad Legal**: No se permiten tachones en planillas físicas, por lo que el registro digital en OptiSaaS es considerado prueba primaria ante visitas de inspección.</p>
        <p>3. **Preservación de Dispositivos**: Las desviaciones prolongadas de humedad (&gt;70%) dañan los filtros antirreflejos de los cristales y propician la aparición de hongos en monturas de stock.</p>
      </div>

      {/* MODAL: ADD TEMPERATURE/HUMIDITY READING */}
      <AnimatePresence>
        {showAddReading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                  <Thermometer className="w-5 h-5 text-primary" />
                  Nueva Medición del Termohigrómetro
                </h3>
                <button
                  onClick={() => setShowAddReading(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateReading}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Temperatura (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={temp}
                      onChange={e => setTemp(e.target.value)}
                      placeholder="Ej: 20.4"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Humedad (%) *</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={humidity}
                      onChange={e => setHumidity(e.target.value)}
                      placeholder="Ej: 56"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Persona que registra *</label>
                  <select
                    value={registrador}
                    onChange={e => setRegistrador(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Carlos (Asesor)">Carlos (Asesor)</option>
                    <option value="Administrador (Sede)">Administrador (Sede)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones / Plan de contingencia</label>
                  <textarea
                    rows={2}
                    value={ambObs}
                    onChange={e => setAmbObs(e.target.value)}
                    placeholder="Todo normal... o temperatura alta, se activa extractor..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAddReading(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                  >
                    Guardar Medición
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
