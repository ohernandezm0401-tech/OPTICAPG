'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, CheckCircle2, Loader2, Receipt, FileText, X } from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { RecomendacionClinica, Promocion } from '@/lib/types';

interface FacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  citaId: string;
  pacienteInfo: {
    nombre: string;
    apellido: string;
    documento: string;
  };
  cartItems: { id: string; marca: string; modelo: string; categoria: string; cantidad: number; precio: number }[];
  subtotal: number;
  promoId: string;
  descuentoCalculado: number;
  totalFinal: number;
  recomendacion?: RecomendacionClinica;
  onSuccess?: () => void;
}

export function FacturaModal({
  isOpen,
  onClose,
  citaId,
  pacienteInfo,
  cartItems,
  subtotal,
  promoId,
  descuentoCalculado,
  totalFinal,
  recomendacion,
  onSuccess
}: FacturaModalProps) {
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');
  const [metodoPago, setMetodoPago] = useState('TARJETA');
  const [bancoRef, setBancoRef] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState<string>('');
  const [facturaResult, setFacturaResult] = useState<{ cufe?: string; pdfUrl?: string } | null>(null);

  const { completeCitaPago, promociones, inventario, updateStock, empresas, cajaSesionActiva } = useClinicStore();

  const refDuplicada = useMemo(() => {
    if (metodoPago !== 'TRANSFERENCIA' || !bancoRef.trim()) return false;
    const refUpper = bancoRef.trim().toUpperCase();
    return cajaSesionActiva?.transacciones.some(
      t => t.metodoPago?.toUpperCase().includes(`REF: ${refUpper}`) || 
           t.descripcion?.toUpperCase().includes(`REF: ${refUpper}`)
    );
  }, [bancoRef, metodoPago, cajaSesionActiva]);
  const empresa = empresas[0];
  const brandColor = empresa?.colorCorporativo || '#2563eb';

  const handleProcesar = async () => {
    setStep('processing');

    try {
      // Llamada al endpoint interno de facturación electrónica
      const res = await fetch('/api/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            identificacion: pacienteInfo.documento,
            nombres: pacienteInfo.nombre,
            apellidos: pacienteInfo.apellido,
            email: 'cliente@ejemplo.com',
            telefono: '3000000000',
            tipo_documento: 'CC'
          },
          items: cartItems.map(item => ({
            codigo: item.id,
            nombre: `${item.marca} - ${item.modelo} (${item.categoria})`,
            cantidad: item.cantidad,
            precio: Math.round(item.precio - (item.precio * (descuentoCalculado / (subtotal || 1)))),
            tasa_impuesto: ''
          })),
          metodo_pago: metodoPago
        })
      });

      const data = await res.json();

      if (data.success) {
        setFacturaResult(data.data);

        // Completar pago de la cita en Zustand store
        completeCitaPago(citaId, {
          cufe: data.data.cufe || '',
          pdfUrl: data.data.pdfUrl || '',
          monto: totalFinal,
          metodoPago: metodoPago === 'TRANSFERENCIA' ? `TRANSFERENCIA (REF: ${bancoRef.trim().toUpperCase()})` : metodoPago,
          promocionAplicadaId: promoId || undefined,
          descuentoAplicado: descuentoCalculado || undefined,
          productosVendidos: cartItems.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad,
            precioUnitario: item.precio
          }))
        });

        // Decrementar el stock físico de los productos vendidos
        cartItems.forEach(item => {
          const invItem = inventario.find(i => i.id === item.id);
          if (invItem) {
            updateStock(item.id, Math.max(0, invItem.stock - item.cantidad));
          }
        });

        toast.success('Factura DIAN emitida exitosamente');
        setStep('success');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Error al facturar: ' + data.error);
        setStep('checkout');
      }
    } catch (err) {
      toast.error('Error de red al procesar la factura');
      setStep('checkout');
    }
  };

  if (!isOpen) return null;

  const promoAplicada = promociones.find(p => p.id === promoId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5" style={{ color: brandColor }} />
              Punto de Venta - Confirmación
            </h3>
            {step !== 'processing' && (
              <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            {step === 'checkout' && (
              <div className="space-y-6">
                <div className="bg-secondary/20 p-4 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Paciente</p>
                  <p className="font-bold">{pacienteInfo.nombre} {pacienteInfo.apellido}</p>
                  <p className="text-xs text-muted-foreground">C.C. {pacienteInfo.documento}</p>
                </div>

                {/* Detalle de Productos */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground block">Detalle de Compra</label>
                  <div className="bg-secondary/10 rounded-xl border border-border divide-y divide-border/40 max-h-[140px] overflow-y-auto p-3 space-y-2 scrollbar-thin">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-start text-xs pt-2 first:pt-0">
                        <div>
                          <p className="font-semibold text-foreground">{item.marca} - {item.modelo}</p>
                          <p className="text-[10px] text-muted-foreground">{item.categoria} • Cant: {item.cantidad}</p>
                        </div>
                        <span className="font-mono text-muted-foreground">$ {(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Campaña Aplicada */}
                {promoId && promoAplicada && (
                  <div className="bg-success/10 border border-success/20 p-3 rounded-xl flex items-center justify-between text-xs text-success font-semibold">
                    <span>Campaña Aplicada:</span>
                    <span className="bg-success/20 px-2 py-0.5 rounded uppercase font-mono tracking-wider text-[10px]">
                      {promoAplicada.nombre}
                    </span>
                  </div>
                )}

                {/* Desglose de Precios */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">$ {subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {descuentoCalculado > 0 && (
                    <div className="flex justify-between text-sm text-destructive font-semibold">
                      <span>Descuento Comercial</span>
                      <span className="font-mono">-$ {descuentoCalculado.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end border-t border-border pt-3">
                    <span className="text-sm font-bold text-foreground">Total Final a Pagar</span>
                    <span className="text-2xl font-black font-mono animate-pulse" style={{ color: brandColor }}>
                      $ {totalFinal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold block">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodoPago('TARJETA')}
                      className="py-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors text-center"
                      style={metodoPago === 'TARJETA' ? { borderColor: brandColor, backgroundColor: `${brandColor}1A`, color: brandColor } : { borderColor: 'var(--border)' }}
                    >
                      <CreditCard className="w-4 h-4 mx-auto" />
                      <span>Tarjeta / POS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('EFECTIVO')}
                      className="py-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors text-center"
                      style={metodoPago === 'EFECTIVO' ? { borderColor: brandColor, backgroundColor: `${brandColor}1A`, color: brandColor } : { borderColor: 'var(--border)' }}
                    >
                      <span className="font-bold text-sm leading-none">$</span>
                      <span>Efectivo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoPago('TRANSFERENCIA')}
                      className="py-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors text-center"
                      style={metodoPago === 'TRANSFERENCIA' ? { borderColor: brandColor, backgroundColor: `${brandColor}1A`, color: brandColor } : { borderColor: 'var(--border)' }}
                    >
                      <FileText className="w-4 h-4 mx-auto" />
                      <span>Transferencia</span>
                    </button>
                  </div>
                </div>

                {metodoPago === 'TRANSFERENCIA' && (
                  <div className="bg-secondary/20 p-4 rounded-xl border border-border space-y-3.5 animate-in slide-in-from-bottom-2 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-muted-foreground uppercase text-[10px] block">
                        Referencia de Aprobación Bancaria (NEQUI/Banco)
                      </label>
                      <input
                        type="text"
                        value={bancoRef}
                        onChange={(e) => setBancoRef(e.target.value)}
                        placeholder="Ej: M123456 ó Ref-982..."
                        className="w-full bg-background border border-input rounded-lg p-2.5 text-xs font-mono outline-none focus:ring-1 focus:ring-primary uppercase font-bold text-foreground"
                      />
                      {refDuplicada && (
                        <p className="text-[10px] text-destructive font-bold mt-1">
                          ⚠️ Error de Seguridad: Esta referencia ya fue utilizada en otra venta de este turno. Ingrese un código único.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-muted-foreground uppercase text-[10px] block">
                        Cargar Soporte / Comprobante de Pago
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          id="file-soporte"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setComprobanteFile(e.target.files[0].name);
                              toast.success("Comprobante cargado de forma exitosa.");
                            }
                          }}
                          className="hidden"
                          accept="image/*,application/pdf"
                        />
                        <label
                          htmlFor="file-soporte"
                          className="flex-1 text-center py-2.5 border border-dashed border-input rounded-xl hover:bg-secondary/40 cursor-pointer font-semibold text-xs text-muted-foreground flex items-center justify-center gap-1.5 transition-colors bg-background"
                        >
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          {comprobanteFile ? `Cambiar: ${comprobanteFile.slice(0, 15)}...` : 'Adjuntar Captura / PDF'}
                        </label>
                        {comprobanteFile && (
                          <span className="text-success font-black text-xs shrink-0 bg-success/10 px-2 py-1 rounded">✓ Listo</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProcesar}
                  disabled={
                    metodoPago === 'TRANSFERENCIA' && (!bancoRef.trim() || !comprobanteFile || refDuplicada)
                  }
                  className="w-full text-white py-3 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  style={{ backgroundColor: brandColor }}
                >
                  Confirmar y Emitir a DIAN
                </button>
              </div>
            )}

            {step === 'processing' && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                <Loader2 className="w-12 h-12 animate-spin" style={{ color: brandColor }} />
                <div>
                  <h4 className="font-bold text-lg">Procesando Pago</h4>
                  <p className="text-sm text-muted-foreground">Emitiendo Factura Electrónica a la DIAN...</p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-5 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-foreground">¡Factura Emitida!</h4>
                  <p className="text-sm text-muted-foreground">La transacción fue reportada a la DIAN con éxito.</p>
                </div>

                <div className="w-full bg-secondary/30 p-4 rounded-xl border border-border text-left">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CUFE (DIAN)</p>
                  <p className="text-xs font-mono break-all">{facturaResult?.cufe}</p>
                </div>

                <div className="flex w-full gap-3 pt-2">
                  <button className="flex-1 bg-secondary text-foreground py-2 rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Ticket POS
                  </button>
                  <button 
                    className="flex-1 text-white py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 hover:brightness-110"
                    style={{ backgroundColor: brandColor }}
                  >
                    <FileText className="w-4 h-4" />
                    Ver XML/PDF
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors font-medium"
                >
                  Volver al Dashboard
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
