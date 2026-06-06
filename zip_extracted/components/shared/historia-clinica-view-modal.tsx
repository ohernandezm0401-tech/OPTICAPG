'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Printer, Shield, User, Heart, Eye, Award, CheckCircle, Lock } from 'lucide-react';
import { HistoriaClinica, Paciente } from '@/lib/types';
import { useClinicStore } from '@/lib/store';

interface HistoriaClinicaViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  hc?: HistoriaClinica;
  pacienteInfo: Paciente;
  citaEstadoComercial?: string;
}

export function HistoriaClinicaViewModal({ isOpen, onClose, hc, pacienteInfo, citaEstadoComercial }: HistoriaClinicaViewModalProps) {
  const { empresas, sedes } = useClinicStore();
  const empresa = empresas[0];
  const activeSede = sedes[0];
  const brandColor = empresa?.colorCorporativo || '#2563eb';
  const isLocked = citaEstadoComercial && citaEstadoComercial !== 'pagado';

  if (!isOpen) return null;

  const handlePrint = () => {
    if (isLocked) return;
    window.print();
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

  // Default mock EMR if none is saved on the appointment
  const currentHc: HistoriaClinica = hc || {
    pacienteId: pacienteInfo.id,
    citaId: '',
    fechaRegistro: new Date().toISOString(),
    anamnesis: {
      motivo: 'Refiere disminución en la agudeza visual de lejos y astenopia al finalizar el día laboral.',
      usoLentes: 'Monofocal',
      antecedentes: {
        ocularesPersonales: ['Uso de lentes monofocales desde hace 3 años'],
        ocularesFamiliares: ['Padre con glaucoma diagnosticado'],
        sistemicosPersonales: ['Ninguno relevante'],
        otros: 'Paciente trabaja frente a computador +8 horas diarias.'
      }
    },
    pruebasPreliminares: {
      coverTestLejos: 'Ortoforia',
      coverTestCerca: 'Exoforia Fisiológica (2 Δ)',
      reflejosPupilares: 'Normorreactivos (PIRRL)',
      motilidadOcular: 'Músculos extraoculares sin restricción en las 9 posiciones de mirada.'
    },
    refraccion: {
      lensometriaOD: { esfera: '-1.50', cilindro: '-0.50', eje: '180', avLejos: '20/30', avCerca: '20/20' },
      lensometriaOI: { esfera: '-1.25', cilindro: '-0.25', eje: '175', avLejos: '20/25', avCerca: '20/20' },
      queratometriaOD: '43.00 / 43.50 @ 180°',
      queratometriaOI: '42.75 / 43.25 @ 175°',
      retinoscopiaOD: { esfera: '-2.00', cilindro: '-0.75', eje: '180', avLejos: '20/40', avCerca: '20/20' },
      retinoscopiaOI: { esfera: '-1.75', cilindro: '-0.50', eje: '175', avLejos: '20/30', avCerca: '20/20' },
      subjetivoOD: { esfera: '-2.00', cilindro: '-0.75', eje: '180', avLejos: '20/20', avCerca: '20/20' },
      subjetivoOI: { esfera: '-1.75', cilindro: '-0.50', eje: '175', avLejos: '20/20', avCerca: '20/20' },
      dp: '62 mm'
    },
    saludOcular: {
      biomicroscopiaOD: 'Córnea transparente, cámara anterior amplia, conjuntiva sin inyección ciliar.',
      biomicroscopiaOI: 'Córnea transparente, conjuntiva normal. Sin alteraciones en el segmento anterior.',
      oftalmoscopiaOD: 'Relación copa/disco 0.3. Mácula normal, retina aplicada. Vasos 2/3.',
      oftalmoscopiaOI: 'Relación copa/disco 0.3. Sin lesiones activas en polo posterior.',
      presionIntraocularOD: 14,
      presionIntraocularOI: 15
    },
    diagnosticoPlan: {
      cie10Principal: 'H52.1',
      cie10PrincipalNombre: 'Miopía',
      cie10Secundario: 'H52.2',
      cie10SecundarioNombre: 'Astigmatismo',
      planTratamiento: 'Se prescribe corrección óptica en policarbonato con antirreflejo premium. Filtro azul para pantallas. Control en 1 año.',
      firmaDigitalConfirmada: true,
      nombreProfesional: 'Dra. Silva',
      registroMedico: 'RM-12345-CO'
    },
    recomendacion: {
      material: 'Policarbonato',
      diseno: 'Monofocal',
      tipo: 'Terminado',
      sintomas: 'Trabaja 8+ horas en computador, refiere astenopia y fatiga ocular.'
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm print:relative print:inset-auto print:bg-white print:p-0 print:block">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30 print:hidden">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <FileText className="w-5 h-5 text-primary" />
              Historia Clínica de Optometría
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="bg-secondary text-foreground p-2 rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2 text-sm font-semibold border border-border"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
              <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors border border-transparent">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* EMR Body */}
          <div className="overflow-y-auto p-8 space-y-6 print:overflow-visible print:p-0 print:space-y-8 print:text-black flex-grow flex flex-col">
            {isLocked ? (
              <div className="flex-grow flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/25 text-destructive rounded-full">
                  <Lock className="w-10 h-10 animate-bounce" />
                </div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-wide">Historia Clínica y Fórmula Protegidas</h3>
                <p className="text-sm text-muted-foreground max-w-lg leading-relaxed font-medium">
                  De acuerdo con el flujo comercial y de auditoría de OptiSaaS, el acceso a la historia clínica y la fórmula de refracción médica del paciente <strong>{pacienteInfo.nombre} {pacienteInfo.apellido}</strong> requiere que la consulta sea marcada como <strong>Pagada/Facturada</strong> previamente en el POS.
                </p>
                <div className="bg-secondary/60 border border-border p-3.5 rounded-xl text-xs flex flex-col items-start gap-1.5 max-w-md text-left">
                  <p><span className="font-bold text-foreground">Paciente:</span> {pacienteInfo.nombre} {pacienteInfo.apellido}</p>
                  <p><span className="font-bold text-foreground">Identificación:</span> {pacienteInfo.tipoDocumento} {pacienteInfo.documento}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-normal italic">
                    * El asesor comercial no podrá visualizar la fórmula médica hasta que se registre el abono o pago total correspondiente al servicio clínico.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="bg-primary text-white hover:bg-blue-600 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-sm"
                >
                  Regresar al Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* Cabezote Institucional */}
                <div className="flex justify-between items-start border-b-2 pb-4" style={{ borderBottomColor: brandColor }}>
                  <div>
                    <h2 className="text-xl font-bold uppercase text-foreground print:text-black" style={{ color: brandColor }}>{empresa?.nombre || 'Ópticas Visión Total S.A.S'}</h2>
                    <p className="text-xs text-muted-foreground print:text-gray-600 font-medium">NIT: {empresa?.nit || '900.123.456-7'} | {activeSede?.nombre || 'Sede Norte'}: {activeSede?.direccion || 'Calle 127 # 14-54'}, {activeSede?.ciudad || 'Bogotá'}</p>
                    <p className="text-xs text-muted-foreground print:text-gray-600">Habilitación Salud: {activeSede?.habilitacionSalud || '11001-08234-01'} (Res. 3100 de 2019)</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/15 border border-success/30 rounded-full text-xs font-semibold text-success print:border-none print:bg-transparent print:text-black">
                      <Shield className="w-3.5 h-3.5" />
                      Registro Firmado y Cerrado
                    </span>
                    <p className="text-xs text-muted-foreground mt-1.5 print:text-gray-600 font-mono">
                      Fecha: {new Date(currentHc.fechaRegistro).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

            {/* 1. Datos Demográficos del Paciente */}
            <div className="bg-secondary/20 p-4 rounded-xl border border-border print:bg-transparent print:border-gray-300 print:rounded-none">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wide mb-3 flex items-center gap-1.5 print:text-black">
                <User className="w-4 h-4 text-primary print:hidden" />
                1. Información Demográfica
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block print:text-gray-500">Nombre Completo</span>
                  <span className="font-semibold">{pacienteInfo.nombre} {pacienteInfo.apellido}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block print:text-gray-500">Identificación</span>
                  <span className="font-semibold">{pacienteInfo.tipoDocumento} {pacienteInfo.documento}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block print:text-gray-500">Edad</span>
                  <span className="font-semibold">{getEdad(pacienteInfo.fechaNacimiento)} años ({pacienteInfo.fechaNacimiento})</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block print:text-gray-500">Aseguradora / EPS</span>
                  <span className="font-semibold">{pacienteInfo.eps || 'Particular'}</span>
                </div>
              </div>
            </div>

            {/* 2. Anamnesis y Antecedentes */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-border pb-1.5 print:text-black print:border-gray-300">
                2. Anamnesis y Antecedentes
              </h3>
              <div className="text-sm space-y-3">
                <div>
                  <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Motivo de Consulta:</span>
                  <p className="bg-secondary/10 p-2.5 rounded-lg border border-border/50 print:bg-transparent print:border-none print:p-0">
                    {currentHc.anamnesis.motivo}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-border/50 rounded-lg p-3 bg-secondary/5 print:bg-transparent print:border-none print:p-0">
                    <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Oculares Personales</span>
                    <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                      {currentHc.anamnesis.antecedentes.ocularesPersonales.map((ant, idx) => <li key={idx}>{ant}</li>)}
                    </ul>
                  </div>
                  <div className="border border-border/50 rounded-lg p-3 bg-secondary/5 print:bg-transparent print:border-none print:p-0">
                    <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Oculares Familiares</span>
                    <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                      {currentHc.anamnesis.antecedentes.ocularesFamiliares.map((ant, idx) => <li key={idx}>{ant}</li>)}
                    </ul>
                  </div>
                  <div className="border border-border/50 rounded-lg p-3 bg-secondary/5 print:bg-transparent print:border-none print:p-0">
                    <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Sistémicos Personales</span>
                    <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                      {currentHc.anamnesis.antecedentes.sistemicosPersonales.map((ant, idx) => <li key={idx}>{ant}</li>)}
                    </ul>
                  </div>
                </div>
                {currentHc.anamnesis.antecedentes.otros && (
                  <div>
                    <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Otros Antecedentes / Observaciones:</span>
                    <p className="text-xs mt-0.5 italic">{currentHc.anamnesis.antecedentes.otros}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Pruebas Preliminares */}
            {currentHc.pruebasPreliminares && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-border pb-1.5 print:text-black print:border-gray-300">
                  3. Pruebas Preliminares y Motilidad Ocular
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block print:text-gray-600">Cover Test (Lejos)</span>
                    <span className="font-semibold text-sm">{currentHc.pruebasPreliminares.coverTestLejos}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block print:text-gray-600">Cover Test (Cerca)</span>
                    <span className="font-semibold text-sm">{currentHc.pruebasPreliminares.coverTestCerca}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block print:text-gray-600">Reflejos Pupilares</span>
                    <span className="font-semibold text-sm">{currentHc.pruebasPreliminares.reflejosPupilares}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block print:text-gray-600">Motilidad Ocular</span>
                    <span className="font-semibold text-sm">{currentHc.pruebasPreliminares.motilidadOcular}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Examen Refractivo */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-border pb-1.5 print:text-black print:border-gray-300">
                4. Examen Refractivo Completo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Queratometría y Retinoscopía */}
                <div className="space-y-3 text-xs">
                  <div className="bg-secondary/10 p-3 rounded-lg border border-border/50 print:bg-transparent print:border-none print:p-0">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1 print:text-gray-600">Queratometría</span>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-[10px] text-muted-foreground block">OD</span><span className="font-mono">{currentHc.refraccion.queratometriaOD || 'No registrada'}</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">OI</span><span className="font-mono">{currentHc.refraccion.queratometriaOI || 'No registrada'}</span></div>
                    </div>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg border border-border/50 print:bg-transparent print:border-none print:p-0">
                    <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1 print:text-gray-600">Retinoscopía</span>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">OD</span>
                        <span className="font-mono">
                          {currentHc.refraccion.retinoscopiaOD ? `${currentHc.refraccion.retinoscopiaOD.esfera} / ${currentHc.refraccion.retinoscopiaOD.cilindro} x ${currentHc.refraccion.retinoscopiaOD.eje}` : 'No registrada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">OI</span>
                        <span className="font-mono">
                          {currentHc.refraccion.retinoscopiaOI ? `${currentHc.refraccion.retinoscopiaOI.esfera} / ${currentHc.refraccion.retinoscopiaOI.cilindro} x ${currentHc.refraccion.retinoscopiaOI.eje}` : 'No registrada'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lensometría (Lentes Actuales) */}
                <div className="bg-secondary/10 p-3 rounded-lg border border-border/50 text-xs print:bg-transparent print:border-none print:p-0">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-2 print:text-gray-600">Lensometría (Gafas Previas)</span>
                  <table className="w-full text-left font-mono">
                    <thead>
                      <tr className="border-b border-border/50 text-[10px] text-muted-foreground">
                        <th className="pb-1">Ojo</th>
                        <th className="pb-1">Esfera</th>
                        <th className="pb-1">Cilindro</th>
                        <th className="pb-1">Eje</th>
                        <th className="pb-1 text-right">AV (Lejos/Cerca)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr>
                        <td className="py-1 font-sans font-bold">OD</td>
                        <td>{currentHc.refraccion.lensometriaOD?.esfera || '--'}</td>
                        <td>{currentHc.refraccion.lensometriaOD?.cilindro || '--'}</td>
                        <td>{currentHc.refraccion.lensometriaOD?.eje ? `${currentHc.refraccion.lensometriaOD.eje}°` : '--'}</td>
                        <td className="text-right">{currentHc.refraccion.lensometriaOD?.avLejos || '--'} / {currentHc.refraccion.lensometriaOD?.avCerca || '--'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-sans font-bold">OI</td>
                        <td>{currentHc.refraccion.lensometriaOI?.esfera || '--'}</td>
                        <td>{currentHc.refraccion.lensometriaOI?.cilindro || '--'}</td>
                        <td>{currentHc.refraccion.lensometriaOI?.eje ? `${currentHc.refraccion.lensometriaOI.eje}°` : '--'}</td>
                        <td className="text-right">{currentHc.refraccion.lensometriaOI?.avLejos || '--'} / {currentHc.refraccion.lensometriaOI?.avCerca || '--'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refracción Subjetiva Final (Fórmula Principal) */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 print:bg-transparent print:border-gray-400 print:rounded-none">
                <span className="font-bold text-primary uppercase text-xs block mb-3 print:text-black">Fórmula Prescrita (Subjetivo Final)</span>
                <table className="w-full text-left font-mono text-sm">
                  <thead>
                    <tr className="border-b border-primary/20 text-xs text-muted-foreground print:text-gray-600">
                      <th className="pb-2 font-sans font-semibold">Ojo</th>
                      <th className="pb-2">Esfera</th>
                      <th className="pb-2">Cilindro</th>
                      <th className="pb-2">Eje</th>
                      <th className="pb-2">Adición</th>
                      <th className="pb-2 text-right font-sans font-semibold">AV Lejos</th>
                      <th className="pb-2 text-right font-sans font-semibold">AV Cerca</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-primary/10">
                      <td className="py-2.5 font-sans font-bold">OD (Ojo Derecho)</td>
                      <td className="font-semibold">{currentHc.refraccion.subjetivoOD.esfera}</td>
                      <td>{currentHc.refraccion.subjetivoOD.cilindro}</td>
                      <td>{currentHc.refraccion.subjetivoOD.eje ? `${currentHc.refraccion.subjetivoOD.eje}°` : '--'}</td>
                      <td>{currentHc.refraccion.subjetivoOD.adicion || '--'}</td>
                      <td className="text-right font-semibold">{currentHc.refraccion.subjetivoOD.avLejos}</td>
                      <td className="text-right">{currentHc.refraccion.subjetivoOD.avCerca}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-sans font-bold">OI (Ojo Izquierdo)</td>
                      <td className="font-semibold">{currentHc.refraccion.subjetivoOI.esfera}</td>
                      <td>{currentHc.refraccion.subjetivoOI.cilindro}</td>
                      <td>{currentHc.refraccion.subjetivoOI.eje ? `${currentHc.refraccion.subjetivoOI.eje}°` : '--'}</td>
                      <td>{currentHc.refraccion.subjetivoOI.adicion || '--'}</td>
                      <td className="text-right font-semibold">{currentHc.refraccion.subjetivoOI.avLejos}</td>
                      <td className="text-right">{currentHc.refraccion.subjetivoOI.avCerca}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-primary/10 text-muted-foreground print:text-gray-600">
                  <span>D.P. (Distancia Pupilar): <strong>{currentHc.refraccion.dp || 'No registrada'}</strong></span>
                </div>
              </div>
            </div>

            {/* 5. Examen Fisiológico y Salud Ocular */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-border pb-1.5 print:text-black print:border-gray-300">
                5. Salud Ocular y Fisiológica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Biomicroscopía (Segmento Anterior)</span>
                  <div className="grid grid-cols-1 gap-2">
                    <p className="bg-secondary/10 p-2.5 rounded-lg border border-border/50 text-xs print:bg-transparent print:border-none print:p-0 print:text-sm">
                      <strong>OD:</strong> {currentHc.saludOcular.biomicroscopiaOD}
                    </p>
                    <p className="bg-secondary/10 p-2.5 rounded-lg border border-border/50 text-xs print:bg-transparent print:border-none print:p-0 print:text-sm">
                      <strong>OI:</strong> {currentHc.saludOcular.biomicroscopiaOI}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-semibold block text-muted-foreground print:text-gray-600">Oftalmoscopía (Polo Posterior)</span>
                  <div className="grid grid-cols-1 gap-2">
                    <p className="bg-secondary/10 p-2.5 rounded-lg border border-border/50 text-xs print:bg-transparent print:border-none print:p-0 print:text-sm">
                      <strong>OD:</strong> {currentHc.saludOcular.oftalmoscopiaOD}
                    </p>
                    <p className="bg-secondary/10 p-2.5 rounded-lg border border-border/50 text-xs print:bg-transparent print:border-none print:p-0 print:text-sm">
                      <strong>OI:</strong> {currentHc.saludOcular.oftalmoscopiaOI}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-secondary/20 p-3 rounded-lg border border-border/50 text-xs flex gap-6 print:bg-transparent print:border-none print:p-0 print:text-sm print:gap-12">
                <div>
                  <span className="text-muted-foreground print:text-gray-600">Presión Intraocular OD:</span>{' '}
                  <strong className="text-foreground print:text-black">{currentHc.saludOcular.presionIntraocularOD ? `${currentHc.saludOcular.presionIntraocularOD} mmHg` : 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground print:text-gray-600">Presión Intraocular OI:</span>{' '}
                  <strong className="text-foreground print:text-black">{currentHc.saludOcular.presionIntraocularOI ? `${currentHc.saludOcular.presionIntraocularOI} mmHg` : 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* 6. Diagnóstico y Plan */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-primary uppercase tracking-wide border-b border-border pb-1.5 print:text-black print:border-gray-300">
                6. Diagnóstico y Plan de Manejo (CIE-10)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-secondary/10 p-3.5 rounded-xl border border-border/50 print:bg-transparent print:border-none print:p-0">
                  <span className="text-xs font-semibold block text-muted-foreground mb-1.5 print:text-gray-600">Diagnóstico Principal</span>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-xs font-bold print:border-none print:bg-transparent print:text-black">
                      {currentHc.diagnosticoPlan.cie10Principal}
                    </span>
                    <span className="font-semibold">{currentHc.diagnosticoPlan.cie10PrincipalNombre}</span>
                  </div>
                  {currentHc.diagnosticoPlan.cie10Secundario && (
                    <div className="flex gap-2 items-center mt-2.5">
                      <span className="font-mono bg-secondary px-2 py-0.5 rounded text-xs font-bold">
                        {currentHc.diagnosticoPlan.cie10Secundario}
                      </span>
                      <span className="text-muted-foreground">{currentHc.diagnosticoPlan.cie10SecundarioNombre}</span>
                    </div>
                  )}
                </div>
                <div className="bg-secondary/10 p-3.5 rounded-xl border border-border/50 print:bg-transparent print:border-none print:p-0">
                  <span className="text-xs font-semibold block text-muted-foreground mb-1 print:text-gray-600">Conducta y Plan de Tratamiento</span>
                  <p className="text-xs">{currentHc.diagnosticoPlan.planTratamiento}</p>
                </div>
              </div>
            </div>

            {/* 7. Recomendación Comercial (Hand-off) */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl print:bg-transparent print:border-gray-300 print:rounded-none">
              <span className="font-bold text-xs text-primary uppercase block mb-2.5 print:text-black">Recomendación Sugerida de Óptica (Hand-off)</span>
              <div className="grid grid-cols-3 gap-4 text-xs text-foreground">
                <div>
                  <span className="text-muted-foreground block print:text-gray-600">Material Sugerido:</span>
                  <span className="font-semibold">{currentHc.recomendacion.material}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block print:text-gray-600">Diseño Sugerido:</span>
                  <span className="font-semibold">{currentHc.recomendacion.diseno}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block print:text-gray-600">Tecnología:</span>
                  <span className="font-semibold">{currentHc.recomendacion.tipo}</span>
                </div>
              </div>
              {currentHc.recomendacion.sintomas && (
                <div className="mt-2.5 border-t border-primary/10 pt-2 text-xs">
                  <span className="text-muted-foreground block print:text-gray-600">Argumentos comerciales de salud recomendados:</span>
                  <p className="italic">{currentHc.recomendacion.sintomas}</p>
                </div>
              )}
            </div>

            {/* Firma Profesional */}
            <div className="flex justify-end pt-8 border-t border-border mt-8 print:border-gray-300">
              <div className="text-center w-64 space-y-1">
                <div className="border-b border-border/70 pb-1 font-mono text-sm italic text-muted-foreground flex flex-col items-center justify-center print:text-black">
                  <Shield className="w-5 h-5 text-primary mb-1 print:hidden" />
                  <span className="text-xs font-sans tracking-wide text-foreground print:text-black">FIRMADO DIGITALMENTE</span>
                  <span className="text-[10px] text-muted-foreground">ID: {currentHc.diagnosticoPlan.registroMedico}-{currentHc.pacienteId}</span>
                </div>
                <p className="font-bold text-sm">{currentHc.diagnosticoPlan.nombreProfesional}</p>
                <p className="text-xs text-muted-foreground print:text-gray-600">Optómetra U. de la Salle</p>
                <p className="text-[10px] font-semibold text-primary print:text-black bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                  Reg. Médico: {currentHc.diagnosticoPlan.registroMedico}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  </div>
</AnimatePresence>
  );
}
