'use client';

import React, { useState } from 'react';
import { Tag, Plus, Calendar, ToggleLeft, ToggleRight, Trash2, Edit3, Award, TrendingUp, Users, ShoppingCart, Percent, DollarSign, X, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';
import { Promocion } from '@/lib/types';

const formatDias = (dias?: number[]) => {
  if (!dias || dias.length === 0) return 'Todos los días';
  if (dias.length === 7) return 'Todos los días';
  if (dias.length === 5 && !dias.includes(0) && !dias.includes(6)) return 'Lun-Vie';
  if (dias.length === 2 && dias.includes(6) && dias.includes(0)) return 'Sáb y Dom';
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias.map(d => nombres[d]).join(', ');
};

const formatHoras = (inicio?: string, fin?: string) => {
  if (!inicio || !fin) return 'Todo el día';
  return `${inicio} - ${fin}`;
};

export default function PromocionesPage() {
  const { promociones, addPromocion, updatePromocion, deletePromocion, togglePromocion } = useClinicStore();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    tipo: 'porcentaje' as 'porcentaje' | 'monto-fijo' | 'combo' | 'segunda-unidad',
    valor: 0,
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    activa: true,
    aplicableA: 'todo' as 'lentes' | 'monturas' | 'todo',
    horaInicio: '',
    horaFin: '',
    diasSemana: [] as number[]
  });

  // Plantillas de Marketing prediseñadas (Guru del Marketing)
  const aplicarPlantilla = (tipoPlantilla: string) => {
    switch (tipoPlantilla) {
      case 'combo':
        setFormData({
          codigo: 'COMBO-COMPLETO',
          nombre: 'Combo Montura + Lente',
          descripcion: 'Ahorro inteligente del 20% al comprar la fórmula de lentes y la montura en el mismo pedido.',
          tipo: 'combo',
          valor: 20,
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: '2026-12-31',
          activa: true,
          aplicableA: 'todo',
          horaInicio: '',
          horaFin: '',
          diasSemana: []
        });
        toast.success('Plantilla de Combo aplicada');
        break;
      case 'convenio':
        setFormData({
          codigo: 'CONV-EMPRESA',
          nombre: 'Convenio Corporativo Especial',
          descripcion: 'Descuento especial del 15% para empleados afiliados en cualquier solución óptica.',
          tipo: 'porcentaje',
          valor: 15,
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: '2026-12-31',
          activa: true,
          aplicableA: 'todo',
          horaInicio: '',
          horaFin: '',
          diasSemana: []
        });
        toast.success('Plantilla de Convenio Corporativo aplicada');
        break;
      case 'segunda':
        setFormData({
          codigo: 'SEGUNDA-UNIDAD',
          nombre: '50% Dto Segunda Gafa',
          descripcion: 'Aplica 50% de descuento en el segundo par de lentes oftálmicas para uso complementario.',
          tipo: 'segunda-unidad',
          valor: 50,
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: '2026-12-31',
          activa: true,
          aplicableA: 'lentes',
          horaInicio: '13:00',
          horaFin: '17:00',
          diasSemana: [2, 4] // Martes y Jueves
        });
        toast.success('Plantilla de Segunda Unidad aplicada');
        break;
      case 'fijo':
        setFormData({
          codigo: 'BONO-CYBER',
          nombre: 'Bono Regalo Cyber Opti',
          descripcion: 'Cupón de descuento directo de $100.000 COP aplicable en monturas seleccionadas de Lunes a Viernes.',
          tipo: 'monto-fijo',
          valor: 100000,
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          activa: true,
          aplicableA: 'monturas',
          horaInicio: '',
          horaFin: '',
          diasSemana: [1, 2, 3, 4, 5] // Lun-Vie
        });
        toast.success('Plantilla de Cyber Bono aplicada');
        break;
      default:
        break;
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo: 'porcentaje',
      valor: 0,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      activa: true,
      aplicableA: 'todo',
      horaInicio: '',
      horaFin: '',
      diasSemana: []
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (promo: Promocion) => {
    setIsEditMode(true);
    setEditingId(promo.id);
    setFormData({
      codigo: promo.codigo,
      nombre: promo.nombre,
      descripcion: promo.descripcion,
      tipo: promo.tipo,
      valor: promo.valor,
      fechaInicio: promo.fechaInicio,
      fechaFin: promo.fechaFin,
      activa: promo.activa,
      aplicableA: promo.aplicableA,
      horaInicio: promo.horaInicio || '',
      horaFin: promo.horaFin || '',
      diasSemana: promo.diasSemana || []
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nombre || formData.valor <= 0) {
      toast.warning('Por favor completa los campos y define un valor mayor a cero.');
      return;
    }

    if (isEditMode) {
      updatePromocion(editingId, {
        codigo: formData.codigo.toUpperCase().replace(/\s+/g, '-'),
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo: formData.tipo,
        valor: formData.valor,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        activa: formData.activa,
        aplicableA: formData.aplicableA,
        horaInicio: formData.horaInicio || undefined,
        horaFin: formData.horaFin || undefined,
        diasSemana: formData.diasSemana.length > 0 ? formData.diasSemana : undefined
      });
      toast.success('Promoción actualizada con éxito');
    } else {
      const nuevaPromo: Promocion = {
        id: `PRM-${Date.now().toString().slice(-4)}`,
        codigo: formData.codigo.toUpperCase().replace(/\s+/g, '-'),
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        tipo: formData.tipo,
        valor: formData.valor,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        activa: formData.activa,
        aplicableA: formData.aplicableA,
        vecesAplicada: 0,
        horaInicio: formData.horaInicio || undefined,
        horaFin: formData.horaFin || undefined,
        diasSemana: formData.diasSemana.length > 0 ? formData.diasSemana : undefined
      };
      addPromocion(nuevaPromo);
      toast.success(`Promoción ${nuevaPromo.nombre} creada exitosamente`);
    }
    setIsAddModalOpen(false);
  };

  const handleEliminar = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la promoción "${nombre}"?`)) {
      deletePromocion(id);
      toast.success('Promoción eliminada');
    }
  };

  const handleToggle = (id: string, nombre: string, activa: boolean) => {
    togglePromocion(id);
    toast.success(`Promoción "${nombre}" ${!activa ? 'activada' : 'desactivada'}`);
  };

  // Metricas de Marketing
  const totalCampanas = promociones.length;
  const campanasActivas = promociones.filter(p => p.activa).length;
  const totalUsos = promociones.reduce((sum, p) => sum + p.vecesAplicada, 0);
  const promoMasPopular = [...promociones].sort((a, b) => b.vecesAplicada - a.vecesAplicada)[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas, Promociones & Convenios</h1>
          <p className="text-muted-foreground text-sm">Gestiona convenios corporativos, descuentos estacionales y estrategias de venta cruzada.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Promoción
        </button>
      </div>

      {/* KPI Panel - Marketing Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Campaña Activas</div>
            <div className="text-xl font-black text-foreground">{campanasActivas} <span className="text-xs font-normal text-muted-foreground">de {totalCampanas}</span></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-success/10 text-success rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Cupones Redimidos</div>
            <div className="text-xl font-black text-foreground">{totalUsos} <span className="text-xs font-normal text-success">Usos</span></div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-warning/10 text-warning rounded-xl flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Promo Más Popular</div>
            <div className="text-sm font-bold text-foreground truncate max-w-[150px]" title={promoMasPopular?.nombre}>
              {promoMasPopular ? promoMasPopular.nombre : 'Ninguna'}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">{promoMasPopular ? `${promoMasPopular.vecesAplicada} redenciones` : '0 usos'}</div>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-purple/10 text-purple-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Conversión Ventas</div>
            <div className="text-xl font-black text-foreground">34.2%</div>
            <div className="text-[10px] text-success font-semibold">Descuento promedio: 16.5%</div>
          </div>
        </div>
      </div>

      {/* Grid de Cupones Promocionales (Premium Look) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {promociones.map((promo, idx) => {
          const estaVencida = new Date(promo.fechaFin) < new Date();
          
          // Color schemes for coupons based on types
          let gradient = 'from-blue-600 to-indigo-700';
          if (promo.tipo === 'combo') gradient = 'from-emerald-600 to-teal-700';
          else if (promo.tipo === 'segunda-unidad') gradient = 'from-violet-600 to-fuchsia-700';
          else if (promo.tipo === 'monto-fijo') gradient = 'from-rose-600 to-pink-700';
          
          if (!promo.activa || estaVencida) {
            gradient = 'from-slate-600 to-slate-800 opacity-60';
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={promo.id}
              className={`relative bg-gradient-to-br ${gradient} text-white rounded-2xl p-5 shadow-lg overflow-hidden flex flex-col justify-between min-h-[190px] border border-white/10 group`}
            >
              {/* Círculo simulado de corte de cupón */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-r border-black/10"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full border-l border-black/10"></div>

              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white/70 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-md">
                    {promo.tipo === 'porcentaje' ? 'Descuento' : promo.tipo}
                  </span>
                  <h3 className="font-bold text-lg leading-tight mt-1">{promo.nombre}</h3>
                </div>
                <div className="text-2xl font-black font-mono bg-white/20 px-3 py-1 rounded-xl backdrop-blur-md border border-white/20 shadow-sm flex items-center gap-0.5">
                  {promo.tipo === 'monto-fijo' ? (
                    <span className="text-xs font-bold">$</span>
                  ) : null}
                  {promo.tipo === 'monto-fijo' ? (promo.valor / 1000) + 'K' : promo.valor}
                  {promo.tipo !== 'monto-fijo' ? '%' : ''}
                </div>
              </div>

              {/* Middle Row (Description) */}
              <p className="text-xs text-white/85 line-clamp-2 mt-3 mb-2 font-medium">
                {promo.descripcion}
              </p>

              {/* Badges de Condiciones */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold">
                  Aplica: {promo.aplicableA === 'todo' ? 'Todo' : promo.aplicableA === 'lentes' ? 'Lentes' : 'Monturas'}
                </span>
                {promo.diasSemana && promo.diasSemana.length > 0 && (
                  <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold">
                    📅 {formatDias(promo.diasSemana)}
                  </span>
                )}
                {promo.horaInicio && promo.horaFin && (
                  <span className="text-[9px] bg-white/20 text-white px-2 py-0.5 rounded font-bold">
                    ⏰ {formatHoras(promo.horaInicio, promo.horaFin)}
                  </span>
                )}
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-center border-t border-white/20 pt-3 text-[10px] text-white/70">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Vence: {promo.fechaFin}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono bg-black/20 px-1.5 py-0.5 rounded">
                    {promo.codigo}
                  </span>
                  <span className="font-semibold text-white/90">
                    ({promo.vecesAplicada} usos)
                  </span>
                </div>
              </div>

              {/* Hover Actions Panel */}
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-2xl">
                <button 
                  onClick={() => handleToggle(promo.id, promo.nombre, promo.activa)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
                  title={promo.activa ? 'Desactivar' : 'Activar'}
                >
                  {promo.activa ? <ToggleRight className="w-6 h-6 text-green-400" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                </button>
                <button 
                  onClick={() => handleOpenEditModal(promo)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
                  title="Editar"
                >
                  <Edit3 className="w-5 h-5 text-yellow-300" />
                </button>
                <button 
                  onClick={() => handleEliminar(promo.id, promo.nombre)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal: Crear / Editar Promoción */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-border mb-4">
              <h3 className="text-lg font-bold">{isEditMode ? 'Editar Promoción / Convenio' : 'Crear Nueva Campaña'}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Templates (Solo si es creación) */}
            {!isEditMode && (
              <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-xs font-bold text-primary uppercase block mb-2">💡 Cargar Plantilla de Marketing Rápida</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button 
                    type="button" 
                    onClick={() => aplicarPlantilla('combo')}
                    className="px-2 py-1.5 text-left text-[11px] font-semibold bg-background border border-input rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    🚀 Combo 20%
                  </button>
                  <button 
                    type="button" 
                    onClick={() => aplicarPlantilla('convenio')}
                    className="px-2 py-1.5 text-left text-[11px] font-semibold bg-background border border-input rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    🏢 Convenio 15%
                  </button>
                  <button 
                    type="button" 
                    onClick={() => aplicarPlantilla('segunda')}
                    className="px-2 py-1.5 text-left text-[11px] font-semibold bg-background border border-input rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    👓 2do Par 50%
                  </button>
                  <button 
                    type="button" 
                    onClick={() => aplicarPlantilla('fijo')}
                    className="px-2 py-1.5 text-left text-[11px] font-semibold bg-background border border-input rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    🎟️ Bono $100K
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Código de Promoción *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. CONV-COLPATRIA"
                    value={formData.codigo}
                    onChange={e => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Nombre Público *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g. Convenio Colpatria 15%"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Descripción de la Oferta</label>
                <textarea 
                  placeholder="Explica las condiciones de aplicación de esta promoción..."
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Tipo de Descuento</label>
                  <select 
                    value={formData.tipo}
                    onChange={e => setFormData({...formData, tipo: e.target.value as any})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  >
                    <option value="porcentaje">Porcentaje %</option>
                    <option value="monto-fijo">Monto Fijo $ (COP)</option>
                    <option value="combo">Combo (Venta Cruzada)</option>
                    <option value="segunda-unidad">Segunda Unidad</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">
                    {formData.tipo === 'monto-fijo' ? 'Valor Fijo (COP) *' : 'Porcentaje Descuento *'}
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder={formData.tipo === 'monto-fijo' ? 'E.g. 50000' : 'E.g. 15'}
                    value={formData.valor || ''}
                    onChange={e => setFormData({...formData, valor: parseInt(e.target.value) || 0})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Aplicable A</label>
                  <select 
                    value={formData.aplicableA}
                    onChange={e => setFormData({...formData, aplicableA: e.target.value as any})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  >
                    <option value="todo">Todo el Pedido</option>
                    <option value="lentes">Únicamente Lentes</option>
                    <option value="monturas">Únicamente Monturas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={formData.fechaInicio}
                    onChange={e => setFormData({...formData, fechaInicio: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Fecha de Expiración</label>
                  <input 
                    type="date" 
                    value={formData.fechaFin}
                    onChange={e => setFormData({...formData, fechaFin: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Horas (Franja) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Hora Inicio (Franja Opcional)</label>
                  <input 
                    type="time" 
                    value={formData.horaInicio}
                    onChange={e => setFormData({...formData, horaInicio: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Hora Fin (Franja Opcional)</label>
                  <input 
                    type="time" 
                    value={formData.horaFin}
                    onChange={e => setFormData({...formData, horaFin: e.target.value})}
                    className="w-full bg-background border border-input rounded-xl p-2 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Días de la semana */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Días de la Semana Habilitados</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dia, index) => {
                    const isSelected = formData.diasSemana.includes(index);
                    const toggleDia = () => {
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          diasSemana: formData.diasSemana.filter(d => d !== index)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          diasSemana: [...formData.diasSemana, index].sort()
                        });
                      }
                    };
                    
                    const diaFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][index];

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={toggleDia}
                        title={diaFull}
                        className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${isSelected ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-background hover:bg-secondary border-input text-muted-foreground'}`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1.5 block">Si no seleccionas ningún día, la promoción aplicará para todos los días de la semana de forma predeterminada.</span>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                >
                  {isEditMode ? 'Actualizar Campaña' : 'Habilitar Campaña'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
