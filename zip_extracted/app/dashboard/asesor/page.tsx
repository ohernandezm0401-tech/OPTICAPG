'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DollarSign, UserPlus, Package, CreditCard, Clock, FileText, Check, ArrowRight, UserCheck, AlertTriangle, Lock, Unlock, LogOut, Receipt, Coins, X, Printer, MessageSquare, Activity, Tag } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { NuevoPacienteModal } from '@/components/shared/nuevo-paciente-modal';
import { HistoriaClinicaViewModal } from '@/components/shared/historia-clinica-view-modal';
import { Paciente, Cita, RecomendacionClinica, TransaccionCaja } from '@/lib/types';
import { toast } from '@/lib/toast-store';

export default function AsesorDashboardPage() {
  const router = useRouter();
  const { 
    citas, 
    pacientes, 
    updateCitaStatus, 
    cajaSesionActiva, 
    abrirCaja, 
    cerrarCaja, 
    registrarTransaccionCaja,
    whatsappSedesConectadas,
    setSedeWhatsappConnected
  } = useClinicStore();

  // Cash Opening & Closing States
  const [baseVal, setBaseVal] = useState('150000');
  const [aperturaObsVal, setAperturaObsVal] = useState('');
  const [showCierre, setShowCierre] = useState(false);
  const [cierreObsVal, setCierreObsVal] = useState('');

  // Denomination States for Closing Breakdown (Moneda Colombiana)
  const [billetesCierre, setBilletesCierre] = useState<{
    100000: number;
    50000: number;
    20000: number;
    10000: number;
    5000: number;
    2000: number;
  }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0
  });

  const [monedasCierre, setMonedasCierre] = useState<{
    1000: number;
    500: number;
    200: number;
    100: number;
    50: number;
  }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0
  });

  const [vouchersCierre, setVouchersCierre] = useState('0');
  const [otrosCierre, setOtrosCierre] = useState('0');
  const [lastClosedSession, setLastClosedSession] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'gafas' | 'primer-contacto' | 'confirmacion-cita' | 'alerta-clinica' | 'crm'>('all');
  const isWsConnected = whatsappSedesConectadas['sede1'];
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrProgress, setQrProgress] = useState(0);

  const totalBilletes = 
    (billetesCierre[100000] * 100000) +
    (billetesCierre[50000] * 50000) +
    (billetesCierre[20000] * 20000) +
    (billetesCierre[10000] * 10000) +
    (billetesCierre[5000] * 5000) +
    (billetesCierre[2000] * 2000);

  const totalMonedas = 
    (monedasCierre[1000] * 1000) +
    (monedasCierre[500] * 500) +
    (monedasCierre[200] * 200) +
    (monedasCierre[100] * 100) +
    (monedasCierre[50] * 50);

  const totalEfectivoContado = totalBilletes + totalMonedas;

  const handleAutocompletar = () => {
    let remaining = cajaSesionActiva?.montoCierreCalculado || 0;
    const billsList = [100000, 50000, 20000, 10000, 5000, 2000];
    const coinsList = [1000, 500, 200, 100, 50];
    
    const newBilletes = { 100000: 0, 50000: 0, 20000: 0, 10000: 0, 5000: 0, 2000: 0 };
    const newMonedas = { 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0 };
    
    for (const b of billsList) {
      const count = Math.floor(remaining / b);
      newBilletes[b as keyof typeof newBilletes] = count;
      remaining -= count * b;
    }
    
    for (const c of coinsList) {
      const count = Math.floor(remaining / c);
      newMonedas[c as keyof typeof newMonedas] = count;
      remaining -= count * c;
    }
    
    setBilletesCierre(newBilletes);
    setMonedasCierre(newMonedas);

    const totalVouchersEsperado = cajaSesionActiva?.transacciones
      .filter(t => t.metodoPago === 'TARJETA')
      .reduce((sum, t) => sum + t.monto, 0) || 0;

    const totalOtrosEsperado = cajaSesionActiva?.transacciones
      .filter(t => t.metodoPago === 'TRANSFERENCIA')
      .reduce((sum, t) => sum + t.monto, 0) || 0;

    setVouchersCierre(totalVouchersEsperado.toString());
    setOtrosCierre(totalOtrosEsperado.toString());
  };

  // Petty Expense States
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoDesc, setGastoDesc] = useState('');

  // Modal Open States
  const [isNuevoPacienteOpen, setIsNuevoPacienteOpen] = useState(false);
  const [isHcViewOpen, setIsHcViewOpen] = useState(false);

  // Selected Data States for Modals
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);

  // Pricing helper based on optometrist recommendations
  const calcularPrecioSugerido = (recom: RecomendacionClinica | undefined) => {
    if (!recom) return 150000; // Base consult price
    let base = 120000;
    
    // Material
    if (recom.material?.includes('Policarbonato')) base += 160000;
    else if (recom.material?.includes('Trivex')) base += 260000;
    else if (recom.material?.includes('Alto')) base += 530000;

    // Diseño
    if (recom.diseno?.includes('Progresivo')) base += 200000;
    else if (recom.diseno?.includes('Bifocal')) base += 100000;
    else if (recom.diseno?.includes('Ocupacional')) base += 150000;

    // Tecnología
    if (recom.tipo?.includes('Free Form')) base += 180000;
    else if (recom.tipo?.includes('Tallado')) base += 80000;

    return base;
  };

  // State to hold custom pricing if advisor edits it
  const [editingCitaId, setEditingCitaId] = useState<string | null>(null);
  const [customPrice, setCustomPrice] = useState<string>('');

  // Filter appointments for active Sede (sede1)
  const citasHoy = citas.filter(c => c.sedeId === 'sede1');

  // Metrics Calculations
  const totalVentas = citasHoy
    .filter(c => c.estadoComercial === 'pagado')
    .reduce((sum, c) => sum + (c.montoCobrado || 0), 0);

  const totalEfectivo = citasHoy
    .filter(c => c.estadoComercial === 'pagado' && c.metodoPago === 'EFECTIVO')
    .reduce((sum, c) => sum + (c.montoCobrado || 0), 0);

  const totalTarjeta = citasHoy
    .filter(c => c.estadoComercial === 'pagado' && c.metodoPago === 'TARJETA')
    .reduce((sum, c) => sum + (c.montoCobrado || 0), 0);

  const atendidosCount = citasHoy.filter(c => c.estadoComercial === 'pagado' || c.estadoComercial === 'cotizando').length;

  const handleOpenCheckout = (cita: Cita, paciente: Paciente) => {
    router.push(`/dashboard/asesor/ventas?patientId=${paciente.id}`);
  };

  const handleOpenFormula = (cita: Cita, paciente: Paciente) => {
    setSelectedCita(cita);
    setSelectedPaciente(paciente);
    setIsHcViewOpen(true);
  };

  const handleAbrirCajaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const base = parseFloat(baseVal);
    if (isNaN(base) || base < 0) {
      toast.error('Ingrese un monto base válido.');
      return;
    }
    abrirCaja('carlos-asesor', 'Carlos (Asesor)', base, aperturaObsVal || undefined);
    setAperturaObsVal('');
    toast.success(`Caja abierta con éxito. Base: $ ${base.toLocaleString('es-CO')}`);
  };

  const handleCerrarCajaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalEfectivo = totalEfectivoContado;
    const vouchersVal = parseFloat(vouchersCierre) || 0;
    const otrosVal = parseFloat(otrosCierre) || 0;

    const desgloseObj = {
      billetes: {
        100000: billetesCierre[100000] || 0,
        50000: billetesCierre[50000] || 0,
        20000: billetesCierre[20000] || 0,
        10000: billetesCierre[10000] || 0,
        5000: billetesCierre[5000] || 0,
        2000: billetesCierre[2000] || 0,
      },
      monedas: {
        1000: monedasCierre[1000] || 0,
        500: monedasCierre[500] || 0,
        200: monedasCierre[200] || 0,
        100: monedasCierre[100] || 0,
        50: monedasCierre[50] || 0,
      },
      vouchers: vouchersVal,
      otros: otrosVal,
    };

    if (cajaSesionActiva) {
      const calculado = cajaSesionActiva.montoCierreCalculado || cajaSesionActiva.montoApertura;
      const diferencia = totalEfectivo - calculado;

      const sessionCopy = {
        ...cajaSesionActiva,
        fechaCierre: new Date().toISOString(),
        montoCierreDeclarado: totalEfectivo,
        diferencia,
        desglose: desgloseObj,
        observaciones: cierreObsVal || cajaSesionActiva.observaciones || 'Cierre de turno estándar sin novedades.'
      };
      
      setLastClosedSession(sessionCopy);
    }

    cerrarCaja(totalEfectivo, cierreObsVal || undefined, desgloseObj);
    setSedeWhatsappConnected('sede1', false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch('http://localhost:3002/instance/logout/optica_sede_norte', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      toast.success('WhatsApp Business desconectado con éxito de la sucursal.');
    } catch (err) {
      console.warn('WhatsApp Gateway local no responde o está inactivo. Sesión cerrada localmente.');
    }

    // Reset states
    setBilletesCierre({
      100000: 0,
      50000: 0,
      20000: 0,
      10000: 0,
      5000: 0,
      2000: 0
    });
    setMonedasCierre({
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
      50: 0
    });
    setVouchersCierre('0');
    setOtrosCierre('0');
    setCierreObsVal('');
    setShowCierre(false);
    setShowReportModal(true);
    toast.success('Caja cerrada con éxito. Visualizando reporte detallado.');
  };

  const isCajaCerrada = !cajaSesionActiva || cajaSesionActiva.estado !== 'abierta';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 relative">
      
      {/* Block screen overlay if Cash Box is closed */}
      {isCajaCerrada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md transition-all">
          <div className="bg-card border border-border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3.5 bg-destructive/15 text-destructive rounded-full border border-destructive/20 animate-pulse">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">Apertura de Caja Obligatoria</h2>
              <p className="text-xs text-muted-foreground">
                Para iniciar la jornada comercial y realizar cobros POS u órdenes de laboratorio, debe abrir la caja chica con una base en efectivo.
              </p>
            </div>

            <form onSubmit={handleAbrirCajaSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground block flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  Efectivo Base en Caja (COP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono font-bold">$</span>
                  <input
                    type="number"
                    value={baseVal}
                    onChange={(e) => setBaseVal(e.target.value)}
                    required
                    className="w-full bg-background border border-input rounded-xl pl-8 pr-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary font-bold text-foreground"
                    placeholder="150000"
                  />
                </div>
                <div className="flex gap-2">
                  {['100000', '150000', '200000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBaseVal(val)}
                      className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-xs font-bold transition-all text-muted-foreground hover:text-foreground"
                    >
                      $ {Number(val).toLocaleString('es-CO')}
                    </button>
                  ))}
                </div>
              </div>

              {/* WhatsApp Connection Verification block */}
              <div className="bg-secondary/35 p-3 rounded-xl border border-border/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                    WhatsApp Business (Sede)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                    isWsConnected
                      ? 'bg-success/15 text-success border-success/30'
                      : 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
                  }`}>
                    {isWsConnected ? 'Enlazado' : 'Desconectado'}
                  </span>
                </div>
                
                {isWsConnected ? (
                  <p className="text-[10px] text-muted-foreground">
                    ✓ Instancia vinculada para la **Sucursal Norte**. Listo para notificar clientes.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-destructive font-semibold">
                      ⚠ Debe enlazar el WhatsApp de la sede antes de aperturar operaciones.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowQrModal(true);
                        setQrProgress(0);
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Escanear Código QR de Vinculación
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground block">
                  Observaciones de Apertura
                </label>
                <textarea
                  value={aperturaObsVal}
                  onChange={(e) => setAperturaObsVal(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary min-h-[60px] text-foreground"
                  placeholder="Ej: Base de caja entregada por Administrador. Todo en orden."
                />
              </div>

              <button
                type="submit"
                disabled={!isWsConnected}
                className={`w-full font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  isWsConnected
                    ? 'bg-primary hover:bg-blue-600 text-white'
                    : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                }`}
              >
                <Unlock className="w-4 h-4" />
                {isWsConnected ? 'Abrir Caja e Iniciar Turno' : 'Bloqueado - Conecte WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Comercial</h1>
          <p className="text-muted-foreground text-sm">Gestión de flujo de pacientes, órdenes de trabajo y ventas en caja.</p>
        </div>
        <button 
          onClick={() => setIsNuevoPacienteOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Paciente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main pane (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Patient Queue Table */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/50">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Cola de Pacientes del Día
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 bg-secondary rounded-full text-muted-foreground">
                HOY: {citasHoy.length} PACIENTES
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/40">
                  <tr>
                    <th className="px-4 py-3 rounded-l-xl">Hora / Prioridad</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right rounded-r-xl">Acciones de Flujo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {citasHoy.map((cita) => {
                    const pac = pacientes.find(p => p.id === cita.pacienteId);
                    if (!pac) return null;

                    const formattedHora = new Date(cita.fechaHora).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });

                    return (
                      <tr key={cita.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-semibold font-mono text-foreground">{formattedHora}</div>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            cita.prioridad === 'urgente' ? 'bg-destructive/15 text-destructive border border-destructive/25' :
                            cita.prioridad === 'alta' ? 'bg-warning/15 text-warning border border-warning/25' :
                            'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            {cita.prioridad}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground">{pac.apellido}, {pac.nombre}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            CC {Number(pac.documento).toLocaleString('es-CO')}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={cita.estadoComercial} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            
                            {/* Actions based on Commercial Status */}
                            {cita.estadoComercial === 'por-llegar' && (
                              <button 
                                onClick={() => updateCitaStatus(cita.id, 'en-sala')}
                                className="bg-primary/10 text-primary hover:bg-primary border border-primary/20 hover:text-primary-foreground px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Registrar Llegada
                              </button>
                            )}

                            {cita.estadoComercial === 'en-sala' && (
                              <button 
                                onClick={() => updateCitaStatus(cita.id, 'en-consulta')}
                                className="bg-success/15 text-success hover:bg-success hover:text-success-foreground border border-success/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                Enviar a Consulta <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {cita.estadoComercial === 'en-consulta' && (
                              <span className="text-xs text-muted-foreground italic flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-xl">
                                <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></span>
                                En consultorio con Dra. Silva
                              </span>
                            )}

                            {cita.estadoComercial === 'cotizando' && (
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                <button 
                                  onClick={() => {
                                    toast.error('Visualización protegida: El cliente debe pagar la consulta antes de poder ver la fórmula u hoja de historia clínica.');
                                  }}
                                  className="text-xs text-muted-foreground/60 hover:text-destructive font-semibold flex items-center gap-1 bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/60 cursor-not-allowed transition-colors"
                                >
                                  <Lock className="w-3.5 h-3.5 text-destructive" /> Ver Fórmula
                                </button>
                                
                                {editingCitaId === cita.id ? (
                                  <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                    <span className="text-xs font-bold text-foreground">$</span>
                                    <input 
                                      type="number" 
                                      value={customPrice} 
                                      onChange={(e) => setCustomPrice(e.target.value)}
                                      className="w-20 px-2 py-1 bg-background border border-primary rounded text-xs font-mono"
                                      placeholder="Monto"
                                    />
                                    <button 
                                      onClick={() => handleOpenCheckout(cita, pac)}
                                      className="bg-primary text-primary-foreground p-1 rounded hover:bg-blue-600 transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingCitaId(null)}
                                      className="bg-secondary text-foreground p-1 rounded hover:bg-secondary/80 border border-border text-xs"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <button 
                                      onClick={() => {
                                        setEditingCitaId(cita.id);
                                        setCustomPrice(calcularPrecioSugerido(cita.recomendacion).toString());
                                      }}
                                      className="text-[10px] text-primary hover:underline font-semibold"
                                    >
                                      Editar Precio
                                    </button>
                                    <button 
                                      onClick={() => handleOpenCheckout(cita, pac)}
                                      className="bg-primary text-primary-foreground hover:bg-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" /> Cobrar POS ($ {calcularPrecioSugerido(cita.recomendacion).toLocaleString('es-CO')})
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {cita.estadoComercial === 'pagado' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-success font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Pagado ($ {cita.montoCobrado?.toLocaleString('es-CO')})
                                </span>
                                <button 
                                  onClick={() => handleOpenFormula(cita, pac)}
                                  className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 bg-secondary px-2.5 py-1.5 rounded-lg border border-border"
                                >
                                  <FileText className="w-3 h-3" /> Ver HC / Factura
                                </button>
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {citasHoy.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No hay citas agendadas para hoy en esta sucursal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entregas Pendientes */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Entregas de Laboratorio Pendientes</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl"><Package className="w-4 h-4 text-primary" /></div>
                    <div>
                      <div className="font-bold text-sm text-foreground">Orden de Tallado #4829</div>
                      <div className="text-xs text-muted-foreground">Paciente: Maria Isabel García. Policarbonato.</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-warning/15 text-warning border border-warning/20 px-2 py-0.5 rounded">
                    En Laboratorio
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2.5 rounded-xl"><Package className="w-4 h-4 text-primary" /></div>
                    <div>
                      <div className="font-bold text-sm text-foreground">Gafas Listas #4812</div>
                      <div className="text-xs text-muted-foreground">Paciente: Juan Carlos Restrepo. Antirreflejo.</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded">
                    Listo para Entrega
                  </span>
                </div>
              </div>
            </div>
            {/* Caja Chica (Dinero Físico en Caja) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Caja Chica - Turno Activo
                  </h3>
                  {cajaSesionActiva && (
                    <span className="text-[10px] font-bold bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></span>
                      Abierta
                    </span>
                  )}
                </div>
                {cajaSesionActiva ? (
                  <>
                    <div className="text-xl font-extrabold text-success mt-2 flex items-center gap-1.5">
                      <Unlock className="w-5 h-5 text-success" />
                      Turno Comercial Activo
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Operador: <strong className="text-foreground">{cajaSesionActiva.usuarioNombre}</strong> (Desde: {new Date(cajaSesionActiva.fechaApertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })})
                    </p>
                    
                    {/* Petty cash quick view */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-secondary/40 p-2 rounded-xl">
                        <span className="text-muted-foreground block font-medium">Base Inicial</span>
                        <strong className="text-foreground font-mono text-xs">$ {cajaSesionActiva.montoApertura.toLocaleString('es-CO')}</strong>
                      </div>
                      <div className="bg-secondary/40 p-2 rounded-xl">
                        <span className="text-muted-foreground block font-medium">Operaciones</span>
                        <strong className="text-foreground font-mono text-xs">
                          {cajaSesionActiva.transacciones.filter(t => t.tipo !== 'base').length} Realizadas
                        </strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm flex flex-col items-center gap-1">
                    <Lock className="w-6 h-6 text-destructive opacity-40" />
                    <span className="font-semibold text-xs">Sin Turno Activo</span>
                    <span className="text-[10px] text-muted-foreground">La caja debe abrirse para iniciar operaciones.</span>
                  </div>
                )}
              </div>

              {cajaSesionActiva && (
                <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-2">
                  {/* Petty expense form toggler */}
                  {showGastoForm ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const monto = parseFloat(gastoMonto);
                      if (isNaN(monto) || monto <= 0 || !gastoDesc) {
                        toast.error('Complete el monto y descripción del gasto.');
                        return;
                      }
                      registrarTransaccionCaja('egreso-gasto', monto, 'EFECTIVO', gastoDesc);
                      setGastoMonto('');
                      setGastoDesc('');
                      setShowGastoForm(false);
                      toast.success(`Gasto registrado: $ ${monto.toLocaleString('es-CO')} por "${gastoDesc}"`);
                    }} className="space-y-2 p-2.5 bg-secondary/35 rounded-xl border border-border animate-in slide-in-from-bottom-2">
                      <div className="text-[10px] font-bold text-foreground">REGISTRAR EGRESO DE CAJA</div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={gastoMonto}
                          onChange={(e) => setGastoMonto(e.target.value)}
                          placeholder="Monto"
                          className="col-span-1 px-2 py-1 bg-background border border-border rounded text-[10px] font-mono text-foreground"
                        />
                        <input
                          type="text"
                          value={gastoDesc}
                          onChange={(e) => setGastoDesc(e.target.value)}
                          placeholder="Ej: Café / Papel"
                          className="col-span-2 px-2 py-1 bg-background border border-border rounded text-[10px] text-foreground"
                        />
                      </div>
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setShowGastoForm(false)} className="text-[9px] bg-secondary hover:bg-secondary/80 px-2 py-1 rounded text-foreground">Cancelar</button>
                        <button type="submit" className="text-[9px] bg-primary text-white hover:bg-blue-600 px-2 py-1 rounded font-bold">Registrar</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => setShowGastoForm(true)}
                        className="flex-1 py-1.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-[10px] font-bold transition-all text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                      >
                        <Receipt className="w-3 h-3 text-primary" />
                        Gasto Menor
                      </button>
                      <button
                        onClick={() => {
                          setShowCierre(true);
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <LogOut className="w-3 h-3" />
                        Cerrar Caja
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right pane (1/3 width sidebar) */}
        <div className="space-y-6">
          
          {/* Canal de Notificaciones (WhatsApp) Sidebar Widget */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Canal de Comunicaciones</h3>
                <span className="text-sm font-extrabold text-foreground">WhatsApp Business Sede</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${
                isWsConnected
                  ? 'bg-success/15 text-success border-success/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse'
              }`}>
                {isWsConnected ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              <div className="flex justify-between items-center bg-secondary/35 p-2 rounded-xl border border-border/40">
                <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary" /> Notificaciones Gafas</span>
                <strong className="text-foreground font-mono bg-background px-2 py-0.5 rounded border border-border/80">
                  {cajaSesionActiva?.comunicaciones?.mensajesGafas || 0}
                </strong>
              </div>
              <div className="flex justify-between items-center bg-secondary/35 p-2 rounded-xl border border-border/40">
                <span className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5 text-success" /> Bienvenidos / Nuevos</span>
                <strong className="text-foreground font-mono bg-background px-2 py-0.5 rounded border border-border/80">
                  {cajaSesionActiva?.comunicaciones?.primerosContactos || 0}
                </strong>
              </div>
              <div className="flex justify-between items-center bg-secondary/35 p-2 rounded-xl border border-border/40">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> Citas Confirmadas</span>
                <strong className="text-foreground font-mono bg-background px-2 py-0.5 rounded border border-border/80">
                  {cajaSesionActiva?.comunicaciones?.confirmacionesCitas || 0}
                </strong>
              </div>
            </div>

            {!isWsConnected && (
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(true);
                  setQrProgress(0);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Vincular Dispositivo QR
              </button>
            )}
          </div>

          {/* Alertas regulatorias */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Alertas Regulatorias Sede Norte
            </h3>
            <div className="space-y-3.5">
              <div className="border-l-4 border-primary pl-3 text-xs space-y-0.5">
                <p className="font-bold text-foreground">Recordatorio Legal</p>
                <p className="text-[11px] text-muted-foreground">Órdenes de trabajo con CIE-10 asignado deben enviarse a laboratorio en un máximo de 30 días.</p>
              </div>
              <div className="border-l-4 border-warning pl-3 text-xs space-y-0.5">
                <p className="font-bold text-foreground">Consumo de Folios DIAN</p>
                <p className="text-[11px] text-muted-foreground">Sede Norte: 852 folios emitidos de 1000 habilitados en resolución.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modals integration */}
      <NuevoPacienteModal 
        isOpen={isNuevoPacienteOpen}
        onClose={() => setIsNuevoPacienteOpen(false)}
      />

      {selectedPaciente && (
        <HistoriaClinicaViewModal 
          isOpen={isHcViewOpen}
          onClose={() => {
            setIsHcViewOpen(false);
            setSelectedCita(null);
            setSelectedPaciente(null);
          }}
          hc={selectedCita?.historiaClinica}
          pacienteInfo={selectedPaciente}
          citaEstadoComercial={selectedCita?.estadoComercial}
        />
      )}

      {/* Modal Cierre de Caja (Arqueo y Arrendamiento) */}
      {showCierre && cajaSesionActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <LogOut className="w-5 h-5 text-destructive" />
                Cierre de Caja y Arqueo Técnico
              </h3>
              <button 
                onClick={() => setShowCierre(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-secondary/40 p-4 rounded-xl border border-border/50 space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Operador de Turno:</span>
                <span className="font-bold text-foreground">{cajaSesionActiva.usuarioNombre}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fecha Apertura:</span>
                <span className="font-mono text-foreground">{new Date(cajaSesionActiva.fechaApertura).toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Base de Apertura:</span>
                <span className="font-mono text-foreground font-bold">$ {cajaSesionActiva.montoApertura.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Operaciones Registradas:</span>
                <span className="font-mono text-foreground font-bold">{cajaSesionActiva.transacciones.filter(t => t.tipo !== 'base').length} transacciones</span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg text-[10px] text-amber-600 dark:text-amber-400 font-semibold leading-normal flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  <strong>Cierre a Ciegas Activo:</strong> Ingrese la cantidad física real de billetes, monedas y comprobantes en caja. Los totales calculados por el sistema y las diferencias se enviarán al Administrador para su validación.
                </span>
              </div>
            </div>

            <form onSubmit={handleCerrarCajaSubmit} className="space-y-4">
              <div className="border border-border/80 rounded-xl p-3 space-y-3 bg-background">
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Billetes Section */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase text-primary tracking-wider block border-b border-border pb-1">
                      Billetes (COP)
                    </label>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {[100000, 50000, 20000, 10000, 5000, 2000].map((denom) => (
                        <div key={denom} className="flex items-center justify-between gap-1.5 bg-secondary/30 p-1.5 rounded-lg border border-border/40">
                          <span className="text-[10px] font-bold text-foreground font-mono">$ {denom.toLocaleString('es-CO')}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">x</span>
                            <input
                              type="number"
                              min="0"
                              value={billetesCierre[denom as keyof typeof billetesCierre] || ''}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setBilletesCierre(prev => ({ ...prev, [denom]: val }));
                              }}
                              className="w-12 px-1 py-0.5 text-center bg-background border border-input rounded text-[10px] font-mono text-foreground font-bold"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-right text-muted-foreground font-semibold">
                      Billetes: <span className="text-foreground font-mono font-bold">$ {totalBilletes.toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                  {/* Monedas Section */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-extrabold uppercase text-amber-500 tracking-wider block border-b border-border pb-1">
                      Monedas (COP)
                    </label>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {[1000, 500, 200, 100, 50].map((denom) => (
                        <div key={denom} className="flex items-center justify-between gap-1.5 bg-secondary/30 p-1.5 rounded-lg border border-border/40">
                          <span className="text-[10px] font-bold text-foreground font-mono">$ {denom.toLocaleString('es-CO')}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">x</span>
                            <input
                              type="number"
                              min="0"
                              value={monedasCierre[denom as keyof typeof monedasCierre] || ''}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setMonedasCierre(prev => ({ ...prev, [denom]: val }));
                              }}
                              className="w-12 px-1 py-0.5 text-center bg-background border border-input rounded text-[10px] font-mono text-foreground font-bold"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-right text-muted-foreground font-semibold">
                      Monedas: <span className="text-foreground font-mono font-bold">$ {totalMonedas.toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                </div>

                {/* Vouchers and Electronic Payments */}
                <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Vouchers Tarjetas (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={vouchersCierre}
                        onChange={(e) => setVouchersCierre(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg pl-6 pr-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-primary font-bold text-foreground"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Transferencias (COP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={otrosCierre}
                        onChange={(e) => setOtrosCierre(e.target.value)}
                        className="w-full bg-background border border-input rounded-lg pl-6 pr-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-primary font-bold text-foreground"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic total display */}
                <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg flex justify-between items-center text-xs font-bold mt-2">
                  <span className="text-[10px] text-muted-foreground uppercase">Total Efectivo Arqueado:</span>
                  <span className="font-mono font-black text-primary text-sm">$ {totalEfectivoContado.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Dynamic difference calculator removed for Advisor blind close */}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground block">
                  Observaciones de Cierre
                </label>
                <textarea
                  value={cierreObsVal}
                  onChange={(e) => setCierreObsVal(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary min-h-[60px] text-foreground"
                  placeholder="Ej: Caja cerrada sin descuadres, remesa lista para consignar."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCierre(false)}
                  className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 py-3 rounded-xl text-xs font-bold border border-border"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Confirmar y Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reporte Diario de Operaciones y Contacto (Cierre de Caja Detallado) */}
      {showReportModal && lastClosedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in-20 print:bg-white print:p-0">
          <div className="bg-card border border-border w-full max-w-2xl p-6 rounded-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 print:max-h-full print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none print:bg-white print-ticket-only">
            
            {/* Cabezote del Reporte (Ticket) */}
            <div className="text-center pb-4 border-b border-border/80 space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center justify-center gap-1.5 print:text-lg">
                👁️ OptiSaaS — Reporte de Turno
              </h2>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest font-mono">
                Informe Operativo y de Comunicaciones
              </p>
              <div className="text-[11px] font-mono text-muted-foreground space-y-0.5 mt-2">
                <div><strong>Turno ID:</strong> {lastClosedSession.id}</div>
                <div><strong>Operador:</strong> {lastClosedSession.usuarioNombre}</div>
                <div><strong>Sede:</strong> Sucursal Norte (Bogotá)</div>
                <div><strong>Apertura:</strong> {new Date(lastClosedSession.fechaApertura).toLocaleString('es-CO')}</div>
                <div><strong>Cierre:</strong> {new Date(lastClosedSession.fechaCierre).toLocaleString('es-CO')}</div>
              </div>
            </div>

            {/* Contenido Principal - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* Columna Izquierda: Estatus de Arqueo a Ciegas y Desglose Declarado */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
                    🔒 Estado de Arqueo a Ciegas
                  </h4>
                  <div className="bg-secondary/45 p-3 rounded-xl border border-border text-xs leading-relaxed space-y-2.5">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-success" />
                      Arqueo Registrado Exitosamente
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      El arqueo físico se ha registrado bajo la modalidad de **Cierre a Ciegas**. Los saldos calculados por el sistema y las diferencias se han transmitido al perfil de Administración para su auditoría y conciliación final.
                    </p>
                    <div className="text-[11px] font-mono border-t border-border/60 pt-2 space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Base de Apertura:</span>
                        <strong className="text-foreground font-semibold">$ {lastClosedSession.montoApertura.toLocaleString('es-CO')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Efectivo Declarado:</span>
                        <strong className="text-foreground font-semibold">$ {lastClosedSession.montoCierreDeclarado.toLocaleString('es-CO')}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desglose de Moneda Física */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    🪙 Arqueo Físico (Efectivo)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="space-y-1">
                      <span className="font-bold text-primary block">Billetes:</span>
                      {Object.entries(lastClosedSession.desglose?.billetes || {}).map(([denom, cant]: any) => 
                        cant > 0 ? (
                          <div key={denom} className="flex justify-between bg-secondary/30 px-2 py-0.5 rounded border border-border/20">
                            <span>${Number(denom).toLocaleString('es-CO')}</span>
                            <strong>x{cant}</strong>
                          </div>
                        ) : null
                      )}
                      {Object.values(lastClosedSession.desglose?.billetes || {}).every(v => v === 0) && (
                        <span className="text-muted-foreground italic text-[9px]">Sin billetes</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-amber-500 block">Monedas:</span>
                      {Object.entries(lastClosedSession.desglose?.monedas || {}).map(([denom, cant]: any) => 
                        cant > 0 ? (
                          <div key={denom} className="flex justify-between bg-secondary/30 px-2 py-0.5 rounded border border-border/20">
                            <span>${Number(denom).toLocaleString('es-CO')}</span>
                            <strong>x{cant}</strong>
                          </div>
                        ) : null
                      )}
                      {Object.values(lastClosedSession.desglose?.monedas || {}).every(v => v === 0) && (
                        <span className="text-muted-foreground italic text-[9px]">Sin monedas</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Comunicaciones detalladas y CRM */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-1">
                    💬 Métricas de WhatsApp Business
                  </h4>
                  <div className="space-y-2">
                    
                    {/* Tarjeta de Mensajes de Gafas */}
                    <div className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">Mensajes de Gafas / Pedidos</span>
                          <span className="text-[10px] text-muted-foreground">Alertas de laboratorio, control de calidad y entregas</span>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {lastClosedSession.comunicaciones?.mensajesGafas || 0}
                      </span>
                    </div>

                    {/* Primeros contactos */}
                    <div className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-success/10 rounded-lg text-success">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">Contactos por Primera Vez</span>
                          <span className="text-[10px] text-muted-foreground">Pacientes nuevos registrados y notificados en el turno</span>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-success bg-success/10 px-2.5 py-1 rounded-lg">
                        {lastClosedSession.comunicaciones?.primerosContactos || 0}
                      </span>
                    </div>

                    {/* Confirmaciones de cita */}
                    <div className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">Confirmaciones de Cita</span>
                          <span className="text-[10px] text-muted-foreground">Agendamientos y recordatorios enviados</span>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                        {lastClosedSession.comunicaciones?.confirmacionesCitas || 0}
                      </span>
                    </div>

                    {/* Alertas clínicas */}
                    <div className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-warning/10 rounded-lg text-warning">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">Alertas Clínicas</span>
                          <span className="text-[10px] text-muted-foreground">Notificaciones de lensometría aprobada por especialista</span>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-warning bg-warning/10 px-2.5 py-1 rounded-lg">
                        {lastClosedSession.comunicaciones?.alertasClinicas || 0}
                      </span>
                    </div>

                    {/* CRM y Promociones */}
                    <div className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-500">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">CRM / Campañas y Promociones</span>
                          <span className="text-[10px] text-muted-foreground">Campañas de salud visual y combos aplicados</span>
                        </div>
                      </div>
                      <span className="text-sm font-black font-mono text-pink-500 bg-pink-500/10 px-2.5 py-1 rounded-lg">
                        {lastClosedSession.comunicaciones?.crmPromociones || 0}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Notas y Observaciones */}
                <div className="space-y-1.5 bg-secondary/20 p-3.5 rounded-xl border border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Observaciones del Operador</span>
                  <p className="text-xs text-foreground italic">"{lastClosedSession.observaciones}"</p>
                </div>
              </div>

            </div>

            {/* Divider */}
            <hr className="border-border/60 print:border-dashed print:border-gray-400 my-4" />

            {/* Bitácora Detallada de WhatsApp */}
            <div className="space-y-4 print:space-y-2">
              <div className="flex justify-between items-center pb-1 border-b border-border/80 print:border-b-0 print:pb-0">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5 print:text-[11px] print:text-black">
                  <MessageSquare className="w-4 h-4 text-green-500 print:hidden" />
                  💬 Bitácora de Notificaciones WhatsApp
                </h4>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full print:hidden">
                  Sesión Activa
                </span>
              </div>

              {/* Filter Tabs - Screen Only */}
              {(() => {
                const logs = lastClosedSession.comunicaciones?.mensajesLogs || [];
                const filteredLogs = logs.filter((l: any) => logFilter === 'all' || l.tipo === logFilter);
                const countLogs = (tipo: string) => logs.filter((l: any) => l.tipo === tipo).length;

                return (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-3 print:hidden">
                      <button
                        type="button"
                        onClick={() => setLogFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                          logFilter === 'all'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        Todos ({logs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('gafas')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          logFilter === 'gafas'
                            ? 'bg-green-500 text-white border-green-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        👓 Gafas ({countLogs('gafas')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('primer-contacto')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          logFilter === 'primer-contacto'
                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        🆕 Nuevos ({countLogs('primer-contacto')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('confirmacion-cita')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          logFilter === 'confirmacion-cita'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        📅 Citas ({countLogs('confirmacion-cita')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('alerta-clinica')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          logFilter === 'alerta-clinica'
                            ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        🏥 Clínica ({countLogs('alerta-clinica')})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogFilter('crm')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          logFilter === 'crm'
                            ? 'bg-pink-500 text-white border-pink-500 shadow-sm'
                            : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                        }`}
                      >
                        🏷️ CRM ({countLogs('crm')})
                      </button>
                    </div>

                    {/* Detailed List for Screen */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 print:hidden">
                      {filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs bg-secondary/20 rounded-xl border border-dashed border-border/80">
                          Ninguna notificación enviada en esta categoría durante el turno.
                        </div>
                      ) : (
                        filteredLogs.map((l: any) => (
                          <div key={l.id} className="p-3 bg-secondary/35 hover:bg-secondary/50 rounded-xl border border-border/60 transition-all flex flex-col md:flex-row justify-between gap-3 text-xs">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded border ${
                                  l.tipo === 'gafas' ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/25' :
                                  l.tipo === 'primer-contacto' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25' :
                                  l.tipo === 'confirmacion-cita' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25' :
                                  l.tipo === 'alerta-clinica' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25' :
                                  'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/25'
                                }`}>
                                  {l.tipo === 'gafas' ? 'Gafas' :
                                   l.tipo === 'primer-contacto' ? 'Nuevo' :
                                   l.tipo === 'confirmacion-cita' ? 'Cita' :
                                   l.tipo === 'alerta-clinica' ? 'Clínica' : 'CRM'}
                                </span>
                                <span className="font-bold text-foreground">{l.pacienteNombre}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">({l.pacienteTelefono})</span>
                                {l.detalleAdicional && (
                                  <span className="text-[9px] font-semibold text-muted-foreground/80 bg-secondary border border-border/40 px-2 py-0.5 rounded">
                                    {l.detalleAdicional}
                                  </span>
                                )}
                              </div>
                              
                              {/* Message bubble simulating a WhatsApp message */}
                              <div className="relative pl-3 pr-2.5 py-2 bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 rounded-2xl rounded-tl-none mt-1.5 flex gap-2 items-end max-w-2xl text-[11px] leading-relaxed text-foreground font-sans">
                                <div className="flex-1 whitespace-pre-wrap">{l.mensajeText}</div>
                                <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground font-mono shrink-0 select-none">
                                  <span>{new Date(l.fechaEnvio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-blue-500 font-bold">✓✓</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex md:flex-col justify-between items-end shrink-0 md:text-right text-[10px] text-muted-foreground">
                              <span className="font-mono">{new Date(l.fechaEnvio).toLocaleTimeString('es-CO')}</span>
                              <span className="font-semibold text-success flex items-center gap-1 bg-success/15 border border-success/20 px-2 py-0.5 rounded-full mt-1.5">
                                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                                Enviado
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Compact layout ONLY for Print (80mm) */}
                    <div className="hidden print:block border-t border-dashed border-gray-400 pt-3.5 space-y-2.5 font-mono text-[9px] text-black w-full">
                      <div className="text-center font-black uppercase tracking-wider mb-2">
                        --- BITÁCORA DE MENSAJES ENVIADOS ---
                      </div>
                      {logs.length === 0 ? (
                        <div className="text-center italic">No se enviaron mensajes.</div>
                      ) : (
                        logs.map((l: any, idx: number) => (
                          <div key={l.id} className="space-y-1 border-b border-dotted border-gray-300 pb-1.5 break-inside-avoid">
                            <div className="flex justify-between font-bold">
                              <span>{idx + 1}. [{new Date(l.fechaEnvio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}] {l.tipo.toUpperCase()}</span>
                              <span>✓✓</span>
                            </div>
                            <div className="pl-1">
                              <strong>Pac:</strong> {l.pacienteNombre} ({l.pacienteTelefono})
                            </div>
                            {l.detalleAdicional && (
                              <div className="pl-1 text-gray-700">
                                <strong>Ref:</strong> {l.detalleAdicional}
                              </div>
                            )}
                            <div className="pl-2.5 border-l border-gray-400 text-gray-800 italic whitespace-pre-wrap leading-tight text-[8px] mt-0.5">
                              "{l.mensajeText}"
                            </div>
                          </div>
                        ))
                      )}
                      <div className="text-center font-bold pt-1.5 border-t border-dashed border-gray-400">
                        TOTAL NOTIFICACIONES EN TURNO: {logs.length}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer del Modal (Acciones) */}
            <div className="flex gap-3 pt-4 border-t border-border mt-4 print:hidden">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-secondary text-foreground border border-border py-3 rounded-xl text-xs font-bold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir Ticket POS (80mm)
              </button>
              
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setLastClosedSession(null);
                }}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Terminar Turno y Salir
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Modal QR Vinculación WhatsApp */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-20">
          <div className="bg-card border border-border w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-green-500" />
                Vincular WhatsApp — Sucursal Norte
              </h3>
              <button 
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex flex-col items-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Escanee el código QR utilizando WhatsApp en su dispositivo móvil de recepción (Configuración &gt; Dispositivos vinculados).
              </p>

              {/* Simulated QR Code Box */}
              <div className="relative w-44 h-44 border border-border rounded-2xl bg-white p-3 flex items-center justify-center shadow-inner">
                {/* Simulated QR Grid Patterns */}
                <div className="w-full h-full bg-cover bg-center opacity-85 relative" style={{ backgroundImage: "url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=optisaas_session_sede1')" }}>
                  {/* QR square corners overlays */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
                </div>

                {/* Overlaid QR Code Loading/Success state */}
                {qrProgress > 0 && qrProgress < 100 && (
                  <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold text-foreground">Sincronizando sesión...</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-success rounded-full animate-ping"></span>
                Instancia: optica_sede_norte
              </div>

              <div className="w-full pt-2.5 border-t border-border flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQrProgress(20);
                    const timer1 = setTimeout(() => setQrProgress(60), 800);
                    const timer2 = setTimeout(() => {
                      setQrProgress(100);
                      setSedeWhatsappConnected('sede1', true);
                      toast.success("WhatsApp vinculado con éxito para la Sucursal Norte.");
                      setShowQrModal(false);
                    }, 1800);
                  }}
                  className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  Simular Escaneo Exitoso
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-full bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-xl text-xs border border-border"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
