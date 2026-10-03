'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Printer, Save, FileText, User, 
  Tag, AlertCircle, Check, Search, ShieldAlert, Sparkles, Barcode as BarcodeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { Barcode } from '@/components/shared/barcode';
import { CompraDetalle, ProductoInventario, Proveedor } from '@/lib/types';
import Link from 'next/link';
import { useSessionUser } from '@/hooks/use-session-user';

export default function ComprasPage() {
  const { 
    inventario, proveedores, configuracionMargenes, 
    addCompra, addProveedor 
  } = useClinicStore();
  const { sedeId, empresaId, email } = useSessionUser();

  // Header State
  const [proveedorId, setProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');

  // Cart / Details State
  const [detallesCart, setDetallesCart] = useState<any[]>([]);

  // Item Input State
  const [scannedCode, setScannedCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [costoUnitario, setCostoUnitario] = useState(0);
  const [precioVentaSugerido, setPrecioVentaSugerido] = useState(0);
  const [precioVentaManual, setPrecioVentaManual] = useState(0);

  // Manual Product Search State
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [showManualResults, setShowManualResults] = useState(false);

  const matchingManualProducts = useMemo(() => {
    if (!manualSearchQuery.trim()) return [];
    const query = manualSearchQuery.toLowerCase();
    return inventario.filter(p => 
      p.marca.toLowerCase().includes(query) ||
      p.modelo.toLowerCase().includes(query) ||
      p.categoria.toLowerCase().includes(query) ||
      p.codigoBarras.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [manualSearchQuery, inventario]);

  // New Vendor Form Modal
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  // New Product Modal (When barcode is not found)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({
    codigoBarras: '',
    categoria: 'Monturas',
    marca: '',
    modelo: '',
    color: '',
    minStock: 5,
    codigoInvima: '',
    lote: '',
    vencimiento: ''
  });

  // Printable Labels State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printedItems, setPrintedItems] = useState<any[]>([]);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Handle barcode search
  const handleBarcodeSearch = (code: string) => {
    if (!code) return;
    // Find in inventory by barcode or ID
    const found = inventario.find(p => p.codigoBarras === code || p.id === code);
    if (found) {
      setSelectedProduct(found);
      setCostoUnitario(found.precioCompra || Math.round(found.precio * 0.5));
      // Suggested selling price
      const catMargen = configuracionMargenes.find(m => m.categoria.toLowerCase() === found.categoria.toLowerCase())?.porcentajeMargen || 100;
      const sugerido = Math.round((found.precioCompra || Math.round(found.precio * 0.5)) * (1 + catMargen / 100));
      setPrecioVentaSugerido(sugerido);
      setPrecioVentaManual(found.precioVenta || found.precio);
      toast.success(`Producto encontrado: ${found.marca} - ${found.modelo}`);
      setScannedCode('');
    } else {
      // Not found, open new product dialog
      setNewProductData({
        codigoBarras: code,
        categoria: 'Monturas',
        marca: '',
        modelo: '',
        color: '',
        minStock: 5,
        codigoInvima: '',
        lote: '',
        vencimiento: ''
      });
      setIsNewProductModalOpen(true);
      setScannedCode('');
    }
  };

  // Run calculation when cost changes
  useEffect(() => {
    if (costoUnitario > 0) {
      const cat = selectedProduct ? selectedProduct.categoria : newProductData.categoria;
      const catMargen = configuracionMargenes.find(m => m.categoria.toLowerCase() === cat.toLowerCase())?.porcentajeMargen || 100;
      const sugerido = Math.round(costoUnitario * (1 + catMargen / 100));
      setPrecioVentaSugerido(sugerido);
      setPrecioVentaManual(sugerido);
    }
  }, [costoUnitario, selectedProduct, newProductData.categoria]);

  // Keypress listener for scanner emulation (fast input ending with Enter)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(scannedCode);
    }
  };

  // Add Item to Purchase Details Cart
  const handleAddItemToCart = () => {
    if (!selectedProduct && !isNewProductModalOpen) {
      toast.warning('Debe seleccionar o escanear un producto primero');
      return;
    }
    if (cantidad <= 0) {
      toast.warning('La cantidad debe ser mayor a 0');
      return;
    }
    if (costoUnitario <= 0) {
      toast.warning('El costo unitario debe ser mayor a 0');
      return;
    }

    const item = {
      id: `DET-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      productoId: selectedProduct?.id,
      nombre: selectedProduct ? `${selectedProduct.marca} - ${selectedProduct.modelo}` : `${newProductData.marca} - ${newProductData.modelo}`,
      categoria: selectedProduct ? selectedProduct.categoria : newProductData.categoria,
      marca: selectedProduct ? selectedProduct.marca : newProductData.marca,
      modelo: selectedProduct ? selectedProduct.modelo : newProductData.modelo,
      color: selectedProduct ? selectedProduct.color : newProductData.color,
      cantidad,
      costoUnitario,
      precioVenta: precioVentaManual || precioVentaSugerido,
      codigoBarras: selectedProduct ? selectedProduct.codigoBarras : newProductData.codigoBarras,
      nuevoProductoJson: selectedProduct ? undefined : { ...newProductData },
      totalCost: cantidad * costoUnitario
    };

    setDetallesCart(prev => [...prev, item]);
    toast.success('Producto añadido a la factura de compra');

    // Reset Item inputs
    setSelectedProduct(null);
    setCantidad(1);
    setCostoUnitario(0);
    setPrecioVentaManual(0);
    setPrecioVentaSugerido(0);

    // Focus scanner field
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Handle New Product Submit from modal
  const handleCreateNewProductFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductData.marca || !newProductData.modelo) {
      toast.error('Marca y Modelo son obligatorios');
      return;
    }
    
    // Add to inputs
    setCostoUnitario(0);
    setIsNewProductModalOpen(false);
    toast.success(`Datos cargados para nuevo producto: ${newProductData.marca} ${newProductData.modelo}`);
  };

  // Handle Save Vendor
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.nombre || !newVendor.nit) {
      toast.error('Nombre y NIT son obligatorios');
      return;
    }
    const idProv = `PROV-${Date.now().toString().slice(-4)}`;
    addProveedor({
      id: idProv,
      empresaId: 'emp1',
      ...newVendor
    });
    setProveedorId(idProv);
    setIsNewVendorModalOpen(false);
    toast.success(`Proveedor "${newVendor.nombre}" registrado`);
    setNewVendor({ nombre: '', nit: '', telefono: '', email: '', direccion: '' });
  };

  // Remove Item from Cart
  const handleRemoveItem = (id: string) => {
    setDetallesCart(prev => prev.filter(item => item.id !== id));
    toast.success('Ítem removido');
  };

  // Submit Invoice Purchase to Zustand
  const handleSavePurchase = () => {
    if (!proveedorId) {
      toast.warning('Debe seleccionar un proveedor');
      return;
    }
    if (!numeroFactura) {
      toast.warning('Debe registrar el número de factura de compra');
      return;
    }
    if (detallesCart.length === 0) {
      toast.warning('No ha añadido ningún ítem a la compra');
      return;
    }

    const totalCompra = detallesCart.reduce((sum, d) => sum + d.totalCost, 0);
    const compraId = `COM-${Date.now().toString().slice(-6)}`;

    const compraData = {
      id: compraId,
      empresaId: empresaId || 'emp1',
      sedeId,
      proveedorId,
      numeroFactura,
      fechaCompra,
      valorCompra: totalCompra,
      registradoPor: email || 'admin',
      observaciones,
      detalles: detallesCart.map(d => ({
        id: d.id,
        compraId,
        productoId: d.productoId,
        nuevoProductoJson: d.nuevoProductoJson,
        cantidad: d.cantidad,
        costoUnitario: d.costoUnitario,
        precioVenta: d.precioVenta
      }))
    };

    addCompra(compraData);
    toast.success(`Factura de Compra ${numeroFactura} guardada con éxito. Inventario actualizado.`);

    // Load printed items to show barcode printer dialog
    setPrintedItems(detallesCart);
    setIsPrintModalOpen(true);

    // Reset Form
    setProveedorId('');
    setNumeroFactura('');
    setObservaciones('');
    setDetallesCart([]);
  };

  // Printable action
  const handlePrintLabels = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 print:bg-white print:p-0">
      
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-4 print:hidden">
        <Link href="/dashboard/admin/inventario" className="p-2 hover:bg-secondary rounded-xl transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingreso de Compras y Abastecimiento</h1>
          <p className="text-muted-foreground text-sm">Registra facturas de proveedores, añade stock mediante código de barras y genera precios por margen.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* Left Column (2/3): Invoice Details and Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Metadata Factura */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">1. Datos Generales de la Factura</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Proveedor</label>
                <div className="flex gap-2">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="flex-1 bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Seleccione...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (NIT: {p.nit})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsNewVendorModalOpen(true)}
                    className="bg-secondary hover:bg-secondary/80 border border-input px-2.5 rounded-xl text-xs font-bold text-foreground"
                    title="Nuevo Proveedor"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">N° de Factura</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: FE-10924"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Fecha de Compra</label>
                <input
                  type="date"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Observaciones</label>
              <textarea
                rows={2}
                placeholder="Notas de recepción, estado de la mercancía, etc."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Barcode scanner & manual search input */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <BarcodeIcon className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">2. Escaneo o Búsqueda de Productos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opción A: Escanear con Lector */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                  <BarcodeIcon className="w-24 h-24 text-primary" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Lector de Código de Barras
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Apunte con el lector y escanee..."
                        value={scannedCode}
                        onChange={(e) => setScannedCode(e.target.value)}
                        onKeyDown={handleBarcodeKeyDown}
                        className="flex-1 bg-background border border-primary/30 rounded-xl p-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => handleBarcodeSearch(scannedCode)}
                        className="bg-primary hover:bg-blue-600 text-white font-bold text-xs px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" /> Buscar
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    El lector USB ingresa automáticamente los caracteres y el carácter de control &quot;Enter&quot; al escanear.
                  </p>
                </div>
              </div>

              {/* Opción B: Digitación / Búsqueda Manual */}
              <div className="bg-secondary/20 border border-border p-4 rounded-xl space-y-3 relative flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
                      Digitación o Búsqueda Manual
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digita marca, modelo o código..."
                        value={manualSearchQuery}
                        onChange={(e) => {
                          setManualSearchQuery(e.target.value);
                          setShowManualResults(true);
                        }}
                        onFocus={() => setShowManualResults(true)}
                        onBlur={() => {
                          // delay so click triggers first
                          setTimeout(() => setShowManualResults(false), 200);
                        }}
                        className="w-full bg-background border border-border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                      
                      {/* Dropdown list of matched products */}
                      {showManualResults && manualSearchQuery.trim() !== '' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto z-30 divide-y divide-border/40">
                          {matchingManualProducts.length > 0 ? (
                            matchingManualProducts.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleBarcodeSearch(p.codigoBarras);
                                  setManualSearchQuery('');
                                  setShowManualResults(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-secondary/40 transition-colors text-xs block space-y-0.5"
                              >
                                <div className="font-bold text-foreground">{p.marca} - {p.modelo}</div>
                                <div className="text-[10px] text-muted-foreground flex justify-between">
                                  <span>Cat: {p.categoria}</span>
                                  <span className="font-mono">Código: {p.codigoBarras}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-muted-foreground">
                              No se encontraron productos coincidentes.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Digita para buscar un producto en el inventario por su nombre, marca o modelo sin necesidad del lector.
                  </p>
                </div>
              </div>
            </div>


            {/* Selected Product info & parameters input */}
            {(selectedProduct || isNewProductModalOpen) && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border/60 rounded-xl p-4 bg-secondary/20 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      {selectedProduct ? selectedProduct.categoria : newProductData.categoria}
                    </span>
                    <h4 className="font-bold text-sm text-foreground mt-2">
                      {selectedProduct ? `${selectedProduct.marca} - ${selectedProduct.modelo}` : `[PRODUCTO NUEVO] ${newProductData.marca} ${newProductData.modelo}`}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Código de Barras / SKU: <strong>{selectedProduct ? selectedProduct.codigoBarras : newProductData.codigoBarras}</strong>
                    </p>
                  </div>
                  {selectedProduct && (
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Stock actual</span>
                      <strong className="text-sm font-bold text-foreground">{selectedProduct.stock} uds</strong>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Cantidad a ingresar</label>
                    <input
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      className="w-full bg-background border border-input rounded-lg p-2 text-xs font-mono outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Costo Unitario ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={costoUnitario || ''}
                      onChange={(e) => setCostoUnitario(Number(e.target.value))}
                      className="w-full bg-background border border-input rounded-lg p-2 text-xs font-mono outline-none text-center"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">Venta Sugerida (Margen)</span>
                    <div className="bg-secondary/40 border border-border/80 text-foreground font-mono rounded-lg p-2 text-xs text-center font-bold">
                      $ {precioVentaSugerido.toLocaleString('es-CO')}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Precio Venta Real ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={precioVentaManual || ''}
                      onChange={(e) => setPrecioVentaManual(Number(e.target.value))}
                      className="w-full bg-background border border-primary/30 rounded-lg p-2 text-xs font-mono outline-none font-bold text-center text-primary"
                      placeholder={String(precioVentaSugerido)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsNewProductModalOpen(false);
                    }}
                    className="bg-secondary hover:bg-secondary/80 text-xs font-semibold px-4 py-2 rounded-xl text-muted-foreground"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className="bg-primary hover:bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Agregar Item a Factura
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Detalles Cart Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col min-h-[260px]">
            <div className="p-4 border-b border-border bg-secondary/15">
              <h3 className="font-bold text-foreground">3. Detalle de Ítems en Factura de Compra</h3>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 text-muted-foreground uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Código / Item</th>
                    <th className="px-4 py-3 font-bold">Categoría</th>
                    <th className="px-4 py-3 text-center font-bold">Cantidad</th>
                    <th className="px-4 py-3 text-right font-bold">Costo Unit.</th>
                    <th className="px-4 py-3 text-right font-bold">Precio Venta</th>
                    <th className="px-4 py-3 text-right font-bold">Costo Total</th>
                    <th className="px-4 py-3 text-right font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detallesCart.length > 0 ? (
                    detallesCart.map(item => (
                      <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{item.nombre}</div>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.codigoBarras} {item.color ? `| Col: ${item.color}` : ''}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.categoria}</td>
                        <td className="px-4 py-3 text-center font-bold font-mono">{item.cantidad}</td>
                        <td className="px-4 py-3 text-right font-mono">$ {item.costoUnitario.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">$ {item.precioVenta.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold font-mono">$ {item.totalCost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <BarcodeIcon className="w-10 h-10 mx-auto mb-2 text-primary opacity-20" />
                        <p className="font-semibold">No ha ingresado ningún ítem a la factura de compra.</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Use el lector de código de barras arriba para escanear productos y sumarlos.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Summary & Vendor Configuration */}
        <div className="space-y-6">
          
          {/* Resumen Factura */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Resumen de Recepción
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Factura N°:</span>
                <strong className="text-foreground">{numeroFactura || 'Sin registrar'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ítems totales:</span>
                <strong className="text-foreground">{detallesCart.reduce((sum, d) => sum + d.cantidad, 0)} uds</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referencias únicas:</span>
                <strong className="text-foreground">{detallesCart.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nuevos productos a crear:</span>
                <strong className="text-foreground font-black text-amber-500">
                  {detallesCart.filter(d => d.nuevoProductoJson).length}
                </strong>
              </div>
              <div className="border-t border-border pt-3 mt-2 flex justify-between items-end">
                <span className="font-semibold text-foreground">Total Inversión (Costo)</span>
                <span className="text-lg font-black text-primary font-mono leading-none">
                  $ {detallesCart.reduce((sum, d) => sum + d.totalCost, 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            <button
              onClick={handleSavePurchase}
              disabled={detallesCart.length === 0 || !proveedorId || !numeroFactura}
              className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-sans mt-4"
            >
              <Save className="w-4 h-4" />
              Guardar Factura e Imprimir Etiquetas
            </button>
          </div>

          {/* Márgenes de Venta Actuales */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-primary" />
                Márgenes por Categoría
              </h3>
              <Link href="/dashboard/admin/configuracion" className="text-[10px] text-primary font-bold hover:underline">
                Configurar
              </Link>
            </div>
            
            <div className="space-y-2.5">
              {configuracionMargenes.map(margen => (
                <div key={margen.id} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{margen.categoria}</span>
                  <span className="bg-secondary px-2 py-0.5 rounded font-mono font-bold text-foreground">
                    +{margen.porcentajeMargen}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Nuevo Proveedor */}
      {isNewVendorModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-xl max-w-sm w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Registrar Nuevo Proveedor</h3>
              <button 
                onClick={() => setIsNewVendorModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVendor} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nombre / Razón Social</label>
                <input 
                  type="text" 
                  required
                  value={newVendor.nombre}
                  onChange={e => setNewVendor({...newVendor, nombre: e.target.value})}
                  placeholder="Co-Opticas Ltda"
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">NIT</label>
                  <input 
                    type="text" 
                    required
                    value={newVendor.nit}
                    onChange={e => setNewVendor({...newVendor, nit: e.target.value})}
                    placeholder="900.111.222-3"
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    required
                    value={newVendor.telefono}
                    onChange={e => setNewVendor({...newVendor, telefono: e.target.value})}
                    placeholder="3005556677"
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Email</label>
                <input 
                  type="email" 
                  value={newVendor.email}
                  onChange={e => setNewVendor({...newVendor, email: e.target.value})}
                  placeholder="ventas@proveedor.com"
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Dirección</label>
                <input 
                  type="text" 
                  value={newVendor.direccion}
                  onChange={e => setNewVendor({...newVendor, direccion: e.target.value})}
                  placeholder="Calle 13 # 20-30"
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t border-border mt-4">
                <button 
                  type="button"
                  onClick={() => setIsNewVendorModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Confirmación Creación Producto Nuevo al Escanear */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-md w-full"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">¡Producto no registrado en Catálogo!</h3>
                <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                  El código de barras <strong>{newProductData.codigoBarras}</strong> no coincide con ninguna referencia existente. Complete la información a continuación para ingresarlo como nueva referencia.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateNewProductFromModal} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Categoría</label>
                <select
                  value={newProductData.categoria}
                  onChange={e => setNewProductData({...newProductData, categoria: e.target.value})}
                  className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Monturas">Monturas</option>
                  <option value="Lentes Oftálmicos">Lentes Oftálmicos</option>
                  <option value="Lentes de Contacto">Lentes de Contacto</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Marca</label>
                  <input 
                    type="text" 
                    required
                    value={newProductData.marca}
                    onChange={e => setNewProductData({...newProductData, marca: e.target.value})}
                    placeholder="Ray-Ban"
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Modelo</label>
                  <input 
                    type="text" 
                    required
                    value={newProductData.modelo}
                    onChange={e => setNewProductData({...newProductData, modelo: e.target.value})}
                    placeholder="Erika 4171"
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Color</label>
                  <input 
                    type="text" 
                    value={newProductData.color}
                    onChange={e => setNewProductData({...newProductData, color: e.target.value})}
                    placeholder="Black Velvet"
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">Stock Mínimo</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={newProductData.minStock}
                    onChange={e => setNewProductData({...newProductData, minStock: Number(e.target.value) || 5})}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3 mt-1.5 space-y-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">Regulación Invima y Lote</span>
                <div className="grid grid-cols-1 gap-2">
                  <input 
                    type="text" 
                    placeholder="Registro INVIMA, ej: 2021DM-0012458"
                    value={newProductData.codigoInvima}
                    onChange={e => setNewProductData({...newProductData, codigoInvima: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="N° Lote"
                    value={newProductData.lote}
                    onChange={e => setNewProductData({...newProductData, lote: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input 
                    type="date" 
                    value={newProductData.vencimiento}
                    onChange={e => setNewProductData({...newProductData, vencimiento: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                <button 
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
                >
                  Cargar Datos de Nueva Referencia
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal / Print Overlay: Barcode Label Generation */}
      {isPrintModalOpen && printedItems.length > 0 && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 print:absolute print:inset-0 print:bg-white print:p-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full flex flex-col space-y-4 print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Impresión de Etiquetas de Barra (Code 128)</h3>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                Cerrar
              </button>
            </div>

            {/* Label sheet printable element */}
            <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-6 max-h-96 overflow-y-auto print:border-none print:bg-white print:p-0 print:max-h-none print:overflow-visible">
              
              {/* CSS print override rule */}
              <style jsx global>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #print-area, #print-area * {
                    visibility: visible;
                  }
                  #print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                    background: white;
                  }
                  .print-label {
                    page-break-inside: avoid;
                    break-inside: avoid;
                    display: inline-flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    width: 50mm !important;
                    height: 25mm !important;
                    margin: 2mm !important;
                    border: 1px solid #ddd !important;
                    padding: 1mm !important;
                    box-sizing: border-box !important;
                  }
                }
              `}</style>

              <div id="print-area" className="grid grid-cols-2 gap-4 justify-items-center print:flex print:flex-wrap print:justify-center">
                {printedItems.map((item) => (
                  // Generate labels according to item count
                  Array.from({ length: item.cantidad }).map((_, i) => (
                    <div 
                      key={`${item.id}-${i}`}
                      className="print-label bg-white border border-border p-3 rounded-lg flex flex-col items-center justify-center text-center w-[50mm] h-[25mm] shadow-sm select-none"
                    >
                      <span className="text-[7px] uppercase font-bold text-foreground font-sans line-clamp-1 block">
                        OptiSaaS — {item.marca}
                      </span>
                      <span className="text-[6px] text-muted-foreground font-semibold block line-clamp-1">
                        Mod: {item.modelo} {item.color ? `| Col: ${item.color}` : ''}
                      </span>
                      
                      {/* Interactive Barcode vector rendering */}
                      <div className="w-full flex justify-center py-1 overflow-hidden h-[12mm]">
                        <Barcode 
                          value={item.codigoBarras} 
                          width={0.8} 
                          height={20} 
                          displayValue={false} 
                          margin={0} 
                        />
                      </div>
                      
                      <span className="text-[7px] font-mono font-bold text-foreground mt-0.5 tracking-widest block">
                        {item.codigoBarras}
                      </span>
                    </div>
                  ))
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border print:hidden">
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Volver a Inventario
              </button>
              <button 
                onClick={handlePrintLabels}
                className="bg-primary text-primary-foreground hover:bg-blue-600 px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir en Impresora de Etiquetas (50x25mm)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
