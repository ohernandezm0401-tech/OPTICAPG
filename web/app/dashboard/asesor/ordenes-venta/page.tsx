'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  ClipboardList, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Tag, 
  Lock, 
  Unlock, 
  Sparkles, 
  Printer, 
  AlertTriangle, 
  RefreshCw, 
  CreditCard,
  ShoppingBag,
  Store,
  FileText,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { Paciente, Cita, ProductoInventario, Promocion, OrdenTrabajo, TratamientoLente } from '@/lib/types';
import { 
  DISENO_OPTIONS, 
  FABRICACION_OPTIONS, 
  MATERIAL_OPTIONS, 
  ANTIRREFLEJO_OPTIONS, 
  FOTOCROMATICO_OPTIONS, 
  FOTOCROMATICO_COLORS, 
  BLUE_BLOCK_OPTIONS, 
  validarCompatibilidadTratamientos, 
  calcularPrecioTratamientos 
} from '@/lib/lens-treatments';
import { toast } from '@/lib/toast-store';
const PRECIO_LENTE_BASE = 45000;

export default function OrdenesVentaPage() {
  const router = useRouter();
  const { 
    citas, 
    pacientes, 
    inventario, 
    promociones, 
    addOrdenTrabajo, 
    completeCitaPago, 
    cajaSesionActiva, 
    updateStock 
  } = useClinicStore();

  const [step, setStep] = useState(1);

  // STEP 1: Paciente y Receta
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isManualRx, setIsManualRx] = useState(false);
  const [bypassCitaPago, setBypassCitaPago] = useState(false);
  const [formulaOD, setFormulaOD] = useState({ esfera: 'Plano', cilindro: '0.00', eje: '0', adicion: '' });
  const [formulaOI, setFormulaOI] = useState({ esfera: 'Plano', cilindro: '0.00', eje: '0', adicion: '' });
  const [formulaDP, setFormulaDP] = useState('62 mm');
  
  // STEP 2: Configurador de Lentes
  const [lensConfig, setLensConfig] = useState<TratamientoLente>({
    diseno: 'monofocal',
    fabricacion: 'terminado',
    material: 'cr39',
    antirreflejo: 'ninguno',
    fotocromatico: 'ninguno',
    blueBlock: false
  });
  const [selectedLenteId, setSelectedLenteId] = useState<string>('');
  const [lenteSugeridoId, setLenteSugeridoId] = useState<string>('');

  // STEP 3: Montura y Accesorios
  const [monturaTipo, setMonturaTipo] = useState<'stock' | 'paciente'>('stock');
  const [cartItems, setCartItems] = useState<{ id: string; marca: string; modelo: string; categoria: string; cantidad: number; precio: number; stock: number }[]>([]);
  const [barcodeInputVal, setBarcodeInputVal] = useState('');
  const [accessorySearch, setAccessorySearch] = useState('');

  // STEP 4: Abono y Envío
  const [promoId, setPromoId] = useState<string>('');
  const [laboratorio, setLaboratorio] = useState<string>('ServiOptica (Essilor)');
  const [abono, setAbono] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'>('EFECTIVO');
  const [observaciones, setObservaciones] = useState('');

  // STEP 5: Confirmación e Impresión
  const [generatedOrden, setGeneratedOrden] = useState<OrdenTrabajo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsing Helpers
  const parseDioptria = (val: string): number => {
    if (!val || val.toLowerCase().includes('plano') || val.trim() === '') return 0;
    const clean = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseEje = (val: string): number => {
    const parsed = parseInt(val.replace(/[^0-9]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDioptria = (num: number): string => {
    if (num === 0) return 'Plano';
    return (num > 0 ? '+' : '') + num.toFixed(2);
  };

  // Autotransposition OD/OI when cylinder is positive
  const odTransposed = useMemo(() => {
    const esf = parseDioptria(formulaOD.esfera);
    const cil = parseDioptria(formulaOD.cilindro);
    const eje = parseEje(formulaOD.eje);
    if (cil > 0) {
      const nuevaEsfera = esf + cil;
      const nuevoCilindro = -cil;
      let nuevoEje = eje + 90;
      if (nuevoEje > 180) nuevoEje -= 180;
      return { esfera: formatDioptria(nuevaEsfera), cilindro: formatDioptria(nuevoCilindro), eje: nuevoEje.toString() };
    }
    return formulaOD;
  }, [formulaOD]);

  const oiTransposed = useMemo(() => {
    const esf = parseDioptria(formulaOI.esfera);
    const cil = parseDioptria(formulaOI.cilindro);
    const eje = parseEje(formulaOI.eje);
    if (cil > 0) {
      const nuevaEsfera = esf + cil;
      const nuevoCilindro = -cil;
      let nuevoEje = eje + 90;
      if (nuevoEje > 180) nuevoEje -= 180;
      return { esfera: formatDioptria(nuevaEsfera), cilindro: formatDioptria(nuevoCilindro), eje: nuevoEje.toString() };
    }
    return formulaOI;
  }, [formulaOI]);

  // Priority Clients waiting for prescription billing/quote (Status: 'cotizando')
  const citasCotizando = useMemo(() => citas.filter(c => c.estadoComercial === 'cotizando'), [citas]);

  const selectedPaciente = useMemo(() => {
    return pacientes.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, pacientes]);

  const selectedCita = useMemo(() => {
    if (!selectedPatientId) return null;
    return citasCotizando.find(c => c.pacienteId === selectedPatientId) || null;
  }, [selectedPatientId, citasCotizando]);

  // Checks if the consultation fee has been paid
  const isCitaPagada = useMemo(() => {
    if (bypassCitaPago) return true; // Manual override/bypass
    if (!selectedCita) return true; // Direct registration
    return (
      selectedCita.estadoComercial === 'pagado' ||
      !!selectedCita.facturaId ||
      !!selectedCita.cufe ||
      (selectedCita.montoCobrado !== undefined && selectedCita.montoCobrado > 0)
    );
  }, [selectedCita, bypassCitaPago]);

  // Load patient HC formula when selected
  useEffect(() => {
    setFormulaOD({ esfera: 'Plano', cilindro: '0.00', eje: '0', adicion: '' });
    setFormulaOI({ esfera: 'Plano', cilindro: '0.00', eje: '0', adicion: '' });
    setFormulaDP('62 mm');
  }, [selectedCita]);

  // Clinical Lens Suggestion Logic
  useEffect(() => {
    if (!inventario) return;

    const lentesCatalog = inventario.filter(i => i.categoria === 'Lentes Oftálmicos');
    if (lentesCatalog.length === 0) return;

    const esferaOD = parseDioptria(formulaOD.esfera);
    const esferaOI = parseDioptria(formulaOI.esfera);
    const maxEsfera = Math.max(Math.abs(esferaOD), Math.abs(esferaOI));
    
    let tipoRecomendado = 'estandar';
    if (maxEsfera >= 6.00) tipoRecomendado = 'alto-indice-1.74';
    else if (maxEsfera >= 4.00) tipoRecomendado = 'alto-indice-1.67';
    else if (maxEsfera >= 2.00) tipoRecomendado = 'alto-indice-1.60';
    else tipoRecomendado = 'poly'; // Polycarbonate is standard for typical prescriptions for safety
    
    // Check if progressives are needed
    const isProgresivo = parseDioptria(formulaOD.adicion || '') > 0 || parseDioptria(formulaOI.adicion || '') > 0;

    let sugerido = null;
    
    if (isProgresivo) {
      sugerido = lentesCatalog.find(l => 
        l.modelo.toLowerCase().includes('varilux') && 
        (tipoRecomendado === 'poly' ? l.modelo.toLowerCase().includes('poly') : l.modelo.toLowerCase().includes(tipoRecomendado.replace('alto-indice-', '')))
      );
      if (!sugerido) sugerido = lentesCatalog.find(l => l.modelo.toLowerCase().includes('varilux'));
    } else {
      sugerido = lentesCatalog.find(l => 
        l.modelo.toLowerCase().includes('monofocal') && 
        (tipoRecomendado === 'poly' ? l.modelo.toLowerCase().includes('poly') : l.modelo.toLowerCase().includes(tipoRecomendado.replace('alto-indice-', '')))
      );
      if (!sugerido) sugerido = lentesCatalog.find(l => l.modelo.toLowerCase().includes('monofocal') && l.modelo.toLowerCase().includes('poly'));
    }

    if (sugerido) {
      setLenteSugeridoId(sugerido.id);
    } else {
      setLenteSugeridoId(lentesCatalog[0]?.id || '');
    }
  }, [formulaOD, formulaOI, inventario]);

  // Auto-populate Config based on selected lente
  useEffect(() => {
    if (!selectedLenteId) return;
    const lente = inventario.find(i => i.id === selectedLenteId);
    if (!lente) return;
    
    const name = lente.modelo.toLowerCase();
    
    setLensConfig(prev => {
      const newConfig = { ...prev };
      
      // Diseño
      if (name.includes('varilux') || name.includes('progresivo')) newConfig.diseno = 'progresivo';
      else if (name.includes('bifocal')) newConfig.diseno = 'bifocal';
      else if (name.includes('monofocal')) newConfig.diseno = 'monofocal';
      else if (name.includes('ocupacional')) newConfig.diseno = 'ocupacional';
      
      // Fabricación - progresivos usually freeform
      if (newConfig.diseno === 'progresivo') newConfig.fabricacion = 'freeform';
      else newConfig.fabricacion = 'terminado';

      // Material
      if (name.includes('1.74')) newConfig.material = '1.74';
      else if (name.includes('1.67')) newConfig.material = '1.67';
      else if (name.includes('1.60')) newConfig.material = '1.60';
      else if (name.includes('trivex')) newConfig.material = 'trivex';
      else if (name.includes('poly') || name.includes('policarbonato')) newConfig.material = 'policarbonato';
      else if (name.includes('cr-39') || name.includes('cr39')) newConfig.material = 'cr39';

      // Antirreflejo
      if (name.includes('sapphire')) newConfig.antirreflejo = 'crizal-sapphire';
      else if (name.includes('rock')) newConfig.antirreflejo = 'crizal-rock';
      else if (name.includes('easy')) newConfig.antirreflejo = 'crizal-easy';
      else if (name.includes('platinum')) newConfig.antirreflejo = 'duravision-platinum';
      else if (name.includes('blueprotect')) newConfig.antirreflejo = 'duravision-blueprotect';
      else if (name.includes('antirreflejo') || name.includes('ar')) newConfig.antirreflejo = 'ar-generico';
      else newConfig.antirreflejo = 'ninguno';
      
      // Blue Block
      if (name.includes('blue') || name.includes('azul')) {
        newConfig.blueBlock = true;
        if (!newConfig.blueBlockTipo) newConfig.blueBlockTipo = 'estandar-blue';
      }

      return newConfig;
    });
  }, [selectedLenteId, inventario]);

  // Lock recipe handler
  const handleRegistrarPagoConsulta = () => {
    if (!selectedCita) return;
    if (!cajaSesionActiva || cajaSesionActiva.estado !== 'abierta') {
      toast.error('La caja está cerrada. Abra la caja chica en el Dashboard antes de facturar la consulta.');
      return;
    }

    try {
      completeCitaPago(selectedCita.id, {
        cufe: `FAC-CONSULTA-${Date.now().toString().slice(-4)}`,
        pdfUrl: 'https://factus.com.co/facturas/mock-pdf-consulta.pdf',
        monto: 50000,
        metodoPago: 'EFECTIVO',
        productosVendidos: []
      });
      toast.success('Cobro de consulta registrado ($50.000). Prescripción desbloqueada.');
    } catch (e) {
      toast.error('Error al desbloquear la fórmula.');
    }
  };

  // Treatment Validation and Pricing
  const validacionTratamientos = useMemo(() => {
    return validarCompatibilidadTratamientos(lensConfig);
  }, [lensConfig]);

  const precioTratamientos = useMemo(() => {
    return calcularPrecioTratamientos(lensConfig);
  }, [lensConfig]);

  // Check if Lens design requires an addition diopter
  const hasAddDiopter = useMemo(() => {
    const addOD = parseDioptria(formulaOD.adicion || '');
    const addOI = parseDioptria(formulaOI.adicion || '');
    return addOD > 0 || addOI > 0;
  }, [formulaOD, formulaOI]);

  const canContinueStep2 = useMemo(() => {
    // Hard errors block progression
    if (!validacionTratamientos.compatible) return false;
    
    // Progresivo requires addition
    if (lensConfig.diseno === 'progresivo' && !hasAddDiopter) return false;

    // Lente base requires selection
    if (!selectedLenteId) return false;

    return true;
  }, [validacionTratamientos, lensConfig, hasAddDiopter, selectedLenteId]);

  // Catalog items for STEP 3
  const monturasCatalogo = useMemo(() => {
    return inventario.filter(i => i.categoria.toLowerCase().includes('montura'));
  }, [inventario]);

  const accesoriosCatalogo = useMemo(() => {
    return inventario.filter(i => !i.categoria.toLowerCase().includes('montura') && i.categoria !== 'Lentes Oftálmicos');
  }, [inventario]);

  const filteredAccessories = useMemo(() => {
    return accesoriosCatalogo.filter(a => 
      a.marca.toLowerCase().includes(accessorySearch.toLowerCase()) || 
      a.modelo.toLowerCase().includes(accessorySearch.toLowerCase())
    );
  }, [accesoriosCatalogo, accessorySearch]);

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInputVal.trim();
      if (!code) return;

      const found = inventario.find(p => p.codigoBarras === code || p.id === code);
      if (found) {
        if (found.categoria === 'Lentes Oftálmicos') {
          toast.warning('Los lentes oftálmicos se cotizan por el configurador de tratamientos.');
        } else {
          handleAddToCart(found);
        }
      } else {
        toast.error(`Producto con código "${code}" no encontrado.`);
      }
      setBarcodeInputVal('');
    }
  };

  const handleAddToCart = (product: ProductoInventario) => {
    if (product.stock <= 0) {
      toast.error('Este producto no tiene existencias.');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cantidad >= product.stock) {
          toast.warning(`Stock máximo alcanzado: ${product.stock}`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, {
        id: product.id,
        marca: product.marca,
        modelo: product.modelo,
        categoria: product.categoria,
        precio: product.precio,
        stock: product.stock,
        cantidad: 1
      }];
    });
    toast.success(`${product.marca} agregada.`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = item.cantidad + delta;
        if (next <= 0) return null;
        if (next > item.stock) return item;
        return { ...item, cantidad: next };
      }
      return item;
    }).filter(Boolean) as typeof cartItems);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // STEP 4: Calculations
  // Lens price structure: Base price of lens (say $100K) + treatment adjustments
  const precioLenteBase = useMemo(() => {
    const lenteSeleccionado = inventario.find(i => i.id === selectedLenteId);
    return lenteSeleccionado ? lenteSeleccionado.precio : 0;
  }, [inventario, selectedLenteId]);

  const subtotal = useMemo(() => {
    // 2 Lenses (Right + Left)
    const costoLentes = (precioLenteBase + precioTratamientos.total) * 2;
    const costoArticulos = cartItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    return costoLentes + costoArticulos;
  }, [precioTratamientos, cartItems, precioLenteBase]);

  const promocionesActivas = useMemo(() => promociones.filter(p => p.activa), [promociones]);

  const descuentoCalculado = useMemo(() => {
    if (!promoId) return 0;
    const promo = promociones.find(p => p.id === promoId);
    if (!promo) return 0;

    let desc = 0;
    if (promo.tipo === 'porcentaje') {
      desc = Math.round(subtotal * (promo.valor / 100));
    } else if (promo.tipo === 'monto-fijo') {
      desc = promo.valor;
    }
    return Math.min(desc, subtotal);
  }, [promoId, subtotal, promociones]);

  const totalFinal = useMemo(() => {
    return subtotal - descuentoCalculado;
  }, [subtotal, descuentoCalculado]);

  const anticipoMinimo = useMemo(() => {
    return Math.round(totalFinal * 0.5);
  }, [totalFinal]);

  // Set minimum abono default when screen loads or total changes
  useEffect(() => {
    setAbono(anticipoMinimo);
  }, [totalFinal, anticipoMinimo]);

  const handleProcederOrden = () => {
    if (!cajaSesionActiva || cajaSesionActiva.estado !== 'abierta') {
      toast.error('La caja está cerrada. Abra la caja chica antes de registrar una orden.');
      return;
    }
    if (abono < anticipoMinimo) {
      toast.error(`El abono mínimo es del 50% ($ ${anticipoMinimo.toLocaleString('es-CO')})`);
      return;
    }

    setIsSubmitting(true);
    const ordenId = `ORT-${Math.floor(1000 + Math.random() * 9000)}`;

    const odVal = `Esf ${odTransposed.esfera} Cil ${odTransposed.cilindro} Eje ${odTransposed.eje}`;
    const oiVal = `Esf ${oiTransposed.esfera} Cil ${oiTransposed.cilindro} Eje ${oiTransposed.eje}`;

    const newOrden: OrdenTrabajo = {
      id: ordenId,
      citaId: selectedCita?.id || 'DIRECTO',
      pacienteId: selectedPatientId,
      pacienteNombre: `${selectedPaciente?.nombre} ${selectedPaciente?.apellido}`,
      fechaCreacion: new Date().toISOString(),
      receta: {
        od: odVal,
        oi: oiVal,
        adicion: formulaOD.adicion || undefined,
        dp: formulaDP
      },
      lenteMaterial: MATERIAL_OPTIONS.find(m => m.id === lensConfig.material)?.label || 'Estándar',
      lenteDiseno: DISENO_OPTIONS.find(d => d.id === lensConfig.diseno)?.label || 'Monofocal',
      monturaDetalle: monturaTipo === 'paciente' ? 'Montura del Paciente' : (cartItems.find(i => i.categoria.toLowerCase().includes('montura')) ? `${cartItems.find(i => i.categoria.toLowerCase().includes('montura'))?.marca} - ${cartItems.find(i => i.categoria.toLowerCase().includes('montura'))?.modelo}` : 'Montura propia'),
      estado: 'enviado-laboratorio',
      laboratorio: laboratorio,
      subtotal: subtotal,
      promoId: promoId || undefined,
      descuentoCalculado: descuentoCalculado,
      totalFinal: totalFinal,
      abono: abono,
      cartItems: cartItems.map(c => ({
        id: c.id,
        marca: c.marca,
        modelo: c.modelo,
        categoria: c.categoria,
        cantidad: c.cantidad,
        precio: c.precio
      })),
      tratamiento: lensConfig
    };

    // Simulate laboratory ordering submit
    setTimeout(() => {
      try {
        addOrdenTrabajo(newOrden);
        
        // Decrement frame stock
        cartItems.forEach(item => {
          const invItem = inventario.find(i => i.id === item.id);
          if (invItem) {
            updateStock(item.id, Math.max(0, invItem.stock - item.cantidad));
          }
        });

        // Decrement lens stock
        if (selectedLenteId) {
          const invLente = inventario.find(i => i.id === selectedLenteId);
          if (invLente) {
            updateStock(selectedLenteId, Math.max(0, invLente.stock - 2));
          }
        }

        setGeneratedOrden(newOrden);
        setStep(5);
        toast.success(`Orden de Trabajo ${ordenId} enviada a laboratorio.`);
      } catch (err) {
        toast.error('Error al guardar la orden.');
      } finally {
        setIsSubmitting(false);
      }
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Módulo Órdenes de Venta</h1>
          <p className="text-muted-foreground text-sm">Configurador y cotizador avanzado de lentes oftálmicos de laboratorio, cristales y recetas.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/asesor')}
          className="bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold px-4 py-2 rounded-xl transition-all"
        >
          Volver a Inicio
        </button>
      </div>

      {/* STEP BAR */}
      <div className="bg-card/40 border border-border/80 backdrop-blur-md rounded-2xl p-5 shadow-sm print:hidden">
        <div className="flex justify-between items-center max-w-3xl mx-auto">
          {[1, 2, 3, 4, 5].map(s => {
            const isCompleted = step > s;
            const isActive = step === s;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted ? 'bg-emerald-600 text-white' : isActive ? 'bg-primary text-white scale-110 shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground border border-border'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </div>
                  <span className="text-[10px] font-semibold mt-2 absolute -bottom-6 w-24 text-center text-muted-foreground whitespace-nowrap hidden sm:block">
                    {s === 1 && 'Paciente / Receta'}
                    {s === 2 && 'Diseño & Tratamientos'}
                    {s === 3 && 'Montura & Accesorios'}
                    {s === 4 && 'Abono & Envío'}
                    {s === 5 && 'Confirmación'}
                  </span>
                </div>
                {s < 5 && (
                  <div className={`h-1 flex-1 mx-2 rounded ${step > s ? 'bg-emerald-600' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="h-6" /> {/* spacer for labels */}
      </div>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Wizard Forms */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 print:hidden"
              >
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Paso 1: Paciente y Prescripción Óptica
                  </h3>
                  <p className="text-muted-foreground text-xs">Seleccione el paciente y cargue su fórmula clínica o ingrésela manualmente.</p>
                </div>

                {/* Patient Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Paciente / Cliente</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setBypassCitaPago(false);
                    }}
                    className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleccione un paciente de la lista...</option>
                    {pacientes.map(p => {
                      const isWaiting = citasCotizando.some(c => c.pacienteId === p.id);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellido} (CC {p.documento}) {isWaiting ? '★ [Consulta Cotizando]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedPatientId && (
                  <div className="border border-border/80 rounded-2xl p-5 bg-secondary/15 space-y-4 relative overflow-hidden">
                    
                    {/* Lock Screen */}
                    {!isCitaPagada && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <Lock className="w-10 h-10 text-destructive animate-bounce" />
                        <h4 className="font-extrabold text-foreground text-sm uppercase tracking-wider">Fórmula Médica Bloqueada</h4>
                        <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                          La prescripción clínica del paciente está bloqueada por caja. Debe registrar el cobro de la consulta médica primero para continuar.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={handleRegistrarPagoConsulta}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2"
                          >
                            <Unlock className="w-4 h-4" />
                            Cobrar Consulta ($50.000)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBypassCitaPago(true)}
                            className="bg-secondary hover:bg-secondary/80 text-foreground border border-border font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all"
                          >
                            Omitir / Cortesía Comercial
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center border-b border-border/60 pb-3">
                      <h4 className="text-sm font-bold text-foreground">Fórmula de Refracción Sugerida</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsManualRx(!isManualRx)}
                          className="text-[11px] font-bold text-primary hover:underline bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10"
                        >
                          {isManualRx ? 'Cargar Sugerida' : 'Editar Manualmente'}
                        </button>
                      </div>
                    </div>

                    {/* OD Right Eye Inputs */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-black text-primary uppercase tracking-wide">Ojo Derecho (OD)</span>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Esfera</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOD.esfera}
                            onChange={e => setFormulaOD({ ...formulaOD, esfera: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Cilindro</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOD.cilindro}
                            onChange={e => setFormulaOD({ ...formulaOD, cilindro: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Eje</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOD.eje}
                            onChange={e => setFormulaOD({ ...formulaOD, eje: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Adición</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOD.adicion}
                            onChange={e => setFormulaOD({ ...formulaOD, adicion: e.target.value })}
                            placeholder="Add"
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* OI Left Eye Inputs */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-black text-primary uppercase tracking-wide">Ojo Izquierdo (OI)</span>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Esfera</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOI.esfera}
                            onChange={e => setFormulaOI({ ...formulaOI, esfera: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Cilindro</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOI.cilindro}
                            onChange={e => setFormulaOI({ ...formulaOI, cilindro: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Eje</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOI.eje}
                            onChange={e => setFormulaOI({ ...formulaOI, eje: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-muted-foreground block text-center mb-1">Adición</span>
                          <input
                            type="text"
                            disabled={!isManualRx}
                            value={formulaOI.adicion}
                            onChange={e => setFormulaOI({ ...formulaOI, adicion: e.target.value })}
                            placeholder="Add"
                            className="w-full bg-background border border-input rounded-xl p-2.5 text-xs text-center font-mono text-foreground focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* D.P. Input */}
                    <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Distancia Pupilar (D.P.)</label>
                        <input
                          type="text"
                          disabled={!isManualRx}
                          value={formulaDP}
                          onChange={e => setFormulaDP(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl p-2 text-xs font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        {/* Auto-transposed info */}
                        {(parseDioptria(formulaOD.cilindro) > 0 || parseDioptria(formulaOI.cilindro) > 0) && (
                          <div className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg leading-normal flex items-start gap-1 font-medium">
                            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Transposición positiva (+) a (-) calculada en segundo plano.</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedPatientId || !isCitaPagada}
                    className="bg-primary text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md hover:bg-blue-600 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Configurar Tratamientos
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 print:hidden animate-in fade-in"
              >
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Paso 2: Configurador de Tratamientos de Lentes
                  </h3>
                  <p className="text-muted-foreground text-xs">Configure el diseño de cristal, fabricación, material e inserte filtros y tratamientos antirreflejo.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Lente Base */}
                  <div className="space-y-4 md:col-span-2">
                    {/* Suggested Lens Card */}
                    {lenteSugeridoId && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 mt-0.5">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                              Lente Recomendado por Optometría
                            </h4>
                            <p className="text-sm font-extrabold text-foreground mt-0.5">
                              {inventario.find(i => i.id === lenteSugeridoId)?.marca} {inventario.find(i => i.id === lenteSugeridoId)?.modelo}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Sugerencia basada en la refracción clínica del paciente (Miopía/Hipermetropía/Adición).
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedLenteId(lenteSugeridoId)}
                          className="bg-primary text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:brightness-110 transition-all whitespace-nowrap shrink-0"
                        >
                          Aplicar Sugerencia
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase text-muted-foreground block">Lente Base de Inventario (Obligatorio)</label>
                      <select
                      value={selectedLenteId}
                      onChange={e => setSelectedLenteId(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">-- Seleccione un Lente Base --</option>
                      {inventario
                        .filter(i => i.categoria === 'Lentes Oftálmicos')
                        .map(l => (
                          <option key={l.id} value={l.id}>
                            {l.marca} {l.modelo} - $ {l.precio.toLocaleString('es-CO')}
                          </option>
                        ))}
                    </select>
                    </div>
                  </div>

                  {/* Diseño de Cristal */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground block">1. Diseño de Lente</label>
                    <select
                      value={lensConfig.diseno}
                      onChange={e => setLensConfig({ ...lensConfig, diseno: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      {DISENO_OPTIONS.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.label} {d.price > 0 ? `(+$ ${d.price.toLocaleString('es-CO')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fabricación */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground block">2. Método de Fabricación</label>
                    <select
                      value={lensConfig.fabricacion}
                      onChange={e => setLensConfig({ ...lensConfig, fabricacion: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      {FABRICACION_OPTIONS.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.label} {f.price > 0 ? `(+$ ${f.price.toLocaleString('es-CO')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Material */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground block">3. Material / Índice de Refracción</label>
                    <select
                      value={lensConfig.material}
                      onChange={e => setLensConfig({ ...lensConfig, material: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      {MATERIAL_OPTIONS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label} {m.price > 0 ? `(+$ ${m.price.toLocaleString('es-CO')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Antirreflejo */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground block">4. Tratamiento Antirreflejo (AR)</label>
                    <select
                      value={lensConfig.antirreflejo}
                      onChange={e => setLensConfig({ ...lensConfig, antirreflejo: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      {ANTIRREFLEJO_OPTIONS.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.manufacturer ? `[${a.manufacturer}] ` : ''}{a.label} {a.price > 0 ? `(+$ ${a.price.toLocaleString('es-CO')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fotocromático */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground block">5. Filtro Fotocromático</label>
                    <select
                      value={lensConfig.fotocromatico}
                      onChange={e => setLensConfig({ 
                        ...lensConfig, 
                        fotocromatico: e.target.value as any,
                        // reset color default
                        fotocromaticoColor: e.target.value !== 'ninguno' ? 'gris' : undefined
                      })}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    >
                      {FOTOCROMATICO_OPTIONS.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.label} {f.price > 0 ? `(+$ ${f.price.toLocaleString('es-CO')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fotocromático Color (visible if selected) */}
                  {lensConfig.fotocromatico !== 'ninguno' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase text-muted-foreground block">Tonalidad / Color Fotocromático</label>
                      <select
                        value={lensConfig.fotocromaticoColor || 'gris'}
                        onChange={e => setLensConfig({ ...lensConfig, fotocromaticoColor: e.target.value as any })}
                        className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                      >
                        {FOTOCROMATICO_COLORS.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Blue Block Section */}
                  <div className="space-y-2 md:col-span-2 border-t border-border/40 pt-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="blueBlockChk"
                        checked={lensConfig.blueBlock}
                        onChange={e => setLensConfig({ 
                          ...lensConfig, 
                          blueBlock: e.target.checked,
                          blueBlockTipo: e.target.checked ? 'estandar-blue' : undefined
                        })}
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                      />
                      <label htmlFor="blueBlockChk" className="text-xs font-bold uppercase text-foreground cursor-pointer select-none">
                        ¿Incluir filtro de bloqueo de Luz Azul (Blue Block)?
                      </label>
                    </div>

                    {lensConfig.blueBlock && (
                      <div className="space-y-1.5 pl-6">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block">Tipo de Filtro de Luz Azul</label>
                        <select
                          value={lensConfig.blueBlockTipo || 'estandar-blue'}
                          onChange={e => setLensConfig({ ...lensConfig, blueBlockTipo: e.target.value })}
                          className="w-full max-w-md bg-background border border-input rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                        >
                          {BLUE_BLOCK_OPTIONS.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.manufacturer ? `[${b.manufacturer}] ` : ''}{b.label} {b.price > 0 ? `(+$ ${b.price.toLocaleString('es-CO')})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compatibility Rules Alerts */}
                {validacionTratamientos.alertas.length > 0 && (
                  <div className="space-y-2 border-t border-border/40 pt-4">
                    {validacionTratamientos.alertas.map((al, idx) => {
                      const isFatal = !validacionTratamientos.compatible;
                      return (
                        <div 
                          key={idx} 
                          className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium leading-relaxed ${
                            isFatal 
                              ? 'bg-destructive/10 border-destructive/25 text-destructive' 
                              : 'bg-amber-500/10 border-amber-500/25 text-amber-700'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold uppercase text-[10px] block">
                              {isFatal ? 'Error de Compatibilidad' : 'Sugerencia Comercial (Filtro Duplicado)'}
                            </span>
                            <p className="mt-0.5">{al}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Progresivo Addition Check */}
                {lensConfig.diseno === 'progresivo' && !hasAddDiopter && (
                  <div className="p-3.5 bg-destructive/10 border border-destructive/25 text-destructive rounded-xl flex items-start gap-2.5 text-xs font-medium leading-normal">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase text-[10px] block">Requisito Obligatorio</span>
                      El lente Progresivo requiere obligatoriamente una Adición óptica superior a +0.00 D en la fórmula del paciente. Vuelva al paso 1 o agregue la adición.
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(1)}
                    className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs py-3 px-5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canContinueStep2}
                    className="bg-primary text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md hover:bg-blue-600 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Seleccionar Montura
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 print:hidden"
              >
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    Paso 3: Montura y Accesorios Adicionales
                  </h3>
                  <p className="text-muted-foreground text-xs">Seleccione si el paciente traerá su propia montura o escoja una de stock. Añada estuches o líquidos limpiadores.</p>
                </div>

                {/* Tipo Montura Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Montaje de Óptica</label>
                  <div className="grid grid-cols-2 gap-3 max-w-md bg-secondary/30 p-1.5 rounded-xl border border-border">
                    <button
                      onClick={() => {
                        setMonturaTipo('stock');
                        // Remove montura patient if added
                      }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${monturaTipo === 'stock' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Montura de Inventario (Sede)
                    </button>
                    <button
                      onClick={() => {
                        setMonturaTipo('paciente');
                        // Clear cart items that are frames
                        setCartItems(prev => prev.filter(i => !i.categoria.toLowerCase().includes('montura')));
                      }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${monturaTipo === 'paciente' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Montura Propia del Paciente ($0)
                    </button>
                  </div>
                </div>

                {/* Stock frame selection */}
                {monturaTipo === 'stock' && (
                  <div className="space-y-4 bg-secondary/10 border border-border/40 p-4 rounded-xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                        Lector Láser (Escanear Montura)
                      </label>
                      <input
                        type="text"
                        placeholder="Escanee código de barras de la montura..."
                        value={barcodeInputVal}
                        onChange={e => setBarcodeInputVal(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        className="w-full bg-background border border-primary/20 rounded-lg p-2.5 text-xs font-mono"
                      />
                    </div>

                    {/* Catalog Frame search */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">O busque monturas del catálogo</span>
                      <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1 text-xs">
                        {monturasCatalogo.map(m => (
                          <div key={m.id} className="border border-border rounded-lg p-2 flex justify-between items-center bg-background">
                            <div>
                              <strong className="text-foreground">{m.marca}</strong>
                              <p className="text-[10px] text-muted-foreground">{m.modelo} (Color: {m.color})</p>
                              <span className="font-mono text-[10px] text-muted-foreground">$ {m.precio.toLocaleString('es-CO')}</span>
                            </div>
                            <button
                              onClick={() => handleAddToCart(m)}
                              className="bg-primary hover:bg-blue-600 text-white p-1 rounded transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessories addition */}
                <div className="space-y-3 pt-3 border-t border-border/40">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Productos de Limpieza o Accesorios</label>
                    <input
                      type="text"
                      placeholder="Buscar estuche, paño..."
                      value={accessorySearch}
                      onChange={e => setAccessorySearch(e.target.value)}
                      className="bg-background border border-input rounded-lg p-1 px-2.5 text-xs w-48 outline-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto pr-1 text-xs">
                    {filteredAccessories.map(a => (
                      <div key={a.id} className="border border-border rounded-lg p-2 flex justify-between items-center bg-background">
                        <div>
                          <strong>{a.marca} - {a.modelo}</strong>
                          <p className="text-[9px] text-muted-foreground">{a.categoria}</p>
                          <span className="font-mono text-[9px] text-muted-foreground">$ {a.precio.toLocaleString('es-CO')}</span>
                        </div>
                        <button
                          onClick={() => handleAddToCart(a)}
                          className="bg-primary hover:bg-blue-600 text-white p-1 rounded transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart selection overview */}
                {cartItems.length > 0 && (
                  <div className="bg-secondary/15 rounded-xl p-4 border border-border space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Artículos a Procesar:</span>
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span>{item.marca} - {item.modelo} ({item.categoria})</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateQty(item.id, -1)} className="p-0.5 bg-secondary rounded hover:bg-border"><Minus className="w-3 h-3" /></button>
                          <span className="font-bold">{item.cantidad}</span>
                          <button onClick={() => handleUpdateQty(item.id, 1)} className="p-0.5 bg-secondary rounded hover:bg-border"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => handleRemoveFromCart(item.id)} className="text-destructive hover:underline ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(2)}
                    className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs py-3 px-5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="bg-primary text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md hover:bg-blue-600 transition-all flex items-center gap-1.5"
                  >
                    Definir Abono y Pago
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 print:hidden animate-in fade-in"
              >
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Paso 4: Resumen, Descuentos y Abonos
                  </h3>
                  <p className="text-muted-foreground text-xs">Defina la campaña comercial, el anticipo de laboratorio del paciente y asigne el laboratorio.</p>
                </div>

                <div className="space-y-4">
                  {/* Campaña */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Campaña / Convenio Aplicable</label>
                    <select
                      value={promoId}
                      onChange={e => setPromoId(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs"
                    >
                      <option value="">Ninguna campaña aplicada</option>
                      {promocionesActivas.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.tipo === 'monto-fijo' ? `$ ${p.valor.toLocaleString('es-CO')}` : `${p.valor}%`})</option>
                      ))}
                    </select>
                  </div>

                  {/* Laboratorio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Laboratorio Óptico</label>
                    <select
                      value={laboratorio}
                      onChange={e => setLaboratorio(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs"
                    >
                      <option value="ServiOptica (Essilor)">ServiOptica (Essilor)</option>
                      <option value="Lafam Lab">Lafam Lab</option>
                      <option value="Óptica Alemana Tallado">Óptica Alemana Tallado</option>
                      <option value="Indulentes">Indulentes</option>
                      <option value="Laboratorio Digital Co">Laboratorio Digital Co</option>
                    </select>
                  </div>

                  {/* Anticipo */}
                  <div className="space-y-2 bg-secondary/15 p-4 rounded-xl border border-border/40">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Anticipo / Abono del Paciente</label>
                      <span className="text-[10px] text-destructive font-bold">Mínimo 50%: $ {anticipoMinimo.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={abono || ''}
                        onChange={e => setAbono(Number(e.target.value))}
                        className="w-full bg-background border border-input rounded-xl pl-8 pr-4 py-2.5 text-xs font-mono font-bold"
                        placeholder="Monto a abonar..."
                      />
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button
                        onClick={() => setAbono(anticipoMinimo)}
                        className="bg-secondary hover:bg-secondary/80 text-[10px] font-bold py-1.5 rounded-lg border border-border"
                      >
                        Abonar Mínimo (50%)
                      </button>
                      <button
                        onClick={() => setAbono(totalFinal)}
                        className="bg-secondary hover:bg-secondary/80 text-[10px] font-bold py-1.5 rounded-lg border border-border"
                      >
                        Abonar Completo (100%)
                      </button>
                    </div>

                    {abono < anticipoMinimo && (
                      <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-start gap-1.5 text-[10px] mt-2 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        El abono de laboratorio no puede ser menor al 50% de la facturación.
                      </div>
                    )}
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(m => (
                        <button
                          key={m}
                          onClick={() => setMetodoPago(m as any)}
                          className={`py-2 rounded-xl text-xs font-bold border transition-colors ${metodoPago === m ? 'bg-primary text-white border-primary shadow-sm' : 'bg-background hover:bg-secondary text-muted-foreground border-border'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block">Observaciones para Laboratorio</label>
                    <textarea
                      value={observaciones}
                      onChange={e => setObservaciones(e.target.value)}
                      placeholder="Ingrese recomendaciones del tallado, espesor, o especificaciones..."
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs h-16 outline-none"
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(3)}
                    className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs py-3 px-5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={handleProcederOrden}
                    disabled={isSubmitting || abono < anticipoMinimo}
                    className="bg-emerald-600 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md hover:bg-emerald-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registrando en Caja...
                      </>
                    ) : (
                      <>
                        Confirmar y Enviar Orden
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Confirmación & Documento Equivalente */}
            {step === 5 && generatedOrden && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6"
              >
                
                {/* Print layout overrides standard design when printing */}
                <div className="flex flex-col items-center justify-center text-center space-y-3 pb-4 border-b border-border print:hidden animate-bounce">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">¡Orden de Trabajo Generada Exitosamente!</h3>
                    <p className="text-xs text-muted-foreground">La orden de trabajo #{generatedOrden.id} está registrada en laboratorios ópticos.</p>
                  </div>
                </div>

                {/* Print Layout */}
                <div className="border border-border/80 rounded-2xl p-6 bg-background space-y-6 font-sans text-xs text-foreground max-w-xl mx-auto shadow-sm print:border-none print:shadow-none print:p-0 print:m-0">
                  
                  {/* Print Header */}
                  <div className="flex justify-between items-start border-b border-border/60 pb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase text-primary">OPTICAS SAAS</h4>
                      <p className="text-[10px] text-muted-foreground">NIT: 901.456.782-4 • Bogotá D.C.</p>
                      <p className="text-[10px] text-muted-foreground">Habilitación S.S: Calle 93 #14-20</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Documento Equivalente
                      </span>
                      <p className="font-mono font-extrabold text-sm text-foreground mt-1.5">{generatedOrden.id}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(generatedOrden.fechaCreacion).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>

                  {/* Print Client */}
                  <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-3 rounded-lg border border-border/40">
                    <div>
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold">Paciente / Cliente</span>
                      <strong className="text-foreground">{generatedOrden.pacienteNombre}</strong>
                      <p className="text-[10px] text-muted-foreground">C.C. {selectedPaciente?.documento}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold">Laboratorio</span>
                      <strong className="text-foreground">{generatedOrden.laboratorio}</strong>
                      <p className="text-[10px] text-muted-foreground">Destino Trabajo</p>
                    </div>
                  </div>

                  {/* Print Recipe */}
                  <div className="border border-border/40 rounded-lg p-3 space-y-2">
                    <span className="text-[10px] font-black text-primary uppercase block border-b border-border/40 pb-1">Fórmula Procesada</span>
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <strong>Ojo Derecho (OD):</strong>
                        <p className="font-mono text-xs">{generatedOrden.receta.od}</p>
                      </div>
                      <div>
                        <strong>Ojo Izquierdo (OI):</strong>
                        <p className="font-mono text-xs">{generatedOrden.receta.oi}</p>
                      </div>
                      {generatedOrden.receta.adicion && (
                        <div>
                          <strong>Adición:</strong>
                          <p className="font-mono text-xs">+{generatedOrden.receta.adicion}</p>
                        </div>
                      )}
                      <div>
                        <strong>D.P.:</strong>
                        <p className="font-mono text-xs">{generatedOrden.receta.dp}</p>
                      </div>
                    </div>
                  </div>

                  {/* Print Treatments Details */}
                  {generatedOrden.tratamiento && (
                    <div className="border border-border/40 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-black text-primary uppercase block border-b border-border/40 pb-1">Configuración Lente Oftálmico</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-medium">
                        <div>• Diseño: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.diseno}</strong></div>
                        <div>• Fabricación: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.fabricacion}</strong></div>
                        <div>• Material: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.material}</strong></div>
                        <div>• Antirreflejo: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.antirreflejo}</strong></div>
                        {generatedOrden.tratamiento.fotocromatico !== 'ninguno' && (
                          <div className="col-span-2">• Fotocromático: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.fotocromatico} ({generatedOrden.tratamiento.fotocromaticoColor})</strong></div>
                        )}
                        {generatedOrden.tratamiento.blueBlock && (
                          <div className="col-span-2">• Filtro Luz Azul: <strong className="text-foreground uppercase">{generatedOrden.tratamiento.blueBlockTipo}</strong></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Policies and Delivery Time */}
                  {generatedOrden.tratamiento && (
                    <div className="border border-border/40 rounded-lg p-3 space-y-2 mt-4 bg-secondary/5">
                      <span className="text-[10px] font-black text-primary uppercase block border-b border-border/40 pb-1">Tiempos Estimados y Políticas de Garantía</span>
                      <div className="text-[9px] space-y-1.5 text-muted-foreground">
                        <p>
                          <strong className="text-foreground">Tiempo de Entrega Estimado: </strong> 
                          {generatedOrden.tratamiento.fabricacion === 'terminado' ? '1 a 2 días hábiles.' : '5 a 8 días hábiles.'}
                          {generatedOrden.tratamiento.blueBlock || generatedOrden.tratamiento.antirreflejo !== 'ninguno' ? ' (Sujeto a variación por tratamientos AR/Filtros).' : ''}
                        </p>
                        <p><strong className="text-foreground">Garantía de Montura: </strong>6 meses por defectos de fábrica. No cubre desgaste por uso, rayones o accidentes.</p>
                        <p><strong className="text-foreground">Garantía de Adaptación: </strong>3 meses (exclusivo para lentes Progresivos). Lentes monofocales no tienen garantía de adaptación salvo error demostrado en refracción.</p>
                        <p className="font-black mt-2 border-t border-border/40 pt-1 text-[9px] uppercase text-foreground">
                          Nota Legal: El abono o anticipo entregado para iniciar el trabajo NO es reembolsable.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Montura & Items */}
                  <div className="border-t border-border/40 pt-4 space-y-2">
                    <span className="text-[10px] font-black text-primary uppercase block">Conceptos Liquidados</span>
                    <div className="divide-y divide-border/40 text-[11px]">
                      
                      {/* Lenses */}
                      <div className="flex justify-between items-center py-1.5">
                        <div>
                          <strong>Lentes Oftálmicos (Par)</strong>
                          <p className="text-[9px] text-muted-foreground">Lente oftálmico personalizado con tratamientos</p>
                        </div>
                        <span className="font-mono font-bold text-foreground">$ {((precioLenteBase + precioTratamientos.total) * 2).toLocaleString('es-CO')}</span>
                      </div>

                      {/* Frame or patient frame */}
                      <div className="flex justify-between items-center py-1.5">
                        <div>
                          <strong>Montura / Montaje</strong>
                          <p className="text-[9px] text-muted-foreground">{generatedOrden.monturaDetalle}</p>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          $ {monturaTipo === 'paciente' ? '0' : (cartItems.find(i => i.categoria.toLowerCase().includes('montura'))?.precio || 0).toLocaleString('es-CO')}
                        </span>
                      </div>

                      {/* Accessories */}
                      {cartItems.filter(i => !i.categoria.toLowerCase().includes('montura')).map(item => (
                        <div key={item.id} className="flex justify-between items-center py-1.5">
                          <div>
                            <strong>{item.marca} - {item.modelo}</strong>
                            <p className="text-[9px] text-muted-foreground">Cantidad: {item.cantidad}</p>
                          </div>
                          <span className="font-mono font-bold text-foreground">$ {(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                        </div>
                      ))}

                    </div>
                  </div>

                  {/* Print Financial Breakdown */}
                  <div className="border-t border-border/60 pt-3 space-y-2.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">$ {generatedOrden.subtotal?.toLocaleString('es-CO')}</span>
                    </div>
                    {generatedOrden.descuentoCalculado && generatedOrden.descuentoCalculado > 0 ? (
                      <div className="flex justify-between text-xs text-destructive font-bold">
                        <span>Descuento Aplicado</span>
                        <span className="font-mono">-$ {generatedOrden.descuentoCalculado.toLocaleString('es-CO')}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-border/40 pt-2 text-sm text-foreground">
                      <span className="font-black">Total Contrato</span>
                      <span className="font-mono font-black text-primary">$ {generatedOrden.totalFinal?.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="flex justify-between text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                      <span className="font-extrabold">Abono / Anticipo Recibido</span>
                      <span className="font-mono font-extrabold">$ {generatedOrden.abono?.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                      <span>Saldo Pendiente Contra Entrega</span>
                      <span className="font-mono">$ {((generatedOrden.totalFinal || 0) - (generatedOrden.abono || 0)).toLocaleString('es-CO')}</span>
                    </div>
                  </div>

                </div>

                {/* Confirmations and Back Buttons */}
                <div className="flex justify-between pt-6 border-t border-border print:hidden">
                  <button
                    onClick={() => {
                      // Reset and create another order
                      setStep(1);
                      setGeneratedOrden(null);
                      setSelectedPatientId('');
                      setCartItems([]);
                      setPromoId('');
                      setAbono(0);
                    }}
                    className="bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold text-xs py-3 px-5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Nueva Órden
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrint}
                      className="bg-primary hover:bg-blue-600 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Órden
                    </button>
                    <button
                      onClick={() => router.push('/dashboard/asesor/entregas')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      Ver en Seguimiento
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Right pane: Real-time Order Summary Sidebar */}
        <div className="lg:col-span-1 print:hidden">
          <div className="bg-card/40 border border-border/80 backdrop-blur-md rounded-2xl p-5 shadow-sm space-y-5 sticky top-6">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <ShoppingBag className="w-4 h-4 text-primary animate-pulse" />
              Detalle de Cotización
            </h3>

            {/* Config details */}
            <div className="space-y-4 text-xs">
              
              {/* Patient */}
              {selectedPaciente ? (
                <div className="space-y-0.5 border-b border-border/40 pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Paciente</span>
                  <strong className="text-foreground">{selectedPaciente.nombre} {selectedPaciente.apellido}</strong>
                  <p className="text-[10px] text-muted-foreground">CC {selectedPaciente.documento}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic text-[11px] border-b border-border/40 pb-3">Seleccione un paciente en el paso 1...</p>
              )}

              {/* Formula overview */}
              {selectedPatientId && (
                <div className="space-y-1.5 border-b border-border/40 pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Fórmula de Refracción</span>
                  <div className="font-mono text-[10px] bg-secondary/20 p-2 rounded-lg grid grid-cols-2 gap-1.5">
                    <div>
                      <strong className="block text-[8px] text-muted-foreground">Ojo Derecho:</strong>
                      {odTransposed.esfera} / {odTransposed.cilindro} x {odTransposed.eje}°
                    </div>
                    <div>
                      <strong className="block text-[8px] text-muted-foreground">Ojo Izquierdo:</strong>
                      {oiTransposed.esfera} / {oiTransposed.cilindro} x {oiTransposed.eje}°
                    </div>
                  </div>
                </div>
              )}

              {/* Lenses and treatments price */}
              <div className="space-y-2 border-b border-border/40 pb-3">
                <span className="text-[10px] text-muted-foreground uppercase block font-bold">Configuración y Tratamientos</span>
                <div className="space-y-1 bg-secondary/15 p-2 rounded-lg">
                  <div className="flex justify-between">
                    <span>Lente Base Oftálmico (x2)</span>
                    <span className="font-mono font-bold">$ {(precioLenteBase * 2).toLocaleString('es-CO')}</span>
                  </div>
                  {precioTratamientos.desglose.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{d.concepto} (x2)</span>
                      <span className="font-mono">$ {(d.valor * 2).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border/30 pt-1.5 font-bold text-foreground">
                    <span>Total Lentes:</span>
                    <span className="font-mono">$ {((precioLenteBase + precioTratamientos.total) * 2).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>

              {/* Items from inventory (Frames & accessories) */}
              {cartItems.length > 0 && (
                <div className="space-y-2 border-b border-border/40 pb-3">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Artículos y Monturas</span>
                  <div className="space-y-1 bg-secondary/15 p-2 rounded-lg">
                    {cartItems.map(i => (
                      <div key={i.id} className="flex justify-between">
                        <span className="truncate max-w-[130px]" title={`${i.marca} ${i.modelo}`}>{i.marca} - {i.modelo}</span>
                        <span className="font-mono text-muted-foreground">x{i.cantidad} $ {(i.precio * i.cantidad).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">$ {subtotal.toLocaleString('es-CO')}</span>
                </div>
                {descuentoCalculado > 0 && (
                  <div className="flex justify-between text-xs text-destructive font-bold">
                    <span>Descuento</span>
                    <span className="font-mono">-$ {descuentoCalculado.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="border-t border-border/60 pt-2 flex justify-between items-end">
                  <span className="text-xs font-bold text-foreground">Total Liquidado</span>
                  <span className="text-lg font-black text-primary font-mono leading-none">
                    $ {totalFinal.toLocaleString('es-CO')}
                  </span>
                </div>

                {abono > 0 && (
                  <div className="space-y-1 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 text-[10px]">
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Abono Recibido:</span>
                      <span className="font-mono">$ {abono.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground font-semibold">
                      <span>Saldo Pendiente:</span>
                      <span className="font-mono">$ {Math.max(0, totalFinal - abono).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
