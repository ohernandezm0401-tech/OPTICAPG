'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Clock,
  Terminal,
  Lock
} from 'lucide-react';
import { toast } from '@/lib/toast-store';

interface SecurityLog {
  id: string;
  timestamp: string;
  ip: string;
  email: string;
  empresaNombre: string;
  action: string;
  severity: 'info' | 'warning' | 'danger';
}

const mockSecurityLogs: SecurityLog[] = [
  { id: 'log-1', timestamp: new Date(Date.now() - 5 * 60000).toISOString(), ip: '190.143.45.12', email: 'admin@visiontotal.com', empresaNombre: 'Ópticas Visión Total S.A.S', action: 'Inicio de Sesión Exitoso (NextAuth)', severity: 'info' },
  { id: 'log-2', timestamp: new Date(Date.now() - 25 * 60000).toISOString(), ip: '190.143.45.12', email: 'carlos@visiontotal.com', empresaNombre: 'Ópticas Visión Total S.A.S', action: 'Generación Documento Equivalente - Venta #FAC-1002', severity: 'info' },
  { id: 'log-3', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), ip: '186.28.192.104', email: 'desconocido@intent.com', empresaNombre: 'Desconocido', action: 'Intento Fallido de Inicio de Sesión (Contraseña Incorrecta)', severity: 'warning' },
  { id: 'log-4', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), ip: '191.98.22.41', email: 'admin@opticentro.com', empresaNombre: 'OptiCentro Express', action: 'Límite de Sedes Alcanzado - Bloqueo de Petición API', severity: 'warning' },
  { id: 'log-5', timestamp: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), ip: '181.48.99.123', email: 'owner@optisaas.co', empresaNombre: 'Plataforma (Soporte)', action: 'Suspensión Temporal de Cuenta - Facturación Atrasada (emp2)', severity: 'danger' },
  { id: 'log-6', timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), ip: '190.143.45.12', email: 'dra.vega@visiontotal.com', empresaNombre: 'Ópticas Visión Total S.A.S', action: 'Modificación de Historia Clínica Firme (Bloqueado por RIPS)', severity: 'danger' },
  { id: 'log-7', timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), ip: '190.22.144.55', email: 'admin@visiontotal.com', empresaNombre: 'Ópticas Visión Total S.A.S', action: 'Sincronización Plan SaaS Enterprise - Stripe Webhook', severity: 'info' },
];

export default function SecurityLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logs, setLogs] = useState<SecurityLog[]>(mockSecurityLogs);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, severityFilter, startDate, endDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Add a new mock log on refresh for interactivity
    const newLog: SecurityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ip: `190.143.45.${Math.floor(Math.random() * 254)}`,
      email: 'carlos@visiontotal.com',
      empresaNombre: 'Ópticas Visión Total S.A.S',
      action: 'Consulta rápida de Catálogo de Lentes Comerciales',
      severity: 'info'
    };
    setLogs(prev => [newLog, ...prev]);
    setIsRefreshing(false);
    toast.success('Logs de seguridad actualizados');
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.empresaNombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    
    // Date range filtering
    let matchesDate = true;
    const logDate = new Date(log.timestamp);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && logDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && logDate <= end;
    }

    return matchesSearch && matchesSeverity && matchesDate;
  });

  // Paginated logs
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const displayedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seguridad & Auditoría</h1>
          <p className="text-muted-foreground text-sm">Registro de actividad global, accesos no autorizados e integraciones API.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-secondary text-foreground hover:bg-secondary/80 border border-border px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `optisaas-security-logs-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Logs de auditoría exportados correctamente.');
            }}
            className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar Logs
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">100%</div>
            <div className="text-xs text-muted-foreground">Uptime de Seguridad API</div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-lg text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs text-muted-foreground">Alertas Críticas Activas</div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-blue-500/10 p-3 rounded-lg text-blue-500">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">MFA</div>
            <div className="text-xs text-muted-foreground">Estado Autenticación Plataforma</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col">
        
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col xl:flex-row gap-3 bg-secondary/15 rounded-t-xl justify-between items-stretch xl:items-center">
          <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por acción, usuario o empresa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs focus:ring-2 focus:ring-primary outline-none text-foreground font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-background border border-input rounded-lg text-xs focus:ring-2 focus:ring-primary outline-none text-foreground font-medium"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-black uppercase tracking-wider text-destructive hover:underline px-2 py-1 bg-destructive/10 border border-destructive/20 rounded-md transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none w-full xl:w-44"
          >
            <option value="all">Todas las Gravedades</option>
            <option value="info">INFO (Informativo)</option>
            <option value="warning">WARNING (Advertencia)</option>
            <option value="danger">DANGER (Crítico)</option>
          </select>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-bold">
              <tr>
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Empresa / Clínica</th>
                <th className="px-6 py-3.5">Usuario / IP</th>
                <th className="px-6 py-3.5">Acción Realizada</th>
                <th className="px-6 py-3.5 text-right">Gravedad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {displayedLogs.map((log) => {
                const formattedTime = new Date(log.timestamp).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                });
                const formattedDate = new Date(log.timestamp).toLocaleDateString('es-CO');

                return (
                  <tr key={log.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {formattedDate} {formattedTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-foreground">{log.empresaNombre}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-foreground font-bold">{log.email}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">IP: {log.ip}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {log.action}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        log.severity === 'danger' ? 'bg-destructive/15 text-destructive border-destructive/20' :
                        log.severity === 'warning' ? 'bg-warning/15 text-warning border-warning/20' :
                        'bg-slate-500/10 text-slate-600 border-slate-500/20'
                      }`}>
                        {log.severity === 'danger' ? 'Crítico' : log.severity === 'warning' ? 'Advertencia' : 'Info'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {displayedLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground font-medium">
                    No se encontraron registros de seguridad con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-secondary/10 rounded-b-xl">
            <span className="text-xs text-muted-foreground font-medium">
              Mostrando {Math.min(filteredLogs.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} a {Math.min(filteredLogs.length, currentPage * ITEMS_PER_PAGE)} de {filteredLogs.length} logs
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <span className="text-xs font-mono font-bold flex items-center px-2">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-border rounded-lg bg-background text-xs font-semibold hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
