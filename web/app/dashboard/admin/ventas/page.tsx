'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { motion } from 'motion/react';

import { useClinicStore } from '@/lib/store';

const formatCurrencyShort = (val: number) => {
  if (val >= 1000000) {
    return `$ ${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `$ ${(val / 1000).toFixed(0)}K`;
  }
  return `$ ${val}`;
};

export default function VentasYDesempenoPage() {
  const { citas, pacientes } = useClinicStore();

  const citasPagadas = citas.filter(c => c.estadoComercial === 'pagado');
  const ingresosTotales = citasPagadas.reduce((sum, c) => sum + (c.montoCobrado || 0), 0);
  
  const tasaConversion = citas.length > 0 
    ? Math.round((citasPagadas.length / citas.length) * 100) 
    : 0;

  const ticketPromedio = citasPagadas.length > 0
    ? Math.round(ingresosTotales / citasPagadas.length)
    : 0;

  const pacientesNuevosCount = pacientes.length;

  // Distribución de métodos de pago
  const ingresosTarjeta = citasPagadas
    .filter(c => c.metodoPago === 'TARJETA')
    .reduce((sum, c) => sum + (c.montoCobrado || 0), 0);

  const ingresosEfectivo = citasPagadas
    .filter(c => c.metodoPago === 'EFECTIVO')
    .reduce((sum, c) => sum + (c.montoCobrado || 0), 0);

  const totalMetodos = ingresosTarjeta + ingresosEfectivo || 1;
  const pctTarjeta = Math.round((ingresosTarjeta / totalMetodos) * 100);
  const pctEfectivo = Math.round((ingresosEfectivo / totalMetodos) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas y Desempeño</h1>
          <p className="text-muted-foreground text-sm">Métricas financieras, conversión y reportes de la sede.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-background border border-input text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
            <option>Este Mes</option>
            <option>Mes Anterior</option>
            <option>Últimos 3 Meses</option>
          </select>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-4 h-4" />
            Exportar XLS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Ingresos Totales" 
          value={formatCurrencyShort(ingresosTotales)} 
          icon={<DollarSign className="w-5 h-5 text-success" />}
          trend={ingresosTotales > 0 ? { value: `${citasPagadas.length} facturas`, isPositive: true } : undefined}
          delay={0.1}
        />
        <StatCard 
          title="Tasa de Conversión" 
          value={`${tasaConversion}%`} 
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          subtitle="Consulta -> Venta Efectiva"
          trend={{ value: "+3% vs mes ant.", isPositive: true }}
          delay={0.2}
        />
        <StatCard 
          title="Ticket Promedio" 
          value={formatCurrencyShort(ticketPromedio)} 
          icon={<BarChart3 className="w-5 h-5 text-warning" />}
          trend={{ value: "-2% vs mes ant.", isPositive: false }}
          delay={0.3}
        />
        <StatCard 
          title="Pacientes Registrados" 
          value={pacientesNuevosCount.toString()} 
          icon={<Users className="w-5 h-5 text-primary" />}
          subtitle="Registrados en la clínica"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm min-h-[300px] flex flex-col justify-between">
          <h3 className="text-lg font-semibold mb-4">Ingresos por Método de Pago</h3>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                  Tarjeta de Crédito / Débito
                </span>
                <span>{formatCurrencyShort(ingresosTarjeta)} ({pctTarjeta}%)</span>
              </div>
              <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pctTarjeta}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-primary h-full rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success inline-block" />
                  Efectivo
                </span>
                <span>{formatCurrencyShort(ingresosEfectivo)} ({pctEfectivo}%)</span>
              </div>
              <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pctEfectivo}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-success h-full rounded-full"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Total reportado: {formatCurrencyShort(ingresosTotales)}</span>
              <span>Citas pagadas: {citasPagadas.length}</span>
            </div>
          </div>
        </div>

        {/* Top Vendedores / Asesores */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Desempeño Asesores</h3>
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">CM</div>
                <div>
                  <p className="text-sm font-semibold">Carlos Méndez</p>
                  <p className="text-[10px] text-muted-foreground">2 Ventas (Simulado)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatCurrencyShort(ingresosTarjeta + ingresosEfectivo)}</p>
                <p className="text-[10px] text-success flex items-center justify-end"><ArrowUpRight className="w-3 h-3" /> 8%</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">LM</div>
                <div>
                  <p className="text-sm font-semibold">Laura Muñoz</p>
                  <p className="text-[10px] text-muted-foreground">0 Ventas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">$ 0.00</p>
                <p className="text-[10px] text-destructive flex items-center justify-end"><ArrowDownRight className="w-3 h-3" /> 0%</p>
              </div>
            </div>
          </div>
          <button className="w-full mt-4 text-xs font-semibold text-primary hover:underline">Ver Reporte Completo</button>
        </div>
      </div>
    </div>
  );
}
