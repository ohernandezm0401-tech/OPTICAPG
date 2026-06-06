'use client';

import React, { useState } from 'react';
import { Package, Search, Plus, Filter, AlertTriangle, ArrowDownUp, Edit, Tag, X, Cpu, Database, RefreshCw, Check, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { ProductoInventario } from '@/lib/types';
import { LENTES_COMERCIALES_CATALOGO } from '@/lib/lentes-catalog';
import Link from 'next/link';
import { Barcode } from '@/components/shared/barcode';

export default function InventarioPage() {
  const { inventario, proveedores, addProducto, updateStock } = useClinicStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    categoria: 'Monturas',
    marca: '',
    modelo: '',
    color: '',
    stock: 0,
    minStock: 5,
    precio: 0,
    precioCompra: 0,
    codigoInvima: '',
    lote: '',
    vencimiento: '',
    proveedorId: ''
  });

  // Adjust Stock Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductoInventario | null>(null);
  const [newStockVal, setNewStockVal] = useState(0);

  // Label print Modal State
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<ProductoInventario | null>(null);
  const [labelQty, setLabelQty] = useState(1);

  const filteredInventario = inventario.filter(item => 
    item.marca.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const valorStockEstimado = inventario.reduce((sum, item) => sum + item.stock * item.precio, 0);

  const formatCurrencyShort = (val: number) => {
    if (val >= 1000000) {
      return `$ ${(val / 1000000).toFixed(2)}M`;
    }
    if (val >= 1000) {
      return `$ ${(val / 1000).toFixed(0)}K`;
    }
    return `$ ${val}`;
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const idNuevo = `INV-${String(inventario.length + 1).padStart(3, '0')}`;
    const productToAdd: ProductoInventario = {
      ...newProduct,
      id: idNuevo,
      precioCompra: newProduct.precioCompra || Math.round(newProduct.precio * 0.5),
      precioVenta: newProduct.precio,
      codigoBarras: idNuevo
    };
    addProducto(productToAdd);
    toast.success(`Producto ${productToAdd.marca} ${productToAdd.modelo} agregado exitosamente`);
    setIsAddModalOpen(false);
    // Reset state
    setNewProduct({
      categoria: 'Monturas',
      marca: '',
      modelo: '',
      color: '',
      stock: 0,
      minStock: 5,
      precio: 0,
      precioCompra: 0,
      codigoInvima: '',
      lote: '',
      vencimiento: '',
      proveedorId: ''
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      updateStock(selectedProduct.id, newStockVal);
      toast.success(`Stock de ${selectedProduct.marca} actualizado a ${newStockVal} uds`);
      setIsStockModalOpen(false);
    }
  };

  const openStockModal = (product: ProductoInventario) => {
    setSelectedProduct(product);
    setNewStockVal(product.stock);
    setIsStockModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario & Stock</h1>
          <p className="text-muted-foreground text-sm">Control de monturas, lentes oftálmicos, lentes de contacto e insumos de la sede.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link 
            href="/dashboard/admin/compras"
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Compra / Factura
          </Link>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ingresar Producto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="text-sm font-semibold text-muted-foreground mb-1">Total Referencias</div>
          <div className="text-2xl font-bold">{inventario.length}</div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="text-sm font-semibold text-muted-foreground mb-1">Valor Stock (Estimado)</div>
          <div className="text-2xl font-bold">{formatCurrencyShort(valorStockEstimado)}</div>
        </div>
        <div className="bg-card border border-destructive/30 p-4 rounded-xl shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
          <div className="text-sm font-semibold text-destructive mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Alertas de Stock Bajo
          </div>
          <div className="text-2xl font-bold text-destructive">
            {inventario.filter(i => i.stock < i.minStock).length}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        {/* Filters and Search */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por código, marca o modelo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors flex-1 sm:flex-none">
              <Filter className="w-4 h-4" /> Categoría
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-input bg-background rounded-lg hover:bg-secondary transition-colors flex-1 sm:flex-none">
              <ArrowDownUp className="w-4 h-4" /> Ordenar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">Código / Producto</th>
                <th className="px-6 py-3 font-semibold">Categoría</th>
                <th className="px-6 py-3 font-semibold">Stock Actual</th>
                <th className="px-6 py-3 font-semibold">Precio / Costo (Margen)</th>
                <th className="px-6 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventario.length > 0 ? (
                filteredInventario.map((item, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id} 
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        {item.marca} - {item.modelo}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono flex flex-wrap items-center gap-2">
                        <span>{item.id} | Color: {item.color}</span>
                        {item.proveedorId && (
                          <span className="text-primary font-sans font-semibold">
                            Proveedor: {proveedores.find(p => p.id === item.proveedorId)?.nombre || item.proveedorId}
                          </span>
                        )}
                        {item.codigoBarras && (
                          <span className="bg-secondary/80 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border">
                            Código: {item.codigoBarras}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {item.categoria}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.stock < item.minStock ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-success/10 text-success border border-success/20'
                        }`}>
                          {item.stock} uds
                        </span>
                        {item.stock < item.minStock && (
                          <span className="text-[10px] text-destructive">Mín: {item.minStock} (Requiere Pedido)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">$ {item.precioVenta.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        Costo: $ {(item.precioCompra || 0).toLocaleString()} 
                        <span className="text-emerald-600 ml-1.5 font-bold">
                          ({item.precioCompra ? Math.round(((item.precioVenta - item.precioCompra) / item.precioVenta) * 100) : 100}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openStockModal(item)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" 
                          title="Ajuste Inventario (Movimiento)"
                        >
                          <ArrowDownUp className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProductForLabel(item);
                            setLabelQty(1);
                            setIsLabelModalOpen(true);
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Imprimir Código de Barras"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Ver Detalles">
                          <Tag className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar Producto">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Ingresar Producto */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Ingresar Nuevo Producto</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Categoría</label>
                <select 
                  value={newProduct.categoria}
                  onChange={e => setNewProduct({...newProduct, categoria: e.target.value})}
                  className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Monturas">Monturas</option>
                  <option value="Lentes Oftálmicos">Lentes Oftálmicos</option>
                  <option value="Lentes de Contacto">Lentes de Contacto</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Proveedor Autorizado</label>
                <select 
                  value={newProduct.proveedorId}
                  onChange={e => setNewProduct({...newProduct, proveedorId: e.target.value})}
                  className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (NIT: {p.nit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Marca</label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.marca}
                    onChange={e => setNewProduct({...newProduct, marca: e.target.value})}
                    placeholder="Ray-Ban"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Modelo</label>
                  <input 
                    type="text" 
                    required
                    value={newProduct.modelo}
                    onChange={e => setNewProduct({...newProduct, modelo: e.target.value})}
                    placeholder="Aviator"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Color</label>
                  <input 
                    type="text" 
                    value={newProduct.color}
                    onChange={e => setNewProduct({...newProduct, color: e.target.value})}
                    placeholder="Gold"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Costo Compra</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newProduct.precioCompra}
                    onChange={e => setNewProduct({...newProduct, precioCompra: parseInt(e.target.value) || 0})}
                    placeholder="325000"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Precio Venta</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newProduct.precio}
                    onChange={e => setNewProduct({...newProduct, precio: parseInt(e.target.value) || 0})}
                    placeholder="650000"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1">
                  {newProduct.precio > 0 && (
                    <div className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg p-2 font-bold text-center">
                      Margen: {Math.round(((newProduct.precio - newProduct.precioCompra) / newProduct.precio) * 100)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Stock Inicial</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newProduct.stock}
                    onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                    placeholder="10"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Stock Mínimo</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={newProduct.minStock}
                    onChange={e => setNewProduct({...newProduct, minStock: parseInt(e.target.value) || 5})}
                    placeholder="5"
                    className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">Información de Regulación (Opcional)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Código INVIMA</label>
                    <input 
                      type="text" 
                      value={newProduct.codigoInvima}
                      onChange={e => setNewProduct({...newProduct, codigoInvima: e.target.value})}
                      placeholder="Reg. No. xxx"
                      className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Lote</label>
                      <input 
                        type="text" 
                        value={newProduct.lote}
                        onChange={e => setNewProduct({...newProduct, lote: e.target.value})}
                        placeholder="LOT-2026"
                        className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Vencimiento</label>
                      <input 
                        type="date" 
                        value={newProduct.vencimiento}
                        onChange={e => setNewProduct({...newProduct, vencimiento: e.target.value})}
                        className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Ajustar Stock */}
      {isStockModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl max-w-sm w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Ajustar Stock</h3>
              <button 
                onClick={() => setIsStockModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm font-semibold">{selectedProduct.marca} - {selectedProduct.modelo}</p>
              <p className="text-xs text-muted-foreground">{selectedProduct.id} | Color: {selectedProduct.color}</p>
            </div>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Nuevo Stock</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={newStockVal}
                  onChange={e => setNewStockVal(parseInt(e.target.value) || 0)}
                  className="w-full bg-background border border-input rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <button 
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                >
                  Actualizar Stock
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Imprimir Etiqueta Código de Barras */}
      {isLabelModalOpen && selectedProductForLabel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:absolute print:inset-0 print:bg-white print:p-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col space-y-4 print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Imprimir Etiqueta (Code 128)</h3>
              </div>
              <button 
                onClick={() => {
                  setIsLabelModalOpen(false);
                  setSelectedProductForLabel(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground print:hidden">
              <span className="font-semibold text-foreground">Producto:</span> {selectedProductForLabel.marca} - {selectedProductForLabel.modelo} ({selectedProductForLabel.categoria})
            </div>

            {/* Quantity Selector */}
            <div className="print:hidden space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">Cantidad de etiquetas:</label>
              <input 
                type="number" 
                min="1" 
                value={labelQty} 
                onChange={(e) => setLabelQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary text-center font-bold font-mono text-foreground"
              />
            </div>

            {/* Live Preview / Print Area */}
            <div className="bg-secondary/20 border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center print:border-none print:bg-white print:p-0">
              <span className="text-[10px] text-muted-foreground font-semibold mb-2 print:hidden">Vista Previa (50x25mm)</span>
              
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

              <div id="print-area" className="flex flex-col items-center gap-4 print:flex-row print:flex-wrap print:justify-center">
                {Array.from({ length: labelQty }).map((_, i) => (
                  <div 
                    key={i}
                    className="print-label bg-white border border-border p-3 rounded-lg flex flex-col items-center justify-center text-center w-[50mm] h-[25mm] shadow-sm select-none"
                  >
                    <span className="text-[7px] uppercase font-bold text-foreground font-sans line-clamp-1 block">
                      OptiSaaS — {selectedProductForLabel.marca}
                    </span>
                    <span className="text-[6px] text-muted-foreground font-semibold block line-clamp-1">
                      Mod: {selectedProductForLabel.modelo} {selectedProductForLabel.color ? `| Col: ${selectedProductForLabel.color}` : ''}
                    </span>
                    
                    <div className="w-full flex justify-center py-1 overflow-hidden h-[12mm]">
                      <Barcode 
                        value={selectedProductForLabel.codigoBarras || selectedProductForLabel.id} 
                        width={0.8} 
                        height={20} 
                        displayValue={false} 
                        margin={0} 
                      />
                    </div>
                    
                    <span className="text-[7px] font-mono font-bold text-foreground mt-0.5 tracking-widest block">
                      {selectedProductForLabel.codigoBarras || selectedProductForLabel.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border print:hidden">
              <button 
                type="button"
                onClick={() => {
                  setIsLabelModalOpen(false);
                  setSelectedProductForLabel(null);
                }}
                className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground"
              >
                Cerrar
              </button>
              <button 
                type="button"
                onClick={() => window.print()}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
