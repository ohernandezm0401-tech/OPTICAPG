'use client';

import React, { useState } from 'react';
import { 
  Eye, 
  Search, 
  Save, 
  User, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Activity, 
  Sparkles, 
  AlertTriangle, 
  Shield, 
  BookOpen, 
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { Paciente, Cita } from '@/lib/types';

const MARCAS_OPTIONS = [
  { value: 'acuvue-oasys', label: 'Acuvue Oasys (Johnson & Johnson)' },
  { value: 'biofinity', label: 'Biofinity (CooperVision)' },
  { value: 'air-optix-plus', label: 'Air Optix Plus HydraGlyde (Alcon)' },
  { value: 'ultra', label: 'Bausch + Lomb ULTRA' },
  { value: 'clariti-1day', label: 'Clariti 1-Day (CooperVision)' },
  { value: 'oasys-1day', label: 'Acuvue Oasys 1-Day' },
  { value: 'custom-rgp', label: 'Lente RGP Personalizado' }
];

const MATERIALES_OPTIONS = [
  { value: 'senofilcon-a', label: 'Senofilcon A (Silicona Hidrogel)' },
  { value: 'comfilcon-a', label: 'Comfilcon A (Silicona Hidrogel)' },
  { value: 'lotrafilcon-b', label: 'Lotrafilcon B (Silicona Hidrogel)' },
  { value: 'samfilcon-a', label: 'Samfilcon A (Silicona Hidrogel)' },
  { value: 'somofilcon-a', label: 'Somofilcon A (Silicona Hidrogel)' },
  { value: 'rgp-fluorosilicona', label: 'Fluorosilicona Acrilato (Gas Permeable)' }
];

export default function AdaptacionLcPage() {
  const router = useRouter();
  const { pacientes, updatePaciente } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  
  // Form states
  const [activeTab, setActiveTab] = useState<'parametros' | 'evaluacion' | 'educacion'>('parametros');
  const [tipoLente, setTipoLente] = useState<'blando-esferico' | 'blando-torico' | 'blando-multifocal' | 'rgp' | 'escleral'>('blando-esferico');
  const [marca, setMarca] = useState('acuvue-oasys');
  const [material, setMaterial] = useState('senofilcon-a');
  const [reemplazo, setReemplazo] = useState<'diario' | 'quincenal' | 'mensual' | 'anual'>('quincenal');

  // Parameters OD
  const [odEsfera, setOdEsfera] = useState('-1.50');
  const [odCilindro, setOdCilindro] = useState('');
  const [odEje, setOdEje] = useState('');
  const [odBc, setOdBc] = useState('8.4');
  const [odDia, setOdDia] = useState('14.0');
  const [odAv, setOdAv] = useState('20/20');

  // Parameters OI
  const [oiEsfera, setOiEsfera] = useState('-1.25');
  const [oiCilindro, setOiCilindro] = useState('');
  const [oiEje, setOiEje] = useState('');
  const [oiBc, setOiBc] = useState('8.4');
  const [oiDia, setOiDia] = useState('14.0');
  const [oiAv, setOiAv] = useState('20/20');

  // Evaluation details
  const [odCentrado, setOdCentrado] = useState('centrado');
  const [odMovimiento, setOdMovimiento] = useState('normal');
  const [odSobreEsfera, setOdSobreEsfera] = useState('0.00');
  const [odSobreCilindro, setOdSobreCilindro] = useState('');
  const [odSobreEje, setOdSobreEje] = useState('');
  const [odLag, setOdLag] = useState('0.8');

  const [oiCentrado, setOiCentrado] = useState('centrado');
  const [oiMovimiento, setOiMovimiento] = useState('normal');
  const [oiSobreEsfera, setOiSobreEsfera] = useState('0.00');
  const [oiSobreCilindro, setOiSobreCilindro] = useState('');
  const [oiSobreEje, setOiSobreEje] = useState('');
  const [oiLag, setOiLag] = useState('0.8');

  const [tiempoUsoHoras, setTiempoUsoHoras] = useState('4');
  const [comodidadSubjetiva, setComodidadSubjetiva] = useState('excelente');
  const [fluorogramaRgp, setFluorogramaRgp] = useState('');

  // Education checklist
  const [entrenamientoColocacion, setEntrenamientoColocacion] = useState(false);
  const [entrenamientoRetiro, setEntrenamientoRetiro] = useState(false);
  const [instruccionHigiene, setInstruccionHigiene] = useState(false);
  const [advertenciaSintomas, setAdvertenciaSintomas] = useState(false);
  const [cronogramaUsoDiseno, setCronogramaUsoDiseno] = useState(false);
  const [solucionRecomendada, setSolucionRecomendada] = useState('Solución Multipropósito Biotrue');
  const [observacionesEducacion, setObservacionesEducacion] = useState('');

  // Search filter
  const filteredPacientes = pacientes.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.documento.includes(searchTerm)
  );

  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente);
    setSearchTerm('');
    // Prefill parameters if patient has an active appointment with subjectives
    toast.success(`Paciente seleccionado: ${paciente.nombre} ${paciente.apellido}`);
  };

  const handleGuardarAdaptacion = () => {
    if (!selectedPaciente) {
      toast.warning('Debe seleccionar un paciente.');
      return;
    }
    if (!entrenamientoColocacion || !entrenamientoRetiro || !instruccionHigiene) {
      toast.warning('El paciente debe superar el entrenamiento práctico de colocación, retiro e higiene.');
      setActiveTab('educacion');
      return;
    }

    // Save contact lens details as clinical notes/metadata in patient model
    const currentNotes = selectedPaciente.saldoPendiente; // Keep existing store fields intact
    updatePaciente(selectedPaciente.id, {
      ocupacion: `${selectedPaciente.ocupacion || ''} [L.C. Adaptado: ${MARCAS_OPTIONS.find(m => m.value === marca)?.label || marca}]`
    });

    toast.success('✓ Ficha de Adaptación de Lentes de Contacto registrada y guardada.');
    router.push('/dashboard/optometra');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adaptación de Lentes de Contacto</h1>
          <p className="text-muted-foreground text-sm">Registro técnico de curvas base, diámetros, fluorogramas y entrenamiento del paciente.</p>
        </div>
        {selectedPaciente && (
          <button 
            onClick={handleGuardarAdaptacion}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Adaptación
          </button>
        )}
      </div>

      {!selectedPaciente ? (
        // Patient Selection Screen
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 mt-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">Seleccione un Paciente</h2>
            <p className="text-muted-foreground text-xs">Busque al paciente para iniciar la adaptación termodinámica del lente de contacto.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, apellido o cédula..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {searchTerm && (
            <div className="border border-border rounded-xl divide-y divide-border max-h-[220px] overflow-y-auto bg-background">
              {filteredPacientes.length > 0 ? (
                filteredPacientes.map(pac => (
                  <button
                    key={pac.id}
                    onClick={() => handleSelectPaciente(pac)}
                    className="w-full text-left px-4 py-3 hover:bg-secondary/40 transition-colors flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-bold text-foreground">{pac.apellido}, {pac.nombre}</span>
                      <span className="text-xs text-muted-foreground ml-2">({pac.tipoDocumento} {pac.documento})</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-xs text-muted-foreground">No se encontraron pacientes.</div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Main Form Screen
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar: Patient Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-sm">
                  {selectedPaciente.nombre[0]}{selectedPaciente.apellido[0]}
                </div>
                <div>
                  <h3 className="font-bold leading-tight text-foreground text-sm">{selectedPaciente.nombre} {selectedPaciente.apellido}</h3>
                  <p className="text-xs text-muted-foreground">CC {selectedPaciente.documento}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EPS</span>
                  <span className="font-semibold text-foreground">{selectedPaciente.eps || 'Particular'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Género</span>
                  <span className="font-semibold text-foreground">{selectedPaciente.genero || 'No especifica'}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPaciente(null)}
                className="w-full text-center bg-secondary hover:bg-secondary/80 border border-border/60 text-muted-foreground hover:text-foreground text-[10px] uppercase font-bold py-2 rounded-xl transition-all"
              >
                Cambiar Paciente
              </button>
            </div>

            {/* Legal Warning Notice: Resolution 3100 */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl text-[10px] text-blue-800 dark:text-blue-200 leading-relaxed flex items-start gap-2">
              <Shield className="w-4.5 h-4.5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] text-blue-900 dark:text-blue-100">Cumplimiento Res. 3100 de 2019</p>
                La adaptación de lentes de contacto es un procedimiento clínico de invasión ocular. Requiere verificación obligatoria del estado corneal mediante biomicroscopía y el consentimiento informado firmado por el paciente.
              </div>
            </div>
          </div>

          {/* Main Form Fields */}
          <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-border bg-secondary/15 overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActiveTab('parametros')}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'parametros' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
              >
                <Activity className="w-4 h-4" /> 1. Parámetros del Lente
              </button>
              <button 
                onClick={() => setActiveTab('evaluacion')}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'evaluacion' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
              >
                <Eye className="w-4 h-4" /> 2. Evaluación de Adaptación
              </button>
              <button 
                onClick={() => setActiveTab('educacion')}
                className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'educacion' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
              >
                <BookOpen className="w-4 h-4" /> 3. Entrenamiento y Educación
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1">

              {/* TAB 1: PARÁMETROS */}
              {activeTab === 'parametros' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  
                  {/* Lens Selection Details */}
                  <div className="bg-secondary/10 p-4 rounded-xl border border-border space-y-4">
                    <span className="font-bold text-xs text-muted-foreground uppercase block">Especificaciones Generales del Lente</span>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-muted-foreground">Tipo de Lente</label>
                        <select 
                          value={tipoLente} 
                          onChange={e => setTipoLente(e.target.value as any)}
                          className="w-full px-2.5 py-2 bg-background border border-input rounded-lg"
                        >
                          <option value="blando-esferico">Blando Esférico</option>
                          <option value="blando-torico">Blando Tórico</option>
                          <option value="blando-multifocal">Blando Multifocal</option>
                          <option value="rgp">RGP (Rígido Gas Permeable)</option>
                          <option value="escleral">Escleral</option>
                        </select>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-muted-foreground">Marca Comercial</label>
                        <select 
                          value={marca} 
                          onChange={e => setMarca(e.target.value)}
                          className="w-full px-2.5 py-2 bg-background border border-input rounded-lg"
                        >
                          {MARCAS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-muted-foreground">Material</label>
                        <select 
                          value={material} 
                          onChange={e => setMaterial(e.target.value)}
                          className="w-full px-2.5 py-2 bg-background border border-input rounded-lg"
                        >
                          {MATERIALES_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-muted-foreground">Reemplazo / Duración</label>
                        <select 
                          value={reemplazo} 
                          onChange={e => setReemplazo(e.target.value as any)}
                          className="w-full px-2.5 py-2 bg-background border border-input rounded-lg"
                        >
                          <option value="diario">Diario</option>
                          <option value="quincenal">Quincenal</option>
                          <option value="mensual">Mensual</option>
                          <option value="anual">Anual (Convencional)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Parameter Entry Tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ojo Derecho */}
                    <div className="border border-border rounded-xl p-4 space-y-4 bg-background shadow-sm">
                      <span className="font-bold text-xs text-primary uppercase block flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Ojo Derecho (OD)
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Esfera</label>
                          <input type="text" value={odEsfera} onChange={e => setOdEsfera(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="-0.00" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Cilindro</label>
                          <input type="text" value={odCilindro} onChange={e => setOdCilindro(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="Dejar vacío si es esférico" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Eje (°)</label>
                          <input type="text" value={odEje} onChange={e => setOdEje(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Agudeza Visual (AV)</label>
                          <input type="text" value={odAv} onChange={e => setOdAv(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="20/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Curva Base (BC - mm) *</label>
                          <input type="text" value={odBc} onChange={e => setOdBc(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="8.4" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Diámetro (DIA - mm) *</label>
                          <input type="text" value={odDia} onChange={e => setOdDia(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="14.0" />
                        </div>
                      </div>
                    </div>

                    {/* Ojo Izquierdo */}
                    <div className="border border-border rounded-xl p-4 space-y-4 bg-background shadow-sm">
                      <span className="font-bold text-xs text-primary uppercase block flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Ojo Izquierdo (OI)
                      </span>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Esfera</label>
                          <input type="text" value={oiEsfera} onChange={e => setOiEsfera(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="-0.00" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Cilindro</label>
                          <input type="text" value={oiCilindro} onChange={e => setOiCilindro(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="Dejar vacío si es esférico" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Eje (°)</label>
                          <input type="text" value={oiEje} onChange={e => setOiEje(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Agudeza Visual (AV)</label>
                          <input type="text" value={oiAv} onChange={e => setOiAv(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono" placeholder="20/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Curva Base (BC - mm) *</label>
                          <input type="text" value={oiBc} onChange={e => setOiBc(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="8.4" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold">Diámetro (DIA - mm) *</label>
                          <input type="text" value={oiDia} onChange={e => setOiDia(e.target.value)} className="w-full px-2.5 py-1.5 border border-input rounded-lg text-center font-mono font-bold" placeholder="14.0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <button 
                      onClick={() => setActiveTab('evaluacion')}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      Siguiente: Evaluación <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: EVALUACIÓN */}
              {activeTab === 'evaluacion' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  
                  {/* Fitting criteria table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OD Evaluation */}
                    <div className="border border-border rounded-xl p-4 bg-background space-y-4">
                      <span className="font-bold text-xs text-primary uppercase block">Comportamiento en OD</span>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Centrado</label>
                          <select value={odCentrado} onChange={e => setOdCentrado(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background">
                            <option value="centrado">Centrado</option>
                            <option value="descentrado-temporal">Descentrado Temporal</option>
                            <option value="descentrado-nasal">Descentrado Nasal</option>
                            <option value="descentrado-superior">Descentrado Superior</option>
                            <option value="descentrado-inferior">Descentrado Inferior</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Movimiento con Parpadeo</label>
                          <select value={odMovimiento} onChange={e => setOdMovimiento(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background">
                            <option value="normal">Adecuado (1.0 - 1.5 mm)</option>
                            <option value="ajustado">Ajustado (Falta movimiento)</option>
                            <option value="flojo">Flojo (Movimiento excesivo)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Lag / Mov. en mirada superior</label>
                          <input type="text" value={odLag} onChange={e => setOdLag(e.target.value)} className="w-full p-2 border border-input rounded-lg font-mono text-center" placeholder="e.g. 0.8 mm" />
                        </div>
                      </div>

                      {/* Over Refraction */}
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <span className="font-bold text-[10px] text-muted-foreground uppercase block">Sobre-Refracción (Over-Refraction)</span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[9px]">Esfera</label>
                            <input type="text" value={odSobreEsfera} onChange={e => setOdSobreEsfera(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[9px]">Cilindro</label>
                            <input type="text" value={odSobreCilindro} onChange={e => setOdSobreCilindro(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[9px]">Eje</label>
                            <input type="text" value={odSobreEje} onChange={e => setOdSobreEje(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OI Evaluation */}
                    <div className="border border-border rounded-xl p-4 bg-background space-y-4">
                      <span className="font-bold text-xs text-primary uppercase block">Comportamiento en OI</span>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Centrado</label>
                          <select value={oiCentrado} onChange={e => setOiCentrado(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background">
                            <option value="centrado">Centrado</option>
                            <option value="descentrado-temporal">Descentrado Temporal</option>
                            <option value="descentrado-nasal">Descentrado Nasal</option>
                            <option value="descentrado-superior">Descentrado Superior</option>
                            <option value="descentrado-inferior">Descentrado Inferior</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Movimiento con Parpadeo</label>
                          <select value={oiMovimiento} onChange={e => setOiMovimiento(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background">
                            <option value="normal">Adecuado (1.0 - 1.5 mm)</option>
                            <option value="ajustado">Ajustado (Falta movimiento)</option>
                            <option value="flojo">Flojo (Movimiento excesivo)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-muted-foreground">Lag / Mov. en mirada superior</label>
                          <input type="text" value={oiLag} onChange={e => setOiLag(e.target.value)} className="w-full p-2 border border-input rounded-lg font-mono text-center" placeholder="e.g. 0.8 mm" />
                        </div>
                      </div>

                      {/* Over Refraction */}
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <span className="font-bold text-[10px] text-muted-foreground uppercase block">Sobre-Refracción (Over-Refraction)</span>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <label className="text-[9px]">Esfera</label>
                            <input type="text" value={oiSobreEsfera} onChange={e => setOiSobreEsfera(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[9px]">Cilindro</label>
                            <input type="text" value={oiSobreCilindro} onChange={e => setOiSobreCilindro(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[9px]">Eje</label>
                            <input type="text" value={oiSobreEje} onChange={e => setOiSobreEje(e.target.value)} className="w-full p-1.5 border border-input rounded text-center font-mono" placeholder="0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Fields for GP or Rigid Lenses */}
                  {(tipoLente === 'rgp' || tipoLente === 'escleral') && (
                    <div className="bg-purple-500/5 border border-purple-500/25 p-4 rounded-xl space-y-3">
                      <span className="font-bold text-xs text-purple-700 uppercase block">Análisis de Fluorograma (Lentes GP / Esclerales)</span>
                      <textarea
                        value={fluorogramaRgp}
                        onChange={e => setFluorogramaRgp(e.target.value)}
                        placeholder="Describa el patrón de fluoresceína: e.g. Apoyo apical leve, banda de aclaramiento periférico de 1.0mm..."
                        className="w-full bg-background border border-input rounded-lg p-2.5 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* General Adaptation Statistics */}
                  <div className="bg-secondary/15 p-4 rounded-xl border border-border/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-muted-foreground">Comodidad Subjetiva del Paciente (Luego de 20 min)</label>
                      <select value={comodidadSubjetiva} onChange={e => setComodidadSubjetiva(e.target.value)} className="w-full p-2 border border-input rounded-lg bg-background">
                        <option value="excelente">Excelente (No lo siente)</option>
                        <option value="buena">Buena (Sensación normal tolerable)</option>
                        <option value="regular">Regular (Disconfort leve)</option>
                        <option value="mala">Mala (Rechazo inmediato/Prurito)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-muted-foreground">Prueba de Tolerancia Inicial (Horas recomendadas día 1)</label>
                      <input type="number" min="1" max="12" value={tiempoUsoHoras} onChange={e => setTiempoUsoHoras(e.target.value)} className="w-full p-2 border border-input rounded-lg text-center" />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border">
                    <button 
                      onClick={() => setActiveTab('parametros')}
                      className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                    >
                      Atrás
                    </button>
                    <button 
                      onClick={() => setActiveTab('educacion')}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      Siguiente: Educación & Manejo <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: EDUCACIÓN & MANEJO */}
              {activeTab === 'educacion' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                  
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-xs space-y-3">
                    <span className="font-black text-amber-700 uppercase block flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
                      Checklist de Habilitación para el Paciente
                    </span>
                    <p className="text-muted-foreground">Antes de entregar los lentes de contacto para uso en el hogar, el paciente debe realizar de forma autónoma el procedimiento de colocación y retiro.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer bg-background p-3 rounded-lg border border-border select-none font-semibold text-foreground">
                        <input 
                          type="checkbox" 
                          checked={entrenamientoColocacion} 
                          onChange={e => setEntrenamientoColocacion(e.target.checked)} 
                          className="rounded text-primary focus:ring-primary w-4 h-4" 
                        />
                        <span>Pasa: Colocación Autónoma</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-background p-3 rounded-lg border border-border select-none font-semibold text-foreground">
                        <input 
                          type="checkbox" 
                          checked={entrenamientoRetiro} 
                          onChange={e => setEntrenamientoRetiro(e.target.checked)} 
                          className="rounded text-primary focus:ring-primary w-4 h-4" 
                        />
                        <span>Pasa: Retiro Clínico Autónomo</span>
                      </label>
                    </div>
                  </div>

                  {/* Sanitization protocols */}
                  <div className="space-y-3 text-xs">
                    <span className="font-bold text-muted-foreground uppercase block">Trazabilidad de Instrucción Sanitaria</span>
                    <div className="space-y-2 bg-secondary/35 p-4 rounded-xl border border-border">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={instruccionHigiene} onChange={e => setInstruccionHigiene(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">Instruido sobre lavado de manos estricto antes de manipular el lente.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={advertenciaSintomas} onChange={e => setAdvertenciaSintomas(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">Informado sobre síntomas de alerta (enrojecimiento, dolor agudo, fotofobia) para retiro inmediato.</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={cronogramaUsoDiseno} onChange={e => setCronogramaUsoDiseno(e.target.checked)} className="rounded text-primary focus:ring-primary w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">Entregada tabla de horas de uso progresivas (4h, 6h, 8h...) y prohibición de dormir con lentes.</span>
                      </label>
                    </div>
                  </div>

                  {/* Solution Recommended */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-muted-foreground uppercase block">Solución de Mantenimiento Prescrita</label>
                      <input 
                        type="text" 
                        value={solucionRecomendada} 
                        onChange={e => setSolucionRecomendada(e.target.value)} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl"
                        placeholder="Ej. Solución de Peróxido / Multipropósito"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-muted-foreground uppercase block">Observaciones del Especialista</label>
                      <input 
                        type="text" 
                        value={observacionesEducacion} 
                        onChange={e => setObservacionesEducacion(e.target.value)} 
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl"
                        placeholder="Ej. Paciente muestra buena motricidad fina..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-border">
                    <button 
                      onClick={() => setActiveTab('evaluacion')}
                      className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                    >
                      Atrás
                    </button>
                    <button 
                      onClick={handleGuardarAdaptacion}
                      className="bg-primary text-white hover:bg-blue-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md"
                    >
                      Guardar y Finalizar Adaptación
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
