'use client';

import React, { useState } from 'react';
import { Save, User, Clock, FileText, CheckCircle2, ChevronRight, Activity, Eye, Shield, Award, Edit, RotateCcw, Heart } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-store';
import { HistoriaClinica, Antecedentes, OjoData, RefraccionHC, SaludOcular, DiagnosticoPlan, RecomendacionClinica } from '@/lib/types';

// Pre-defined CIE-10 options for Optometry
const CIE10_OPTIONS = [
  { code: 'H52.1', name: 'Miopía' },
  { code: 'H52.2', name: 'Astigmatismo' },
  { code: 'H52.0', name: 'Hipermetropía' },
  { code: 'H52.4', name: 'Presbicia' },
  { code: 'H18.6', name: 'Queratocono' },
  { code: 'H25.9', name: 'Catarata Senil, no especificada' },
  { code: 'H40.9', name: 'Glaucoma, no especificado' },
  { code: 'H10.9', name: 'Conjuntivitis, no especificada' },
  { code: 'H53.0', name: 'Ambliopía por deprivación (Ojo vago)' },
  { code: 'H50.9', name: 'Estrabismo, no especificado' },
  { code: 'Z01.0', name: 'Examen de ojos y de la visión' }
];

export default function HistoriaClinicaPage() {
  const router = useRouter();
  const { citas, pacientes, guardarHistoriaClinica, updatePaciente } = useClinicStore();
  const [activeTab, setActiveTab] = useState<'anamnesis' | 'preliminares' | 'refraccion' | 'salud-ocular' | 'diagnostico'>('anamnesis');
  
  // Buscar la cita actual en consulta, o en sala, o la primera
  const citaActual = citas.find(c => c.estadoComercial === 'en-consulta') || 
                     citas.find(c => c.estadoComercial === 'en-sala') || 
                     citas[0];

  const pacienteActual = pacientes.find(p => p.id === citaActual?.pacienteId) || pacientes[0]; 

  // --- STATE FOR EMR FORM ---

  // Datos editables de Paciente (Demográficos)
  const [pacienteGenero, setPacienteGenero] = useState<'M' | 'F' | 'Otro'>(pacienteActual?.genero || 'M');
  const [pacienteDireccion, setPacienteDireccion] = useState(pacienteActual?.direccion || '');
  const [pacienteOcupacion, setPacienteOcupacion] = useState(pacienteActual?.ocupacion || '');

  // 1. Anamnesis
  const [motivo, setMotivo] = useState('Refiere visión borrosa de lejos y dolor de cabeza al final de la jornada laboral.');
  const [usoLentes, setUsoLentes] = useState('Ninguno');
  const [ocPersonales, setOcPersonales] = useState('Niega cirugías ni traumas oculares.');
  const [ocFamiliares, setOcFamiliares] = useState('Padre con Glaucoma.');
  const [sisPersonales, setSisPersonales] = useState('Niega hipertensión, diabetes o alergias.');
  const [otrosAntecedentes, setOtrosAntecedentes] = useState('Usa computador +8 horas al día.');

  // Nuevas variables clínicas
  const [ppc, setPpc] = useState('Normal (8 cm)');
  const [visionColor, setVisionColor] = useState('Normal 17/17 (Ishihara)');
  const [estereopsis, setEstereopsis] = useState('Normal (40" de arco)');
  const [avSinCorrODLejos, setAvSinCorrODLejos] = useState('20/40');
  const [avSinCorrODCerca, setAvSinCorrODCerca] = useState('20/30');
  const [avSinCorrOILejos, setAvSinCorrOILejos] = useState('20/30');
  const [avSinCorrOICerca, setAvSinCorrOICerca] = useState('20/20');
  const [phOD, setPhOD] = useState('');
  const [phOI, setPhOI] = useState('');
  const [dpc, setDpc] = useState('58 mm');
  const [tonometriaMetodo, setTonometriaMetodo] = useState('Soplo (Neumotónometro)');

  // 2. Pruebas Preliminares
  const [coverTestLejos, setCoverTestLejos] = useState('Ortoforia');
  const [coverTestCerca, setCoverTestCerca] = useState('Exoforia fisiológica 2 Dptas');
  const [reflejosPupilares, setReflejosPupilares] = useState('PIRRL (Pupilas Iguales Redondas Reactivas a la Luz y Acomodación)');
  const [motilidadOcular, setMotilidadOcular] = useState('Músculos extraoculares normales. Versiones y ducciones completas.');

  // 3. Refracción
  // Lensometría
  const [lenOD_esfera, setLenOD_esfera] = useState('');
  const [lenOD_cilindro, setLenOD_cilindro] = useState('');
  const [lenOD_eje, setLenOD_eje] = useState('');
  const [lenOD_avLejos, setLenOD_avLejos] = useState('');
  const [lenOD_avCerca, setLenOD_avCerca] = useState('');
  const [lenOI_esfera, setLenOI_esfera] = useState('');
  const [lenOI_cilindro, setLenOI_cilindro] = useState('');
  const [lenOI_eje, setLenOI_eje] = useState('');
  const [lenOI_avLejos, setLenOI_avLejos] = useState('');
  const [lenOI_avCerca, setLenOI_avCerca] = useState('');

  // Queratometría
  const [queratometriaOD, setQueratometriaOD] = useState('42.50 / 43.00 @ 180°');
  const [queratometriaOI, setQueratometriaOI] = useState('42.25 / 42.75 @ 175°');

  // Retinoscopía
  const [retOD_esfera, setRetOD_esfera] = useState('-1.75');
  const [retOD_cilindro, setRetOD_cilindro] = useState('-0.50');
  const [retOD_eje, setRetOD_eje] = useState('180');
  const [retOI_esfera, setRetOI_esfera] = useState('-1.50');
  const [retOI_cilindro, setRetOI_cilindro] = useState('-0.25');
  const [retOI_eje, setRetOI_eje] = useState('175');

  // Subjetivo Final (Fórmula)
  const [subOD_esfera, setSubOD_esfera] = useState('-1.75');
  const [subOD_cilindro, setSubOD_cilindro] = useState('-0.50');
  const [subOD_eje, setSubOD_eje] = useState('180');
  const [subOD_adicion, setSubOD_adicion] = useState('');
  const [subOD_avLejos, setSubOD_avLejos] = useState('20/20');
  const [subOD_avCerca, setSubOD_avCerca] = useState('20/20');

  const [subOI_esfera, setSubOI_esfera] = useState('-1.50');
  const [subOI_cilindro, setSubOI_cilindro] = useState('-0.50');
  const [subOI_eje, setSubOI_eje] = useState('175');
  const [subOI_adicion, setSubOI_adicion] = useState('');
  const [subOI_avLejos, setSubOI_avLejos] = useState('20/20');
  const [subOI_avCerca, setSubOI_avCerca] = useState('20/20');
  const [dp, setDp] = useState('62 mm');

  // 4. Salud Ocular
  const [biomicroscopiaOD, setBiomicroscopiaOD] = useState('Córnea transparente, conjuntiva clara, cámara anterior formada sin Tyndall.');
  const [biomicroscopiaOI, setBiomicroscopiaOI] = useState('Córnea transparente, conjuntiva sin alteraciones, cristalino transparente.');
  const [oftalmoscopiaOD, setOftalmoscopiaOD] = useState('Papila de bordes netos, relación copa/disco 0.3, mácula libre, retina aplicada.');
  const [oftalmoscopiaOI, setOftalmoscopiaOI] = useState('Papila de bordes netos, relación copa/disco 0.3, retina aplicada sin lesiones.');
  const [pioOD, setPioOD] = useState<number>(14);
  const [pioOI, setPioOI] = useState<number>(14);

  // 5. Diagnóstico, Plan & Firma
  const [cie10PrincipalCode, setCie10PrincipalCode] = useState('H52.1');
  const [cie10PrincipalName, setCie10PrincipalName] = useState('Miopía');
  const [cie10SecundarioCode, setCie10SecundarioCode] = useState('H52.2');
  const [cie10SecundarioName, setCie10SecundarioName] = useState('Astigmatismo');
  const [planTratamiento, setPlanTratamiento] = useState('Se prescribe corrección de uso permanente. Lentes con filtro luz azul y antirreflejo premium. Higiene visual laboral (regla 20-20-20). Control anual.');
  const [firmaDigital, setFirmaDigital] = useState(false);

  // Recomendación de Óptica (Hand-off)
  const [recMaterial, setRecMaterial] = useState('Policarbonato');
  const [recDiseno, setRecDiseno] = useState('Visión Sencilla');
  const [recTipo, setRecTipo] = useState('Terminado');
  const [recSintomas, setRecSintomas] = useState('Astenopia al final del día por uso continuo de pantallas. Requiere protección antirreflejo premium y filtro azul.');

  // Carga asistida inteligente
  const handleAutoFill = () => {
    setRecMaterial('Alto Índice (1.60 - 1.67)');
    setRecDiseno('Visión Sencilla');
    setRecTipo('Free Form (Digital)');
    setRecSintomas(`Paciente con Miopía y Astigmatismo (${subOD_esfera} DS / ${subOI_esfera} DS). Trabaja 8+ horas frente a pantallas. Se aconseja lentes tallados digitalmente (Free Form) en Alto Índice para optimizar peso y espesor, adicionando filtro azul.`);
  };

  const handleCie10Change = (type: 'principal' | 'secundario', code: string) => {
    const selected = CIE10_OPTIONS.find(o => o.code === code);
    if (selected) {
      if (type === 'principal') {
        setCie10PrincipalCode(selected.code);
        setCie10PrincipalName(selected.name);
      } else {
        setCie10SecundarioCode(selected.code);
        setCie10SecundarioName(selected.name);
      }
    }
  };

  const handleGuardar = () => {
    if (!firmaDigital) {
      toast.warning('Debe firmar digitalmente la historia clínica antes de cerrarla (Tab 5: Diagnóstico y Firma).');
      setActiveTab('diagnostico');
      return;
    }

    // Actualizar datos del paciente en el store
    updatePaciente(pacienteActual.id, {
      genero: pacienteGenero,
      direccion: pacienteDireccion,
      ocupacion: pacienteOcupacion
    });

    // Estructurar el objeto completo de Historia Clínica
    const antec: Antecedentes = {
      ocularesPersonales: ocPersonales.split('.').filter(x => x.trim().length > 0).map(x => x.trim()),
      ocularesFamiliares: ocFamiliares.split('.').filter(x => x.trim().length > 0).map(x => x.trim()),
      sistemicosPersonales: sisPersonales.split('.').filter(x => x.trim().length > 0).map(x => x.trim()),
      otros: otrosAntecedentes
    };

    const refr: RefraccionHC = {
      queratometriaOD,
      queratometriaOI,
      subjetivoOD: {
        esfera: subOD_esfera,
        cilindro: subOD_cilindro,
        eje: subOD_eje,
        adicion: subOD_adicion || undefined,
        avLejos: subOD_avLejos,
        avCerca: subOD_avCerca
      },
      subjetivoOI: {
        esfera: subOI_esfera,
        cilindro: subOI_cilindro,
        eje: subOI_eje,
        adicion: subOI_adicion || undefined,
        avLejos: subOI_avLejos,
        avCerca: subOI_avCerca
      },
      dp,
      avSinCorreccionODLejos: avSinCorrODLejos,
      avSinCorreccionODCerca: avSinCorrODCerca,
      avSinCorreccionOILejos: avSinCorrOILejos,
      avSinCorreccionOICerca: avSinCorrOICerca,
      phOD: phOD || undefined,
      phOI: phOI || undefined,
      dpc: dpc || undefined
    };

    // Añadir datos opcionales de refracción si están llenos
    if (lenOD_esfera || lenOD_cilindro) {
      refr.lensometriaOD = {
        esfera: lenOD_esfera,
        cilindro: lenOD_cilindro,
        eje: lenOD_eje,
        avLejos: lenOD_avLejos,
        avCerca: lenOD_avCerca
      };
    }
    if (lenOI_esfera || lenOI_cilindro) {
      refr.lensometriaOI = {
        esfera: lenOI_esfera,
        cilindro: lenOI_cilindro,
        eje: lenOI_eje,
        avLejos: lenOI_avLejos,
        avCerca: lenOI_avCerca
      };
    }
    if (retOD_esfera || retOD_cilindro) {
      refr.retinoscopiaOD = {
        esfera: retOD_esfera,
        cilindro: retOD_cilindro,
        eje: retOD_eje,
        avLejos: '20/20',
        avCerca: '20/20'
      };
    }
    if (retOI_esfera || retOI_cilindro) {
      refr.retinoscopiaOI = {
        esfera: retOI_esfera,
        cilindro: retOI_cilindro,
        eje: retOI_eje,
        avLejos: '20/20',
        avCerca: '20/20'
      };
    }

    const salud: SaludOcular = {
      biomicroscopiaOD,
      biomicroscopiaOI,
      oftalmoscopiaOD,
      oftalmoscopiaOI,
      presionIntraocularOD: pioOD || undefined,
      presionIntraocularOI: pioOI || undefined,
      tonometriaMetodo: tonometriaMetodo || undefined
    };

    const diag: DiagnosticoPlan = {
      cie10Principal: cie10PrincipalCode,
      cie10PrincipalNombre: cie10PrincipalName,
      cie10Secundario: cie10SecundarioCode || undefined,
      cie10SecundarioNombre: cie10SecundarioName || undefined,
      planTratamiento,
      firmaDigitalConfirmada: true,
      nombreProfesional: 'Dra. Silva',
      registroMedico: 'RM-12345-CO'
    };

    const recom: RecomendacionClinica = {
      material: recMaterial,
      diseno: recDiseno,
      tipo: recTipo,
      sintomas: recSintomas
    };

    const nuevaHC: HistoriaClinica = {
      pacienteId: pacienteActual.id,
      citaId: citaActual.id,
      fechaRegistro: new Date().toISOString(),
      anamnesis: {
        motivo,
        usoLentes,
        antecedentes: antec
      },
      pruebasPreliminares: {
        coverTestLejos,
        coverTestCerca,
        reflejosPupilares,
        motilidadOcular,
        ppc: ppc || undefined,
        visionColor: visionColor || undefined,
        estereopsis: estereopsis || undefined
      },
      refraccion: refr,
      saludOcular: salud,
      diagnosticoPlan: diag,
      recomendacion: recom
    };

    // Guardar historia clínica en el Zustand store (cambia estado a 'cotizando' e inyecta la recomendación)
    guardarHistoriaClinica(citaActual.id, nuevaHC);
    toast.success('✓ Historia clínica firmada y sellada');

    // Redireccionar
    router.push('/dashboard/optometra');
  };

  // Helper to calculate age from birthdate
  const getEdad = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (!citaActual || !pacienteActual) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-foreground">No hay consulta activa seleccionada</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Para registrar una historia clínica, debes iniciar una consulta desde la agenda de pacientes en sala.
          </p>
          <button 
            onClick={() => router.push('/dashboard/optometra')}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            Ir a Mi Agenda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registro de Historia Clínica</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
            Paciente Activo: <strong className="text-foreground">{pacienteActual.nombre} {pacienteActual.apellido}</strong> (CC {pacienteActual.documento})
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/dashboard/optometra')}
            className="bg-background text-foreground border border-input px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
          >
            Pausar / Salir
          </button>
          <button 
            onClick={handleGuardar}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar, Firmar y Cerrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sidebar: Patient Info Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-lg">
                {pacienteActual.nombre[0]}{pacienteActual.apellido[0]}
              </div>
              <div>
                <h3 className="font-bold leading-tight text-foreground">{pacienteActual.nombre} <br/> {pacienteActual.apellido}</h3>
                <p className="text-xs text-muted-foreground">{pacienteActual.tipoDocumento} {pacienteActual.documento}</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Edad</span>
                <span className="font-semibold text-foreground">{getEdad(pacienteActual.fechaNacimiento)} años</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">EPS</span>
                <span className="font-semibold text-foreground">{pacienteActual.eps || 'Particular'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridad Cita</span>
                <span className="font-semibold capitalize text-foreground">{citaActual.prioridad}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Motivo Agendado</span>
                <span className="font-semibold text-right max-w-[130px] truncate text-foreground" title={citaActual.motivoClinico}>
                  {citaActual.motivoClinico}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" /> Antecedentes Previos
            </h3>
            <div className="space-y-3">
              <div className="p-2.5 bg-secondary/30 border border-border/50 rounded-xl">
                <div className="text-xs font-bold text-foreground">12 May 2024</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Control Miopía. Subjetivo: OD -1.50 (-0.25) OI -1.25. Lentes en buen estado.</div>
              </div>
              <div className="p-2.5 bg-secondary/30 border border-border/50 rounded-xl">
                <div className="text-xs font-bold text-foreground">10 Jun 2023</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Primera Consulta. Cansancio visual. Astigmatismo leve diagnosticado.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: 5-Tab Form */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-border bg-secondary/15 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('anamnesis')}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'anamnesis' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
            >
              <User className="w-4 h-4" /> 1. Anamnesis
            </button>
            <button 
              onClick={() => setActiveTab('preliminares')}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'preliminares' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
            >
              <Activity className="w-4 h-4" /> 2. Preliminares
            </button>
            <button 
              onClick={() => setActiveTab('refraccion')}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'refraccion' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
            >
              <Eye className="w-4 h-4" /> 3. Refracción
            </button>
            <button 
              onClick={() => setActiveTab('salud-ocular')}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border-r border-border/40 ${activeTab === 'salud-ocular' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
            >
              <Heart className="w-4 h-4" /> 4. Salud Ocular
            </button>
            <button 
              onClick={() => setActiveTab('diagnostico')}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'diagnostico' ? 'bg-background text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}
            >
              <FileText className="w-4 h-4" /> 5. Diagnóstico & Firma
            </button>
          </div>

          {/* Tab Body */}
          <div className="p-6 flex-1">

            {/* TAB 1: ANAMNESIS & ANTECEDENTES */}
            {activeTab === 'anamnesis' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Datos Demográficos */}
                <div className="bg-secondary/10 p-4 rounded-2xl border border-border">
                  <span className="font-bold text-xs text-muted-foreground uppercase block mb-3">Información Demográfica (Res. 3100/2019)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Género *</label>
                      <select
                        value={pacienteGenero}
                        onChange={(e) => setPacienteGenero(e.target.value as 'M' | 'F' | 'Otro')}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="Otro">Otro / No Especifica</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Dirección de Residencia</label>
                      <input
                        type="text"
                        value={pacienteDireccion}
                        onChange={(e) => setPacienteDireccion(e.target.value)}
                        placeholder="Ej. Calle 127 # 14-54"
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Ocupación / Oficio</label>
                      <input
                        type="text"
                        value={pacienteOcupacion}
                        onChange={(e) => setPacienteOcupacion(e.target.value)}
                        placeholder="Ej. Ingeniero de Sistemas"
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Motivo de Consulta *</label>
                    <textarea 
                      required
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="w-full min-h-[90px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
                      placeholder="Ej. Siente visión borrosa de lejos..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Uso de Lentes Actuales</label>
                    <select
                      value={usoLentes}
                      onChange={(e) => setUsoLentes(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    >
                      <option value="Ninguno">Ninguno (No usa corrección)</option>
                      <option value="Monofocal">Lentes Monofocales</option>
                      <option value="Bifocal">Lentes Bifocales</option>
                      <option value="Progresivo">Lentes Progresivos</option>
                      <option value="Lentes de Contacto">Lentes de Contacto</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-bold text-foreground mb-4">Antecedentes Médicos (Res. 1995/1999)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Antecedentes Oculares Personales</label>
                      <textarea 
                        value={ocPersonales}
                        onChange={(e) => setOcPersonales(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Sin cirugías. No traumas."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Antecedentes Oculares Familiares</label>
                      <textarea 
                        value={ocFamiliares}
                        onChange={(e) => setOcFamiliares(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Glaucoma o catarata en familiares..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Antecedentes Sistémicos Personales</label>
                      <textarea 
                        value={sisPersonales}
                        onChange={(e) => setSisPersonales(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Diabetes, HTA, Alergias..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Otros Antecedentes / Notas Ambientales</label>
                      <textarea 
                        value={otrosAntecedentes}
                        onChange={(e) => setOtrosAntecedentes(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Exposición a luz UV, pantallas, etc."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <button 
                    onClick={() => setActiveTab('preliminares')}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    Siguiente: Preliminares <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: PRUEBAS PRELIMINARES */}
            {activeTab === 'preliminares' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <h4 className="text-sm font-bold text-foreground">Examen Sensoriomotor Basal</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Cover Test (Lejos)</label>
                    <input 
                      type="text" 
                      value={coverTestLejos} 
                      onChange={(e) => setCoverTestLejos(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      placeholder="Ej. Ortoforia / Esotropia"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Cover Test (Cerca)</label>
                    <input 
                      type="text" 
                      value={coverTestCerca} 
                      onChange={(e) => setCoverTestCerca(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      placeholder="Ej. Exoforia fisiológica 2 Dptas"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Reflejos Pupilares</label>
                    <input 
                      type="text" 
                      value={reflejosPupilares} 
                      onChange={(e) => setReflejosPupilares(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      placeholder="Ej. PIRRL / Defecto pupilar aferente"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Motilidad Ocular</label>
                    <input 
                      type="text" 
                      value={motilidadOcular} 
                      onChange={(e) => setMotilidadOcular(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      placeholder="Ej. Normal en todas las direcciones..."
                    />
                  </div>
                </div>

                {/* Pruebas Especiales y Binocularidad */}
                <div className="border-t border-border pt-4">
                  <span className="font-bold text-xs text-muted-foreground uppercase block mb-3">Binocularidad y Pruebas Especiales (Ishihara / Estereopsis)</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Punto Próximo de Convergencia (PPC)</label>
                      <input 
                        type="text" 
                        value={ppc} 
                        onChange={(e) => setPpc(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Normal (8 cm) / Alejado"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Visión de Colores (Ishihara)</label>
                      <input 
                        type="text" 
                        value={visionColor} 
                        onChange={(e) => setVisionColor(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Normal 17/17"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block text-muted-foreground">Estereopsis (Randot/Fly)</label>
                      <input 
                        type="text" 
                        value={estereopsis} 
                        onChange={(e) => setEstereopsis(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        placeholder="Ej. Normal (40 seg de arco)"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-border">
                  <button 
                    onClick={() => setActiveTab('anamnesis')}
                    className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Atrás
                  </button>
                  <button 
                    onClick={() => setActiveTab('refraccion')}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    Siguiente: Refracción <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: REFRACCIÓN COMPLETA */}
            {activeTab === 'refraccion' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

                {/* Agudeza Visual Inicial Sin Corrección */}
                <div className="bg-secondary/15 p-4 rounded-2xl border border-border">
                  <span className="font-bold text-xs text-muted-foreground uppercase block mb-3">Agudeza Visual Inicial (Sin Corrección)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* OD */}
                    <div className="space-y-3 p-3 bg-background rounded-xl border border-border/50">
                      <span className="font-bold text-xs text-primary uppercase block">Ojo Derecho (OD)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">AV Lejos</label>
                          <input type="text" placeholder="e.g. 20/40" value={avSinCorrODLejos} onChange={(e) => setAvSinCorrODLejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">AV Cerca</label>
                          <input type="text" placeholder="e.g. 20/30" value={avSinCorrODCerca} onChange={(e) => setAvSinCorrODCerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Agujero Estenopeico (PH)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 20/20 (Dejar vacío si no aplica)" 
                          value={phOD} 
                          onChange={(e) => setPhOD(e.target.value)} 
                          className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center font-mono" 
                        />
                      </div>
                    </div>

                    {/* OI */}
                    <div className="space-y-3 p-3 bg-background rounded-xl border border-border/50">
                      <span className="font-bold text-xs text-primary uppercase block">Ojo Izquierdo (OI)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">AV Lejos</label>
                          <input type="text" placeholder="e.g. 20/30" value={avSinCorrOILejos} onChange={(e) => setAvSinCorrOILejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">AV Cerca</label>
                          <input type="text" placeholder="e.g. 20/20" value={avSinCorrOICerca} onChange={(e) => setAvSinCorrOICerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Agujero Estenopeico (PH)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 20/20 (Dejar vacío si no aplica)" 
                          value={phOI} 
                          onChange={(e) => setPhOI(e.target.value)} 
                          className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs text-center font-mono" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 3.1 Lensometría (Gafas Actuales) */}
                <div className="bg-secondary/15 p-4 rounded-2xl border border-border">
                  <span className="font-bold text-xs text-muted-foreground uppercase block mb-3">3.1 Lensometría (Prescripción en Uso)</span>
                  
                  {/* OD */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="w-8 font-bold text-xs text-foreground">OD</div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground">Esfera</label>
                      <input type="text" placeholder="e.g. -1.50" value={lenOD_esfera} onChange={(e) => setLenOD_esfera(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground">Cilindro</label>
                      <input type="text" placeholder="e.g. -0.25" value={lenOD_cilindro} onChange={(e) => setLenOD_cilindro(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <label className="text-[10px] text-muted-foreground">Eje</label>
                      <input type="text" placeholder="e.g. 180" value={lenOD_eje} onChange={(e) => setLenOD_eje(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground">AV Lejos</label>
                      <input type="text" placeholder="e.g. 20/30" value={lenOD_avLejos} onChange={(e) => setLenOD_avLejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground">AV Cerca</label>
                      <input type="text" placeholder="e.g. J1" value={lenOD_avCerca} onChange={(e) => setLenOD_avCerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                  </div>

                  {/* OI */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 font-bold text-xs text-foreground">OI</div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" placeholder="e.g. -1.25" value={lenOI_esfera} onChange={(e) => setLenOI_esfera(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" placeholder="e.g. -0.25" value={lenOI_cilindro} onChange={(e) => setLenOI_cilindro(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <input type="text" placeholder="e.g. 175" value={lenOI_eje} onChange={(e) => setLenOI_eje(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" placeholder="e.g. 20/25" value={lenOI_avLejos} onChange={(e) => setLenOI_avLejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" placeholder="e.g. J1" value={lenOI_avCerca} onChange={(e) => setLenOI_avCerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs font-mono text-center" />
                    </div>
                  </div>
                </div>

                {/* 3.2 Queratometría y Retinoscopía */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/10 rounded-2xl border border-border space-y-3">
                    <span className="font-bold text-xs text-muted-foreground uppercase block">3.2 Queratometría (Medida Córnea)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">OD</label>
                        <input type="text" value={queratometriaOD} onChange={(e) => setQueratometriaOD(e.target.value)} className="w-full px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">OI</label>
                        <input type="text" value={queratometriaOI} onChange={(e) => setQueratometriaOI(e.target.value)} className="w-full px-3 py-1.5 bg-background border border-input rounded-lg text-xs font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-2xl border border-border space-y-3">
                    <span className="font-bold text-xs text-muted-foreground uppercase block">3.3 Retinoscopía (Objetiva)</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">OD</label>
                        <div className="flex gap-1">
                          <input type="text" placeholder="Esf" value={retOD_esfera} onChange={(e) => setRetOD_esfera(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                          <input type="text" placeholder="Cil" value={retOD_cilindro} onChange={(e) => setRetOD_cilindro(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                          <input type="text" placeholder="Eje" value={retOD_eje} onChange={(e) => setRetOD_eje(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">OI</label>
                        <div className="flex gap-1">
                          <input type="text" placeholder="Esf" value={retOI_esfera} onChange={(e) => setRetOI_esfera(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                          <input type="text" placeholder="Cil" value={retOI_cilindro} onChange={(e) => setRetOI_cilindro(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                          <input type="text" placeholder="Eje" value={retOI_eje} onChange={(e) => setRetOI_eje(e.target.value)} className="w-1/3 px-1 py-1.5 bg-background border border-input rounded text-[10px] font-mono text-center" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3.4 Subjetivo Final (Fórmula Prescrita) */}
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-primary uppercase block">3.4 Subjetivo Final * (Fórmula A Emitir)</span>
                    <button 
                      onClick={() => {
                        setSubOD_esfera(retOD_esfera);
                        setSubOD_cilindro(retOD_cilindro);
                        setSubOD_eje(retOD_eje);
                        setSubOI_esfera(retOI_esfera);
                        setSubOI_cilindro(retOI_cilindro);
                        setSubOI_eje(retOI_eje);
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Copiar Retinoscopía
                    </button>
                  </div>

                  {/* OD subjetivo */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 font-bold text-xs text-primary">OD</div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground block text-center">Esfera</label>
                      <input type="text" value={subOD_esfera} onChange={(e) => setSubOD_esfera(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-semibold font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <label className="text-[10px] text-muted-foreground block text-center">Cilindro</label>
                      <input type="text" value={subOD_cilindro} onChange={(e) => setSubOD_cilindro(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <label className="text-[10px] text-muted-foreground block text-center">Eje</label>
                      <input type="text" value={subOD_eje} onChange={(e) => setSubOD_eje(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <label className="text-[10px] text-muted-foreground block text-center">Adición</label>
                      <input type="text" placeholder="+" value={subOD_adicion} onChange={(e) => setSubOD_adicion(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[75px]">
                      <label className="text-[10px] text-muted-foreground block text-center">AV Lejos</label>
                      <input type="text" value={subOD_avLejos} onChange={(e) => setSubOD_avLejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm text-center" />
                    </div>
                    <div className="flex-1 min-w-[75px]">
                      <label className="text-[10px] text-muted-foreground block text-center">AV Cerca</label>
                      <input type="text" value={subOD_avCerca} onChange={(e) => setSubOD_avCerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm text-center" />
                    </div>
                  </div>

                  {/* OI subjetivo */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-8 font-bold text-xs text-primary">OI</div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" value={subOI_esfera} onChange={(e) => setSubOI_esfera(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-semibold font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[70px]">
                      <input type="text" value={subOI_cilindro} onChange={(e) => setSubOI_cilindro(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <input type="text" value={subOI_eje} onChange={(e) => setSubOI_eje(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-primary" />
                    </div>
                    <div className="flex-1 min-w-[60px]">
                      <input type="text" placeholder="+" value={subOI_adicion} onChange={(e) => setSubOI_adicion(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm font-mono text-center" />
                    </div>
                    <div className="flex-1 min-w-[75px]">
                      <input type="text" value={subOI_avLejos} onChange={(e) => setSubOI_avLejos(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm text-center" />
                    </div>
                    <div className="flex-1 min-w-[75px]">
                      <input type="text" value={subOI_avCerca} onChange={(e) => setSubOI_avCerca(e.target.value)} className="w-full px-2 py-1.5 bg-background border border-primary/20 rounded-lg text-sm text-center" />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-4 items-center">
                    <div className="w-40">
                      <label className="text-xs font-semibold text-foreground">D.P. Lejos (DPL)</label>
                      <input type="text" value={dp} onChange={(e) => setDp(e.target.value)} placeholder="e.g. 62 mm" className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm font-mono text-center" />
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-semibold text-foreground">D.P. Cerca (DPC)</label>
                      <input type="text" value={dpc} onChange={(e) => setDpc(e.target.value)} placeholder="e.g. 58 mm" className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm font-mono text-center" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-border">
                  <button 
                    onClick={() => setActiveTab('preliminares')}
                    className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Atrás
                  </button>
                  <button 
                    onClick={() => setActiveTab('salud-ocular')}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    Siguiente: Salud Ocular <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SALUD OCULAR (FISIOLÓGICO) */}
            {activeTab === 'salud-ocular' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <h4 className="text-sm font-bold text-foreground">Exploración Anatómica y Fisiológica</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Biomicroscopia */}
                  <div className="space-y-4">
                    <span className="font-bold text-xs text-muted-foreground uppercase">Biomicroscopía (Segmento Anterior)</span>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block">Ojo Derecho (OD)</label>
                      <textarea 
                        value={biomicroscopiaOD} 
                        onChange={(e) => setBiomicroscopiaOD(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block">Ojo Izquierdo (OI)</label>
                      <textarea 
                        value={biomicroscopiaOI} 
                        onChange={(e) => setBiomicroscopiaOI(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Oftalmoscopia */}
                  <div className="space-y-4">
                    <span className="font-bold text-xs text-muted-foreground uppercase">Oftalmoscopía (Polo Posterior/Fondo Ojo)</span>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block">Ojo Derecho (OD)</label>
                      <textarea 
                        value={oftalmoscopiaOD} 
                        onChange={(e) => setOftalmoscopiaOD(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block">Ojo Izquierdo (OI)</label>
                      <textarea 
                        value={oftalmoscopiaOI} 
                        onChange={(e) => setOftalmoscopiaOI(e.target.value)}
                        className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Tonometria (PIO) */}
                <div className="bg-secondary/15 p-4 rounded-2xl border border-border">
                  <span className="font-bold text-xs text-muted-foreground uppercase block mb-3">Presión Intraocular (PIO - Tonometría)</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">OD (mmHg)</label>
                      <input 
                        type="number" 
                        value={pioOD} 
                        onChange={(e) => setPioOD(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">OI (mmHg)</label>
                      <input 
                        type="number" 
                        value={pioOI} 
                        onChange={(e) => setPioOI(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Método de Medición</label>
                      <select 
                        value={tonometriaMetodo} 
                        onChange={(e) => setTonometriaMetodo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        <option value="Soplo (Neumotónometro)">Soplo (Neumotónometro)</option>
                        <option value="Aplanación Goldmann">Aplanación Goldmann</option>
                        <option value="Perkins">Perkins</option>
                        <option value="Palpación Digital">Palpación Digital</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-border">
                  <button 
                    onClick={() => setActiveTab('refraccion')}
                    className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Atrás
                  </button>
                  <button 
                    onClick={() => setActiveTab('diagnostico')}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    Siguiente: Diagnóstico & Firma <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: DIAGNÓSTICO, RECOMENDACIÓN & FIRMA */}
            {activeTab === 'diagnostico' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
                
                {/* 5.1 Diagnóstico CIE-10 */}
                <div className="space-y-3">
                  <span className="font-bold text-xs text-muted-foreground uppercase block">5.1 Diagnóstico de Salud (CIE-10)</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Diagnóstico Principal</label>
                      <select 
                        value={cie10PrincipalCode}
                        onChange={(e) => handleCie10Change('principal', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        {CIE10_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>{opt.code} - {opt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Diagnóstico Secundario</label>
                      <select 
                        value={cie10SecundarioCode}
                        onChange={(e) => handleCie10Change('secundario', e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        <option value="">Ninguno</option>
                        {CIE10_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>{opt.code} - {opt.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold block">Conducta y Plan de Manejo Clínico</label>
                    <textarea 
                      value={planTratamiento}
                      onChange={(e) => setPlanTratamiento(e.target.value)}
                      className="w-full min-h-[70px] px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* 5.2 Hand-off Recomendación Óptica */}
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-primary/10">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-5 h-5 text-primary" />
                      <div>
                        <h4 className="font-bold text-sm text-primary">Recomendación Sugerida de Óptica (Comercial)</h4>
                        <p className="text-[10px] text-muted-foreground">Fluye directamente a la pantalla de ventas (órdenes de trabajo) del asesor.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleAutoFill}
                      className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-3 py-1 rounded-xl text-xs font-bold transition-colors"
                    >
                      ✨ Análisis Asistido
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Material Sugerido</label>
                      <select 
                        value={recMaterial}
                        onChange={(e) => setRecMaterial(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        <option>CR-39 (Estándar)</option>
                        <option>Policarbonato</option>
                        <option>Trivex</option>
                        <option>Alto Índice (1.60 - 1.67)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Diseño Sugerido</label>
                      <select 
                        value={recDiseno}
                        onChange={(e) => setRecDiseno(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        <option>Visión Sencilla</option>
                        <option>Progresivo</option>
                        <option>Bifocal</option>
                        <option>Ocupacional</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Tecnología de Fabricación</label>
                      <select 
                        value={recTipo}
                        onChange={(e) => setRecTipo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-background border border-input rounded-xl text-sm focus:outline-none"
                      >
                        <option>Terminado (Stock)</option>
                        <option>Tallado Convencional</option>
                        <option>Free Form (Digital)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Argumento Clínico de Salud para la Venta</label>
                    <textarea 
                      value={recSintomas}
                      onChange={(e) => setRecSintomas(e.target.value)}
                      className="w-full min-h-[60px] px-3 py-1.5 bg-background border border-input rounded-xl text-xs"
                      placeholder="Ej. Paciente trabaja 8+ horas frente a pantallas..."
                    />
                  </div>
                </div>

                {/* 5.3 Firma Digital */}
                <div className="bg-secondary/20 border border-border p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h5 className="font-bold text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Firma de Registro Clínico
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      Cumple con la Res. 1995 de 1999. Una vez firmado y cerrado no podrá modificarse.
                    </p>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Optómetra Firmante: <strong>Dra. Silva</strong> (Reg. Médico: <strong>RM-12345-CO</strong>)
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={firmaDigital} 
                      onChange={(e) => setFirmaDigital(e.target.checked)}
                      className="w-4.5 h-4.5 text-primary border-border focus:ring-primary"
                    />
                    <div className="text-xs font-semibold">
                      Confirmar Firma Digital
                    </div>
                  </label>
                </div>

                {/* Submit button */}
                <div className="flex justify-between pt-4 border-t border-border">
                  <button 
                    onClick={() => setActiveTab('salud-ocular')}
                    className="text-muted-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Atrás
                  </button>
                  <button 
                    onClick={handleGuardar}
                    disabled={!firmaDigital}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-colors ${firmaDigital ? 'bg-primary text-primary-foreground hover:bg-blue-600' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Cerrar y Firmar Historia Clínica
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
