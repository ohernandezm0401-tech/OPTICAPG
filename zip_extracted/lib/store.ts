import { create } from 'zustand';
import { Cita, StatusType, RecomendacionClinica, Paciente, HistoriaClinica, ProductoInventario, Empresa, Sede, Usuario, Promocion, OrdenTrabajo, OrderStatus, Garantia, EquipoMedico, LecturaAmbiental, IncidenteTecnovigilancia, RegistroResiduos, RegistroDesinfeccion, ConceptoSanitario, ServicioSaneamiento, TransaccionCaja, CajaSesion, DesgloseCaja, Proveedor, Compra, ConfiguracionMargenes, MensajeLog } from './types';
import { mockCitas, mockPacientes, mockInventario, mockEmpresas, mockSedes, mockUsuarios, mockPromociones, mockOrdenesTrabajo, mockGarantias, mockEquiposMedicos, mockLecturasAmbientales, mockRegistrosResiduos, mockRegistrosDesinfeccion, mockConceptoSanitario, mockSaneamientoLogs, mockCajaSesiones } from './mock-data';
import { supabase } from './supabase';
import * as mappers from './supabase-mappers';

const isSupabaseActive = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes('placeholder-url') && !url.includes('tu-proyecto-id');
};


export interface PlatformConfig {
  trialDays: number;
  maintenanceMode: boolean;
  dianMode: 'sandbox' | 'production';
}

interface ClinicStore {
  citas: Cita[];
  pacientes: Paciente[];
  inventario: ProductoInventario[];
  empresas: Empresa[];
  sedes: Sede[];
  usuarios: Usuario[];
  promociones: Promocion[];
  ordenesTrabajo: OrdenTrabajo[];
  garantias: Garantia[];
  equiposMedicos: EquipoMedico[];
  lecturasAmbientales: LecturaAmbiental[];
  registrosResiduos: RegistroResiduos[];
  registrosDesinfeccion: RegistroDesinfeccion[];
  conceptoSanitario: ConceptoSanitario;
  saneamientoLogs: ServicioSaneamiento[];
  platformConfig: PlatformConfig;
  
  // Módulo de Compras y Márgenes
  proveedores: Proveedor[];
  compras: Compra[];
  configuracionMargenes: ConfiguracionMargenes[];
  addProveedor: (prov: Proveedor) => void;
  addCompra: (compra: Compra) => void;
  configurarMargen: (categoria: string, porcentaje: number) => void;

  updateCitaStatus: (id: string, status: StatusType) => void;
  updateCitaRecomendacion: (id: string, recomendacion: RecomendacionClinica) => void;
  addPaciente: (paciente: Paciente) => void;
  updatePaciente: (id: string, data: Partial<Paciente>) => void;
  addCita: (cita: Cita) => void;
  guardarHistoriaClinica: (citaId: string, hc: HistoriaClinica) => void;
  completeCitaPago: (citaId: string, pagoInfo: { cufe: string; pdfUrl: string; monto: number; metodoPago: string; promocionAplicadaId?: string; descuentoAplicado?: number; productosVendidos?: { productoId: string; cantidad: number; precioUnitario: number }[] }) => void;
  addProducto: (producto: ProductoInventario) => void;
  updateStock: (id: string, newStock: number) => void;
  deleteProducto: (id: string) => void;
  addEmpresa: (empresa: Empresa) => void;
  updateEmpresa: (id: string, data: Partial<Empresa>) => void;
  deleteEmpresa: (id: string) => void;
  // Sedes CRUD
  addSede: (sede: Sede) => void;
  updateSede: (id: string, data: Partial<Sede>) => void;
  deleteSede: (id: string) => void;
  // Usuarios CRUD
  addUsuario: (usuario: Usuario, password?: string) => void;
  updateUsuario: (id: string, data: Partial<Usuario>) => void;
  deleteUsuario: (id: string) => void;
  // Platform Config
  updatePlatformConfig: (data: Partial<PlatformConfig>) => void;
  syncLentesComerciales: (lentes: ProductoInventario[]) => void;
  addPromocion: (promocion: Promocion) => void;
  updatePromocion: (id: string, data: Partial<Promocion>) => void;
  deletePromocion: (id: string) => void;
  togglePromocion: (id: string) => void;
  addOrdenTrabajo: (orden: OrdenTrabajo) => void;
  updateOrdenStatus: (id: string, status: OrderStatus) => void;
  aprobarCalidadOptometra: (id: string, observaciones: string, profesionalId: string) => void;
  aprobarCalidadAsesor: (id: string, observaciones: string, asesorId: string) => void;
  completarEntrega: (id: string, comentarios: string, firmaPng: string) => void;
  
  // Garantias Actions
  addGarantia: (garantia: Garantia) => void;
  updateGarantia: (id: string, data: Partial<Garantia>) => void;
  resolverGarantia: (id: string, data: { resolucionTipo: Garantia['resolucionTipo']; resolucionDetalle: string; costoOptica?: number; costoPaciente?: number }) => void;
  
  // Compliance Actions
  addEquipoMedico: (equipo: EquipoMedico) => void;
  updateEquipoMedico: (id: string, data: Partial<EquipoMedico>) => void;
  addLecturaAmbiental: (lectura: LecturaAmbiental) => void;
  addIncidenteTecnovigilancia: (equipoId: string, incidente: IncidenteTecnovigilancia) => void;
  addRegistroResiduos: (registro: RegistroResiduos) => void;
  addRegistroDesinfeccion: (registro: RegistroDesinfeccion) => void;
  actualizarConceptoSanitario: (data: Partial<ConceptoSanitario>) => void;
  addSaneamientoLog: (log: ServicioSaneamiento) => void;
  cajaSesiones: CajaSesion[];
  cajaSesionActiva: CajaSesion | null;
  abrirCaja: (usuarioId: string, usuarioNombre: string, base: number, observaciones?: string) => void;
  registrarTransaccionCaja: (tipo: TransaccionCaja['tipo'], monto: number, metodoPago: TransaccionCaja['metodoPago'], descripcion: string, referenciaId?: string) => void;
  cerrarCaja: (montoCierreDeclarado: number, observaciones?: string, desglose?: DesgloseCaja) => void;
  whatsappSedesConectadas: Record<string, boolean>;
  setSedeWhatsappConnected: (sedeId: string, connected: boolean) => void;
  mensajesGlobales: MensajeLog[];
  enviarMensajeChat: (sedeId: string, pacienteNombre: string, pacienteTelefono: string, texto: string, direccion?: 'entrante' | 'saliente') => void;
  initializeStoreFromSupabase: () => Promise<void>;
}



// Helper functions for client-side persistence
const getInitialEmpresas = () => {
  if (typeof window === 'undefined') return mockEmpresas;
  try {
    const stored = localStorage.getItem('optisaas_registered_empresas');
    if (stored) {
      const custom = JSON.parse(stored);
      const filteredCustom = custom.filter((c: any) => !mockEmpresas.some(me => me.id === c.id));
      return [...mockEmpresas, ...filteredCustom];
    }
  } catch (e) {
    console.error("Error loading empresas from localStorage", e);
  }
  return mockEmpresas;
};

const getInitialUsuarios = () => {
  if (typeof window === 'undefined') return mockUsuarios;
  try {
    const stored = localStorage.getItem('optisaas_registered_usuarios');
    if (stored) {
      const custom = JSON.parse(stored);
      const filteredCustom = custom.filter((c: any) => !mockUsuarios.some(mu => mu.id === c.id));
      return [...mockUsuarios, ...filteredCustom];
    }
  } catch (e) {
    console.error("Error loading usuarios from localStorage", e);
  }
  return mockUsuarios;
};

const getInitialSedes = () => {
  if (typeof window === 'undefined') return mockSedes;
  try {
    const stored = localStorage.getItem('optisaas_registered_sedes');
    if (stored) {
      const custom = JSON.parse(stored);
      const filteredCustom = custom.filter((c: any) => !mockSedes.some(ms => ms.id === c.id));
      return [...mockSedes, ...filteredCustom];
    }
  } catch (e) {
    console.error("Error loading sedes from localStorage", e);
  }
  return mockSedes;
};

const getInitialEquiposMedicos = () => {
  if (typeof window === 'undefined') return mockEquiposMedicos;
  try {
    const stored = localStorage.getItem('optisaas_equipos_medicos');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading equipos from localStorage", e);
  }
  return mockEquiposMedicos;
};

const getInitialLecturasAmbientales = () => {
  if (typeof window === 'undefined') return mockLecturasAmbientales;
  try {
    const stored = localStorage.getItem('optisaas_lecturas_ambientales');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading lecturas from localStorage", e);
  }
  return mockLecturasAmbientales;
};

const getInitialRegistrosResiduos = () => {
  if (typeof window === 'undefined') return mockRegistrosResiduos;
  try {
    const stored = localStorage.getItem('optisaas_registros_residuos');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading residuos from localStorage", e);
  }
  return mockRegistrosResiduos;
};

const getInitialRegistrosDesinfeccion = () => {
  if (typeof window === 'undefined') return mockRegistrosDesinfeccion;
  try {
    const stored = localStorage.getItem('optisaas_registros_desinfeccion');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading desinfeccion from localStorage", e);
  }
  return mockRegistrosDesinfeccion;
};

const getInitialConceptoSanitario = () => {
  if (typeof window === 'undefined') return mockConceptoSanitario;
  try {
    const stored = localStorage.getItem('optisaas_concepto_sanitario');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading concepto sanitario from localStorage", e);
  }
  return mockConceptoSanitario;
};

const getInitialSaneamientoLogs = () => {
  if (typeof window === 'undefined') return mockSaneamientoLogs;
  try {
    const stored = localStorage.getItem('optisaas_saneamiento_logs');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading saneamiento logs from localStorage", e);
  }
  return mockSaneamientoLogs;
};

const getInitialCajaSesiones = () => {
  if (typeof window === 'undefined') return mockCajaSesiones;
  try {
    const stored = localStorage.getItem('optisaas_caja_sesiones');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading caja sesiones from localStorage", e);
  }
  return mockCajaSesiones;
};

const getInitialCajaSesionActiva = () => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('optisaas_caja_sesion_activa');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error loading active caja sesion from localStorage", e);
  }
  return null;
};

const getInitialWhatsappSedes = () => {
  if (typeof window === 'undefined') return { sede1: false, sede2: false };
  try {
    return {
      sede1: localStorage.getItem('optisaas_whatsapp_connected_sede1') === 'true',
      sede2: localStorage.getItem('optisaas_whatsapp_connected_sede2') === 'true',
    };
  } catch (e) {
    return { sede1: false, sede2: false };
  }
};

import { LENTES_COMERCIALES_CATALOGO } from './lentes-catalog';
import scrapedLentes from './scraped-lentes.json';

export const useClinicStore = create<ClinicStore>((set) => ({
  citas: mockCitas,
  pacientes: mockPacientes,
  inventario: [...mockInventario, ...LENTES_COMERCIALES_CATALOGO, ...scrapedLentes],
  empresas: getInitialEmpresas(),
  sedes: getInitialSedes(),
  usuarios: getInitialUsuarios(),
  promociones: mockPromociones,
  ordenesTrabajo: mockOrdenesTrabajo,
  garantias: mockGarantias,
  equiposMedicos: getInitialEquiposMedicos(),
  lecturasAmbientales: getInitialLecturasAmbientales(),
  registrosResiduos: getInitialRegistrosResiduos(),
  registrosDesinfeccion: getInitialRegistrosDesinfeccion(),
  conceptoSanitario: getInitialConceptoSanitario(),
  saneamientoLogs: getInitialSaneamientoLogs(),
  cajaSesiones: getInitialCajaSesiones(),
  cajaSesionActiva: getInitialCajaSesionActiva(),
  platformConfig: { trialDays: 15, maintenanceMode: false, dianMode: 'sandbox' },
  whatsappSedesConectadas: getInitialWhatsappSedes(),
  mensajesGlobales: [],
  enviarMensajeChat: (sedeId, pacienteNombre, pacienteTelefono, texto, direccion = 'saliente') => set((state) => {
    const newLog: MensajeLog = {
      id: `MSG-CHAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tipo: 'chat',
      pacienteNombre,
      pacienteTelefono,
      fechaEnvio: new Date().toISOString(),
      mensajeText: texto,
      estado: 'enviado',
      direccion
    };
    
    let updatedCaja = state.cajaSesionActiva;
    if (updatedCaja && updatedCaja.estado === 'abierta' && updatedCaja.sedeId === sedeId) {
      const nuevasComms = {
        ...(updatedCaja.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] }),
        mensajesLogs: [...(updatedCaja.comunicaciones?.mensajesLogs || []), newLog]
      };
      updatedCaja = { ...updatedCaja, comunicaciones: nuevasComms };
      if (typeof window !== 'undefined') localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
    }

    if (isSupabaseActive()) {
      supabase.from('mensajes_logs').insert({
        id: newLog.id,
        sesion_id: updatedCaja?.id || null,
        tipo: newLog.tipo,
        paciente_nombre: newLog.pacienteNombre,
        paciente_telefono: newLog.pacienteTelefono,
        fecha_envio: newLog.fechaEnvio,
        mensaje_text: newLog.mensajeText,
        estado: newLog.estado,
        direccion: newLog.direccion
      }).then(({ error }) => { if (error) console.error('Error logging chat message in Supabase:', error); });
    }

    return { 
      mensajesGlobales: [...state.mensajesGlobales, newLog],
      cajaSesionActiva: updatedCaja
    };
  }),
  setSedeWhatsappConnected: (sedeId, connected) => {
    if (isSupabaseActive()) {
      supabase.from('sedes').update({ whatsapp_conectado: connected }).eq('id', sedeId)
        .then(({ error }) => { if (error) console.error('Error updating whatsapp_conectado in Supabase:', error); });
    }
    
    set((state) => ({
      sedes: state.sedes.map(s => s.id === sedeId ? { ...s, whatsappConectado: connected } : s),
      whatsappSedesConectadas: {
        ...state.whatsappSedesConectadas,
        [sedeId]: connected
      }
    }));
  },

  initializeStoreFromSupabase: async () => {
    if (!isSupabaseActive()) return;
    try {
      const { data: emps } = await supabase.from('empresas').select('*');
      const { data: sds } = await supabase.from('sedes').select('*');
      const { data: usrs } = await supabase.from('usuarios').select('*');
      const { data: pacs } = await supabase.from('pacientes').select('*');
      const { data: cts } = await supabase.from('citas').select('*');
      const { data: hcs } = await supabase.from('historias_clinicas').select('*');
      const { data: invs } = await supabase.from('inventario').select('*');
      const { data: promos } = await supabase.from('promociones').select('*');
      const { data: ords } = await supabase.from('ordenes_trabajo').select('*');
      const { data: gars } = await supabase.from('garantias').select('*');
      const { data: cjs } = await supabase.from('caja_sesiones').select('*');
      const { data: txs } = await supabase.from('transacciones_caja').select('*');
      const { data: msgs } = await supabase.from('mensajes_logs').select('*');

      set((state) => ({
        empresas: emps && emps.length > 0 ? emps.map(mappers.mapEmpresaFromDb) : state.empresas,
        sedes: sds && sds.length > 0 ? sds.map(mappers.mapSedeFromDb) : state.sedes,
        usuarios: usrs && usrs.length > 0 ? usrs.map(mappers.mapUsuarioFromDb) : state.usuarios,
        pacientes: pacs && pacs.length > 0 ? pacs.map(mappers.mapPacienteFromDb) : state.pacientes,
        inventario: invs && invs.length > 0 ? invs.map(mappers.mapInventarioFromDb) : state.inventario,
        promociones: promos && promos.length > 0 ? promos.map(mappers.mapPromocionFromDb) : state.promociones,
        garantias: gars && gars.length > 0 ? gars.map(mappers.mapGarantiaFromDb) : state.garantias,
        citas: cts && cts.length > 0 ? cts.map((c: any) => {
          const matchingHc = hcs?.find((h: any) => h.cita_id === c.id);
          return mappers.mapCitaFromDb(c, matchingHc);
        }) : state.citas,
        ordenesTrabajo: ords && ords.length > 0 ? ords.map(mappers.mapOrdenFromDb) : state.ordenesTrabajo,
        cajaSesiones: cjs && cjs.length > 0 ? cjs.map((cj: any) => {
          const relatedTxs = txs?.filter((t: any) => t.sesion_id === cj.id) || [];
          return mappers.mapCajaSesionFromDb(cj, relatedTxs);
        }) : state.cajaSesiones,
        cajaSesionActiva: cjs ? (() => {
          const open = cjs.find((cj: any) => cj.estado === 'abierta');
          if (!open) return null;
          const relatedTxs = txs?.filter((t: any) => t.sesion_id === open.id) || [];
          return mappers.mapCajaSesionFromDb(open, relatedTxs);
        })() : state.cajaSesionActiva,
        mensajesGlobales: msgs && msgs.length > 0 ? msgs.map((m: any) => ({
          id: m.id,
          tipo: m.tipo,
          pacienteNombre: m.paciente_nombre,
          pacienteTelefono: m.paciente_telefono,
          fechaEnvio: m.fecha_envio,
          mensajeText: m.mensaje_text,
          detalleAdicional: m.detalle_adicional,
          estado: m.estado,
          direccion: m.direccion || 'saliente'
        })) : state.mensajesGlobales
      }));
    } catch (err) {
      console.error('Error fetching data from Supabase, using local fallback:', err);
    }
  },


  // Módulo de Compras y Márgenes
  proveedores: [
    { id: 'PROV-001', empresaId: 'emp1', nombre: 'Co-Opticas S.A.S', nit: '800.111.222-3', telefono: '3005556677', email: 'ventas@coopticas.com' },
    { id: 'PROV-002', empresaId: 'emp1', nombre: 'Distribuidora Internacional Lux', nit: '900.222.333-4', telefono: '3104445566', email: 'contacto@luxdistribuciones.com' },
    { id: 'PROV-003', empresaId: 'emp1', nombre: 'Servioptica S.A.S.', nit: '860.508.392-4', telefono: '6014482020', email: 'pedidos@servioptica.co', direccion: 'Calle 13 # 37-54, Bogotá' },
    { id: 'PROV-004', empresaId: 'emp1', nombre: 'Laboratorio Óptico Zeiss Colombia', nit: '900.567.890-1', telefono: '6017425555', email: 'servicio.zeiss@zeiss.com', direccion: 'Cra 15 # 93-75, Bogotá' },
    { id: 'PROV-005', empresaId: 'emp1', nombre: 'Optecom S.A.S.', nit: '890.302.145-2', telefono: '6026601234', email: 'ventas@optecom.com.co', direccion: 'Avenida 4 Norte # 10N-45, Cali' },
    { id: 'PROV-006', empresaId: 'emp1', nombre: 'Laboratorio Óptico Aliens S.A.S.', nit: '900.826.142-8', telefono: '3115556677', email: 'pedidos@aliens.com.co', direccion: 'Diagonal 45 Sur # 12-30, Bogotá' },
    { id: 'PROV-007', empresaId: 'emp1', nombre: 'Austral Lens Colombia S.A.S.', nit: '900.400.135-7', telefono: '6013152200', email: 'comercial@australlens.com', direccion: 'Cra 22 # 63-12, Bogotá' },
    { id: 'PROV-008', empresaId: 'emp1', nombre: 'Megalens Digital Lab', nit: '901.124.897-5', telefono: '6044448899', email: 'laboratorio@megalens.com', direccion: 'Calle 10 # 43D-21, Medellín' }
  ],
  compras: [],
  configuracionMargenes: [
    { id: 'm1', empresaId: 'emp1', categoria: 'Monturas', porcentajeMargen: 100 },
    { id: 'm2', empresaId: 'emp1', categoria: 'Lentes Oftálmicos', porcentajeMargen: 80 },
    { id: 'm3', empresaId: 'emp1', categoria: 'Lentes de Contacto', porcentajeMargen: 50 },
    { id: 'm4', empresaId: 'emp1', categoria: 'Insumos', porcentajeMargen: 40 },
  ],
  addProveedor: (prov) => set((state) => ({ proveedores: [...state.proveedores, prov] })),
  addCompra: (compra) => set((state) => {
    let updatedInventario = [...state.inventario];
    compra.detalles.forEach(det => {
      if (det.productoId) {
        // Producto existente: incrementar stock
        updatedInventario = updatedInventario.map(item => {
          if (item.id === det.productoId) {
            const nuevoStock = item.stock + det.cantidad;
            const nuevoPrecioVenta = det.precioVenta || item.precioVenta;
            return {
              ...item,
              stock: nuevoStock,
              precioCompra: det.costoUnitario,
              precioVenta: nuevoPrecioVenta,
              precio: nuevoPrecioVenta // compatible
            };
          }
          return item;
        });
      } else if (det.nuevoProductoJson) {
        // Producto nuevo: crear
        const idNuevo = `INV-${String(updatedInventario.length + 1).padStart(3, '0')}`;
        const margen = state.configuracionMargenes.find(m => m.categoria.toLowerCase() === det.nuevoProductoJson!.categoria.toLowerCase())?.porcentajeMargen || 100;
        const precioVentaSugerido = Math.round(det.costoUnitario * (1 + margen / 100));
        const finalPrecioVenta = det.precioVenta || precioVentaSugerido;
        const barcodeVal = det.nuevoProductoJson.codigoBarras || idNuevo;

        const nuevoProd: ProductoInventario = {
          id: idNuevo,
          categoria: det.nuevoProductoJson.categoria,
          marca: det.nuevoProductoJson.marca,
          modelo: det.nuevoProductoJson.modelo,
          color: det.nuevoProductoJson.color,
          stock: det.cantidad,
          minStock: det.nuevoProductoJson.minStock || 5,
          precio: finalPrecioVenta,
          precioCompra: det.costoUnitario,
          precioVenta: finalPrecioVenta,
          codigoBarras: barcodeVal,
          codigoInvima: det.nuevoProductoJson.codigoInvima,
          lote: det.nuevoProductoJson.lote,
          vencimiento: det.nuevoProductoJson.vencimiento
        };
        updatedInventario.push(nuevoProd);
      }
    });

    if (isSupabaseActive()) {
      // 1. Save Compra Invoice
      supabase.from('compras').insert({
        id: compra.id,
        empresa_id: compra.empresaId,
        proveedor_id: compra.proveedorId,
        fecha: compra.fechaCompra,
        total: compra.valorCompra,
        factura_soporte_id: compra.numeroFactura,
        detalles: compra.detalles
      }).then(({ error }) => { if (error) console.error('Error saving Compra to Supabase:', error); });

      // 2. Save Inventory Changes
      compra.detalles.forEach(det => {
        if (det.productoId) {
          const updatedItem = updatedInventario.find(i => i.id === det.productoId);
          if (updatedItem) {
            supabase.from('inventario').update({
              stock: updatedItem.stock,
              precio_compra: updatedItem.precioCompra,
              precio_venta: updatedItem.precioVenta,
              precio: updatedItem.precio
            }).eq('id', det.productoId)
              .then(({ error }) => { if (error) console.error('Error updating inventory stock in Supabase:', error); });
          }
        } else {
          // Find the newly pushed product from updatedInventario
          const brand = det.nuevoProductoJson?.marca;
          const model = det.nuevoProductoJson?.modelo;
          const newlyAddedItem = updatedInventario.find(i => i.marca === brand && i.modelo === model && i.categoria === det.nuevoProductoJson?.categoria);
          if (newlyAddedItem) {
            supabase.from('inventario').insert(mappers.mapInventarioToDb(newlyAddedItem, compra.empresaId))
              .then(({ error }) => { if (error) console.error('Error inserting new inventory item to Supabase:', error); });
          }
        }
      });
    }

    return {
      compras: [...state.compras, compra],
      inventario: updatedInventario
    };
  }),
  configurarMargen: (categoria, porcentaje) => set((state) => ({
    configuracionMargenes: state.configuracionMargenes.map(m =>
      m.categoria.toLowerCase() === categoria.toLowerCase() ? { ...m, porcentajeMargen: porcentaje } : m
    )
  })),

  updateCitaStatus: (id, status) => {
    if (isSupabaseActive()) {
      supabase.from('citas').update({ estado_comercial: status }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Error updating appointment status in Supabase:', error); });
    }
    set((state) => ({
      citas: state.citas.map(cita => 
        cita.id === id ? { ...cita, estadoComercial: status } : cita
      )
    }));
  },
  updateCitaRecomendacion: (id, recomendacion) => {
    if (isSupabaseActive()) {
      supabase.from('citas').update({ recomendacion }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Error updating appointment recommendation in Supabase:', error); });
    }
    set((state) => ({
      citas: state.citas.map(cita => 
        cita.id === id ? { ...cita, recomendacion } : cita
      )
    }));
  },
  addPaciente: (paciente) => {
    if (isSupabaseActive()) {
      supabase.from('pacientes').insert(mappers.mapPacienteToDb(paciente))
        .then(({ error }) => { if (error) console.error('Error adding patient to Supabase:', error); });
    }
    set((state) => {
      const active = state.cajaSesionActiva;
      let updatedCaja = active;
      const targetEmpresa = state.empresas.find(e => e.id === paciente.empresaId);
      const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;

      if (active && active.estado === 'abierta') {
        const nuevosIds = [...(active.nuevosPacientesIds || []), paciente.id];
        
        let nuevasComms = active.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] };
        let newLog: MensajeLog | null = null;

        if (isWhatsappEnabled) {
          newLog = {
            id: `MSG-PC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tipo: 'primer-contacto',
            pacienteNombre: `${paciente.nombre} ${paciente.apellido}`,
            pacienteTelefono: paciente.telefono,
            fechaEnvio: new Date().toISOString(),
            mensajeText: `Hola ${paciente.nombre}, ¡bienvenido a nuestra óptica! Tu registro ha sido exitoso. Estaremos atentos a tus necesidades visuales.`,
            detalleAdicional: `Nuevo Registro - Documento: CC ${paciente.documento}`,
            estado: 'enviado'
          };
          nuevasComms = {
            ...nuevasComms,
            primerosContactos: (nuevasComms.primerosContactos || 0) + 1,
            mensajesLogs: [...(nuevasComms.mensajesLogs || []), newLog]
          };
        }

        updatedCaja = {
          ...active,
          nuevosPacientesIds: nuevosIds,
          comunicaciones: nuevasComms
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
        }

        if (isSupabaseActive()) {
          supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCaja)).eq('id', updatedCaja.id)
            .then(({ error }) => { if (error) console.error('Error updating active session communications in Supabase:', error); });
          if (newLog) {
            supabase.from('mensajes_logs').insert({
              id: newLog.id,
              sesion_id: updatedCaja.id,
              tipo: newLog.tipo,
              paciente_nombre: newLog.pacienteNombre,
              paciente_telefono: newLog.pacienteTelefono,
              fecha_envio: newLog.fechaEnvio,
              mensaje_text: newLog.mensajeText,
              detalle_adicional: newLog.detalleAdicional,
              estado: newLog.estado
            }).then(({ error }) => { if (error) console.error('Error logging first-contact message in Supabase:', error); });
          }
        }
      }
      return {
        pacientes: [...state.pacientes, paciente],
        cajaSesionActiva: updatedCaja
      };
    });
  },
  addCita: (cita) => {
    if (isSupabaseActive()) {
      supabase.from('citas').insert(mappers.mapCitaToDb(cita))
        .then(({ error }) => { if (error) console.error('Error adding appointment to Supabase:', error); });
    }
    set((state) => {
      const active = state.cajaSesionActiva;
      let updatedCaja = active;
      const targetSede = state.sedes.find(s => s.id === cita.sedeId);
      const targetEmpresa = state.empresas.find(e => e.id === targetSede?.empresaId);
      const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;

      if (active && active.estado === 'abierta') {
        const pac = state.pacientes.find(p => p.id === cita.pacienteId);
        const pacNombre = pac ? `${pac.nombre} ${pac.apellido}` : 'Paciente';
        const pacTelefono = pac ? pac.telefono : '';
        const formattedHora = new Date(cita.fechaHora).toLocaleTimeString('es-CO', {
          hour: '2-digit', minute: '2-digit', hour12: true
        });
        const formattedFecha = new Date(cita.fechaHora).toLocaleDateString('es-CO');
        
        let nuevasComms = active.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] };
        let newLog: MensajeLog | null = null;

        if (isWhatsappEnabled) {
          newLog = {
            id: `MSG-CI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            tipo: 'confirmacion-cita',
            pacienteNombre: pacNombre,
            pacienteTelefono: pacTelefono,
            fechaEnvio: new Date().toISOString(),
            mensajeText: `Hola ${pacNombre}, confirmamos tu cita programada para el ${formattedFecha} a las ${formattedHora} en la Sede Norte.`,
            detalleAdicional: `Agendamiento - Profesional ID: ${cita.profesionalId || 'Por asignar'}`,
            estado: 'enviado'
          };
          nuevasComms = {
            ...nuevasComms,
            confirmacionesCitas: (nuevasComms.confirmacionesCitas || 0) + 1,
            mensajesLogs: [...(nuevasComms.mensajesLogs || []), newLog]
          };
        }

        updatedCaja = {
          ...active,
          comunicaciones: nuevasComms
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
        }

        if (isSupabaseActive()) {
          supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCaja)).eq('id', updatedCaja.id)
            .then(({ error }) => { if (error) console.error('Error updating active session in Supabase:', error); });
          if (newLog) {
            supabase.from('mensajes_logs').insert({
              id: newLog.id,
              sesion_id: updatedCaja.id,
              tipo: newLog.tipo,
              paciente_nombre: newLog.pacienteNombre,
              paciente_telefono: newLog.pacienteTelefono,
              fecha_envio: newLog.fechaEnvio,
              mensaje_text: newLog.mensajeText,
              detalle_adicional: newLog.detalleAdicional,
              estado: newLog.estado
            }).then(({ error }) => { if (error) console.error('Error logging appointment message in Supabase:', error); });
          }
        }
      }
      return {
        citas: [...state.citas, cita],
        cajaSesionActiva: updatedCaja
      };
    });
  },
  guardarHistoriaClinica: (citaId, hc) => {
    if (isSupabaseActive()) {
      supabase.from('citas').update({ estado_comercial: 'cotizando' }).eq('id', citaId)
        .then(({ error }) => { if (error) console.error('Error updating appointment status in Supabase:', error); });
      supabase.from('historias_clinicas').upsert(mappers.mapHistoriaClinicaToDb(hc))
        .then(({ error }) => { if (error) console.error('Error saving EMR in Supabase:', error); });
    }
    set((state) => ({
      citas: state.citas.map(cita => 
        cita.id === citaId 
          ? { 
              ...cita, 
              historiaClinica: hc, 
              recomendacion: hc.recomendacion, 
              estadoComercial: 'cotizando' 
            } 
          : cita
      )
    }));
  },
  completeCitaPago: (citaId, pagoInfo) => {
    const facturaId = `FAC-${Date.now()}`;
    const fechaPago = new Date().toISOString();
    
    if (isSupabaseActive()) {
      supabase.from('citas').update({
        estado_comercial: 'pagado',
        factura_id: facturaId,
        cufe: pagoInfo.cufe,
        pdf_url: pagoInfo.pdfUrl,
        monto_cobrado: pagoInfo.monto,
        metodo_pago: pagoInfo.metodoPago,
        fecha_pago: fechaPago,
        promocion_aplicada_id: pagoInfo.promocionAplicadaId || null,
        descuento_aplicado: pagoInfo.descuentoAplicado || null,
        productos_vendidos: pagoInfo.productosVendidos || null
      }).eq('id', citaId)
        .then(({ error }) => { if (error) console.error('Error completing payment in Supabase:', error); });
      
      const state = useClinicStore.getState();
      const citaObj = state.citas.find(c => c.id === citaId);
      if (citaObj) {
        supabase.from('pacientes').select('saldo_pendiente').eq('id', citaObj.pacienteId).single()
          .then(({ data }) => {
            if (data) {
              const newBalance = Math.max(0, Number(data.saldo_pendiente) - (pagoInfo.monto || 0));
              supabase.from('pacientes').update({ saldo_pendiente: newBalance }).eq('id', citaObj.pacienteId)
                .then(({ error }) => { if (error) console.error('Error updating patient balance in Supabase:', error); });
            }
          });
      }
    }

    set((state) => {
      let nuevasPromos = state.promociones;
      if (pagoInfo.promocionAplicadaId) {
        nuevasPromos = state.promociones.map(p => 
          p.id === pagoInfo.promocionAplicadaId ? { ...p, vecesAplicada: p.vecesAplicada + 1 } : p
        );
      }

      let updatedCajaActiva = state.cajaSesionActiva;
      if (updatedCajaActiva && updatedCajaActiva.estado === 'abierta') {
        const isEfectivo = pagoInfo.metodoPago === 'EFECTIVO';
        const newTx: TransaccionCaja = {
          id: `TX-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
          fecha: new Date().toISOString(),
          tipo: 'ingreso-venta',
          monto: pagoInfo.monto,
          metodoPago: (pagoInfo.metodoPago as any) || 'EFECTIVO',
          referenciaId: citaId,
          descripcion: `Venta directa POS - Cita #${citaId}`
        };
        
        const expectedAddition = isEfectivo ? pagoInfo.monto : 0;
        const hasGafas = pagoInfo.productosVendidos && pagoInfo.productosVendidos.length > 0;
        const isCrm = !!pagoInfo.promocionAplicadaId;
        
        const cita = state.citas.find(c => c.id === citaId);
        const pac = cita ? state.pacientes.find(p => p.id === cita.pacienteId) : null;
        const pacNombre = pac ? `${pac.nombre} ${pac.apellido}` : 'Paciente';
        const pacTelefono = pac ? pac.telefono : '';
        const targetEmpresa = state.empresas.find(e => e.id === pac?.empresaId);
        const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;
        
        const newLogs: MensajeLog[] = [];
        if (isWhatsappEnabled) {
          if (hasGafas) {
            newLogs.push({
              id: `MSG-GF-${Date.now()}-1`,
              tipo: 'gafas',
              pacienteNombre: pacNombre,
              pacienteTelefono: pacTelefono,
              fechaEnvio: new Date().toISOString(),
              mensajeText: `Estimado(a) ${pacNombre}, hemos recibido tu pago de $${pagoInfo.monto.toLocaleString('es-CO')}. Iniciamos la orden de fabricación en laboratorio para tus gafas.`,
              detalleAdicional: `Facturado - Cita: #${citaId}`,
              estado: 'enviado'
            });
          }
          if (isCrm) {
            const promo = state.promociones.find(p => p.id === pagoInfo.promocionAplicadaId);
            const promoNombre = promo ? promo.nombre : 'Promoción Aplicada';
            newLogs.push({
              id: `MSG-CRM-${Date.now()}-2`,
              tipo: 'crm',
              pacienteNombre: pacNombre,
              pacienteTelefono: pacTelefono,
              fechaEnvio: new Date().toISOString(),
              mensajeText: `Hola ${pacNombre}, se aplicó con éxito el beneficio de la campaña "${promoNombre}" a tu compra. ¡Disfruta tus descuentos!`,
              detalleAdicional: `Campaña: ${promoNombre} - Descuento: $${pagoInfo.descuentoAplicado?.toLocaleString('es-CO') || 0}`,
              estado: 'enviado'
            });
          }
        }

        const nuevasComms = {
          ...(updatedCajaActiva.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] }),
          mensajesGafas: (updatedCajaActiva.comunicaciones?.mensajesGafas || 0) + (isWhatsappEnabled && hasGafas ? 1 : 0),
          crmPromociones: (updatedCajaActiva.comunicaciones?.crmPromociones || 0) + (isWhatsappEnabled && isCrm ? 1 : 0),
          mensajesLogs: [...(updatedCajaActiva.comunicaciones?.mensajesLogs || []), ...newLogs]
        };

        updatedCajaActiva = {
          ...updatedCajaActiva,
          montoCierreCalculado: (updatedCajaActiva.montoCierreCalculado || updatedCajaActiva.montoApertura) + expectedAddition,
          transacciones: [...updatedCajaActiva.transacciones, newTx],
          comunicaciones: nuevasComms
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCajaActiva));
        }

        if (isSupabaseActive()) {
          supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCajaActiva)).eq('id', updatedCajaActiva.id)
            .then(({ error }) => { if (error) console.error('Error updating active session in Supabase:', error); });
          supabase.from('transacciones_caja').insert(mappers.mapTransaccionToDb(newTx, updatedCajaActiva.id))
            .then(({ error }) => { if (error) console.error('Error inserting POS transaction in Supabase:', error); });
          
          newLogs.forEach(log => {
            supabase.from('mensajes_logs').insert({
              id: log.id,
              sesion_id: updatedCajaActiva!.id,
              tipo: log.tipo,
              paciente_nombre: log.pacienteNombre,
              paciente_telefono: log.pacienteTelefono,
              fecha_envio: log.fechaEnvio,
              mensaje_text: log.mensajeText,
              detalle_adicional: log.detalleAdicional,
              estado: log.estado
            }).then(({ error }) => { if (error) console.error('Error logging checkout message in Supabase:', error.message || JSON.stringify(error)); });
          });
        }
      }

      return {
        promociones: nuevasPromos,
        cajaSesionActiva: updatedCajaActiva,
        citas: state.citas.map(cita => 
          cita.id === citaId 
            ? { 
                ...cita, 
                estadoComercial: 'pagado',
                facturaId: facturaId,
                cufe: pagoInfo.cufe,
                pdfUrl: pagoInfo.pdfUrl,
                montoCobrado: pagoInfo.monto,
                metodoPago: pagoInfo.metodoPago,
                fechaPago: fechaPago,
                promocionAplicadaId: pagoInfo.promocionAplicadaId,
                descuentoAplicado: pagoInfo.descuentoAplicado,
                productosVendidos: pagoInfo.productosVendidos
              } 
            : cita
        )
      };
    });
  },
  addProducto: (producto) => set((state) => ({
    inventario: [...state.inventario, producto]
  })),
  updateStock: (id, newStock) => set((state) => ({
    inventario: state.inventario.map(item => 
      item.id === id ? { ...item, stock: newStock } : item
    )
  })),
  deleteProducto: (id) => set((state) => ({
    inventario: state.inventario.filter(item => item.id !== id)
  })),
  updatePaciente: (id, data) => set((state) => {
    const updated = state.pacientes.map(p => 
      p.id === id ? { ...p, ...data } : p
    );
    if (isSupabaseActive()) {
      const updatedPac = updated.find(p => p.id === id);
      if (updatedPac) {
        supabase.from('pacientes').update(mappers.mapPacienteToDb(updatedPac)).eq('id', id)
          .then(({ error }) => { if (error) console.error('Error updating patient in Supabase:', error); });
      }
    }
    return { pacientes: updated };
  }),
  addEmpresa: (empresa) => set((state) => {
    const updated = [...state.empresas, empresa];
    if (typeof window !== 'undefined') {
      const custom = updated.filter(e => !mockEmpresas.some(me => me.id === e.id));
      localStorage.setItem('optisaas_registered_empresas', JSON.stringify(custom));
      document.cookie = `optisaas_registered_empresas=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (isSupabaseActive()) {
      supabase.from('empresas').insert(mappers.mapEmpresaToDb(empresa))
        .then(({ error }) => { if (error) console.error('Error adding empresa to Supabase:', error); });
    }
    return { empresas: updated };
  }),
  updateEmpresa: (id, data) => set((state) => {
    const updated = state.empresas.map(e => e.id === id ? { ...e, ...data } : e);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(e => !mockEmpresas.some(me => me.id === e.id));
      localStorage.setItem('optisaas_registered_empresas', JSON.stringify(custom));
      document.cookie = `optisaas_registered_empresas=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (isSupabaseActive()) {
      const target = updated.find(e => e.id === id);
      if (target) {
        supabase.from('empresas').update(mappers.mapEmpresaToDb(target)).eq('id', id)
          .then(({ error }) => { if (error) console.error('Error updating empresa in Supabase:', error); });
      }
    }
    return { empresas: updated };
  }),
  deleteEmpresa: (id) => set((state) => {
    const updated = state.empresas.filter(e => e.id !== id);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(e => !mockEmpresas.some(me => me.id === e.id));
      localStorage.setItem('optisaas_registered_empresas', JSON.stringify(custom));
      document.cookie = `optisaas_registered_empresas=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
    }
    if (isSupabaseActive()) {
      supabase.from('empresas').delete().eq('id', id)
        .then(({ error }) => { if (error) console.error('Error deleting empresa in Supabase:', error); });
    }
    return { empresas: updated };
  }),
  addSede: (sede) => set((state) => {
    const updated = [...state.sedes, sede];
    if (typeof window !== 'undefined') {
      const custom = updated.filter(s => !mockSedes.some(ms => ms.id === s.id));
      localStorage.setItem('optisaas_registered_sedes', JSON.stringify(custom));
    }
    return { sedes: updated };
  }),
  updateSede: (id, data) => set((state) => {
    const updated = state.sedes.map(s => s.id === id ? { ...s, ...data } : s);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(s => !mockSedes.some(ms => ms.id === s.id));
      localStorage.setItem('optisaas_registered_sedes', JSON.stringify(custom));
    }
    return { sedes: updated };
  }),
  deleteSede: (id) => set((state) => {
    const updated = state.sedes.filter(s => s.id !== id);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(s => !mockSedes.some(ms => ms.id === s.id));
      localStorage.setItem('optisaas_registered_sedes', JSON.stringify(custom));
    }
    return { sedes: updated };
  }),
  addUsuario: async (usuario, password) => {
    if (password && isSupabaseActive()) {
      const { error } = await supabase.auth.signUp({
        email: usuario.email,
        password: password,
        options: {
          data: {
            nombre: usuario.nombre,
            role: usuario.role,
            empresaId: usuario.empresaId
          }
        }
      });
      if (error) console.error('Error registering user in Supabase Auth:', error);
    }
    set((state) => {
      const updated = [...state.usuarios, usuario];
      if (typeof window !== 'undefined') {
        const custom = updated.filter(u => !mockUsuarios.some(mu => mu.id === u.id));
        localStorage.setItem('optisaas_registered_usuarios', JSON.stringify(custom));
        document.cookie = `optisaas_registered_usuarios=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return { usuarios: updated };
    });
  },
  updateUsuario: (id, data) => set((state) => {
    const updated = state.usuarios.map(u => u.id === id ? { ...u, ...data } : u);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(u => !mockUsuarios.some(mu => mu.id === u.id));
      localStorage.setItem('optisaas_registered_usuarios', JSON.stringify(custom));
      document.cookie = `optisaas_registered_usuarios=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return { usuarios: updated };
  }),
  deleteUsuario: (id) => set((state) => {
    const updated = state.usuarios.filter(u => u.id !== id);
    if (typeof window !== 'undefined') {
      const custom = updated.filter(u => !mockUsuarios.some(mu => mu.id === u.id));
      localStorage.setItem('optisaas_registered_usuarios', JSON.stringify(custom));
      document.cookie = `optisaas_registered_usuarios=${encodeURIComponent(JSON.stringify(custom))}; path=/; max-age=31536000; SameSite=Lax`;
    }
    return { usuarios: updated };
  }),
  updatePlatformConfig: (data) => set((state) => ({
    platformConfig: { ...state.platformConfig, ...data }
  })),
  syncLentesComerciales: (lentes) => set((state) => {
    const existingIds = new Set(state.inventario.map(i => i.id));
    const nuevasLentes = lentes.filter(l => !existingIds.has(l.id));
    return {
      inventario: [...state.inventario, ...nuevasLentes]
    };
  }),
  addPromocion: (promocion) => set((state) => ({
    promociones: [...state.promociones, promocion]
  })),
  updatePromocion: (id, data) => set((state) => ({
    promociones: state.promociones.map(p => 
      p.id === id ? { ...p, ...data } : p
    )
  })),
  deletePromocion: (id) => set((state) => ({
    promociones: state.promociones.filter(p => p.id !== id)
  })),
  togglePromocion: (id) => set((state) => ({
    promociones: state.promociones.map(p => 
      p.id === id ? { ...p, activa: !p.activa } : p
    )
  })),
  addOrdenTrabajo: (orden) => set((state) => {
    let updatedCajaActiva = state.cajaSesionActiva;
    if (updatedCajaActiva && updatedCajaActiva.estado === 'abierta' && orden.abono && orden.abono > 0) {
      const newTx: TransaccionCaja = {
        id: `TX-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
        fecha: new Date().toISOString(),
        tipo: 'ingreso-abono',
        monto: orden.abono,
        metodoPago: 'EFECTIVO', // abonos por orden
        referenciaId: orden.id,
        descripcion: `Abono de Orden #${orden.id} - Paciente: ${orden.pacienteNombre}`
      };

      updatedCajaActiva = {
        ...updatedCajaActiva,
        montoCierreCalculado: (updatedCajaActiva.montoCierreCalculado || updatedCajaActiva.montoApertura) + orden.abono,
        transacciones: [...updatedCajaActiva.transacciones, newTx]
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCajaActiva));
      }

      if (isSupabaseActive()) {
        supabase.from('transacciones_caja').insert({
          id: newTx.id,
          sesion_id: updatedCajaActiva.id,
          fecha: newTx.fecha,
          tipo: 'ingreso-abono',
          monto: newTx.monto,
          metodo_pago: newTx.metodoPago,
          descripcion: newTx.descripcion,
          referencia_id: newTx.referenciaId
        }).then(({ error }) => { if (error) console.error('Error syncing abono transaction to Supabase:', error); });
        
        supabase.from('caja_sesiones').update({
          monto_cierre_calculado: updatedCajaActiva.montoCierreCalculado
        }).eq('id', updatedCajaActiva.id)
          .then(({ error }) => { if (error) console.error('Error syncing cash session to Supabase:', error); });
      }
    }

    if (isSupabaseActive()) {
      supabase.from('ordenes_trabajo').insert(mappers.mapOrdenToDb(orden, 'emp1', 'sede1'))
        .then(({ error }) => { if (error) console.error('Error saving OrdenTrabajo to Supabase:', error); });
    }

    return {
      cajaSesionActiva: updatedCajaActiva,
      ordenesTrabajo: [...state.ordenesTrabajo, orden]
    };
  }),
  updateOrdenStatus: (id, status) => set((state) => {
    const updated = state.ordenesTrabajo.map(ord => 
      ord.id === id ? { ...ord, estado: status } : ord
    );
    if (isSupabaseActive()) {
      const dbEstado = status === 'calidad-optometra' || status === 'calidad-asesor' ? 'revision-calidad' : (status === 'listo-entrega' ? 'listo' : (status === 'enviado-laboratorio' ? 'en-espera' : (status === 'recibido-laboratorio' ? 'laboratorio' : status)));
      supabase.from('ordenes_trabajo').update({ estado: dbEstado }).eq('id', id)
        .then(({ error }) => { if (error) console.error('Error updating order status in Supabase:', error); });
    }
    return { ordenesTrabajo: updated };
  }),
  aprobarCalidadOptometra: (id, observaciones, profesionalId) => set((state) => {
    const active = state.cajaSesionActiva;
    let updatedCaja = active;
    
    const ord = state.ordenesTrabajo.find(o => o.id === id);
    if (!ord) return {};

    const checkOptometra = { aprobado: true, fecha: new Date().toISOString(), observaciones, profesionalId };
    const hasAsesorApproved = !!ord.checkAsesor?.aprobado;
    const newStatus: OrderStatus = hasAsesorApproved ? 'listo-entrega' : 'calidad-optometra';

    const pac = ord ? state.pacientes.find(p => p.id === ord.pacienteId) : null;
    const pacNombre = pac ? `${pac.nombre} ${pac.apellido}` : ord?.pacienteNombre || 'Paciente';
    const pacTelefono = pac ? pac.telefono : '';
    const targetEmpresa = state.empresas.find(e => e.id === pac?.empresaId);
    const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;

    let nuevasComms = active?.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] };
    const newLogs: MensajeLog[] = [];

    if (active && active.estado === 'abierta' && isWhatsappEnabled) {
      const newLogClinico: MensajeLog = {
        id: `MSG-QA-OPT-${Date.now()}-1`,
        tipo: 'alerta-clinica',
        pacienteNombre: pacNombre,
        pacienteTelefono: pacTelefono,
        fechaEnvio: new Date().toISOString(),
        mensajeText: `Control de calidad clínico aprobado por Optómetra para la orden #${id}. Lensometría y parámetros conformes.`,
        detalleAdicional: `Orden ID: ${id} - Aprobación Técnica`,
        estado: 'enviado'
      };

      const newLogGafas: MensajeLog = {
        id: `MSG-QA-OPT-GF-${Date.now()}-2`,
        tipo: 'gafas',
        pacienteNombre: pacNombre,
        pacienteTelefono: pacTelefono,
        fechaEnvio: new Date().toISOString(),
        mensajeText: newStatus === 'listo-entrega' 
          ? `¡Excelentes noticias ${pacNombre}! Tus gafas han superado con éxito el control de calidad clínico final del optómetra y ya están listas para entrega en la sucursal.`
          : `Hola ${pacNombre}, tus lentes ya pasaron el control clínico del optómetra con éxito y están listos para montaje en biselado.`,
        detalleAdicional: newStatus === 'listo-entrega' ? `Orden ID: ${id} - Estado: Listo para entrega` : `Orden ID: ${id} - Estado: Listo para montaje`,
        estado: 'enviado'
      };

      newLogs.push(newLogClinico, newLogGafas);
      
      nuevasComms = {
        ...nuevasComms,
        alertasClinicas: (nuevasComms.alertasClinicas || 0) + 1,
        mensajesGafas: (nuevasComms.mensajesGafas || 0) + 1,
        mensajesLogs: [...(nuevasComms.mensajesLogs || []), ...newLogs]
      };

      updatedCaja = {
        ...active,
        comunicaciones: nuevasComms
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
      }
    }

    const updatedOrders = state.ordenesTrabajo.map(o => 
      o.id === id 
        ? { 
            ...o, 
            estado: newStatus, 
            checkOptometra 
          } 
        : o
    );

    if (isSupabaseActive()) {
      const dbStatus = newStatus === 'calidad-optometra' ? 'revision-calidad' : 'listo';
      const aud = {
        optometra: checkOptometra,
        asesor: ord.checkAsesor || null
      };

      supabase.from('ordenes_trabajo').update({
        estado: dbStatus,
        auditoria_calidad: aud
      }).eq('id', id).then(({ error }) => { if (error) console.error('Error updating quality audit in Supabase:', error); });

      if (active && active.estado === 'abierta') {
        supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCaja!)).eq('id', updatedCaja!.id)
          .then(({ error }) => { if (error) console.error('Error updating active session in Supabase:', error); });
        
        newLogs.forEach(log => {
          supabase.from('mensajes_logs').insert({
            id: log.id,
            sesion_id: updatedCaja!.id,
            tipo: log.tipo,
            paciente_nombre: log.pacienteNombre,
            paciente_telefono: log.pacienteTelefono,
            fecha_envio: log.fechaEnvio,
            mensaje_text: log.mensajeText,
            detalle_adicional: log.detalleAdicional,
            estado: log.estado
          }).then(({ error }) => { if (error) console.error('Error inserting msg log in Supabase:', error); });
        });
      }
    }

    return {
      cajaSesionActiva: updatedCaja,
      ordenesTrabajo: updatedOrders
    };
  }),
  aprobarCalidadAsesor: (id, observaciones, asesorId) => set((state) => {
    const active = state.cajaSesionActiva;
    let updatedCaja = active;
    
    const ord = state.ordenesTrabajo.find(o => o.id === id);
    if (!ord) return {};

    const checkAsesor = { aprobado: true, fecha: new Date().toISOString(), observaciones, asesorId };
    const hasOptometraApproved = !!ord.checkOptometra?.aprobado;
    const newStatus: OrderStatus = hasOptometraApproved ? 'listo-entrega' : 'calidad-asesor';

    const pac = ord ? state.pacientes.find(p => p.id === ord.pacienteId) : null;
    const pacNombre = pac ? `${pac.nombre} ${pac.apellido}` : ord?.pacienteNombre || 'Paciente';
    const pacTelefono = pac ? pac.telefono : '';
    const targetEmpresa = state.empresas.find(e => e.id === pac?.empresaId);
    const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;

    let nuevasComms = active?.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] };
    let newLogGafas: MensajeLog | null = null;

    if (active && active.estado === 'abierta' && isWhatsappEnabled) {
      newLogGafas = {
        id: `MSG-QA-ASE-${Date.now()}`,
        tipo: 'gafas',
        pacienteNombre: pacNombre,
        pacienteTelefono: pacTelefono,
        fechaEnvio: new Date().toISOString(),
        mensajeText: newStatus === 'listo-entrega'
          ? `¡Excelentes noticias ${pacNombre}! Tus gafas han superado con éxito el control de calidad estético final del asesor y ya están listas para entrega en la sucursal.`
          : `Hola ${pacNombre}, tus gafas han superado con éxito el control de calidad estético y ahora se encuentran en revisión clínica final por parte del optómetra.`,
        detalleAdicional: newStatus === 'listo-entrega' ? `Orden ID: ${id} - Estado: Listo para entrega` : `Orden ID: ${id} - Calidad Estética Aprobada`,
        estado: 'enviado'
      };

      nuevasComms = {
        ...nuevasComms,
        mensajesGafas: (nuevasComms.mensajesGafas || 0) + 1,
        mensajesLogs: [...(nuevasComms.mensajesLogs || []), newLogGafas]
      };

      updatedCaja = {
        ...active,
        comunicaciones: nuevasComms
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
      }
    }

    const updatedOrders = state.ordenesTrabajo.map(o => 
      o.id === id 
        ? { 
            ...o, 
            estado: newStatus, 
            checkAsesor 
          } 
        : o
    );

    if (isSupabaseActive()) {
      const dbStatus = newStatus === 'calidad-asesor' ? 'revision-calidad' : 'listo';
      const aud = {
        optometra: ord.checkOptometra || null,
        asesor: checkAsesor
      };

      supabase.from('ordenes_trabajo').update({
        estado: dbStatus,
        auditoria_calidad: aud
      }).eq('id', id).then(({ error }) => { if (error) console.error('Error updating quality audit in Supabase:', error); });

      if (active && active.estado === 'abierta') {
        supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCaja!)).eq('id', updatedCaja!.id)
          .then(({ error }) => { if (error) console.error('Error updating active session in Supabase:', error); });
        
        if (newLogGafas) {
          supabase.from('mensajes_logs').insert({
            id: newLogGafas.id,
            sesion_id: updatedCaja!.id,
            tipo: newLogGafas.tipo,
            paciente_nombre: newLogGafas.pacienteNombre,
            paciente_telefono: newLogGafas.pacienteTelefono,
            fecha_envio: newLogGafas.fechaEnvio,
            mensaje_text: newLogGafas.mensajeText,
            detalle_adicional: newLogGafas.detalleAdicional,
            estado: newLogGafas.estado
          }).then(({ error }) => { if (error) console.error('Error inserting msg log in Supabase:', error); });
        }
      }
    }

    return {
      cajaSesionActiva: updatedCaja,
      ordenesTrabajo: updatedOrders
    };
  }),
  completarEntrega: (id, comentarios, firmaPng) => set((state) => {
    const active = state.cajaSesionActiva;
    let updatedCaja = active;
    
    const ord = state.ordenesTrabajo.find(o => o.id === id);
    if (!ord) return {};

    const pac = ord ? state.pacientes.find(p => p.id === ord.pacienteId) : null;
    const pacNombre = pac ? `${pac.nombre} ${pac.apellido}` : ord?.pacienteNombre || 'Paciente';
    const pacTelefono = pac ? pac.telefono : '';
    const targetEmpresa = state.empresas.find(e => e.id === pac?.empresaId);
    const isWhatsappEnabled = targetEmpresa?.whatsappHabilitado !== false;

    let nuevasComms = active?.comunicaciones || { mensajesGafas: 0, primerosContactos: 0, confirmacionesCitas: 0, alertasClinicas: 0, crmPromociones: 0, mensajesLogs: [] };
    let newLogGafas: MensajeLog | null = null;

    if (active && active.estado === 'abierta' && isWhatsappEnabled) {
      newLogGafas = {
        id: `MSG-ENT-${Date.now()}`,
        tipo: 'gafas',
        pacienteNombre: pacNombre,
        pacienteTelefono: pacTelefono,
        fechaEnvio: new Date().toISOString(),
        mensajeText: `Hola ${pacNombre}, confirmamos la entrega física de tus gafas con firma de recibo de conformidad. ¡Gracias por confiar en nosotros!`,
        detalleAdicional: `Orden ID: ${id} - Estado: Entregado`,
        estado: 'enviado'
      };

      nuevasComms = {
        ...nuevasComms,
        mensajesGafas: (nuevasComms.mensajesGafas || 0) + 1,
        mensajesLogs: [...(nuevasComms.mensajesLogs || []), newLogGafas]
      };

      updatedCaja = {
        ...active,
        comunicaciones: nuevasComms
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updatedCaja));
      }
    }

    const updatedOrders = state.ordenesTrabajo.map(o => 
      o.id === id 
        ? { 
            ...o, 
            estado: 'entregado' as OrderStatus, 
            facturaEmitida: true,
            reciboSatisfaccion: { firmado: true, fecha: new Date().toISOString(), firmaPng, comentarios } 
          } 
        : o
    );

    if (isSupabaseActive()) {
      const updatedOrd = updatedOrders.find(o => o.id === id);
      if (updatedOrd) {
        supabase.from('ordenes_trabajo').update(mappers.mapOrdenToDb(updatedOrd, 'emp1', 'sede1'))
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Error completing delivery in Supabase:', error); });
      }

      if (active && active.estado === 'abierta') {
        supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(updatedCaja!)).eq('id', updatedCaja!.id)
          .then(({ error }) => { if (error) console.error('Error updating active session in Supabase:', error); });
        
        if (newLogGafas) {
          supabase.from('mensajes_logs').insert({
            id: newLogGafas.id,
            sesion_id: updatedCaja!.id,
            tipo: newLogGafas.tipo,
            paciente_nombre: newLogGafas.pacienteNombre,
            paciente_telefono: newLogGafas.pacienteTelefono,
            fecha_envio: newLogGafas.fechaEnvio,
            mensaje_text: newLogGafas.mensajeText,
            detalle_adicional: newLogGafas.detalleAdicional,
            estado: newLogGafas.estado
          }).then(({ error }) => { if (error) console.error('Error inserting msg log in Supabase:', error); });
        }
      }
    }

    return {
      cajaSesionActiva: updatedCaja,
      ordenesTrabajo: updatedOrders
    };
  }),
  addGarantia: (garantia) => set((state) => ({
    garantias: [...state.garantias, garantia]
  })),
  updateGarantia: (id, data) => set((state) => ({
    garantias: state.garantias.map(g => g.id === id ? { ...g, ...data } : g)
  })),
  resolverGarantia: (id, data) => set((state) => ({
    garantias: state.garantias.map(g => 
      g.id === id 
        ? { 
            ...g, 
            ...data, 
            estado: 'resuelta-entregada', 
            fechaResolucion: new Date().toISOString() 
          } 
        : g
    )
  })),
  addEquipoMedico: (equipo) => set((state) => {
    const updated = [...state.equiposMedicos, equipo];
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_equipos_medicos', JSON.stringify(updated));
    }
    return { equiposMedicos: updated };
  }),
  updateEquipoMedico: (id, data) => set((state) => {
    const updated = state.equiposMedicos.map(eq => eq.id === id ? { ...eq, ...data } : eq);
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_equipos_medicos', JSON.stringify(updated));
    }
    return { equiposMedicos: updated };
  }),
  addLecturaAmbiental: (lectura) => set((state) => {
    const updated = [lectura, ...state.lecturasAmbientales];
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_lecturas_ambientales', JSON.stringify(updated));
    }
    return { lecturasAmbientales: updated };
  }),
  addIncidenteTecnovigilancia: (equipoId, incidente) => set((state) => {
    const updated = state.equiposMedicos.map(eq => 
      eq.id === equipoId 
        ? { ...eq, incidentes: [incidente, ...eq.incidentes] } 
        : eq
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_equipos_medicos', JSON.stringify(updated));
    }
    return { equiposMedicos: updated };
  }),
  addRegistroResiduos: (registro) => set((state) => {
    const updated = [registro, ...state.registrosResiduos];
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_registros_residuos', JSON.stringify(updated));
    }
    return { registrosResiduos: updated };
  }),
  addRegistroDesinfeccion: (registro) => set((state) => {
    const updated = [registro, ...state.registrosDesinfeccion];
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_registros_desinfeccion', JSON.stringify(updated));
    }
    return { registrosDesinfeccion: updated };
  }),
  actualizarConceptoSanitario: (data) => set((state) => {
    const updated = { ...state.conceptoSanitario, ...data };
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_concepto_sanitario', JSON.stringify(updated));
    }
    return { conceptoSanitario: updated };
  }),
  addSaneamientoLog: (log) => set((state) => {
    const updated = [log, ...state.saneamientoLogs];
    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_saneamiento_logs', JSON.stringify(updated));
    }
    return { saneamientoLogs: updated };
  }),
  abrirCaja: (usuarioId, usuarioNombre, base, observaciones) => {
    const nuevaSesion: CajaSesion = {
      id: `CJ-${Date.now().toString().slice(-6)}`,
      usuarioId,
      usuarioNombre,
      sedeId: 'sede1',
      fechaApertura: new Date().toISOString(),
      montoApertura: base,
      montoCierreCalculado: base,
      estado: 'abierta',
      transacciones: [
        {
          id: `TX-${Date.now().toString().slice(-4)}-BASE`,
          fecha: new Date().toISOString(),
          tipo: 'base',
          monto: base,
          metodoPago: 'EFECTIVO',
          descripcion: 'Base de caja inicial (Apertura de Turno)'
        }
      ],
      observaciones,
      comunicaciones: {
        mensajesGafas: 0,
        primerosContactos: 0,
        confirmacionesCitas: 0,
        alertasClinicas: 0,
        crmPromociones: 0,
        mensajesLogs: []
      },
      nuevosPacientesIds: []
    };

    if (isSupabaseActive()) {
      supabase.from('caja_sesiones').insert(mappers.mapCajaSesionToDb(nuevaSesion))
        .then(({ error }) => { if (error) console.error('Error opening cash session in Supabase:', error); });
      supabase.from('transacciones_caja').insert(mappers.mapTransaccionToDb(nuevaSesion.transacciones[0], nuevaSesion.id))
        .then(({ error }) => { if (error) console.error('Error recording initial cash balance in Supabase:', error); });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(nuevaSesion));
    }

    set({ cajaSesionActiva: nuevaSesion });
  },
  registrarTransaccionCaja: (tipo, monto, metodoPago, descripcion, referenciaId) => {
    const activa = useClinicStore.getState().cajaSesionActiva;
    if (!activa || activa.estado !== 'abierta') return;

    const newTx: TransaccionCaja = {
      id: `TX-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`,
      fecha: new Date().toISOString(),
      tipo,
      monto,
      metodoPago,
      referenciaId,
      descripcion
    };

    const isEfectivo = metodoPago === 'EFECTIVO';
    const isEgreso = tipo === 'egreso-gasto';
    let addition = 0;
    if (isEfectivo) {
      addition = isEgreso ? -monto : monto;
    }

    const updated: CajaSesion = {
      ...activa,
      montoCierreCalculado: (activa.montoCierreCalculado || activa.montoApertura) + addition,
      transacciones: [...activa.transacciones, newTx]
    };

    if (isSupabaseActive()) {
      supabase.from('transacciones_caja').insert(mappers.mapTransaccionToDb(newTx, activa.id))
        .then(({ error }) => { if (error) console.error('Error recording cash transaction in Supabase:', error.message || JSON.stringify(error)); });
      supabase.from('caja_sesiones').update({
        monto_cierre_calculado: updated.montoCierreCalculado
      }).eq('id', activa.id)
        .then(({ error }) => { if (error) console.error('Error updating calculations in Supabase:', error); });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('optisaas_caja_sesion_activa', JSON.stringify(updated));
    }

    set({ cajaSesionActiva: updated });
  },
  cerrarCaja: (montoDeclarado, observaciones, desglose) => {
    const activa = useClinicStore.getState().cajaSesionActiva;
    if (!activa || activa.estado !== 'abierta') return;

    const calculado = activa.montoCierreCalculado || activa.montoApertura;
    const diferencia = montoDeclarado - calculado;

    const sesionCerrada: CajaSesion = {
      ...activa,
      fechaCierre: new Date().toISOString(),
      montoCierreDeclarado: montoDeclarado,
      diferencia,
      estado: 'cerrada',
      desglose,
      observaciones: observaciones || activa.observaciones
    };

    if (isSupabaseActive()) {
      supabase.from('caja_sesiones').update(mappers.mapCajaSesionToDb(sesionCerrada)).eq('id', activa.id)
        .then(({ error }) => { if (error) console.error('Error closing cash session in Supabase:', error); });
        
      // Desconectar WhatsApp si es el último asesor con caja abierta en la sede
      supabase.from('caja_sesiones')
        .select('id')
        .eq('sede_id', activa.sedeId)
        .eq('estado', 'abierta')
        .neq('id', activa.id)
        .then(({ data }) => {
          if (!data || data.length === 0) {
             useClinicStore.getState().setSedeWhatsappConnected(activa.sedeId, false);
          }
        });
    } else {
      // Verificación local (sin Supabase)
      const state = useClinicStore.getState();
      const otherOpen = state.cajaSesiones.filter(c => c.sedeId === activa.sedeId && c.estado === 'abierta' && c.id !== activa.id);
      if (otherOpen.length === 0) {
        state.setSedeWhatsappConnected(activa.sedeId, false);
      }
    }

    set((state) => {
      const updatedHistorico = [sesionCerrada, ...state.cajaSesiones];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('optisaas_caja_sesion_activa');
        localStorage.setItem('optisaas_caja_sesiones', JSON.stringify(updatedHistorico));
      }
      return {
        cajaSesionActiva: null,
        cajaSesiones: updatedHistorico
      };
    });
  }
}));

