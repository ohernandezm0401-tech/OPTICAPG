'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, ShieldAlert, X, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from '@/lib/toast-store';
import { useClinicStore } from '@/lib/store';

interface DocumentoEquivalenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordenId: string;
  pacienteInfo: {
    nombre: string;
    apellido: string;
    documento: string;
    telefono: string;
  };
  cartItems: { id: string; marca: string; modelo: string; categoria: string; cantidad: number; precio: number }[];
  subtotal: number;
  descuentoCalculado: number;
  totalFinal: number;
  abono: number;
  laboratorio: string;
  lenteMaterial: string;
  lenteDiseno: string;
}

export function DocumentoEquivalenteModal({
  isOpen,
  onClose,
  ordenId,
  pacienteInfo,
  cartItems,
  subtotal,
  descuentoCalculado,
  totalFinal,
  abono,
  laboratorio,
  lenteMaterial,
  lenteDiseno
}: DocumentoEquivalenteModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { empresas, sedes } = useClinicStore();
  const empresa = empresas[0];
  const activeSede = sedes[0];
  const brandColor = empresa?.colorCorporativo || '#2563eb';

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
      toast.success('Documento enviado a la cola de impresión');
    }
  };

  if (!isOpen) return null;

  const saldoPendiente = Math.max(0, totalFinal - abono);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8 print:p-0 print:border-0 print:shadow-none print:my-0"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/30 print:hidden">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: brandColor }} />
              Documento Equivalente - Orden de Trabajo
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Printable Content */}
          <div ref={printAreaRef} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible print:p-0 print:bg-white print:text-black">
            
            {/* Header Factura Equivalente */}
            <div className="flex justify-between items-start border-b pb-6" style={{ borderBottomColor: `${brandColor}33` }}>
              <div>
                <h2 className="font-black text-xl print:text-black" style={{ color: brandColor }}>{empresa?.nombre?.toUpperCase() || 'ÓPTICAS VISIÓN TOTAL S.A.S'}</h2>
                <p className="text-xs text-muted-foreground print:text-slate-600 mt-0.5">NIT: {empresa?.nit || '900.123.456-7'} • {activeSede?.nombre || 'Sucursal Norte'}</p>
                <p className="text-xs text-muted-foreground print:text-slate-600">{activeSede?.direccion || 'Calle 127 # 14-54'}, {activeSede?.ciudad || 'Bogotá'} • Tel: (601) 745-1234</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase print:text-black print:bg-slate-100 px-3 py-1 rounded-full" style={{ color: brandColor, backgroundColor: `${brandColor}1A` }}>
                  Orden de Trabajo
                </span>
                <p className="font-mono font-bold text-sm text-foreground mt-2">{ordenId}</p>
                <p className="text-[10px] text-muted-foreground">Fecha: {new Date().toLocaleDateString('es-CO')}</p>
              </div>
            </div>

            {/* Datos Paciente (Sin formula oftálmica para evitar fuga de fórmula) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-secondary/20 print:bg-slate-50 p-4 rounded-xl border border-border/40">
              <div>
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Paciente / Cliente</h4>
                <p className="text-sm font-bold text-foreground mt-1">{pacienteInfo.nombre} {pacienteInfo.apellido}</p>
                <p className="text-xs text-muted-foreground">C.C. {Number(pacienteInfo.documento).toLocaleString('es-CO')}</p>
                <p className="text-xs text-muted-foreground">Teléfono: {pacienteInfo.telefono}</p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Detalles de Elaboración</h4>
                <p className="text-xs text-foreground mt-1"><span className="font-semibold text-muted-foreground">Diseño Lente:</span> {lenteDiseno}</p>
                <p className="text-xs text-foreground"><span className="font-semibold text-muted-foreground">Material Lente:</span> {lenteMaterial}</p>
                <p className="text-xs text-foreground"><span className="font-semibold text-muted-foreground">Laboratorio:</span> {laboratorio}</p>
              </div>
            </div>

            {/* Detalle de Productos Comprados */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Detalle del Pedido</h4>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80 pb-2 text-muted-foreground">
                    <th className="py-2">Item / Producto</th>
                    <th className="py-2 text-center">Cant</th>
                    <th className="py-2 text-right">Precio Unitario</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {cartItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <p className="font-bold">{item.marca}</p>
                        <p className="text-[10px] text-muted-foreground">{item.modelo} • {item.categoria}</p>
                      </td>
                      <td className="py-3 text-center font-semibold">{item.cantidad}</td>
                      <td className="py-3 text-right font-mono">$ {item.precio.toLocaleString('es-CO')}</td>
                      <td className="py-3 text-right font-mono">$ {(item.precio * item.cantidad).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y Anticipo */}
            <div className="border-t border-border/60 pt-4 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">$ {subtotal.toLocaleString('es-CO')}</span>
                </div>
                {descuentoCalculado > 0 && (
                  <div className="flex justify-between text-destructive font-semibold">
                    <span>Descuento Comercial</span>
                    <span className="font-mono">-$ {descuentoCalculado.toLocaleString('es-CO')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-2 text-sm">
                  <span>Total Neto</span>
                  <span className="font-mono">$ {totalFinal.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between text-success font-bold bg-success/5 p-2 rounded-lg border border-success/15">
                  <span>Abono / Anticipo</span>
                  <span className="font-mono">$ {abono.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between font-bold text-foreground text-sm pt-1">
                  <span>Saldo Pendiente</span>
                  <span className="font-mono" style={{ color: brandColor }}>$ {saldoPendiente.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>

            {/* Políticas de Venta y Blindaje Legal (Muy importante para la Óptica) */}
            <div className="bg-secondary/10 print:bg-white print:border print:border-slate-300 p-4 rounded-xl border border-border/40 space-y-3">
              <h4 className="text-[10px] font-bold uppercase print:text-black flex items-center gap-1" style={{ color: brandColor }}>
                <ShieldAlert className="w-4 h-4 print:text-black" style={{ color: brandColor }} />
                Términos, Garantías y Condiciones Comerciales (Políticas de Venta)
              </h4>
              <div className="text-[9px] text-muted-foreground print:text-slate-700 leading-relaxed space-y-1.5 list-decimal pl-2">
                <p>
                  <strong>1. TIEMPOS DE ELABORACIÓN:</strong> El proceso de tallado y montaje personalizado de lentes requiere un tiempo estimado de <strong>5 a 12 días hábiles</strong>. La óptica no se responsabiliza por demoras imprevistas del proveedor o aduana en cristales importados.
                </p>
                <p>
                  <strong>2. ANTICIPOS Y CANCELACIONES:</strong> Toda orden requiere un anticipo mínimo del <strong>50%</strong>. Al ser un producto tallado bajo prescripción médica individualizada, <strong>no se realizarán devoluciones de abonos ni cancelaciones</strong> una vez procesada la orden en laboratorio.
                </p>
                <p>
                  <strong>3. POLÍTICA DE ADAPTACIÓN:</strong> El paciente cuenta con un periodo máximo de <strong>30 días calendario</strong> para reportar problemas de adaptación en su fórmula. Vencido este plazo, cualquier modificación en los lentes tendrá costo pleno. No aplica garantía de adaptación si la fórmula proviene de un optómetra ajeno a nuestra clínica.
                </p>
                <p>
                  <strong>4. GARANTÍA DE PRODUCTOS:</strong> Las monturas poseen garantía de 6 meses por defectos de fabricación. La garantía de lentes cubre tratamientos desprendidos, no cubre rayones, fisuras por presión externa o daños causados por solventes, calor o mal uso.
                </p>
                <p>
                  <strong>5. CLÁUSULA DE ABANDONO:</strong> Transcurridos <strong>60 días calendario</strong> desde la notificación de entrega de los anteojos, si estos no han sido retirados ni cancelados en su totalidad, la óptica declarará la mercancía en estado de abandono y dispondrá de ella, extinguiéndose la obligación de entrega y perdiéndose el abono realizado.
                </p>
              </div>
            </div>

            {/* Firmas de Aceptación */}
            <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
              <div className="space-y-12">
                <div className="border-b border-border/80 w-48 mx-auto print:border-black"></div>
                <div>
                  <p className="font-bold text-foreground">Firma del Cliente</p>
                  <p className="text-[10px] text-muted-foreground">Acepto los términos y políticas descritos</p>
                </div>
              </div>
              <div className="space-y-12">
                <div className="border-b border-border/80 w-48 mx-auto print:border-black"></div>
                <div>
                  <p className="font-bold text-foreground">Asesor de Venta</p>
                  <p className="text-[10px] text-muted-foreground">{empresa?.nombre || 'OptiSaaS'} {activeSede?.nombre || 'Sucursal Norte'}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 justify-end p-4 border-t border-border bg-secondary/15 print:hidden">
            <button
              onClick={onClose}
              className="bg-secondary hover:bg-secondary/80 text-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm hover:brightness-110"
              style={{ backgroundColor: brandColor }}
            >
              <Printer className="w-4 h-4" />
              Imprimir Documento
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
