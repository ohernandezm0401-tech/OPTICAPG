'use client';

import React, { useState } from 'react';
import { 
  HeartPulse, 
  Activity, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Thermometer, 
  Droplets, 
  Calendar, 
  User, 
  Plus, 
  Search, 
  Building, 
  Check, 
  ArrowRight, 
  Clock, 
  Sparkles,
  X,
  FileCheck,
  ClipboardList,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { EquipoMedico, LecturaAmbiental, RegistroResiduos, RegistroDesinfeccion, ConceptoSanitario, ServicioSaneamiento } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';

export default function SecretariaSaludPage() {
  const { 
    equiposMedicos, 
    lecturasAmbientales, 
    registrosResiduos,
    registrosDesinfeccion,
    conceptoSanitario,
    saneamientoLogs,
    addEquipoMedico, 
    updateEquipoMedico, 
    addLecturaAmbiental,
    addIncidenteTecnovigilancia,
    addRegistroResiduos,
    addRegistroDesinfeccion,
    actualizarConceptoSanitario,
    addSaneamientoLog,
    pacientes,
    citas
  } = useClinicStore();

  const [activeTab, setActiveTab] = useState<'standards' | 'equipment' | 'ambient' | 'pgiras' | 'disinfection' | 'sanitation' | 'clinical'>('standards');
  
  // Search and filter states
  const [eqSearch, setEqSearch] = useState('');
  const [eqFilter, setEqFilter] = useState<string>('all');

  // Modals
  const [showAddReading, setShowAddReading] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoMedico | null>(null);

  // Modals for waste and disinfection and registering equipment
  const [showAddEquipo, setShowAddEquipo] = useState(false);
  const [showAddResiduo, setShowAddResiduo] = useState(false);
  const [showAddDesinfeccion, setShowAddDesinfeccion] = useState(false);

  // New Modals for Saneamiento and Concepto Sanitario
  const [showConceptoModal, setShowConceptoModal] = useState(false);
  const [showSaneamientoModal, setShowSaneamientoModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [wasteWizardTab, setWasteWizardTab] = useState<'blanco' | 'negro' | 'rojo'>('rojo');

  // Form states - Register Equipment
  const [eqNombre, setEqNombre] = useState('');
  const [eqMarca, setEqMarca] = useState('');
  const [eqModelo, setEqModelo] = useState('');
  const [eqSerie, setEqSerie] = useState('');
  const [eqRegistroInvima, setEqRegistroInvima] = useState('');
  const [eqClasificacionRiesgo, setEqClasificacionRiesgo] = useState<'Clase I' | 'Clase IIa' | 'Clase IIb' | 'Clase III'>('Clase I');
  const [eqVoltaje, setEqVoltaje] = useState('110 V');
  const [eqPotencia, setEqPotencia] = useState('');
  const [eqFrecuencia, setEqFrecuencia] = useState('12');
  const [eqReferente, setEqReferente] = useState('Dra. Vega (Optómetra)');
  const [eqObservaciones, setEqObservaciones] = useState('');

  // Form states - PGIRAS
  const [resFecha, setResFecha] = useState(new Date().toISOString().split('T')[0]);
  const [resBiosanitarios, setResBiosanitarios] = useState('0.0');
  const [resCortopunzantes, setResCortopunzantes] = useState('0.0');
  const [resQuimicos, setResQuimicos] = useState('0.0');
  const [resAprovechables, setResAprovechables] = useState('0.0');
  const [resNoAprovechables, setResNoAprovechables] = useState('0.0');
  const [resEmpresa, setResEmpresa] = useState('Ecocentral S.A.S. (Especializados)');
  const [resManifiesto, setResManifiesto] = useState('');
  const [resObservaciones, setResObservaciones] = useState('');

  // Form states - Disinfection
  const [dsfArea, setDsfArea] = useState('Consultorio 1 (Refracción)');
  const [dsfTipo, setDsfTipo] = useState<'rutinaria' | 'terminal'>('rutinaria');
  const [dsfDesinfectante, setDsfDesinfectante] = useState('Alcohol Isopropílico al 70%');
  const [dsfResponsable, setDsfResponsable] = useState('Carlos (Asesor)');
  const [dsfObservaciones, setDsfObservaciones] = useState('');

  // Form states - Concepto Sanitario
  const [csFechaInspeccion, setCsFechaInspeccion] = useState(conceptoSanitario?.fechaInspeccion || new Date().toISOString().split('T')[0]);
  const [csEstado, setCsEstado] = useState<'favorable' | 'favorable-con-requerimientos' | 'desfavorable'>('favorable');
  const [csRadicado, setCsRadicado] = useState(conceptoSanitario?.numeroRadicado || '');
  const [csInspector, setCsInspector] = useState(conceptoSanitario?.funcionarioInspector || '');
  const [csObservaciones, setCsObservaciones] = useState(conceptoSanitario?.observaciones || '');

  // Form states - Servicio Saneamiento
  const [snTipo, setSnTipo] = useState<'control-plagas' | 'lavado-tanques'>('control-plagas');
  const [snFecha, setSnFecha] = useState(new Date().toISOString().split('T')[0]);
  const [snEmpresa, setSnEmpresa] = useState('');
  const [snCertificado, setSnCertificado] = useState('');
  const [snResponsable, setSnResponsable] = useState('Carlos (Asesor)');
  const [snObservaciones, setSnObservaciones] = useState('');

  // Forms states - Environmental readings
  const [temp, setTemp] = useState('20.0');
  const [humidity, setHumidity] = useState('55');
  const [registrador, setRegistrador] = useState('Carlos (Asesor)');
  const [ambObs, setAmbObs] = useState('');

  // Form states - Maintenance/Calibration Update
  const [tecnicoName, setTecnicoName] = useState('');
  const [calibObs, setCalibObs] = useState('');

  // Form states - Technovigilance Incident
  const [incTipo, setIncTipo] = useState<'evento-adverso' | 'incidente-adverso'>('incidente-adverso');

  const [incGravedad, setIncGravedad] = useState<'leve' | 'moderado' | 'serio'>('leve');
  const [incDesc, setIncDesc] = useState('');
  const [incReporter, setIncReporter] = useState('Dra. Vega (Optómetra)');


  // 7 Standards autoevaluation scores (Resolución 3100 de 2019)
  const [scores, setScores] = useState({
    talentoHumano: 85,
    infraestructura: 70,
    dotacion: 60,
    medicamentos: 90,
    procesosPrioritarios: 80,
    historiaClinica: 95,
    interdependencia: 100
  });

  const overallScore = Math.round(
    (scores.talentoHumano + 
     scores.infraestructura + 
     scores.dotacion + 
     scores.medicamentos + 
     scores.procesosPrioritarios + 
     scores.historiaClinica + 
     scores.interdependencia) / 7
  );

  // Calibration alert counters
  const totalEquipos = equiposMedicos.length;
  const equiposVigentes = equiposMedicos.filter(e => e.estadoCalibracion === 'vigente').length;
  const equiposVencidos = equiposMedicos.filter(e => e.estadoCalibracion === 'vencido').length;
  const equiposProximos = equiposMedicos.filter(e => e.estadoCalibracion === 'proximo-vencer').length;

  // Ambient statistics
  const ultimaLectura = lecturasAmbientales[0];
  const totalAlertasAmbientales = lecturasAmbientales.filter(l => 
    l.temperatura < 15 || l.temperatura > 25 || l.humedad > 70
  ).length;

  // CIE-10 and Clinical Records auditing
  const citasConHC = citas.filter(c => c.historiaClinica).length;
  const totalHistorias = citasConHC;
  
  // Submit daily temperature log
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

  // Submit calibration update
  const handleUpdateCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipo || !tecnicoName) {
      toast.warning('Complete los campos obligatorios.');
      return;
    }

    // Set new calibration dates
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextCalib = nextYear.toISOString().split('T')[0];

    updateEquipoMedico(selectedEquipo.id, {
      fechaUltimoMantenimiento: today,
      fechaProximaCalibracion: nextCalib,
      tecnicoResponsable: tecnicoName,
      estadoCalibracion: 'vigente',
      observaciones: calibObs || undefined
    });

    toast.success(`Equipo ${selectedEquipo.nombre} calibrado con éxito. Vigencia extendida hasta ${nextCalib}.`);
    setTecnicoName('');
    setCalibObs('');
    setShowMaintModal(false);
    setSelectedEquipo(null);
  };

  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipo || !incDesc) {
      toast.warning('Debe completar la descripción.');
      return;
    }

    const newIncident = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      fecha: new Date().toISOString().split('T')[0],
      tipo: incTipo,
      gravedad: incGravedad,
      descripcion: incDesc,
      reportadoPor: incReporter,
      estadoReporte: 'bajo-investigacion' as const
    };

    addIncidenteTecnovigilancia(selectedEquipo.id, newIncident);

    // Refresh selected equipo reference in state
    const updated = useClinicStore.getState().equiposMedicos.find(eq => eq.id === selectedEquipo.id);
    if (updated) setSelectedEquipo(updated);

    toast.success('Incidente de tecnovigilancia registrado en la bitácora de control.');
    setIncDesc('');
    setShowIncidentModal(false);
  };

  const handleCreateEquipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqNombre || !eqMarca || !eqModelo || !eqSerie || !eqRegistroInvima) {
      toast.warning('Complete los campos obligatorios.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const nextCalibDate = new Date();
    const months = parseInt(eqFrecuencia) || 12;
    nextCalibDate.setMonth(nextCalibDate.getMonth() + months);
    const proximaCalib = nextCalibDate.toISOString().split('T')[0];

    const newEquipo: EquipoMedico = {
      id: `EQP-${Date.now().toString().slice(-4)}`,
      nombre: eqNombre,
      marca: eqMarca,
      modelo: eqModelo,
      serie: eqSerie,
      fechaUltimoMantenimiento: today,
      fechaProximaCalibracion: proximaCalib,
      tecnicoResponsable: 'Ing. de Fábrica (Puesta en Marcha)',
      registroInvima: eqRegistroInvima,
      clasificacionRiesgo: eqClasificacionRiesgo,
      voltaje: eqVoltaje || undefined,
      potencia: eqPotencia || undefined,
      frecuenciaCalibracionMeses: months,
      referenteTecnovigilancia: eqReferente,
      incidentes: [],
      alertasInvimaAsociadas: [],
      estadoCalibracion: 'vigente',
      observaciones: eqObservaciones || undefined
    };

    addEquipoMedico(newEquipo);
    toast.success(`Equipo biomédico "${eqNombre}" registrado con éxito.`);

    // Reset form
    setEqNombre('');
    setEqMarca('');
    setEqModelo('');
    setEqSerie('');
    setEqRegistroInvima('');
    setEqClasificacionRiesgo('Clase I');
    setEqVoltaje('110 V');
    setEqPotencia('');
    setEqFrecuencia('12');
    setEqReferente('Dra. Vega (Optómetra)');
    setEqObservaciones('');
    setShowAddEquipo(false);
  };

  const handleCreateResiduo = (e: React.FormEvent) => {
    e.preventDefault();
    const bio = parseFloat(resBiosanitarios) || 0;
    const corto = parseFloat(resCortopunzantes) || 0;
    const quim = parseFloat(resQuimicos) || 0;
    const aprov = parseFloat(resAprovechables) || 0;
    const noAprov = parseFloat(resNoAprovechables) || 0;

    if (!resFecha || !resManifiesto) {
      toast.warning('La fecha y el número de manifiesto son obligatorios.');
      return;
    }

    const newResiduo: RegistroResiduos = {
      id: `RES-${Date.now().toString().slice(-4)}`,
      fecha: resFecha,
      infecciososBiosanitarios: bio,
      infecciososCortopunzantes: corto,
      quimicos: quim,
      aprovechables: aprov,
      noAprovechables: noAprov,
      empresaRecolectora: resEmpresa,
      numeroManifiesto: resManifiesto,
      registradoPor: 'Administrador Sede',
      observaciones: resObservaciones || undefined
    };

    addRegistroResiduos(newResiduo);
    toast.success('Pesaje de residuos hospitalarios (PGIRAS) guardado con éxito.');

    // Reset form
    setResBiosanitarios('0.0');
    setResCortopunzantes('0.0');
    setResQuimicos('0.0');
    setResAprovechables('0.0');
    setResNoAprovechables('0.0');
    setResManifiesto('');
    setResObservaciones('');
    setShowAddResiduo(false);
  };

  const handleCreateDesinfeccion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsfArea || !dsfDesinfectante) {
      toast.warning('Complete los campos obligatorios.');
      return;
    }

    const newDesinfeccion: RegistroDesinfeccion = {
      id: `DSF-${Date.now().toString().slice(-4)}`,
      fechaHora: new Date().toISOString(),
      area: dsfArea,
      tipo: dsfTipo,
      desinfectante: dsfDesinfectante,
      registradoPor: dsfResponsable,
      observaciones: dsfObservaciones || undefined
    };

    addRegistroDesinfeccion(newDesinfeccion);
    toast.success(`Registro de limpieza y desinfección en ${dsfArea} guardado.`);

    // Reset form
    setDsfObservaciones('');
    setShowAddDesinfeccion(false);
  };

  const handleUpdateConcepto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csFechaInspeccion || !csRadicado || !csInspector) {
      toast.warning('Complete los campos obligatorios.');
      return;
    }

    const nextYear = new Date(csFechaInspeccion);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const vencimiento = nextYear.toISOString().split('T')[0];

    actualizarConceptoSanitario({
      fechaInspeccion: csFechaInspeccion,
      fechaVencimiento: vencimiento,
      estadoConcepto: csEstado,
      numeroRadicado: csRadicado,
      funcionarioInspector: csInspector,
      observaciones: csObservaciones || undefined
    });

    toast.success('Concepto Sanitario Anual actualizado correctamente.');
    setShowConceptoModal(false);
  };

  const handleCreateSaneamiento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snFecha || !snEmpresa || !snCertificado) {
      toast.warning('Complete los campos obligatorios.');
      return;
    }

    const nextSixMonths = new Date(snFecha);
    nextSixMonths.setMonth(nextSixMonths.getMonth() + 6);
    const vencimiento = nextSixMonths.toISOString().split('T')[0];

    const newLog: ServicioSaneamiento = {
      id: `SNM-${Date.now().toString().slice(-4)}`,
      tipo: snTipo,
      fechaEjecucion: snFecha,
      fechaVencimiento: vencimiento,
      empresaCertificada: snEmpresa,
      numeroCertificado: snCertificado,
      responsableInterno: snResponsable,
      observaciones: snObservaciones || undefined
    };

    addSaneamientoLog(newLog);
    toast.success(`Servicio de ${snTipo === 'control-plagas' ? 'fumigación' : 'lavado de tanques'} registrado.`);
    
    // Reset form
    setSnEmpresa('');
    setSnCertificado('');
    setSnObservaciones('');
    setShowSaneamientoModal(false);
  };

  const handleQuickAmbient = () => {
    const newLectura: LecturaAmbiental = {
      id: `AMB-${Date.now().toString().slice(-4)}`,
      fechaHora: new Date().toISOString(),
      temperatura: 20.8,
      humedad: 52,
      registradoPor: 'Auto-Registro (Cierre)',
      observaciones: 'Registro rápido automático durante el cierre de jornada.'
    };
    addLecturaAmbiental(newLectura);
    toast.success('Termohigrómetro registrado automáticamente: 20.8°C y 52% H.');
  };

  const handleQuickDesinfeccion = () => {
    const newDesinfeccion: RegistroDesinfeccion = {
      id: `DSF-${Date.now().toString().slice(-4)}`,
      fechaHora: new Date().toISOString(),
      area: 'Consultorio 1 (Refracción)',
      tipo: 'rutinaria',
      desinfectante: 'Alcohol Isopropílico al 70%',
      registradoPor: 'Auto-Registro (Cierre)',
      observaciones: 'Limpieza y desinfección rutinaria pre-cierre.'
    };
    addRegistroDesinfeccion(newDesinfeccion);
    toast.success('Desinfección de Consultorio 1 registrada automáticamente.');
  };

  const handleQuickResiduos = () => {
    const newResiduo: RegistroResiduos = {
      id: `RES-${Date.now().toString().slice(-4)}`,
      fecha: new Date().toISOString().split('T')[0],
      infecciososBiosanitarios: 0,
      infecciososCortopunzantes: 0,
      quimicos: 0,
      aprovechables: 0,
      noAprovechables: 0,
      empresaRecolectora: 'No aplica (Sin residuos hoy)',
      numeroManifiesto: 'N/A-CIERRE',
      registradoPor: 'Auto-Registro (Cierre)',
      observaciones: 'Declaración jurada de no generación de residuos en la jornada.'
    };
    addRegistroResiduos(newResiduo);
    toast.success('Declaración de residuo cero registrada para hoy.');
  };

  const checkShiftBlockStatus = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const hasTodayAmbient = lecturasAmbientales.some(l => 
      l.fechaHora.split('T')[0] === todayStr
    );
    
    const hasTodayResiduos = registrosResiduos.some(r => 
      r.fecha === todayStr
    );

    const hasTodayDesinfeccion = registrosDesinfeccion.some(d => 
      d.fechaHora.split('T')[0] === todayStr
    );

    // Semáforo de Saneamiento y Acreditación
    const logs = saneamientoLogs;
    const plagasLog = logs.find(l => l.tipo === 'control-plagas');
    const tanquesLog = logs.find(l => l.tipo === 'lavado-tanques');

    const todayMs = Date.now();
    const plagasExpired = plagasLog ? new Date(plagasLog.fechaVencimiento).getTime() < todayMs : true;
    const tanquesExpired = tanquesLog ? new Date(tanquesLog.fechaVencimiento).getTime() < todayMs : true;

    // Check if Concepto Sanitario is expired or not favorable
    const conceptoExpired = conceptoSanitario ? new Date(conceptoSanitario.fechaVencimiento).getTime() < todayMs : true;
    const conceptoFavorable = conceptoSanitario ? conceptoSanitario.estadoConcepto === 'favorable' : false;

    return {
      isBlocked: !hasTodayAmbient || !hasTodayResiduos || !hasTodayDesinfeccion,
      missingAmbient: !hasTodayAmbient,
      missingResiduos: !hasTodayResiduos,
      missingDesinfeccion: !hasTodayDesinfeccion,
      plagasExpired,
      tanquesExpired,
      conceptoExpired,
      conceptoFavorable
    };
  };

  const adjustScore = (key: keyof typeof scores, amount: number) => {
    setScores(prev => {
      const newScore = Math.min(100, Math.max(0, prev[key] + amount));
      return { ...prev, [key]: newScore };
    });
    toast.success('Puntaje de autoevaluación actualizado.');
  };

  // Filter equipments
  const filteredEquipos = equiposMedicos.filter(eq => {
    const matchesSearch = eq.nombre.toLowerCase().includes(eqSearch.toLowerCase()) || 
                          eq.serie.toLowerCase().includes(eqSearch.toLowerCase());
    const matchesFilter = eqFilter === 'all' ? true : eq.estadoCalibracion === eqFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-destructive animate-pulse" />
            Vigilancia Sanitaria y Habilitación
          </h1>
          <p className="text-muted-foreground text-sm">
            Control de estándares de habilitación (Resolución 3100/2019) y bitácoras requeridas por la Secretaría Distrital de Salud.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {/* Cierre de Jornada Process Control Button */}
          <button
            onClick={() => {
              const status = checkShiftBlockStatus();
              if (status.isBlocked) {
                setShowCloseShiftModal(true);
              } else {
                toast.success('¡Cierre de jornada técnico exitoso! Todos los controles de proceso del día de hoy están al día.');
              }
            }}
            className="bg-secondary hover:bg-secondary/80 text-foreground border border-border px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Clock className="w-4 h-4 text-primary" />
            Cierre de Jornada
          </button>

          {activeTab === 'ambient' && (
            <button 
              onClick={() => setShowAddReading(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva Medición Termohigrómetro
            </button>
          )}
          {activeTab === 'equipment' && (
            <button 
              onClick={() => setShowAddEquipo(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Nuevo Equipo
            </button>
          )}
          {activeTab === 'pgiras' && (
            <button 
              onClick={() => setShowAddResiduo(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Residuos (PGIRAS)
            </button>
          )}
          {activeTab === 'disinfection' && (
            <button 
              onClick={() => setShowAddDesinfeccion(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Desinfección
            </button>
          )}
          {activeTab === 'sanitation' && (
            <button 
              onClick={() => setShowSaneamientoModal(true)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Registrar Saneamiento
            </button>
          )}
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Autoevaluación Res. 3100"
          value={`${overallScore}%`}
          subtitle={overallScore >= 80 ? "Cumplimiento Seguro" : "Riesgo de Cierre"}
          icon={<Activity className="w-5 h-5 text-primary" />}
          trend={{ value: overallScore >= 80 ? "Óptimo" : "Mejorar Urgente", isPositive: overallScore >= 80 }}
        />
        <StatCard 
          title="Alertas de Calibración"
          value={equiposVencidos.toString()}
          subtitle={`${equiposProximos} próximos a vencer`}
          icon={<Wrench className="w-5 h-5 text-primary" />}
          trend={{ value: equiposVencidos === 0 ? "Equipos al Día" : "Acción Requerida", isPositive: equiposVencidos === 0 }}
        />
        <StatCard 
          title="Control Ambiental (Último)"
          value={ultimaLectura ? `${ultimaLectura.temperatura}°C` : "N/D"}
          subtitle={ultimaLectura ? `${ultimaLectura.humedad}% H.R.` : "Sin lecturas"}
          icon={<Thermometer className="w-5 h-5 text-primary" />}
          trend={{ value: totalAlertasAmbientales === 0 ? "Rangos Seguros" : `${totalAlertasAmbientales} Alertas`, isPositive: totalAlertasAmbientales === 0 }}
        />
        <StatCard 
          title="Cumplimiento Historias"
          value={totalHistorias > 0 ? "96.4%" : "100%"}
          subtitle={`${totalHistorias} historias de control`}
          icon={<FileCheck className="w-5 h-5 text-success" />}
          trend={{ value: "PAMEC Conforme", isPositive: true }}
        />
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap border-b border-border bg-card p-1 rounded-xl border w-full max-w-5xl gap-1">
        <button
          onClick={() => setActiveTab('standards')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'standards' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          1. Estándares Habilitación
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'equipment' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          2. Bitácora de Equipos
        </button>
        <button
          onClick={() => setActiveTab('ambient')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'ambient' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          3. Control Ambiental
        </button>
        <button
          onClick={() => setActiveTab('pgiras')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'pgiras' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          4. Residuos (PGIRAS)
        </button>
        <button
          onClick={() => setActiveTab('disinfection')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'disinfection' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          5. Limpieza y Desinfección
        </button>
        <button
          onClick={() => setActiveTab('sanitation')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'sanitation' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          6. Acreditación y Saneamiento
        </button>
        <button
          onClick={() => setActiveTab('clinical')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            activeTab === 'clinical' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'
          }`}
        >
          7. Auditoría PAMEC
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6">
        
        {/* STANDARDS TAB */}
        {activeTab === 'standards' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 gap-4">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Autoevaluación de Estándares de Habilitación</h3>
                <p className="text-muted-foreground text-xs">Monitoreo interno previo a auditoría presencial de la Secretaría de Salud.</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-bold">PROMEDIO HABILITACIÓN:</span>
                <span className={`text-xl font-black ${overallScore >= 80 ? 'text-success' : 'text-warning'}`}>{overallScore}%</span>
              </div>
            </div>

            {/* Checklist of 7 standards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Talento Humano */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <User className="w-4 h-4 text-primary" />
                      1. Talento Humano
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Control de registros ReTHUS, diplomas y tarjetas profesionales.</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.talentoHumano >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>{scores.talentoHumano}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success transition-all duration-300" style={{ width: `${scores.talentoHumano}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-muted-foreground">Revisión de hojas de vida del personal médico.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('talentoHumano', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('talentoHumano', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>

              {/* Infraestructura */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-primary" />
                      2. Infraestructura Física
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Condiciones locativas, rampas, señalización de emergencia y baños adaptados.</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.infraestructura >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>{scores.infraestructura}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-warning transition-all duration-300" style={{ width: `${scores.infraestructura}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-muted-foreground">Auditoría física realizada el mes pasado.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('infraestructura', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('infraestructura', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>

              {/* Dotacion */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-primary" />
                      3. Dotación y Equipos
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Calibraciones anuales y mantenimiento preventivo contratado.</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.dotacion >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-destructive/15 text-destructive border-destructive/20'
                  }`}>{scores.dotacion}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive transition-all duration-300" style={{ width: `${scores.dotacion}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-warning-foreground font-semibold">⚠️ Un equipo reporta calibración vencida.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('dotacion', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('dotacion', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>

              {/* Medicamentos */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-primary" />
                      4. Medicamentos, Dispositivos e Insumos
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Trazabilidad de registros Invima y monitoreo diario de termohigrómetro.</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.medicamentos >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>{scores.medicamentos}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success transition-all duration-300" style={{ width: `${scores.medicamentos}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-muted-foreground">Trazabilidad de colirios oftálmicos e implantes al día.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('medicamentos', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('medicamentos', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>

              {/* Procesos Prioritarios */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      5. Procesos Prioritarios Asistenciales
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Guías clínicas de optometría, lavado de manos y gestión de residuos (PGIRAS).</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.procesosPrioritarios >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>{scores.procesosPrioritarios}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success transition-all duration-300" style={{ width: `${scores.procesosPrioritarios}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-muted-foreground">Rutina diaria de desinfección y separación de residuos roja/verde.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('procesosPrioritarios', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('procesosPrioritarios', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>

              {/* Historia Clinica */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/10 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      6. Historia Clínica y Registros
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Seguridad informática, backups clínicos y custodia conforme Res. 1995/1999.</p>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                    scores.historiaClinica >= 80 ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>{scores.historiaClinica}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success transition-all duration-300" style={{ width: `${scores.historiaClinica}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-success-foreground font-bold flex items-center gap-0.5">✓ Guardián de intangibilidad clínico-legal activo.</span>
                  <div className="flex gap-1">
                    <button onClick={() => adjustScore('historiaClinica', -5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">-5%</button>
                    <button onClick={() => adjustScore('historiaClinica', 5)} className="text-[10px] font-bold bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">+5%</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl flex gap-3 text-xs text-destructive items-start leading-relaxed font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0 text-destructive mt-0.5" />
              <div>
                <strong className="block font-bold">¡ALERTA DE SEGURIDAD SANITARIA!</strong>
                El estándar de **Dotación y Equipos** está por debajo del 70%. Recuerde que poseer equipos de salud visual obligatorios (como el Lensómetro) sin calibración vigente con certificado trazable a la ONAC (Organismo Nacional de Acreditación de Colombia) da lugar a la **suspensión inmediata del servicio** y sellamiento en inspecciones de la SDS Bogotá.
              </div>
            </div>
          </div>
        )}

        {/* EQUIPMENT TAB */}
        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Bitácora de Control y Calibración de Dispositivos Médicos</h3>
                <p className="text-muted-foreground text-xs">Inventario clínico con trazabilidad de mantenimiento preventivo y alertas semafóricas.</p>
              </div>

              {/* Filters & Search */}
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar equipo o serie..."
                    value={eqSearch}
                    onChange={e => setEqSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <select
                  value={eqFilter}
                  onChange={e => setEqFilter(e.target.value)}
                  className="px-2 py-1.5 bg-background border border-input rounded-xl text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Todos los estados</option>
                  <option value="vigente">Vigente</option>
                  <option value="proximo-vencer">Próximo a Vencer</option>
                  <option value="vencido">Vencidos</option>
                </select>
              </div>
            </div>

            {/* Equipment list table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
                  <tr>
                    <th className="px-4 py-3">Nombre del Equipo</th>
                    <th className="px-4 py-3">Marca / Modelo</th>
                    <th className="px-4 py-3">Serie</th>
                    <th className="px-4 py-3">Reg. INVIMA</th>
                    <th className="px-4 py-3">Último Mantenimiento</th>
                    <th className="px-4 py-3">Vence Calibración</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredEquipos.map((eq) => (
                    <tr key={eq.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground">{eq.nombre}</div>
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{eq.id}</div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {eq.marca} / {eq.modelo}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[10px]">{eq.serie}</td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-[10px]">{eq.registroInvima || 'N/A'}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {eq.fechaUltimoMantenimiento}
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        {eq.fechaProximaCalibracion}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          eq.estadoCalibracion === 'vigente' ? 'bg-success/10 text-success border-success/20' :
                          eq.estadoCalibracion === 'proximo-vencer' ? 'bg-warning/10 text-warning border-warning/20' :
                          'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                        }`}>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {eq.estadoCalibracion.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right flex gap-1.5 justify-end items-center font-bold">
                        <button
                          onClick={() => {
                            setSelectedEquipo(eq);
                            setShowFichaModal(true);
                          }}
                          className="px-2.5 py-1 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-lg text-[10px] font-bold transition-all"
                        >
                          Ficha Técnica (INVIMA)
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEquipo(eq);
                            setShowMaintModal(true);
                          }}
                          className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          Calibrar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEquipos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground font-medium">
                        No se encontraron equipos bajo los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Maintenance Log Instructions */}
            <div className="bg-secondary/20 p-4 rounded-xl text-[11px] leading-relaxed text-muted-foreground space-y-1">
              <span className="text-foreground font-bold uppercase block">Manual de Calibraciones del Consultorio:</span>
              <p>1. Todos los equipos biomédicos de refracción y visualización deben contar con una etiqueta física pegada en el chasis que consigne la fecha de última calibración, empresa certificadora con firma, y fecha límite.</p>
              <p>2. En el archivo físico (AZ de Habilitación) debe reposar la **Hoja de Vida de Equipo** adjuntando copia del rut del Ingeniero Biomédico que certifica y el informe con la trazabilidad metrológica del patrón utilizado.</p>
            </div>
          </div>
        )}

        {/* AMBIENT TAB */}
        {activeTab === 'ambient' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Registro Diario Termohigrométrico</h3>
                <p className="text-muted-foreground text-xs">Monitoreo de temperatura y humedad en el área de almacenamiento de dispositivos ópticos y colirios.</p>
              </div>
              <button
                onClick={() => setShowAddReading(true)}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Medición
              </button>
            </div>

            {/* Dials of Current State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Temperature Display Card */}
              <div className="border border-border rounded-2xl p-5 bg-gradient-to-br from-background to-secondary/15 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase block">Última Temperatura Registrada</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-3xl font-black text-foreground">{ultimaLectura ? ultimaLectura.temperatura : 'N/D'}</strong>
                    <span className="text-sm text-muted-foreground font-bold">°C</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Rango Reglamentario: **15.0°C a 25.0°C**</span>
                </div>
                <div className={`p-4 rounded-full ${
                  !ultimaLectura ? 'bg-secondary/40' :
                  (ultimaLectura.temperatura >= 15 && ultimaLectura.temperatura <= 25) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  <Thermometer className="w-8 h-8" />
                </div>
              </div>

              {/* Humidity Display Card */}
              <div className="border border-border rounded-2xl p-5 bg-gradient-to-br from-background to-secondary/15 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-bold uppercase block">Última Humedad Relativa</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-3xl font-black text-foreground">{ultimaLectura ? ultimaLectura.humedad : 'N/D'}</strong>
                    <span className="text-sm text-muted-foreground font-bold">% H.R.</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Rango Reglamentario: **Menor a 70%**</span>
                </div>
                <div className={`p-4 rounded-full ${
                  !ultimaLectura ? 'bg-secondary/40' :
                  (ultimaLectura.humedad <= 70) ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  <Droplets className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Environmental Readings logs list */}
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
                        <td className="px-4 py-3 text-muted-foreground">
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
                            !hasAlert ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
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
        )}

        {/* PGIRAS TAB */}
        {activeTab === 'pgiras' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Bitácora de Gestión Integral de Residuos Sanitarios (PGIRAS)</h3>
                <p className="text-muted-foreground text-xs">Declaración obligatoria mensual y pesajes diarios de residuos peligrosos (infecciosos/químicos) y ordinarios.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.info('Generando reporte mensual para el archivo AZ de Habilitación...');
                    setTimeout(() => toast.success('Reporte PGIRAS de Sede Norte exportado correctamente en PDF.'), 1500);
                  }}
                  className="px-3 py-1.5 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold transition-all"
                >
                  Exportar PDF (SDS)
                </button>
                <button
                  onClick={() => setShowAddResiduo(true)}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Pesaje
                </button>
              </div>
            </div>

            {/* Waste weight counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Biosanitarios y Cortopunzantes */}
              <div className="border border-border rounded-xl p-4 bg-red-500/5 space-y-1">
                <span className="text-[10px] text-destructive font-bold uppercase block">Peligrosos Infecciosos (Total)</span>
                <div className="flex items-baseline gap-1">
                  <strong className="text-2xl font-black text-destructive">
                    {(registrosResiduos.reduce((sum, r) => sum + r.infecciososBiosanitarios + r.infecciososCortopunzantes, 0)).toFixed(2)}
                  </strong>
                  <span className="text-xs text-muted-foreground font-bold">kg</span>
                </div>
                <span className="text-[9px] text-muted-foreground block">Biosanitarios y Agujas desechables (Bolsa Roja/Guardián)</span>
              </div>

              {/* Químicos */}
              <div className="border border-border rounded-xl p-4 bg-warning/5 space-y-1">
                <span className="text-[10px] text-warning-foreground font-bold uppercase block">Peligrosos Químicos</span>
                <div className="flex items-baseline gap-1">
                  <strong className="text-2xl font-black text-warning-foreground">
                    {(registrosResiduos.reduce((sum, r) => sum + r.quimicos, 0)).toFixed(2)}
                  </strong>
                  <span className="text-xs text-muted-foreground font-bold">kg</span>
                </div>
                <span className="text-[9px] text-muted-foreground block">Colirios, reactivos vencidos y envases de limpieza</span>
              </div>

              {/* Aprovechables y Ordinarios */}
              <div className="border border-border rounded-xl p-4 bg-success/5 space-y-1">
                <span className="text-[10px] text-success font-bold uppercase block">No Peligrosos (Total)</span>
                <div className="flex items-baseline gap-1">
                  <strong className="text-2xl font-black text-success">
                    {(registrosResiduos.reduce((sum, r) => sum + r.aprovechables + r.noAprovechables, 0)).toFixed(2)}
                  </strong>
                  <span className="text-xs text-muted-foreground font-bold">kg</span>
                </div>
                <span className="text-[9px] text-muted-foreground block">Plástico, cartón, barrido y ordinarios comunes</span>
              </div>
            </div>

            {/* Waste table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Infecciosos (kg)</th>
                    <th className="px-4 py-3">Cortopunzantes (kg)</th>
                    <th className="px-4 py-3">Químicos (kg)</th>
                    <th className="px-4 py-3">No Peligrosos (kg)</th>
                    <th className="px-4 py-3">Manifiesto / Comprobante</th>
                    <th className="px-4 py-3">Operador Autorizado</th>
                    <th className="px-4 py-3">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {registrosResiduos.map((reg) => (
                    <tr key={reg.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">{reg.fecha}</td>
                      <td className="px-4 py-3 font-semibold text-destructive">{reg.infecciososBiosanitarios.toFixed(2)} kg</td>
                      <td className="px-4 py-3 font-semibold text-destructive">{reg.infecciososCortopunzantes.toFixed(2)} kg</td>
                      <td className="px-4 py-3 font-semibold text-warning-foreground">{reg.quimicos.toFixed(2)} kg</td>
                      <td className="px-4 py-3 text-success font-semibold">
                        {(reg.aprovechables + reg.noAprovechables).toFixed(2)} kg <span className="text-[9px] text-muted-foreground">(A: {reg.aprovechables}, O: {reg.noAprovechables})</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-foreground">{reg.numeroManifiesto}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.empresaRecolectora}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.registradoPor}</td>
                    </tr>
                  ))}
                  {registrosResiduos.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground font-medium">
                        No hay registros de pesaje de residuos cargados para este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl text-xs text-destructive leading-relaxed font-medium">
              <strong>Recuerde:</strong> Según el plan **PGIRAS**, las bolsas rojas de residuos biosanitarios no pueden almacenarse temporalmente por más de **8 días** en la sede debido al riesgo de proliferación microbiológica, a menos que se cuente con un cuarto de congelación de residuos certificado.
            </div>
          </div>
        )}

        {/* DISINFECTION TAB */}
        {activeTab === 'disinfection' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Registro de Limpieza y Desinfección de Áreas</h3>
                <p className="text-muted-foreground text-xs">Bitácora diaria de saneamiento de superficies, instrumentos e infraestructura de acuerdo al protocolo de bioseguridad.</p>
              </div>
              <button
                onClick={() => setShowAddDesinfeccion(true)}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Desinfección
              </button>
            </div>

            {/* Disinfection table */}
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
                  <tr>
                    <th className="px-4 py-3">Fecha y Hora</th>
                    <th className="px-4 py-3">Área / Consultorio</th>
                    <th className="px-4 py-3">Tipo de Limpieza</th>
                    <th className="px-4 py-3">Agente Desinfectante</th>
                    <th className="px-4 py-3">Registrado Por</th>
                    <th className="px-4 py-3">Observaciones / Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {registrosDesinfeccion.map((reg) => (
                    <tr key={reg.id} className="hover:bg-secondary/15 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(reg.fechaHora).toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{reg.area}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          reg.tipo === 'terminal' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'
                        }`}>
                          {reg.tipo === 'terminal' ? 'Terminal (Profunda)' : 'Rutinaria'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{reg.desinfectante}</td>
                      <td className="px-4 py-3 text-muted-foreground">{reg.registradoPor}</td>
                      <td className="px-4 py-3 italic text-muted-foreground">{reg.observaciones || 'Conforme.'}</td>
                    </tr>
                  ))}
                  {registrosDesinfeccion.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground font-medium">
                        No hay registros de desinfección en la base de datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-secondary/20 p-4 rounded-xl text-[11px] leading-relaxed text-muted-foreground space-y-1 border border-border">
              <span className="text-foreground font-bold uppercase block">Protocolo de Limpieza SDS:</span>
              <p>1. **Limpieza Rutinaria:** Se realiza a diario entre turnos o pacientes sobre las superficies de contacto (mentonera del foróptero, mesa de refracción, manijas y teclados).</p>
              <p>2. **Limpieza Terminal:** Lavado profundo semanal de paredes, pisos, luminarias y rejillas de ventilación utilizando desinfectantes de nivel intermedio-alto (Amonio Cuaternario de Quinta Generación o hipoclorito).</p>
            </div>
          </div>
        )}

        {/* SANITATION & ACCREDITATION TAB */}
        {activeTab === 'sanitation' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Acreditación Sanitaria y Servicios de Saneamiento</h3>
                <p className="text-muted-foreground text-xs">Semáforo de cumplimiento técnico-legal para el Concepto Sanitario Anual y servicios de control ambiental obligatorios.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConceptoModal(true)}
                  className="px-3.5 py-2 bg-secondary text-foreground hover:bg-secondary/85 border border-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4 text-primary" />
                  Actualizar Visita SDS
                </button>
                <button
                  onClick={() => setShowSaneamientoModal(true)}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Registrar Servicio Saneamiento
                </button>
              </div>
            </div>

            {/* Acreditación Semaphored Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Concepto Sanitario SDS */}
              <div className={`border rounded-2xl p-5 bg-card flex flex-col justify-between border-border`}>
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block tracking-wider">Concepto Sanitario (SDS)</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-xl font-black text-foreground">
                      {conceptoSanitario ? conceptoSanitario.estadoConcepto.toUpperCase().replace(/-/g, ' ') : 'SIN CONCEPTO'}
                    </strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>Última Inspección: <strong>{conceptoSanitario?.fechaInspeccion}</strong></p>
                    <p>Vence: <strong className="text-foreground">{conceptoSanitario?.fechaVencimiento}</strong></p>
                    <p>Radicado: <strong className="font-mono text-foreground">{conceptoSanitario?.numeroRadicado}</strong></p>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">Inspector: {conceptoSanitario?.funcionarioInspector}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${
                    conceptoSanitario?.estadoConcepto === 'favorable' ? 'bg-success/10 text-success border-success/20' :
                    conceptoSanitario?.estadoConcepto === 'favorable-con-requerimientos' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-destructive/10 text-destructive border-destructive/20'
                  }`}>
                    {conceptoSanitario?.estadoConcepto === 'favorable' ? 'APROBADO' : 'PENDIENTE'}
                  </span>
                </div>
              </div>

              {/* Control de Plagas */}
              {(() => {
                const log = saneamientoLogs.find(l => l.tipo === 'control-plagas');
                const diffTime = log ? new Date(log.fechaVencimiento).getTime() - Date.now() : -1;
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isVencido = daysRemaining <= 0;
                const isProximo = daysRemaining > 0 && daysRemaining <= 30;

                return (
                  <div className="border border-border rounded-2xl p-5 bg-card flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block tracking-wider">Control de Plagas (Fumigación)</span>
                      <div className="flex justify-between items-baseline">
                        <strong className="text-xl font-black text-foreground">
                          {log ? (isVencido ? 'VENCIDO' : isProximo ? 'PRÓXIMO A VENCER' : 'VIGENTE') : 'SIN REGISTRO'}
                        </strong>
                        {log && <span className="text-xs font-semibold text-muted-foreground">{daysRemaining} días restantes</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p>Última Fumigación: <strong>{log?.fechaEjecucion || 'N/D'}</strong></p>
                        <p>Vence: <strong className="text-foreground">{log?.fechaVencimiento || 'N/D'}</strong></p>
                        <p>Certificado: <strong className="font-mono text-foreground">{log?.numeroCertificado || 'N/D'}</strong></p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground text-ellipsis overflow-hidden max-w-[150px]" title={log?.empresaCertificada}>
                        {log?.empresaCertificada || 'Sin empresa'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${
                        isVencido ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        isProximo ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-success/10 text-success border-success/20'
                      }`}>
                        {isVencido ? 'REQUERIDO' : 'CONFORME'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Lavado de Tanques */}
              {(() => {
                const log = saneamientoLogs.find(l => l.tipo === 'lavado-tanques');
                const diffTime = log ? new Date(log.fechaVencimiento).getTime() - Date.now() : -1;
                const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isVencido = daysRemaining <= 0;
                const isProximo = daysRemaining > 0 && daysRemaining <= 30;

                return (
                  <div className="border border-border rounded-2xl p-5 bg-card flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase block tracking-wider">Lavado de Tanques de Agua</span>
                      <div className="flex justify-between items-baseline">
                        <strong className="text-xl font-black text-foreground">
                          {log ? (isVencido ? 'VENCIDO' : isProximo ? 'PRÓXIMO A VENCER' : 'VIGENTE') : 'SIN REGISTRO'}
                        </strong>
                        {log && <span className="text-xs font-semibold text-muted-foreground">{daysRemaining} días restantes</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p>Último Lavado: <strong>{log?.fechaEjecucion || 'N/D'}</strong></p>
                        <p>Vence: <strong className="text-foreground">{log?.fechaVencimiento || 'N/D'}</strong></p>
                        <p>Certificado: <strong className="font-mono text-foreground">{log?.numeroCertificado || 'N/D'}</strong></p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground text-ellipsis overflow-hidden max-w-[150px]" title={log?.empresaCertificada}>
                        {log?.empresaCertificada || 'Sin empresa'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${
                        isVencido ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        isProximo ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-success/10 text-success border-success/20'
                      }`}>
                        {isVencido ? 'REQUERIDO' : 'CONFORME'}
                      </span>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Saneamiento Logs Table */}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-4 py-3 border-b border-border bg-secondary/10">
                <span className="font-bold text-xs text-foreground uppercase block">Historial de Ejecución de Servicios Sanitarios</span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
                  <tr>
                    <th className="px-4 py-3">Tipo de Servicio</th>
                    <th className="px-4 py-3">Fecha de Ejecución</th>
                    <th className="px-4 py-3">Fecha de Vencimiento</th>
                    <th className="px-4 py-3">Empresa Autorizada</th>
                    <th className="px-4 py-3">N° Certificado / Concepto</th>
                    <th className="px-4 py-3">Responsable Interno</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {saneamientoLogs.map((log) => {
                    const diffTime = new Date(log.fechaVencimiento).getTime() - Date.now();
                    const isVencido = diffTime <= 0;

                    return (
                      <tr key={log.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">
                          {log.tipo === 'control-plagas' ? 'Control de Plagas (Fumigación)' : 'Lavado de Tanques de Reserva'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{log.fechaEjecucion}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{log.fechaVencimiento}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.empresaCertificada}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-foreground">{log.numeroCertificado}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.responsableInterno}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            !isVencido ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}>
                            {!isVencido ? 'Vigente' : 'Vencido'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {saneamientoLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground font-medium">
                        No se han registrado servicios de saneamiento ambiental.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Acreditacion Guidelines */}
            <div className="bg-secondary/20 p-4 rounded-xl text-[11px] leading-relaxed text-muted-foreground space-y-1.5 border border-border">
              <span className="text-foreground font-bold uppercase block tracking-wide">Pautas Técnicas de Ingeniería de Procesos y Acreditación en Salud (Colombia):</span>
              <p>• **Concepto Sanitario:** Visita anual obligatoria de los ingenieros higienistas de la Subred Integrada de Servicios de Salud. Evalúan higiene locativa, cadena de frío de medicamentos (termohigrómetro), bioseguridad, RIPS y RAE (Residuos de Aparatos Eléctricos y Electrónicos).</p>
              <p>• **Decreto 1575 de 2007 (Agua Potable):** El tanque de reserva de agua del consultorio debe ser lavado obligatoriamente cada 6 meses por una empresa autorizada que expida el certificado de idoneidad y trazabilidad de cloro residual.</p>
              <p>• **Resolución 1164 de 2002 (Plagas):** Contratación semestral de control integrado de plagas, documentando fichas técnicas de plaguicidas de uso en salud pública e insumos aplicados.</p>
            </div>
          </div>
        )}

        {/* CLINICAL AUDIT TAB */}
        {activeTab === 'clinical' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-foreground">Panel de Calidad Clínica y Auditoría (PAMEC)</h3>
              <p className="text-muted-foreground text-xs">Auditoría automática de consistencia e integridad legal de las Historias Clínicas registradas.</p>
            </div>

            {/* Clinical metrics grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Metric 1 */}
              <div className="border border-border rounded-xl p-4 bg-secondary/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Consentimientos Firmados</span>
                  <span className="text-xs font-bold text-success">98.2%</span>
                </div>
                <div className="text-xl font-black text-foreground">Conforme</div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '98%' }}></div>
                </div>
                <p className="text-[9px] text-muted-foreground">Historias que incorporan el documento de aceptación de refracción y uso de LC.</p>
              </div>

              {/* Metric 2 */}
              <div className="border border-border rounded-xl p-4 bg-secondary/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Codificación CIE-10</span>
                  <span className="text-xs font-bold text-success">100%</span>
                </div>
                <div className="text-xl font-black text-foreground">Conforme</div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '100%' }}></div>
                </div>
                <p className="text-[9px] text-muted-foreground">Obligatorio: Diagnóstico principal codificado bajo estándar internacional.</p>
              </div>

              {/* Metric 3 */}
              <div className="border border-border rounded-xl p-4 bg-secondary/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase">Firmas e Intangibilidad</span>
                  <span className="text-xs font-bold text-success">100%</span>
                </div>
                <div className="text-xl font-black text-foreground">Inalterable</div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '100%' }}></div>
                </div>
                <p className="text-[9px] text-muted-foreground">Cierre automático digital firmado e inmutabilidad garantizada (Res. 1995/1999).</p>
              </div>
            </div>

            {/* Audit compliance list */}
            <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/5">
              <span className="text-xs font-bold text-foreground uppercase block border-b border-border pb-2">Resultados Recientes del Control de Historias Clínicas (RIPS)</span>
              
              <div className="divide-y divide-border text-xs">
                
                <div className="py-2.5 flex justify-between items-center">
                  <div className="flex gap-2.5 items-center">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <strong className="block font-bold">Verificación de Firma Electrónica Obligatoria</strong>
                      <span className="text-[10px] text-muted-foreground">Sistema de criptografía interno de historias clínicas cerrado.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">CUMPLIDO</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div className="flex gap-2.5 items-center">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <strong className="block font-bold">Validación de Códigos Diagnósticos en Fórmulas (CIE-10)</strong>
                      <span className="text-[10px] text-muted-foreground">Revisión de presencia de códigos H52 (Ametropías) en recetas generadas.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">CUMPLIDO</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div className="flex gap-2.5 items-center">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div>
                      <strong className="block font-bold">Auditoría de Inmutabilidad de Registros Clínicos</strong>
                      <span className="text-[10px] text-muted-foreground">Validación de bloqueo y emisión exclusiva de Notas de Evolución Aclaratorias para correcciones.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded border border-success/20">CUMPLIDO</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div className="flex gap-2.5 items-center">
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                    <div>
                      <strong className="block font-bold">Auditoría de Hojas de Consentimiento Informado</strong>
                      <span className="text-[10px] text-muted-foreground">2 expedientes médicos requieren cargar PDF firmado del paciente para lentes de contacto.</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">ADVERTENCIA</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR NUEVO EQUIPO */}
      <AnimatePresence>
        {showAddEquipo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-border overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                  <Wrench className="w-5 h-5 text-primary" />
                  Registrar Nuevo Equipo Biomédico
                </h3>
                <button
                  onClick={() => setShowAddEquipo(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateEquipo}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Nombre del Equipo *</label>
                    <input
                      type="text"
                      required
                      value={eqNombre}
                      onChange={e => setEqNombre(e.target.value)}
                      placeholder="Ej: Lensómetro Digital, Autorrefractómetro"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Marca *</label>
                    <input
                      type="text"
                      required
                      value={eqMarca}
                      onChange={e => setEqMarca(e.target.value)}
                      placeholder="Ej: Topcon, Nidek"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Modelo *</label>
                    <input
                      type="text"
                      required
                      value={eqModelo}
                      onChange={e => setEqModelo(e.target.value)}
                      placeholder="Ej: CL-300, ARK-1"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Número de Serie *</label>
                    <input
                      type="text"
                      required
                      value={eqSerie}
                      onChange={e => setEqSerie(e.target.value)}
                      placeholder="Ej: LNS-9823-TP"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Registro Sanitario INVIMA *</label>
                    <input
                      type="text"
                      required
                      value={eqRegistroInvima}
                      onChange={e => setEqRegistroInvima(e.target.value)}
                      placeholder="Ej: INVIMA 2018DM-0018274"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Clasificación de Riesgo *</label>
                    <select
                      value={eqClasificacionRiesgo}
                      onChange={e => setEqClasificacionRiesgo(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="Clase I">Clase I (Bajo Riesgo)</option>
                      <option value="Clase IIa">Clase IIa (Riesgo Moderado)</option>
                      <option value="Clase IIb">Clase IIb (Riesgo Alto-Moderado)</option>
                      <option value="Clase III">Clase III (Alto Riesgo)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Calibración (Meses) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={eqFrecuencia}
                      onChange={e => setEqFrecuencia(e.target.value)}
                      placeholder="Ej: 12"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Voltaje</label>
                    <input
                      type="text"
                      value={eqVoltaje}
                      onChange={e => setEqVoltaje(e.target.value)}
                      placeholder="Ej: 110 V, N/A"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Potencia</label>
                    <input
                      type="text"
                      value={eqPotencia}
                      onChange={e => setEqPotencia(e.target.value)}
                      placeholder="Ej: 40 W, N/A"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Referente de Tecnovigilancia *</label>
                    <input
                      type="text"
                      required
                      value={eqReferente}
                      onChange={e => setEqReferente(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones Iniciales</label>
                    <textarea
                      rows={2}
                      value={eqObservaciones}
                      onChange={e => setEqObservaciones(e.target.value)}
                      placeholder="Indique el estado físico del equipo, accesorios incluidos o notas de instalación..."
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAddEquipo(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                  >
                    Registrar Equipo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR PESO RESIDUOS (PGIRAS) */}
      <AnimatePresence>
        {showAddResiduo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border overflow-y-auto max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  Registrar Pesaje de Residuos (PGIRAS)
                </h3>
                <button
                  onClick={() => setShowAddResiduo(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateResiduo}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Fecha del Pesaje *</label>
                    <input
                      type="date"
                      required
                      value={resFecha}
                      onChange={e => setResFecha(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {/* Asistente Educativo de Categorización (Res. 2184/2020) */}
                  <div className="col-span-2 border border-border rounded-xl p-3 bg-secondary/10 space-y-2">
                    <span className="text-[10px] text-muted-foreground font-extrabold uppercase block tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      Guía de Categorización de Residuos (Resolución 2184/2020)
                    </span>
                    
                    {/* Bags tabs */}
                    <div className="grid grid-cols-3 gap-1 bg-background/50 p-0.5 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setWasteWizardTab('rojo')}
                        className={`py-1 text-[9px] font-bold rounded-md transition-colors ${
                          wasteWizardTab === 'rojo' 
                            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                            : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        🔴 Peligrosos (Rojo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setWasteWizardTab('blanco')}
                        className={`py-1 text-[9px] font-bold rounded-md transition-colors ${
                          wasteWizardTab === 'blanco' 
                            ? 'bg-card text-foreground border border-border shadow-sm font-extrabold' 
                            : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        ⚪ Aprovechables
                      </button>
                      <button
                        type="button"
                        onClick={() => setWasteWizardTab('negro')}
                        className={`py-1 text-[9px] font-bold rounded-md transition-colors ${
                          wasteWizardTab === 'negro' 
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' 
                            : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        ⚫ No Aprov. (Negro)
                      </button>
                    </div>

                    {/* Content list */}
                    <div className="text-[10px] space-y-1 bg-background/60 p-2.5 rounded-lg border border-border font-medium leading-normal">
                      {wasteWizardTab === 'rojo' && (
                        <div className="space-y-1 text-muted-foreground">
                          <p className="font-bold text-destructive flex items-center gap-1 text-[10px]">
                            Contenedor Rojo y Guardián (Peligrosos):
                          </p>
                          <p>• <strong>Biosanitarios:</strong> Gasas, algodones o tapabocas contaminados con lágrimas o secreciones. Lentes de contacto usados.</p>
                          <p>• <strong>Cortopunzantes:</strong> Agujas de remoción de cuerpos extraños, ampollas rotas de anestésicos (Depositar en Guardián rígido).</p>
                          <p>• <strong>Químicos:</strong> Medicamentos vencidos, colirios sobrantes o reactivos ópticos vencidos.</p>
                        </div>
                      )}
                      {wasteWizardTab === 'blanco' && (
                        <div className="space-y-1 text-muted-foreground">
                          <p className="font-bold text-foreground flex items-center gap-1 text-[10px]">
                            Bolsa Blanca (Reciclables Limpios y Secos):
                          </p>
                          <p>• Cajas de cartón vacías de monturas o lentes.</p>
                          <p>• Sobres de papel de lentes oftálmicos.</p>
                          <p>• Envases plásticos limpios de soluciones multipropósito.</p>
                          <p className="text-[9px] text-amber-500 font-bold">⚠️ Nota: ¡Todo debe estar completamente seco y libre de materia orgánica!</p>
                        </div>
                      )}
                      {wasteWizardTab === 'negro' && (
                        <div className="space-y-1 text-muted-foreground">
                          <p className="font-bold text-zinc-400 flex items-center gap-1 text-[10px]">
                            Bolsa Negra (Ordinarios no Reciclables):
                          </p>
                          <p>• Papel higiénico y toallas de manos de los baños.</p>
                          <p>• Servilletas sucias y restos de comida.</p>
                          <p>• Papeles metalizados, plastificados o encerados de alimentos.</p>
                          <p>• Tapabocas, cofias o guantes de uso diario no contaminados con fluidos clínicos.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 py-1 border-b border-border font-bold uppercase text-[9px] text-primary tracking-wider">
                    Residuos Peligrosos (kg)
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Biosanitarios *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={resBiosanitarios}
                      onChange={e => setResBiosanitarios(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Cortopunzantes *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={resCortopunzantes}
                      onChange={e => setResCortopunzantes(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Químicos (Medicamentos/Fórmulas) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={resQuimicos}
                      onChange={e => setResQuimicos(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="col-span-2 py-1 border-b border-border font-bold uppercase text-[9px] text-primary tracking-wider">
                    Residuos No Peligrosos (kg)
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Aprovechables *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={resAprovechables}
                      onChange={e => setResAprovechables(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Ordinarios *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={resNoAprovechables}
                      onChange={e => setResNoAprovechables(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="col-span-2 py-1 border-b border-border font-bold uppercase text-[9px] text-primary tracking-wider">
                    Información de Recolección
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Empresa Transportadora Autorizada *</label>
                    <select
                      value={resEmpresa}
                      onChange={e => setResEmpresa(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="Ecocentral S.A.S. (Especializados)">Ecocentral S.A.S. (Especializados)</option>
                      <option value="Promoambiental Distrito S.A.">Promoambiental Distrito S.A.</option>
                      <option value="LIME S.A. ESP">LIME S.A. ESP</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Número de Manifiesto / Recibo *</label>
                    <input
                      type="text"
                      required
                      value={resManifiesto}
                      onChange={e => setResManifiesto(e.target.value)}
                      placeholder="Ej: MAN-2026-8910"
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones</label>
                    <textarea
                      rows={2}
                      value={resObservaciones}
                      onChange={e => setResObservaciones(e.target.value)}
                      placeholder="Comentarios adicionales..."
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  
                  {((parseFloat(resBiosanitarios) || 0) > 5 || 
                    (parseFloat(resCortopunzantes) || 0) > 5 || 
                    (parseFloat(resQuimicos) || 0) > 5 || 
                    (parseFloat(resAprovechables) || 0) > 5 || 
                    (parseFloat(resNoAprovechables) || 0) > 5) && (
                    <div className="col-span-2 p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs text-warning-foreground font-semibold flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div>
                        <span>Alerta: Peso Diario Elevado (&gt;5 kg)</span>
                        <p className="mt-0.5 text-[9px] text-muted-foreground font-medium leading-relaxed">
                          Has ingresado un peso mayor a 5 kg. En ópticas pequeñas, la generación de residuos diaria es típicamente muy baja. Asegúrate de que el peso esté en kilogramos (kg) y no en gramos (g), o que corresponda a un pesaje acumulado de recolección mensual.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAddResiduo(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR LIMPIEZA Y DESINFECCION */}
      <AnimatePresence>
        {showAddDesinfeccion && (
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
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Registrar Limpieza y Desinfección
                </h3>
                <button
                  onClick={() => setShowAddDesinfeccion(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateDesinfeccion}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Área / Consultorio *</label>
                  <select
                    value={dsfArea}
                    onChange={e => setDsfArea(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Consultorio 1 (Refracción)">Consultorio 1 (Refracción)</option>
                    <option value="Sala de Espera y Recepción">Sala de Espera y Recepción</option>
                    <option value="Baño de Pacientes">Baño de Pacientes</option>
                    <option value="Área de Lentes y Biselado">Área de Lentes y Biselado</option>
                    <option value="Pre-consulta">Pre-consulta</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Tipo de Limpieza *</label>
                    <select
                      value={dsfTipo}
                      onChange={e => setDsfTipo(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="rutinaria">Rutinaria (Superficies)</option>
                      <option value="terminal">Terminal (Profunda)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Desinfectante Utilizado *</label>
                    <select
                      value={dsfDesinfectante}
                      onChange={e => setDsfDesinfectante(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="Alcohol Isopropílico al 70%">Alcohol Isopropílico al 70%</option>
                      <option value="Amonio Cuaternario 5ta Generación">Amonio Cuaternario 5ta Gen</option>
                      <option value="Hipoclorito de Sodio al 0.5%">Hipoclorito de Sodio al 0.5%</option>
                      <option value="Glutaraldehído Clínico">Glutaraldehído Clínico</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Personal Responsable *</label>
                  <select
                    value={dsfResponsable}
                    onChange={e => setDsfResponsable(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Carlos (Asesor)">Carlos (Asesor)</option>
                    <option value="Dra. Vega (Optómetra)">Dra. Vega (Optómetra)</option>
                    <option value="Marta (Auxiliar de Servicios)">Marta (Auxiliar de Servicios)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones / Incidentes</label>
                  <textarea
                    rows={2}
                    value={dsfObservaciones}
                    onChange={e => setDsfObservaciones(e.target.value)}
                    placeholder="Todo conforme... o requiere reposición de insumos..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAddDesinfeccion(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                  >
                    Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <HeartPulse className="w-5 h-5 text-primary" />
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
                    <option value="Dra. Vega (Optómetra)">Dra. Vega (Optómetra)</option>
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

      {/* MODAL: UPDATE MAINTENANCE / CALIBRATION */}
      <AnimatePresence>
        {showMaintModal && selectedEquipo && (
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
                  <Wrench className="w-5 h-5 text-primary" />
                  Registrar Calibración y Mantenimiento
                </h3>
                <button
                  onClick={() => {
                    setShowMaintModal(false);
                    setSelectedEquipo(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-secondary/20 p-3 rounded-xl border border-border mb-4 space-y-1 text-xs">
                <div><span className="text-muted-foreground">Equipo a intervenir:</span> <strong className="text-foreground font-bold">{selectedEquipo.nombre}</strong></div>
                <div><span className="text-muted-foreground">Marca/Modelo:</span> <strong className="text-foreground font-bold">{selectedEquipo.marca} {selectedEquipo.modelo}</strong></div>
                <div><span className="text-muted-foreground">Número de Serie:</span> <strong className="text-foreground font-mono font-bold">{selectedEquipo.serie}</strong></div>
              </div>

              <form className="space-y-4" onSubmit={handleUpdateCalibration}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Ingeniero Biomédico / Técnico Responsable *</label>
                  <input
                    type="text"
                    required
                    value={tecnicoName}
                    onChange={e => setTecnicoName(e.target.value)}
                    placeholder="Ej: Ing. Sonia Rincón (Óptica Service Ltda.)"
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones del procedimiento / Informe técnico</label>
                  <textarea
                    rows={3}
                    value={calibObs}
                    onChange={e => setCalibObs(e.target.value)}
                    placeholder="Se realiza limpieza de lentes ópticas, lubricación de engranajes y calibración de prismas..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaintModal(false);
                      setSelectedEquipo(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md"
                  >
                    Confirmar Calibración
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: HOJA DE VIDA Y TECNOVIGILANCIA (FICHA TECNICA) */}
      <AnimatePresence>
        {showFichaModal && selectedEquipo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-border overflow-y-auto max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Hoja de Vida de Dispositivo Médico (INVIMA)
                </h3>
                <button
                  onClick={() => {
                    setShowFichaModal(false);
                    setSelectedEquipo(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-xs text-foreground">
                
                {/* 1. Identification Section */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-border p-4 rounded-xl bg-secondary/10">
                  <div className="col-span-2 sm:col-span-3 pb-2 border-b border-border/50 font-bold uppercase text-[10px] text-primary tracking-wider">
                    I. Identificación del Equipo
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Nombre Comercial</span>
                    <strong className="text-foreground text-sm font-black">{selectedEquipo.nombre}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Marca / Modelo</span>
                    <strong className="text-foreground">{selectedEquipo.marca} / {selectedEquipo.modelo}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Número de Serie</span>
                    <strong className="text-foreground font-mono">{selectedEquipo.serie}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Registro Sanitario INVIMA</span>
                    <strong className="text-foreground font-mono">{selectedEquipo.registroInvima}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Clasificación de Riesgo</span>
                    <span className={`inline-block px-2 py-0.5 mt-0.5 rounded font-bold ${
                      selectedEquipo.clasificacionRiesgo === 'Clase I' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                    }`}>{selectedEquipo.clasificacionRiesgo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Frecuencia de Calibración</span>
                    <strong className="text-foreground">{selectedEquipo.frecuenciaCalibracionMeses} meses</strong>
                  </div>
                </div>

                {/* 2. Technical & Electric Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border border-border p-4 rounded-xl bg-secondary/10">
                  <div className="col-span-2 sm:col-span-3 pb-2 border-b border-border/50 font-bold uppercase text-[10px] text-primary tracking-wider">
                    II. Especificaciones Técnicas y Operativas
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Voltaje de Alimentación</span>
                    <strong className="text-foreground">{selectedEquipo.voltaje || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Consumo de Potencia</span>
                    <strong className="text-foreground">{selectedEquipo.potencia || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px] uppercase">Responsable de Tecnovigilancia</span>
                    <strong className="text-foreground">{selectedEquipo.referenteTecnovigilancia}</strong>
                  </div>
                </div>

                {/* 3. Technovigilance Log */}
                <div className="border border-border p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border/50">
                    <span className="font-bold uppercase text-[10px] text-primary tracking-wider">III. Historial de Tecnovigilancia (Reportes)</span>
                    <button
                      type="button"
                      onClick={() => setShowIncidentModal(true)}
                      className="px-2.5 py-1 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white rounded-lg text-[9px] font-bold transition-all flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Reportar Incidente
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedEquipo.incidentes.map((inc) => (
                      <div key={inc.id} className="border border-border/80 rounded-xl p-3 bg-background space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] text-muted-foreground font-bold">{inc.id} • {inc.fecha}</span>
                          <div className="flex gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                              inc.gravedad === 'serio' ? 'bg-destructive/15 text-destructive border-destructive/20' :
                              inc.gravedad === 'moderado' ? 'bg-warning/15 text-warning border-warning/20' :
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {inc.gravedad}
                            </span>
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                              {inc.estadoReporte.replace(/-/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="font-sans font-bold text-foreground">&quot;{inc.descripcion}&quot;</p>
                        <div className="text-[9px] text-muted-foreground">Reportado por: {inc.reportadoPor} • Clasificado como: **{inc.tipo}**</div>
                      </div>
                    ))}
                    {selectedEquipo.incidentes.length === 0 && (
                      <p className="text-center text-muted-foreground py-2 italic">Sin reportes de incidentes o eventos adversos registrados.</p>
                    )}
                  </div>
                </div>

                {/* 4. Safety Alerts (INVIMA Recalls) */}
                <div className="border border-border p-4 rounded-xl bg-warning/5 border-warning/20 space-y-2">
                  <div className="pb-2 border-b border-warning/20 font-bold uppercase text-[10px] text-warning-foreground tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    IV. Alertas Sanitarias INVIMA Asociadas
                  </div>
                  <div className="space-y-2">
                    {selectedEquipo.alertasInvimaAsociadas.map((alr) => (
                      <div key={alr.id} className="space-y-0.5">
                        <div className="flex justify-between items-center font-bold text-warning-foreground text-[10px]">
                          <span>{alr.titulo}</span>
                          <span className="font-mono text-[9px]">{alr.fecha}</span>
                        </div>
                        <p className="text-muted-foreground text-[10px] leading-relaxed">{alr.descripcion}</p>
                      </div>
                    ))}
                    {selectedEquipo.alertasInvimaAsociadas.length === 0 && (
                      <p className="text-muted-foreground italic text-[10px]">No existen alertas sanitarias activas emitidas por el INVIMA para esta referencia en el último año.</p>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowFichaModal(false);
                    setSelectedEquipo(null);
                  }}
                  className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl transition-colors border border-border"
                >
                  Cerrar Ficha Técnica
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REPORT TECHNIVIGILANCE INCIDENT */}
      <AnimatePresence>
        {showIncidentModal && selectedEquipo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 border border-border z-50"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-foreground">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  Reportar Incidente de Tecnovigilancia
                </h3>
                <button
                  onClick={() => setShowIncidentModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleReportIncident}>
                
                <div className="bg-secondary/20 p-3 rounded-xl border border-border text-xs mb-3 font-bold text-foreground">
                  Reportar novedad para el equipo: {selectedEquipo.nombre} (Serie: {selectedEquipo.serie})
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Tipo de Reporte *</label>
                    <select
                      value={incTipo}
                      onChange={e => setIncTipo(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="incidente-adverso">Incidente Adverso (Equipo)</option>
                      <option value="evento-adverso">Evento Adverso (Lesión/Paciente)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Gravedad *</label>
                    <select
                      value={incGravedad}
                      onChange={e => setIncGravedad(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="leve">Leve (Sin riesgo vital)</option>
                      <option value="moderado">Moderado</option>
                      <option value="serio">Serio / Crítico</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Responsable de Reporte *</label>
                  <select
                    value={incReporter}
                    onChange={e => setIncReporter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Dra. Vega (Optómetra)">Dra. Vega (Optómetra)</option>
                    <option value="Carlos (Asesor)">Carlos (Asesor)</option>
                    <option value="Administrador General">Administrador General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Descripción Detallada del Incidente *</label>
                  <textarea
                    required
                    rows={4}
                    value={incDesc}
                    onChange={e => setIncDesc(e.target.value)}
                    placeholder="Describa el comportamiento inusual, falla eléctrica, desajuste mecánico o afectación al paciente observada..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-destructive text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md"
                  >
                    Registrar Incidente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REGISTRAR SERVICIO SANEAMIENTO */}
      <AnimatePresence>
        {showSaneamientoModal && (
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
                  <Sparkles className="w-5 h-5 text-primary" />
                  Registrar Servicio de Saneamiento
                </h3>
                <button
                  onClick={() => setShowSaneamientoModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateSaneamiento}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Tipo de Servicio *</label>
                  <select
                    value={snTipo}
                    onChange={e => setSnTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="control-plagas">Control de Plagas (Fumigación Semestral)</option>
                    <option value="lavado-tanques">Lavado de Tanques de Agua (Semestral - Dec. 1575)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Fecha de Ejecución *</label>
                  <input
                    type="date"
                    required
                    value={snFecha}
                    onChange={e => setSnFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Empresa Certificada Autorizada *</label>
                  <input
                    type="text"
                    required
                    value={snEmpresa}
                    onChange={e => setSnEmpresa(e.target.value)}
                    placeholder="Ej: Plagas S.A.S. / Tanques Limpios Colombia"
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground">Exigido por la Secretaría de Salud: el contratista debe contar con concepto favorable vigente.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Número de Certificado / Acta Oficial *</label>
                  <input
                    type="text"
                    required
                    value={snCertificado}
                    onChange={e => setSnCertificado(e.target.value)}
                    placeholder="Ej: CERT-2026-9812"
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Este número es registrado en el acta de visita de inspección de sanidad.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Responsable Interno *</label>
                  <select
                    value={snResponsable}
                    onChange={e => setSnResponsable(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="Carlos (Asesor)">Carlos (Asesor)</option>
                    <option value="Dra. Vega (Optómetra)">Dra. Vega (Optómetra)</option>
                    <option value="Administrador General">Administrador General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones</label>
                  <textarea
                    rows={2}
                    value={snObservaciones}
                    onChange={e => setSnObservaciones(e.target.value)}
                    placeholder="Detalles sobre productos químicos usados o estado del tanque..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowSaneamientoModal(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Registrar Saneamiento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ACTUALIZAR VISITA SDS (CONCEPTO SANITARIO) */}
      <AnimatePresence>
        {showConceptoModal && (
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
                  <FileCheck className="w-5 h-5 text-primary" />
                  Actualizar Concepto Sanitario Distrital/Municipal
                </h3>
                <button
                  onClick={() => setShowConceptoModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleUpdateConcepto}>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Fecha de la Inspección *</label>
                  <input
                    type="date"
                    required
                    value={csFechaInspeccion}
                    onChange={e => setCsFechaInspeccion(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Resultado del Concepto *</label>
                  <select
                    value={csEstado}
                    onChange={e => setCsEstado(e.target.value as any)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="favorable">Favorable (Aprobado - Cumple 100%)</option>
                    <option value="favorable-con-requerimientos">Favorable con Requerimientos (Visita de Control Programada)</option>
                    <option value="desfavorable">Desfavorable (Medida Sanitaria / Cierre Preventivo)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Número de Radicado / Acta de Visita *</label>
                  <input
                    type="text"
                    required
                    value={csRadicado}
                    onChange={e => setCsRadicado(e.target.value)}
                    placeholder="Ej: ACTA-SDS-2026-4560"
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Funcionario Inspector *</label>
                  <input
                    type="text"
                    required
                    value={csInspector}
                    onChange={e => setCsInspector(e.target.value)}
                    placeholder="Ej: Ing. Mauricio Gómez (Sanitario SDS)"
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones y Compromisos del Acta</label>
                  <textarea
                    rows={3}
                    value={csObservaciones}
                    onChange={e => setCsObservaciones(e.target.value)}
                    placeholder="Indique los requerimientos específicos o aclaraciones del inspector..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={() => setShowConceptoModal(false)}
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Guardar Concepto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONTROL DE PROCESOS - CIERRE DE JORNADA */}
      <AnimatePresence>
        {showCloseShiftModal && (
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
                  <Clock className="w-5 h-5 text-primary" />
                  Auditoría de Control de Cierre de Jornada
                </h3>
                <button
                  onClick={() => setShowCloseShiftModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const status = checkShiftBlockStatus();
                const readyToClose = !status.missingAmbient && !status.missingDesinfeccion && !status.missingResiduos;

                return (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      De acuerdo con la resolución de habilitación en salud (Res. 3100 de 2019), antes de cerrar la sede al público es obligatorio registrar las bitácoras operativas del día.
                    </p>

                    {/* Checklist */}
                    <div className="space-y-2.5">
                      {/* Termohigrómetro check */}
                      <div className="flex justify-between items-center bg-secondary/15 p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${status.missingAmbient ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-foreground">Termohigrómetro (Área de Almacenamiento)</span>
                            <span className="text-[10px] text-muted-foreground">Monitoreo de temperatura y humedad diaria</span>
                          </div>
                        </div>
                        {status.missingAmbient ? (
                          <button
                            onClick={handleQuickAmbient}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Registrar 20°C / 54%
                          </button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        )}
                      </div>

                      {/* Desinfección check */}
                      <div className="flex justify-between items-center bg-secondary/15 p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${status.missingDesinfeccion ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-foreground">Limpieza y Desinfección de Superficies</span>
                            <span className="text-[10px] text-muted-foreground">Bitácora diaria de saneamiento de superficies</span>
                          </div>
                        </div>
                        {status.missingDesinfeccion ? (
                          <button
                            onClick={handleQuickDesinfeccion}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Registrar Rutina
                          </button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        )}
                      </div>

                      {/* PGIRAS check */}
                      <div className="flex justify-between items-center bg-secondary/15 p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${status.missingResiduos ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs block text-foreground">Pesaje de Residuos (PGIRAS)</span>
                            <span className="text-[10px] text-muted-foreground">Registro de pesaje y manifiesto diario</span>
                          </div>
                        </div>
                        {status.missingResiduos ? (
                          <button
                            onClick={handleQuickResiduos}
                            className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Declarar 0 kg (Cero Residuos)
                          </button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        )}
                      </div>
                    </div>

                    {/* Semáforo Saneamiento Alertas en Cierre */}
                    {(status.plagasExpired || status.tanquesExpired || !status.conceptoFavorable) && (
                      <div className="p-3 bg-warning/5 border border-warning/20 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-warning-foreground uppercase tracking-wider block flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                          Ingeniería de Procesos - Alertas de Acreditación
                        </span>
                        <div className="text-[10px] text-muted-foreground space-y-0.5 font-medium">
                          {status.plagasExpired && <p>• Fumigación requerida: Han pasado más de 6 meses desde el último control de plagas.</p>}
                          {status.tanquesExpired && <p>• Lavado de tanques requerido (Decreto 1575/2007): Vencido o sin registro vigente.</p>}
                          {!status.conceptoFavorable && <p>• Concepto Sanitario SDS: No aprobado o requiere subsanar observaciones.</p>}
                        </div>
                      </div>
                    )}

                    {readyToClose ? (
                      <div className="bg-success/5 border border-success/20 p-3.5 rounded-xl text-center space-y-1.5">
                        <CheckCircle2 className="w-8 h-8 text-success mx-auto animate-bounce" />
                        <h4 className="text-xs font-bold text-success-foreground">¡Todo en regla para el cierre!</h4>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Todos los controles diarios requeridos por la Secretaría de Salud han sido registrados satisfactoriamente.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-destructive-foreground block">Cierre Técnico Bloqueado</span>
                          <span className="text-[10px] text-muted-foreground leading-relaxed block">
                            Complete los registros obligatorios pendientes usando los botones de acción rápida de arriba para poder realizar el cierre.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
                      <button
                        type="button"
                        onClick={() => setShowCloseShiftModal(false)}
                        className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!readyToClose}
                        onClick={() => {
                          setShowCloseShiftModal(false);
                          toast.success('¡Cierre de jornada técnico exitoso y firmado digitalmente! Datos enviados a auditoría.');
                        }}
                        className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-md ${
                          readyToClose 
                            ? 'bg-success text-white hover:bg-success/90 cursor-pointer' 
                            : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirmar y Cerrar Día
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
