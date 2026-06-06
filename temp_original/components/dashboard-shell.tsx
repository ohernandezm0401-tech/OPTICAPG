'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Package, 
  CreditCard, 
  FileText,
  Plus,
  Stethoscope,
  ClipboardList,
  Eye,
  Settings,
  Tag,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

type Role = 'asesor' | 'optometra' | 'admin';

export default function DashboardShell() {
  const [currentRole, setCurrentRole] = useState<Role>('admin');

  return (
    <div className="grid grid-cols-[220px_1fr] grid-rows-[56px_1fr_32px] h-screen w-full bg-[#f1f5f9] text-[#1e293b] font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="bg-[#0f172a] text-[#cbd5e1] p-3 flex flex-col gap-1 row-span-3">
        <div className="py-2 px-3 mb-4">
          <div className="text-[#38bdf8] font-extrabold text-[18px]">
            OptiSaaS <span className="font-normal text-[12px] text-[#94a3b8]">v2.4</span>
          </div>
        </div>
        
        <nav className="flex flex-col gap-1">
          {currentRole === 'asesor' && (
            <>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer bg-[#1e293b] text-[#f8fafc] font-medium">
                <LayoutDashboard className="w-4 h-4" /> Dashboard Comercial
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Calendar className="w-4 h-4" /> Agenda
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Users className="w-4 h-4" /> Pacientes
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <FileText className="w-4 h-4" /> Cotizaciones
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <CreditCard className="w-4 h-4" /> Ventas POS
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Package className="w-4 h-4" /> Entregas
              </div>
            </>
          )}

          {currentRole === 'optometra' && (
            <>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer bg-[#1e293b] text-[#f8fafc] font-medium">
                <Calendar className="w-4 h-4" /> Mi Agenda Clínica
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Users className="w-4 h-4" /> Pacientes
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <ClipboardList className="w-4 h-4" /> Historia Clínica
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Stethoscope className="w-4 h-4" /> Fórmulas
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Eye className="w-4 h-4" /> Adaptación L.C.
              </div>
            </>
          )}

          {currentRole === 'admin' && (
            <>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer bg-[#1e293b] text-[#f8fafc] font-medium">
                <LayoutDashboard className="w-4 h-4" /> Dashboard General
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Calendar className="w-4 h-4" /> Agenda Global
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Users className="w-4 h-4" /> Pacientes & HC
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Package className="w-4 h-4" /> Inventario & Stock
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Tag className="w-4 h-4" /> Promociones
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <CreditCard className="w-4 h-4" /> Ventas y Desempeño
              </div>
              <div className="py-2 px-3 rounded-[6px] text-[13px] flex items-center gap-[10px] cursor-pointer hover:bg-[#1e293b] hover:text-[#f8fafc] transition-colors">
                <Settings className="w-4 h-4" /> Configuración Sede
              </div>
            </>
          )}
        </nav>
        
        <div className="mt-auto p-3 text-[11px] border-t border-[#1e293b]">
          {currentRole === 'asesor' && (
            <>Asesor: Carlos Méndez<br />Caja: 01 - Sucursal Norte</>
          )}
          {currentRole === 'optometra' && (
            <>Optómetra: Dr. Andrés Vega<br />Reg. Médico: OP-98234-CO</>
          )}
          {currentRole === 'admin' && (
            <>Admin: Dr. Andrés Vega<br />Dir. Científico Sede Norte</>
          )}
        </div>
      </aside>

      {/* Header */}
      <header className="bg-[#ffffff] border-b border-[#e2e8f0] flex items-center justify-between px-[20px] col-start-2">
        <div className="flex gap-[24px] items-center">
          <div className="text-[14px] font-semibold">Sucursal Norte - Bogotá D.C.</div>
          <div className="flex gap-[8px]">
            <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">
              Habilitación: Vigente
            </span>
            <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#fef3c7] text-[#92400e]">
              INVIMA: 4 Alertas
            </span>
          </div>
        </div>
        <div className="flex gap-[12px] items-center">
          <select 
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as Role)}
            className="text-[12px] border border-[#e2e8f0] rounded-[4px] px-2 py-1 bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          >
            <option value="asesor">Asesor Comercial</option>
            <option value="optometra">Optómetra</option>
            <option value="admin">Optómetra Administrador</option>
          </select>
          <button className="bg-[#3b82f6] text-white border-none py-[6px] px-[12px] rounded-[4px] text-[12px] font-semibold flex items-center gap-[6px] transition-colors hover:bg-blue-600">
            <Plus className="w-3 h-3" /> 
            {currentRole === 'asesor' ? 'Nuevo Paciente' : 'Nueva Atención'}
          </button>
          <div className="w-[32px] h-[32px] bg-[#e2e8f0] rounded-[50%] flex items-center justify-center text-slate-500">
             <Users className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-[16px] grid grid-cols-[1fr_320px] gap-[16px] bg-[#f8fafc] col-start-2 overflow-y-auto content-start">
        <div className="flex flex-col gap-[16px]">
          
          {/* Main Area based on Role */}
          {currentRole === 'asesor' && (
            <>
              <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                  <span>Pacientes por Llegar / En Sala</span>
                  <span className="font-normal text-[#94a3b8]">Hoy: 14 Citas</span>
                </div>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Hora</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Paciente</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Estado Com.</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">08:30 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>García, Maria Isabel</b><br />
                        <span className="text-[#94a3b8]">CC 52.483.xxx | Saldo: $0</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">Fórmula Vigente</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">Revisar Cotización</td>
                    </tr>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">09:00 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>Restrepo, Juan Carlos</b><br />
                        <span className="text-[#94a3b8]">CC 80.122.xxx | Sin Saldo</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                         <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#fef3c7] text-[#92400e]">Pendiente Pago</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">Cobrar POS</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-[16px]">
                 <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                    <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px]">Entregas Pendientes</div>
                    <div className="flex flex-col gap-2">
                      <div className="p-[8px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] text-[12px]">
                        <div className="flex justify-between font-bold">
                          Orden #4829
                          <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">Lista</span>
                        </div>
                        <div className="text-[#64748b] text-[11px] mt-1">López, Valentina. Lentes Contacto.</div>
                      </div>
                    </div>
                 </div>
                 <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                    <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px]">Caja - Turno 1</div>
                    <div className="text-[20px] font-bold">$ 1.250.000</div>
                    <div className="text-[#64748b] text-[11px] border-t border-[#f1f5f9] pt-2">Efectivo: $450.000 | Tarjetas: $800.000</div>
                 </div>
              </div>
            </>
          )}

          {currentRole === 'optometra' && (
            <>
              <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                  <span>Mi Agenda Clínica</span>
                  <span className="font-normal text-[#94a3b8]">En Espera: 2</span>
                </div>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Hora</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Paciente</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Motivo Clínico</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">08:30 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>García, Maria Isabel</b><br />
                        <span className="text-[#94a3b8]">Edad: 34 | DM Tipo 2</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">Control Post-Queratocono</td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">
                        <button className="bg-[#ef4444] text-white px-2 py-1 rounded-[4px] text-[11px] font-bold">Atender</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">09:00 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>Restrepo, Juan Carlos</b><br />
                        <span className="text-[#94a3b8]">Primera Vez</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">Valoración Inicial Optometría</td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">
                        <button className="bg-[#fbbf24] text-amber-900 px-2 py-1 rounded-[4px] text-[11px] font-bold">Revisar Info</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px]">Panel de Sugerencia Rápida (Derivado de HC)</div>
                <div className="flex gap-[16px] text-[12px]">
                  <div className="flex1 bg-[#f8fafc] p-[12px] rounded-[6px] border border-[#e2e8f0] w-full">
                    <div className="font-bold mb-2">Recomendación para Asesor</div>
                    <div className="text-[11px] text-[#64748b] mb-2">Paciente requiere lente Progresivo Digital con filtro luz azul por fatiga visual severa reportada en HC.</div>
                    <button className="bg-[#1e293b] text-white px-3 py-1.5 rounded-[4px] text-[11px] font-medium w-full">Enviar a Cotizador</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentRole === 'admin' && (
            <>
              <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                  <span>Agenda Global de la Sede</span>
                  <span className="font-normal text-[#94a3b8]">Total: 32 Citas</span>
                </div>
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Hora</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Profesional</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Paciente</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Estado</th>
                      <th className="text-left p-[8px] border-b border-[#e2e8f0] text-[#64748b] uppercase text-[10px] tracking-[0.025em]">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">08:30 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">Dr. Vega</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>García, Maria Isabel</b>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">En Sala</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">Ver Reloj</td>
                    </tr>
                    <tr>
                      <td className="p-[8px] border-b border-[#f1f5f9]">09:00 AM</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">Dra. Silva</td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <b>Restrepo, Juan Carlos</b>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9]">
                        <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#fef3c7] text-[#92400e]">Confirmado</span>
                      </td>
                      <td className="p-[8px] border-b border-[#f1f5f9] text-[#3b82f6] cursor-pointer">Reasignar</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-[16px]">
                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                  <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                    Dispensa de Dispositivos (INVIMA)
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <div className="p-[8px] bg-[#f8fafc] rounded-[4px] text-[12px]">
                      <div className="flex justify-between items-center mb-1">
                        <b>Lente Mono-focal Poly</b>
                        <span className="font-mono bg-[#f8fafc] px-[4px] py-[2px] rounded-[3px] text-[10px] border border-[#e2e8f0] text-[#64748b]">INV-2023DM-012</span>
                      </div>
                      <div className="text-[11px] text-[#64748b]">
                        Lote: LT-9982 | Vence: 12/2026
                      </div>
                    </div>
                    <div className="p-[8px] bg-[#f8fafc] rounded-[4px] text-[12px]">
                      <div className="flex justify-between items-center mb-1">
                        <b>Montura Acetato High-End</b>
                        <span className="font-mono bg-[#f8fafc] px-[4px] py-[2px] rounded-[3px] text-[10px] border border-[#e2e8f0] text-[#64748b]">N/A Acceso.</span>
                      </div>
                      <div className="text-[11px] text-[#64748b]">
                        Trazabilidad: Importador Certificado
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                  <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                    Cumplimiento Normativo (Res. 3100)
                  </div>
                  <div className="flex flex-col gap-[10px] mt-1">
                    <div>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#64748b]">RIPS Generados (Mes)</span>
                        <span className="font-semibold text-[#475569]">142 / 145</span>
                      </div>
                      <div className="h-[6px] bg-[#f1f5f9] rounded-[3px] overflow-hidden">
                        <div className="w-[96%] h-full bg-[#10b981] rounded-[3px]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#64748b]">Historias Cerradas &lt; 24h</span>
                        <span className="font-semibold text-[#475569]">98.5%</span>
                      </div>
                      <div className="h-[6px] bg-[#f1f5f9] rounded-[3px] overflow-hidden">
                        <div className="w-[98.5%] h-full bg-[#3b82f6] rounded-[3px]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar widgets */}
        <div className="flex flex-col gap-[16px]">
          
          {(currentRole === 'admin' || currentRole === 'asesor') && (
            <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
              <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                Ventas & POS
              </div>
              <div className="text-[24px] font-[800] text-[#1e293b] flex items-baseline gap-2">
                $ 4.820.000 <span className="text-[12px] text-[#10b981] font-[400]">+12% vs Ayer</span>
              </div>
              <div className="border-t border-[#f1f5f9] pt-[8px] mt-1">
                <div className="flex justify-between text-[11px] text-[#64748b] mb-[4px]">
                  <span>Consultas (Exentas)</span>
                  <span className="font-medium">$ 1.200.000</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#64748b]">
                  <span>Dispositivos (Gravados)</span>
                  <span className="font-medium">$ 3.620.000</span>
                </div>
              </div>
            </div>
          )}

          {currentRole === 'optometra' && (
             <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
             <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
               Estadísticas Clínicas
             </div>
             <div className="border-t border-[#f1f5f9] pt-[8px] mt-1">
               <div className="flex justify-between text-[11px] text-[#64748b] mb-[4px]">
                 <span>Atenciones Hoy</span>
                 <span className="font-medium">6</span>
               </div>
               <div className="flex justify-between text-[11px] text-[#64748b]">
                 <span>Historias por Cerrar</span>
                 <span className="font-medium text-[#ef4444]">1</span>
               </div>
             </div>
           </div>
          )}

          <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px] flex-grow">
            <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
              Alertas {currentRole === 'optometra' ? 'Clínicas' : 'Regulatorias'}
            </div>
            <div className="flex flex-col gap-[8px]">
              {currentRole === 'admin' && (
                <>
                  <div className="text-[11px] p-[8px] border-l-[3px] border-[#f59e0b] bg-[#fffbeb] text-[#1e293b]">
                    <b>Vencimiento Registro:</b> Gafas Lectura Serie B (Lote 44). INVIMA vence en 15 días.
                  </div>
                  <div className="text-[11px] p-[8px] border-l-[3px] border-[#ef4444] bg-[#fef2f2] text-[#1e293b]">
                    <b>Auditoría HC:</b> 3 Historias de ayer sin firma digital del optómetra.
                  </div>
                  <div className="text-[11px] p-[8px] border-l-[3px] border-[#3b82f6] bg-[#eff6ff] text-[#1e293b]">
                    <b>Facturación:</b> Resolución DIAN próxima a agotar (850/1000 folios).
                  </div>
                </>
              )}
              {currentRole === 'asesor' && (
                <>
                  <div className="text-[11px] p-[8px] border-l-[3px] border-[#3b82f6] bg-[#eff6ff] text-[#1e293b]">
                    <b>Recordatorio:</b> Cotización #940 por vencer hoy.
                  </div>
                </>
              )}
              {currentRole === 'optometra' && (
                <>
                  <div className="text-[11px] p-[8px] border-l-[3px] border-[#ef4444] bg-[#fef2f2] text-[#1e293b]">
                    <b>Auditoría HC:</b> Tiene 1 Historia de ayer pendiente de firma digital.
                  </div>
                </>
              )}
            </div>
          </div>

          {currentRole === 'admin' && (
             <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-[8px] p-[12px] flex flex-col gap-[8px]">
                <div className="text-[12px] font-bold text-[#475569] uppercase mb-[4px] flex items-center justify-between">
                  Promociones Activas <span className="font-normal text-[#3b82f6] cursor-pointer">+ Nueva</span>
                </div>
                <div className="text-[11px] p-[8px] border border-[#e2e8f0] rounded-[4px] flex justify-between items-center">
                  <div>
                     <b>Promo Mes del Lente</b><br />
                     <span className="text-[#64748b]">10% Dcto en Progresivos</span>
                  </div>
                  <span className="px-[8px] py-[2px] rounded-[99px] text-[10px] font-semibold uppercase bg-[#dcfce7] text-[#166534]">Activa</span>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#ffffff] border-t border-[#e2e8f0] flex items-center px-[16px] text-[11px] text-[#64748b] col-start-2 gap-[16px]">
        <span>&copy; 2024 OptiSaaS Colombia - Cumplimiento Ley 1581 & Res 1995</span>
        <span className="text-[#e2e8f0]">|</span>
        <span>
          Estado Servidor: <b className="text-[#10b981]">● Óptimo</b>
        </span>
        <span className="text-[#e2e8f0]">|</span>
        <span>
          Facturación Electrónica: <b>Activa</b>
        </span>
        <div className="ml-auto">
          Habilitación Salud: 11001-08234-01
        </div>
      </footer>
      
    </div>
  );
}

