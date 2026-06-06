'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  ClipboardList, 
  Stethoscope, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  BookOpen, 
  Signature 
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';
import { Garantia } from '@/lib/types';

export default function OptometraGarantiasPage() {
  const { garantias, updateGarantia, citas, ordenesTrabajo } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGarantia, setSelectedGarantia] = useState<Garantia | null>(null);

  // Form states for re-check
  const [aprobado, setAprobado] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  
  // Full structured formula states
  const [odEsfera, setOdEsfera] = useState('0.00');
  const [odCilindro, setOdCilindro] = useState('0.00');
  const [odEje, setOdEje] = useState('0');
  const [odAdicion, setOdAdicion] = useState('0.00');
  const [odAvLejos, setOdAvLejos] = useState('20/20');
  const [odAvCerca, setOdAvCerca] = useState('1.0M');

  const [oiEsfera, setOiEsfera] = useState('0.00');
  const [oiCilindro, setOiCilindro] = useState('0.00');
  const [oiEje, setOiEje] = useState('0');
  const [oiAdicion, setOiAdicion] = useState('0.00');
  const [oiAvLejos, setOiAvLejos] = useState('20/20');
  const [oiAvCerca, setOiAvCerca] = useState('1.0M');

  const [dpVal, setDpVal] = useState('60');

  // Symptoms Checklist States
  const [sintomasSelected, setSintomasSelected] = useState<string[]>([]);

  const SINTOMAS_OPCIONES = [
    'Disconfort visual / Fatiga ocular',
    'Mareos o distorsión espacial',
    'Visión borrosa de lejos',
    'Visión borrosa de cerca',
    'Dificultad en zona intermedia (Progresivos)',
    'Problemas de altura de montaje o centrado',
    'Aberraciones periféricas molestas'
  ];

  const toggleSintoma = (sintoma: string) => {
    setSintomasSelected(prev => 
      prev.includes(sintoma) ? prev.filter(s => s !== sintoma) : [...prev, sintoma]
    );
  };

  // Filter desadaptaciones that are pending or under check
  const clinicalWarranties = garantias.filter(g => 
    g.tipoGarantia === 'adaptacion-receta' && g.sedeId === 'sede1'
  );

  const filteredWarranties = clinicalWarranties.filter(g => 
    g.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmitRecheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGarantia || !observaciones) {
      toast.warning('Debe registrar las observaciones clínicas.');
      return;
    }

    const formattedOD = `Esf ${odEsfera} Cil ${odCilindro} Eje ${odEje}° Add ${odAdicion}`;
    const formattedOI = `Esf ${oiEsfera} Cil ${oiCilindro} Eje ${oiEje}° Add ${oiAdicion}`;

    const nuevaRefraccionEstructurada = {
      od: {
        esfera: odEsfera,
        cilindro: odCilindro,
        eje: odEje,
        adicion: odAdicion,
        avLejos: odAvLejos,
        avCerca: odAvCerca
      },
      oi: {
        esfera: oiEsfera,
        cilindro: oiCilindro,
        eje: oiEje,
        adicion: oiAdicion,
        avLejos: oiAvLejos,
        avCerca: oiAvCerca
      },
      dp: `${dpVal} mm`
    };

    const associatedOrder = ordenesTrabajo.find(o => o.id === selectedGarantia.ordenTrabajoId);
    let esDiferenteFormula = false;
    let esMismoOptometra = false;

    if (associatedOrder?.receta) {
      const origOD = associatedOrder.receta.od || '';
      const origOI = associatedOrder.receta.oi || '';
      const origAdd = associatedOrder.receta.adicion || '';
      const origDP = associatedOrder.receta.dp || '';

      const parseSphere = (str: string) => {
        const match = str.match(/Esf\s*([+-]?\d+\.?\d*)/i);
        return match ? parseFloat(match[1]).toFixed(2) : '0.00';
      };
      const parseCylinder = (str: string) => {
        const match = str.match(/Cil\s*([+-]?\d+\.?\d*)/i);
        return match ? parseFloat(match[1]).toFixed(2) : '0.00';
      };
      const parseAxis = (str: string) => {
        const match = str.match(/Eje\s*(\d+)/i);
        return match ? match[1] : '0';
      };

      const origSphOD = parseSphere(origOD);
      const origCylOD = parseCylinder(origOD);
      const origAxisOD = parseAxis(origOD);

      const origSphOI = parseSphere(origOI);
      const origCylOI = parseCylinder(origOI);
      const origAxisOI = parseAxis(origOI);

      const origAddVal = origAdd ? parseFloat(origAdd.replace('+', '')).toFixed(2) : '0.00';
      const newAddVal = parseFloat(odAdicion.replace('+', '')).toFixed(2);

      const origDPVal = origDP.replace(/[^0-9]/g, '');

      const sphODDiff = origSphOD && parseFloat(origSphOD).toFixed(2) !== parseFloat(odEsfera).toFixed(2);
      const cylODDiff = origCylOD && parseFloat(origCylOD).toFixed(2) !== parseFloat(odCilindro).toFixed(2);
      const axisODDiff = origAxisOD && origAxisOD !== odEje;

      const sphOIDiff = origSphOI && parseFloat(origSphOI).toFixed(2) !== parseFloat(oiEsfera).toFixed(2);
      const cylOIDiff = origCylOI && parseFloat(origCylOI).toFixed(2) !== parseFloat(oiCilindro).toFixed(2);
      const axisOIDiff = origAxisOI && origAxisOI !== oiEje;

      const addDiff = origAdd && origAddVal !== newAddVal;
      const dpDiff = origDP && origDPVal !== dpVal;

      if (sphODDiff || cylODDiff || axisODDiff || sphOIDiff || cylOIDiff || axisOIDiff || addDiff || dpDiff) {
        esDiferenteFormula = true;
      }
      
      const associatedCita = citas.find(c => c.id === associatedOrder.citaId);
      const originalOptometraId = associatedCita?.profesionalId;
      // We assume Silva ('usr3' in the component context) is the active optometrist
      esMismoOptometra = originalOptometraId === 'usr3';
    }

    const esGarantiaPorFormula = esDiferenteFormula && esMismoOptometra;

    const checkOptometra = {
      aprobado,
      observaciones,
      profesionalId: 'usr3', // Mock Dr. Silva
      profesionalNombre: 'Dra. Silva (Optómetra)',
      nuevaRefraccion: { od: formattedOD, oi: formattedOI },
      nuevaRefraccionEstructurada,
      sintomasChecklist: sintomasSelected,
      fecha: new Date().toISOString(),
      esDiferenteFormula,
      esMismoOptometra,
      esGarantiaPorFormula
    };

    updateGarantia(selectedGarantia.id, { 
      checkOptometra,
      estado: aprobado ? 'bajo-evaluacion' : 'rechazada'
    });

    setSelectedGarantia(null);
    setObservaciones('');
    setSintomasSelected([]);
    setOdEsfera('0.00');
    setOdCilindro('0.00');
    setOdEje('0');
    setOdAdicion('0.00');
    setOiEsfera('0.00');
    setOiCilindro('0.00');
    setOiEje('0');
    setOiAdicion('0.00');
    setDpVal('60');
    toast.success('Rechequeo clínico registrado y firmado digitalmente.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rechequeos de Garantías</h1>
        <p className="text-muted-foreground text-sm">Audita y dictamina las desadaptaciones de fórmula oftálmica de los pacientes.</p>
      </div>

      {/* Main List */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/15 rounded-t-xl">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por paciente o código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-6 py-3.5">ID Reclamación</th>
                <th className="px-6 py-3.5">Paciente</th>
                <th className="px-6 py-3.5">Lentes / Producto</th>
                <th className="px-6 py-3.5">Queja Clínica</th>
                <th className="px-6 py-3.5">Rechequeo Clínico</th>
                <th className="px-6 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {filteredWarranties.map((gar) => (
                <tr key={gar.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{gar.id}</td>
                  <td className="px-6 py-4 text-foreground font-bold">{gar.pacienteNombre}</td>
                  <td className="px-6 py-4 text-muted-foreground">{gar.productoNombre}</td>
                  <td className="px-6 py-4 text-xs max-w-xs truncate" title={gar.motivoDetalle}>
                    "{gar.motivoDetalle}"
                  </td>
                  <td className="px-6 py-4">
                    {gar.checkOptometra ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs font-bold bg-success/10 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning text-xs font-bold bg-warning/10 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3.5 h-3.5" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedGarantia(gar);
                        if (gar.checkOptometra) {
                          setAprobado(gar.checkOptometra.aprobado);
                          setObservaciones(gar.checkOptometra.observaciones);
                          setSintomasSelected(gar.checkOptometra.sintomasChecklist || []);
                          if (gar.checkOptometra.nuevaRefraccionEstructurada) {
                            setOdEsfera(gar.checkOptometra.nuevaRefraccionEstructurada.od.esfera);
                            setOdCilindro(gar.checkOptometra.nuevaRefraccionEstructurada.od.cilindro);
                            setOdEje(gar.checkOptometra.nuevaRefraccionEstructurada.od.eje);
                            setOdAdicion(gar.checkOptometra.nuevaRefraccionEstructurada.od.adicion || '0.00');
                            setOdAvLejos(gar.checkOptometra.nuevaRefraccionEstructurada.od.avLejos);
                            setOdAvCerca(gar.checkOptometra.nuevaRefraccionEstructurada.od.avCerca);

                            setOiEsfera(gar.checkOptometra.nuevaRefraccionEstructurada.oi.esfera);
                            setOiCilindro(gar.checkOptometra.nuevaRefraccionEstructurada.oi.cilindro);
                            setOiEje(gar.checkOptometra.nuevaRefraccionEstructurada.oi.eje);
                            setOiAdicion(gar.checkOptometra.nuevaRefraccionEstructurada.oi.adicion || '0.00');
                            setOiAvLejos(gar.checkOptometra.nuevaRefraccionEstructurada.oi.avLejos);
                            setOiAvCerca(gar.checkOptometra.nuevaRefraccionEstructurada.oi.avCerca);

                            setDpVal(gar.checkOptometra.nuevaRefraccionEstructurada.dp?.replace(/[^0-9]/g, '') || '60');
                          }
                        } else {
                          // Prefill from original prescription
                          const order = ordenesTrabajo.find(o => o.id === gar.ordenTrabajoId);
                          if (order?.receta) {
                            const parseSphere = (str: string) => {
                              const match = str.match(/Esf\s*([+-]?\d+\.?\d*)/i);
                              return match ? match[1] : '0.00';
                            };
                            const parseCylinder = (str: string) => {
                              const match = str.match(/Cil\s*([+-]?\d+\.?\d*)/i);
                              return match ? match[1] : '0.00';
                            };
                            const parseAxis = (str: string) => {
                              const match = str.match(/Eje\s*(\d+)/i);
                              return match ? match[1] : '0';
                            };
                            
                            setOdEsfera(parseSphere(order.receta.od));
                            setOdCilindro(parseCylinder(order.receta.od));
                            setOdEje(parseAxis(order.receta.od));
                            setOdAdicion(order.receta.adicion?.replace('+', '') || '0.00');
                            
                            setOiEsfera(parseSphere(order.receta.oi));
                            setOiCilindro(parseCylinder(order.receta.oi));
                            setOiEje(parseAxis(order.receta.oi));
                            setOiAdicion(order.receta.adicion?.replace('+', '') || '0.00');

                            setDpVal(order.receta.dp?.replace(/[^0-9]/g, '') || '60');
                          }
                        }
                      }}
                      className="bg-primary text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 float-right"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      {gar.checkOptometra ? 'Ver Rechequeo' : 'Iniciar Examen'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredWarranties.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground font-medium">
                    No hay solicitudes de desadaptación de fórmula pendientes de examen clínico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLINICAL RECHECK MODAL */}
      <AnimatePresence>
        {selectedGarantia && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-xl rounded-2xl shadow-2xl p-6 border border-border"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
                <h2 className="text-lg font-black flex items-center gap-1.5 text-foreground">
                  <Stethoscope className="w-5 h-5 text-purple-600" />
                  Valoración de Desadaptación Clínica
                </h2>
                <button 
                  onClick={() => setSelectedGarantia(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-secondary/15 p-3 rounded-xl border border-border text-xs mb-3">
                <p className="font-semibold text-foreground">Paciente: {selectedGarantia.pacienteNombre}</p>
                <p className="text-muted-foreground mt-1 leading-normal"><strong>Queja reportada:</strong> "{selectedGarantia.motivoDetalle}"</p>
              </div>

              {/* Legal Warning Notice: Resolution 1995/1999 */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[9px] text-amber-900 dark:text-amber-100">Cumplimiento Resolución 1995 de 1999</p>
                  Por ley de la República de Colombia, la historia clínica original no puede ser alterada ni sobreescrita. Este rechequeo se guardará como una **Nota de Evolución Aclaratoria** vinculada a la HC inicial, garantizando la integridad legal de los registros clínicos.
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmitRecheck}>

                
                {/* Checklist de Síntomas */}
                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-border space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-350">Checklist de Síntomas y Observaciones</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {SINTOMAS_OPCIONES.map((sin) => {
                      const isChecked = sintomasSelected.includes(sin);
                      return (
                        <label key={sin} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleSintoma(sin)}
                            disabled={!!selectedGarantia.checkOptometra}
                            className="rounded border-slate-300 text-purple-650 focus:ring-purple-500 w-3.5 h-3.5"
                          />
                          <span>{sin}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Refraction check forms (Structured Grid) */}
                <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20 space-y-3">
                  <h4 className="text-xs font-black uppercase text-purple-700">Nueva Fórmula de Refracción (Reajuste)</h4>
                  
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-xs font-mono text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-400 font-bold uppercase border-b border-purple-500/10">
                          <th className="pb-1.5 pr-2">Ojo</th>
                          <th className="pb-1.5 pr-2">Esfera (Sph)</th>
                          <th className="pb-1.5 pr-2">Cilindro (Cyl)</th>
                          <th className="pb-1.5 pr-2">Eje (Axis)</th>
                          <th className="pb-1.5 pr-2">Adición (Add)</th>
                          <th className="pb-1.5 pr-2">AV Lejos</th>
                          <th className="pb-1.5">AV Cerca</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/5 font-semibold text-slate-800 dark:text-slate-200">
                        {/* OD row */}
                        <tr>
                          <td className="py-2 pr-2 text-purple-600 font-bold">OD</td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={odEsfera} 
                              onChange={(e) => setOdEsfera(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={odCilindro} 
                              onChange={(e) => setOdCilindro(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={odEje} 
                              onChange={(e) => setOdEje(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-12 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={odAdicion} 
                              onChange={(e) => setOdAdicion(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={odAvLejos} 
                              onChange={(e) => setOdAvLejos(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="20/20"
                            />
                          </td>
                          <td className="py-2">
                            <input 
                              type="text" 
                              value={odAvCerca} 
                              onChange={(e) => setOdAvCerca(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="1.0M"
                            />
                          </td>
                        </tr>

                        {/* OI row */}
                        <tr>
                          <td className="py-2 pr-2 text-purple-600 font-bold">OI</td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={oiEsfera} 
                              onChange={(e) => setOiEsfera(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={oiCilindro} 
                              onChange={(e) => setOiCilindro(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={oiEje} 
                              onChange={(e) => setOiEje(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-12 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={oiAdicion} 
                              onChange={(e) => setOiAdicion(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              value={oiAvLejos} 
                              onChange={(e) => setOiAvLejos(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="20/20"
                            />
                          </td>
                          <td className="py-2">
                            <input 
                              type="text" 
                              value={oiAvCerca} 
                              onChange={(e) => setOiAvCerca(e.target.value)} 
                              disabled={!!selectedGarantia.checkOptometra}
                              className="w-14 px-1.5 py-1 border border-input rounded bg-background"
                              placeholder="1.0M"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="text-slate-500 font-bold">Distancia Pupilar (DP):</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="text" 
                        value={dpVal} 
                        onChange={(e) => setDpVal(e.target.value)} 
                        disabled={!!selectedGarantia.checkOptometra}
                        className="w-12 px-1.5 py-1 border border-input rounded bg-background text-center font-mono font-semibold"
                        placeholder="60"
                      />
                      <span className="text-slate-400 font-semibold">mm</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="text-muted-foreground font-bold block">Observaciones y Diagnóstico Clínico *</label>
                  <textarea
                    required
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Detalle por qué el paciente desadaptó de la fórmula previa y justificación médica..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-border">
                  <div className="text-xs">
                    <span className="font-bold text-foreground block">Veredicto Médico</span>
                    <span className="text-muted-foreground">¿Requiere cambio de lentes por desadaptación clínica?</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAprobado(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        aprobado ? 'bg-success/15 border-success text-success' : 'bg-background text-muted-foreground border-border'
                      }`}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAprobado(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        !aprobado ? 'bg-destructive/15 border-destructive text-destructive' : 'bg-background text-muted-foreground border-border'
                      }`}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>

                {/* Digital Signature Simulation */}
                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-5">
                  <button 
                    type="button" 
                    onClick={() => setSelectedGarantia(null)} 
                    className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cerrar
                  </button>
                  {!selectedGarantia.checkOptometra && (
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-md flex items-center gap-1.5"
                    >
                      <Signature className="w-4 h-4" />
                      Firmar y Registrar Rechequeo
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
