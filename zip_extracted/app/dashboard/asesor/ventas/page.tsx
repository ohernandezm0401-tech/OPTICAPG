'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  ShoppingBag, 
  Plus, 
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  User,
  History,
  Store,
  ArrowRight,
  TrendingUp,
  Tag,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Lock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { FacturaModal } from '@/components/pos/factura-modal';
import { Paciente, ProductoInventario, Promocion } from '@/lib/types';
import { toast } from '@/lib/toast-store';

export default function VentasPage() {
  const router = useRouter();
  const { citas, pacientes, inventario, promociones, cajaSesionActiva, completeCitaPago } = useClinicStore();
  
  // Tab control: 'pos' (terminal) or 'history' (auditoría)
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Factura Search states for reprint (Advisors can only reprint by entering exact Invoice ID)
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [searchError, setSearchError] = useState(false);
  const [searchedInvoice, setSearchedInvoice] = useState<any>(null);

  const handleInvoiceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = invoiceSearchQuery.trim().toUpperCase();
    if (!query) {
      setSearchedInvoice(null);
      setSearchError(false);
      return;
    }
    const found = citasPagadas.find(
      c => (c.facturaId || '').toUpperCase() === query || c.id.toUpperCase() === query
    );
    if (found) {
      setSearchedInvoice(found);
      setSearchError(false);
      toast.success('Factura encontrada con éxito');
    } else {
      setSearchedInvoice(null);
      setSearchError(true);
      toast.error('Factura no encontrada en el turno actual');
    }
  };

  // POS State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [cartItems, setCartItems] = useState<{ id: string; marca: string; modelo: string; categoria: string; cantidad: number; precio: number; stock: number }[]>([]);
  const [promoId, setPromoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barcode Scanner State
  const [barcodeInputVal, setBarcodeInputVal] = useState('');

  // Checkout modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Load patientId from query string on mount (if redirected from dashboard or clinical area)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const patientId = params.get('patientId');
      if (patientId) {
        setSelectedPatientId(patientId);
        toast.info('Paciente seleccionado para compra de vitrina');
      }
    }
  }, [pacientes]);

  const selectedPaciente = useMemo(() => {
    return pacientes.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, pacientes]);

  // Filter inventory to show only POS retail products (monturas, contacto, insumos, accesorios)
  // We exclude Lentes Oftálmicos because they require the Sales Orders lab wizard module.
  const filteredProducts = useMemo(() => {
    return inventario.filter(prod => {
      // Exclude ophthalmic laboratory lenses since they are sold via "Órdenes de Venta"
      if (prod.categoria === 'Lentes Oftálmicos') return false;

      const matchesCategory = selectedCategory === 'Todos' || prod.categoria === selectedCategory;
      const matchesSearch = 
        prod.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventario, selectedCategory, searchQuery]);

  // Active promotions
  const promocionesActivas = useMemo(() => promociones.filter(p => p.activa), [promociones]);

  // Real-time Promo Eligibility & Constraints Evaluation
  const validarPromocionParaCarrito = (promo: Promocion, cart: typeof cartItems) => {
    const ahora = new Date();
    
    // Fechas
    const inicio = new Date(promo.fechaInicio + 'T00:00:00');
    const fin = new Date(promo.fechaFin + 'T23:59:59');
    if (ahora < inicio) return { valida: false, razon: 'No iniciada' };
    if (ahora > fin) return { valida: false, razon: 'Vencida' };
    
    // Contenido del Carrito
    if (cart.length === 0) return { valida: false, razon: 'Carrito vacío' };

    const tieneLentes = cart.some(item => item.categoria.toLowerCase().includes('lente'));
    const tieneMonturas = cart.some(item => item.categoria.toLowerCase().includes('montura'));

    if (promo.tipo === 'combo' && (!tieneLentes || !tieneMonturas)) {
      return { valida: false, razon: 'Requiere Lente + Montura' };
    }

    if (promo.aplicableA === 'lentes' && !tieneLentes) {
      return { valida: false, razon: 'Falta Lente' };
    }

    if (promo.aplicableA === 'monturas' && !tieneMonturas) {
      return { valida: false, razon: 'Falta Montura' };
    }

    return { valida: true };
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }, [cartItems]);

  const descuentoCalculado = useMemo(() => {
    if (!promoId) return 0;
    const promo = promociones.find(p => p.id === promoId);
    if (!promo) return 0;

    const validation = validarPromocionParaCarrito(promo, cartItems);
    if (!validation.valida) return 0;

    let subtotalLentes = 0;
    let subtotalMonturas = 0;

    cartItems.forEach(item => {
      const valorItem = item.precio * item.cantidad;
      if (item.categoria.toLowerCase().includes('lente')) {
        subtotalLentes += valorItem;
      } else if (item.categoria.toLowerCase().includes('montura')) {
        subtotalMonturas += valorItem;
      }
    });

    let desc = 0;
    if (promo.tipo === 'porcentaje' || promo.tipo === 'combo' || promo.tipo === 'segunda-unidad') {
      const pct = promo.valor / 100;
      if (promo.aplicableA === 'lentes') {
        desc = Math.round(subtotalLentes * pct);
      } else if (promo.aplicableA === 'monturas') {
        desc = Math.round(subtotalMonturas * pct);
      } else {
        desc = Math.round(subtotal * pct);
      }
    } else if (promo.tipo === 'monto-fijo') {
      desc = promo.valor;
    }

    return Math.min(desc, subtotal);
  }, [promoId, cartItems, subtotal, promociones]);

  const totalFinal = useMemo(() => {
    return subtotal - descuentoCalculado;
  }, [subtotal, descuentoCalculado]);

  // IVA 19% Incluido detail
  const ivaCalculado = useMemo(() => {
    return Math.round(totalFinal * 0.19 / 1.19);
  }, [totalFinal]);

  // Cart Functions
  const handleAddToCart = (product: ProductoInventario) => {
    if (product.stock <= 0) {
      toast.error('Este producto no cuenta con existencias en stock');
      return;
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cantidad >= product.stock) {
          toast.warning(`No puedes agregar más unidades. Stock disponible: ${product.stock}`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
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
    toast.success(`${product.marca} agregada al carrito`);
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = barcodeInputVal.trim();
      if (!code) return;

      const found = inventario.find(p => p.codigoBarras === code || p.id === code);
      if (found) {
        if (found.categoria === 'Lentes Oftálmicos') {
          toast.warning('Los lentes oftálmicos de laboratorio deben cotizarse a través del módulo Órdenes de Venta.');
        } else {
          handleAddToCart(found);
        }
      } else {
        toast.error(`Producto con código "${code}" no encontrado en el inventario.`);
      }
      setBarcodeInputVal('');
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const nuevaCant = item.cantidad + delta;
          if (nuevaCant <= 0) return null;
          if (nuevaCant > item.stock) {
            toast.warning(`Cantidad máxima alcanzada. Stock disponible: ${item.stock}`);
            return item;
          }
          return { ...item, cantidad: nuevaCant };
        }
        return item;
      }).filter(Boolean) as typeof cartItems;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    toast.success('Producto removido del carrito');
  };

  const handleProcederPago = () => {
    if (!selectedPatientId) {
      toast.warning('Por favor selecciona un cliente/paciente para la venta');
      return;
    }
    if (cartItems.length === 0) {
      toast.warning('El carrito de compras está vacío');
      return;
    }
    setModalOpen(true);
  };

  // AUDIT TAB Calculations
  const citasPagadas = useMemo(() => citas.filter(c => c.estadoComercial === 'pagado'), [citas]);
  const totalFacturadoHoy = useMemo(() => citasPagadas.reduce((sum, c) => sum + (c.montoCobrado || 0), 0), [citasPagadas]);
  const totalDescuentosHoy = useMemo(() => citasPagadas.reduce((sum, c) => sum + (c.descuentoAplicado || 0), 0), [citasPagadas]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header and Tab switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Venta de Vitrina (POS)</h1>
          <p className="text-muted-foreground text-sm">Registro rápido de ventas de mostrador: monturas, gafas de sol, lentes de contacto y accesorios.</p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="bg-secondary/40 p-1 rounded-xl border border-border flex items-center gap-1">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'pos' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Store className="w-4 h-4 text-primary" />
            Terminal de Venta
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <History className="w-4 h-4 text-primary" />
            Historial de Facturas ({citasPagadas.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pos' ? (
          <motion.div
            key="pos-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Area (2/3): Catalog */}
            <div className="lg:col-span-2 space-y-6 flex flex-col">
              
              {/* Patient Selector */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Asociar Cliente</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <select
                      value={selectedPatientId}
                      onChange={(e) => {
                        setSelectedPatientId(e.target.value);
                        setCartItems([]);
                        setPromoId('');
                      }}
                      className="w-full bg-background border border-input rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Selecciona un paciente/cliente...</option>
                      {pacientes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.apellido} (C.C. {p.documento})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-start text-xs text-muted-foreground">
                    Asocie la venta a un cliente registrado para facturación electrónica DIAN.
                  </div>
                </div>
              </div>

              {/* Product Catalog search and filter */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    Catálogo de Productos
                  </h3>

                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar por marca o modelo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Category tabs */}
                <div className="flex flex-wrap gap-1.5 border-b border-border pb-3">
                  {['Todos', 'Monturas', 'Lentes de Contacto', 'Insumos'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedCategory === cat ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary/45 border border-border/40 hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[450px] pr-1">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(prod => {
                      const yaEnCarrito = cartItems.find(item => item.id === prod.id);
                      const esAgotado = prod.stock <= 0;

                      return (
                        <div 
                          key={prod.id}
                          className={`border border-border rounded-xl p-4 bg-background shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${esAgotado ? 'opacity-65' : 'hover:border-primary/40'}`}
                        >
                          <div>
                            <span className="text-[9px] uppercase font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                              {prod.categoria}
                            </span>
                            <h4 className="font-bold text-sm text-foreground mt-2 leading-tight">
                              {prod.marca}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium line-clamp-1">
                              {prod.modelo}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Color: {prod.color}</p>
                          </div>

                          <div className="mt-4 border-t border-border/50 pt-3 flex justify-between items-center">
                            <div>
                              <span className="text-xs text-muted-foreground block">Precio</span>
                              <span className="font-mono text-sm font-bold text-foreground">$ {prod.precio.toLocaleString('es-CO')}</span>
                            </div>

                            <button
                              disabled={esAgotado}
                              onClick={() => handleAddToCart(prod)}
                              className={`p-2 rounded-lg transition-all ${esAgotado ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-blue-600 text-white shadow-sm'}`}
                              title={esAgotado ? 'Agotado' : 'Agregar al Carrito'}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex justify-between items-center text-[10px] mt-2 text-muted-foreground">
                            <span>Disp: <strong className={prod.stock <= prod.minStock ? 'text-warning font-bold' : ''}>{prod.stock} u.</strong></span>
                            {yaEnCarrito && (
                              <span className="text-success font-semibold">({yaEnCarrito.cantidad} en carro)</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-3 py-10 flex flex-col items-center justify-center text-muted-foreground">
                      <HelpCircle className="w-10 h-10 mb-2 text-primary opacity-20" />
                      <p className="font-semibold text-sm">No encontramos productos en esta categoría</p>
                      <p className="text-xs text-muted-foreground">Intenta buscando con otro término.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Area (1/3): Shopping Cart & Checkout */}
            <div className="space-y-6">
              
              {/* Shopping Cart Summary */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col min-h-[460px] justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Carrito POS
                    </h3>
                    <span className="bg-secondary text-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {cartItems.length} Items
                    </span>
                  </div>

                  {/* Lector de código de barras */}
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 relative overflow-hidden">
                    <label className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-primary animate-pulse" />
                      Escáner de Código de Barras (Vitrina)
                    </label>
                    <input
                      type="text"
                      placeholder="Escanee el código de barras..."
                      value={barcodeInputVal}
                      onChange={(e) => setBarcodeInputVal(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      className="w-full bg-background border border-primary/30 rounded-lg p-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                    />
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Haga clic en la caja superior y use el lector láser para agregar monturas o accesorios instantáneamente.
                    </p>
                  </div>

                  {/* Cart list */}
                  <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1 divide-y divide-border/40 scrollbar-thin">
                    {cartItems.length > 0 ? (
                      cartItems.map(item => (
                        <div key={item.id} className="flex justify-between items-start pt-3 first:pt-0 group">
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-xs text-foreground truncate max-w-[140px]" title={`${item.marca} ${item.modelo}`}>
                              {item.marca} - {item.modelo}
                            </h4>
                            <p className="text-[10px] text-muted-foreground uppercase">{item.categoria}</p>
                            <span className="text-[10px] font-mono text-muted-foreground">$ {item.precio.toLocaleString('es-CO')}</span>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5 bg-secondary/60 border border-border p-1 rounded-lg">
                              <button
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="p-0.5 hover:bg-background rounded transition-colors text-muted-foreground"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-mono font-bold w-4 text-center">{item.cantidad}</span>
                              <button
                                onClick={() => handleUpdateQty(item.id, 1)}
                                className="p-0.5 hover:bg-background rounded transition-colors text-muted-foreground"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
                        <ShoppingBag className="w-8 h-8 mb-2 opacity-25 text-primary" />
                        <p className="font-semibold text-xs">El carrito está vacío</p>
                        <p className="text-[10px] text-muted-foreground">Escanee o seleccione productos a la izquierda.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Convenios / Promociones */}
                <div className="border-t border-border pt-4 mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground block flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      Campaña / Convenio Aplicable
                    </label>
                    <select
                      value={promoId}
                      onChange={(e) => setPromoId(e.target.value)}
                      disabled={cartItems.length === 0}
                      className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    >
                      <option value="">Ninguno (Venta a precio de lista)</option>
                      {promocionesActivas.map(p => {
                        const validation = validarPromocionParaCarrito(p, cartItems);
                        return (
                          <option key={p.id} value={p.id} disabled={!validation.valida}>
                            {p.nombre} ({p.tipo === 'monto-fijo' ? `$ ${p.valor.toLocaleString('es-CO')}` : `${p.valor}%`})
                            {!validation.valida ? ` - [❌ ${validation.razon}]` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Summary Pricing breakdown */}
                  <div className="bg-secondary/15 rounded-xl p-4 border border-border space-y-2.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold">$ {subtotal.toLocaleString('es-CO')}</span>
                    </div>

                    {descuentoCalculado > 0 && (
                      <div className="flex justify-between text-xs text-destructive font-semibold">
                        <span>Descuento aplicado</span>
                        <span className="font-mono">-$ {descuentoCalculado.toLocaleString('es-CO')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[10px] text-muted-foreground italic">
                      <span>IVA Incluido (19%)</span>
                      <span className="font-mono">$ {ivaCalculado.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="border-t border-border/60 pt-2 flex justify-between items-end">
                      <span className="text-xs font-bold text-foreground">Total Vitrina</span>
                      <span className="text-xl font-black text-primary font-mono leading-none">
                        $ {totalFinal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  {(!cajaSesionActiva || cajaSesionActiva.estado !== 'abierta') ? (
                    <div className="space-y-2">
                      <button
                        disabled
                        className="w-full bg-destructive/15 text-destructive border border-destructive/25 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-not-allowed text-xs"
                      >
                        <Lock className="w-4 h-4" />
                        Caja Cerrada
                      </button>
                      <p className="text-[10px] text-destructive text-center font-semibold">
                        Por favor abra la caja chica en el <span className="underline cursor-pointer font-extrabold hover:text-red-700" onClick={() => router.push('/dashboard/asesor')}>Dashboard Comercial</span> antes de facturar.
                      </p>
                    </div>
                  ) : (
                     <button
                      onClick={handleProcederPago}
                      disabled={isSubmitting || cartItems.length === 0 || !selectedPatientId}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-sans animate-pulse"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          Proceder al Pago
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Box Office / cashier metrics removed for Advisor view */}

            {/* Paid Invoices List */}
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-sm flex flex-col min-h-[300px]">
              <div className="p-4 border-b border-border bg-secondary/15 flex justify-between items-center">
                <h3 className="font-bold text-foreground">Historial de Facturas del Turno (DIAN)</h3>
              </div>
              <div className="p-5 flex-grow flex flex-col space-y-4">
                
                {/* Search Form */}
                <form onSubmit={handleInvoiceSearch} className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    placeholder="Ingrese el Factura ID exacto (ej: FAC-001)..."
                    className="flex-grow bg-background border border-input rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary text-foreground uppercase"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    Buscar Factura
                  </button>
                </form>

                <hr className="border-border/50" />

                {/* Search Result */}
                {searchedInvoice ? (
                  <div className="overflow-x-auto border border-border rounded-xl bg-background p-3 animate-in slide-in-from-top-2">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-secondary/20">
                        <tr>
                          <th className="px-4 py-2 font-semibold rounded-l-lg">Factura ID</th>
                          <th className="px-4 py-2 font-semibold">Cliente</th>
                          <th className="px-4 py-2 font-semibold text-center">Método</th>
                          <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        <tr className="hover:bg-secondary/10 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {searchedInvoice.facturaId || 'FAC-MOCK'}
                            {searchedInvoice.cufe && (
                              <span className="block text-[8px] text-muted-foreground truncate max-w-[200px]" title={searchedInvoice.cufe}>
                                CUFE: {searchedInvoice.cufe}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const pac = pacientes.find(p => p.id === searchedInvoice.pacienteId);
                              return (
                                <>
                                  <div className="font-bold text-foreground">{pac?.nombre} {pac?.apellido}</div>
                                  <div className="text-[10px] text-muted-foreground">CC {pac?.documento}</div>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 bg-secondary border border-border rounded font-bold uppercase tracking-wider text-[10px]">
                              {searchedInvoice.metodoPago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <a 
                                href={searchedInvoice.pdfUrl}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 font-bold text-[11px] bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> PDF / Reimprimir
                              </a>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : searchError ? (
                  <div className="py-10 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-1">
                    <Search className="w-8 h-8 opacity-25 text-destructive animate-pulse" />
                    <span className="font-bold text-destructive">Factura no encontrada</span>
                    <span>Asegúrese de ingresar el código ID exacto. Solo se pueden reimprimir facturas de su turno activo.</span>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-1">
                    <Lock className="w-8 h-8 opacity-25 text-primary" />
                    <span className="font-bold text-foreground">Consulta de Facturas Protegida</span>
                    <span>Ingrese el código de Factura ID exacto arriba para buscar y reimprimir el soporte de compra del cliente.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      {modalOpen && selectedPaciente && (
        <FacturaModal 
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setCartItems([]);
            setPromoId('');
            setSelectedPatientId('');
          }}
          citaId="DIRECTO"
          pacienteInfo={{
            nombre: selectedPaciente.nombre,
            apellido: selectedPaciente.apellido,
            documento: selectedPaciente.documento
          }}
          cartItems={cartItems}
          subtotal={subtotal}
          promoId={promoId}
          descuentoCalculado={descuentoCalculado}
          totalFinal={totalFinal}
        />
      )}

    </div>
  );
}
