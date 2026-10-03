import { create } from 'zustand';
import { Cita, StatusType, RecomendacionClinica, Paciente, HistoriaClinica, ProductoInventario, Empresa, Sede, Usuario, Promocion, OrdenTrabajo, OrderStatus, Garantia, EquipoMedico, LecturaAmbiental, IncidenteTecnovigilancia, RegistroResiduos, RegistroDesinfeccion, ConceptoSanitario, ServicioSaneamiento, TransaccionCaja, CajaSesion, DesgloseCaja, Proveedor, Compra, ConfiguracionMargenes, MensajeLog } from './types';
import { mockCitas, mockPacientes, mockInventario, mockEmpresas, mockSedes, mockUsuarios, mockPromociones, mockOrdenesTrabajo, mockGarantias, mockEquiposMedicos, mockLecturasAmbientales, mockRegistrosResiduos, mockRegistrosDesinfeccion, mockConceptoSanitario, mockSaneamientoLogs, mockCajaSesiones } from './mock-data';

// PLT-02 (T03) — Capa demo en memoria: sin persistencia en el navegador para
// datos de dominio (pacientes, HC, bitácoras, ventas, caja) y sin SDK
// propietario en el navegador. La persistencia real vive en PostgreSQL vía
// Server Actions (`db/` + `app/acciones/`). Cada entidad migra en su propio
// PR.


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
  abrirCaja: (usuarioId: string, usuarioNombre: string, base: number, observaciones?: string, sedeId?: string) => void;
  registrarTransaccionCaja: (tipo: TransaccionCaja['tipo'], monto: number, metodoPago: TransaccionCaja['metodoPago'], descripcion: string, referenciaId?: string) => void;
  cerrarCaja: (montoCierreDeclarado: number, observaciones?: string, desglose?: DesgloseCaja) => void;
  whatsappSedesConectadas: Record<string, boolean>;
  setSedeWhatsappConnected: (sedeId: string, connected: boolean) => void;
  mensajesGlobales: MensajeLog[];
  enviarMensajeChat: (sedeId: string, pacienteNombre: string, pacienteTelefono: string, texto: string, direccion?: 'entrante' | 'saliente') => void;
}



// Estado inicial: solo datos sintéticos en memoria (modo demo). Sin
// persistencia en el navegador: la persistencia real es PostgreSQL (ver `db/`).
const getInitialEmpresas = () => mockEmpresas;

const getInitialUsuarios = () => mockUsuarios;

const getInitialSedes = () => mockSedes;

const getInitialEquiposMedicos = () => mockEquiposMedicos;

const getInitialLecturasAmbientales = () => mockLecturasAmbientales;

const getInitialRegistrosResiduos = () => mockRegistrosResiduos;

const getInitialRegistrosDesinfeccion = () => mockRegistrosDesinfeccion;

const getInitialConceptoSanitario = () => mockConceptoSanitario;

const getInitialSaneamientoLogs = () => mockSaneamientoLogs;

const getInitialCajaSesiones = () => mockCajaSesiones;

const getInitialCajaSesionActiva = () => null;

const getInitialWhatsappSedes = () => ({ sede1: false, sede2: false });

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
    }

    return { 
      mensajesGlobales: [...state.mensajesGlobales, newLog],
      cajaSesionActiva: updatedCaja
    };
  }),
  setSedeWhatsappConnected: (sedeId, connected) => {
    set((state) => ({
      sedes: state.sedes.map(s => s.id === sedeId ? { ...s, whatsappConectado: connected } : s),
      whatsappSedesConectadas: {
        ...state.whatsappSedesConectadas,
        [sedeId]: connected
      }
    }));
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
    set((state) => ({
      citas: state.citas.map(cita => 
        cita.id === id ? { ...cita, estadoComercial: status } : cita
      )
    }));
  },
  updateCitaRecomendacion: (id, recomendacion) => {
    set((state) => ({
      citas: state.citas.map(cita => 
        cita.id === id ? { ...cita, recomendacion } : cita
      )
    }));
  },
  addPaciente: (paciente) => {
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
      }
      return {
        pacientes: [...state.pacientes, paciente],
        cajaSesionActiva: updatedCaja
      };
    });
  },
  addCita: (cita) => {
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
      }
      return {
        citas: [...state.citas, cita],
        cajaSesionActiva: updatedCaja
      };
    });
  },
  guardarHistoriaClinica: (citaId, hc) => {
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
  updatePaciente: (id, data) => set((state) => ({
    pacientes: state.pacientes.map(p =>
      p.id === id ? { ...p, ...data } : p
    )
  })),
  addEmpresa: (empresa) => set((state) => ({
    empresas: [...state.empresas, empresa]
  })),
  updateEmpresa: (id, data) => set((state) => ({
    empresas: state.empresas.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  deleteEmpresa: (id) => set((state) => ({
    empresas: state.empresas.filter(e => e.id !== id)
  })),
  addSede: (sede) => set((state) => ({
    sedes: [...state.sedes, sede]
  })),
  updateSede: (id, data) => set((state) => ({
    sedes: state.sedes.map(s => s.id === id ? { ...s, ...data } : s)
  })),
  deleteSede: (id) => set((state) => ({
    sedes: state.sedes.filter(s => s.id !== id)
  })),
  // T05 autentica contra la tabla `usuarios` de PostgreSQL; mientras tanto la
  // demo en memoria sigue disponible solo con `APP_MODE=demo` (ver `lib/modo.ts`).
  addUsuario: (usuario) => {
    set((state) => ({
      usuarios: [...state.usuarios, usuario]
    }));
  },
  updateUsuario: (id, data) => set((state) => ({
    usuarios: state.usuarios.map(u => u.id === id ? { ...u, ...data } : u)
  })),
  deleteUsuario: (id) => set((state) => ({
    usuarios: state.usuarios.filter(u => u.id !== id)
  })),
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
    }

    return {
      cajaSesionActiva: updatedCajaActiva,
      ordenesTrabajo: [...state.ordenesTrabajo, orden]
    };
  }),
  updateOrdenStatus: (id, status) => set((state) => ({
    ordenesTrabajo: state.ordenesTrabajo.map(ord =>
      ord.id === id ? { ...ord, estado: status } : ord
    )
  })),
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
  addEquipoMedico: (equipo) => set((state) => ({
    equiposMedicos: [...state.equiposMedicos, equipo]
  })),
  updateEquipoMedico: (id, data) => set((state) => ({
    equiposMedicos: state.equiposMedicos.map(eq => eq.id === id ? { ...eq, ...data } : eq)
  })),
  addLecturaAmbiental: (lectura) => set((state) => ({
    lecturasAmbientales: [lectura, ...state.lecturasAmbientales]
  })),
  addIncidenteTecnovigilancia: (equipoId, incidente) => set((state) => ({
    equiposMedicos: state.equiposMedicos.map(eq =>
      eq.id === equipoId
        ? { ...eq, incidentes: [incidente, ...eq.incidentes] }
        : eq
    )
  })),
  addRegistroResiduos: (registro) => set((state) => ({
    registrosResiduos: [registro, ...state.registrosResiduos]
  })),
  addRegistroDesinfeccion: (registro) => set((state) => ({
    registrosDesinfeccion: [registro, ...state.registrosDesinfeccion]
  })),
  actualizarConceptoSanitario: (data) => set((state) => ({
    conceptoSanitario: { ...state.conceptoSanitario, ...data }
  })),
  addSaneamientoLog: (log) => set((state) => ({
    saneamientoLogs: [log, ...state.saneamientoLogs]
  })),
  abrirCaja: (usuarioId, usuarioNombre, base, observaciones, sedeId = 'sede1') => {
    const nuevaSesion: CajaSesion = {
      id: `CJ-${Date.now().toString().slice(-6)}`,
      usuarioId,
      usuarioNombre,
      sedeId,
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

    // Desconectar WhatsApp si es la última caja abierta en la sede.
    const estadoCajas = useClinicStore.getState();
    const otrasAbiertas = estadoCajas.cajaSesiones.filter(c => c.sedeId === activa.sedeId && c.estado === 'abierta' && c.id !== activa.id);
    if (otrasAbiertas.length === 0) {
      estadoCajas.setSedeWhatsappConnected(activa.sedeId, false);
    }

    set((state) => ({
      cajaSesionActiva: null,
      cajaSesiones: [sesionCerrada, ...state.cajaSesiones]
    }));
  }
}));

