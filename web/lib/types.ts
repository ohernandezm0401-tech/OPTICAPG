export type Role = 'owner' | 'admin' | 'asesor' | 'optometra';

export interface Empresa {
  id: string;
  nombre: string;
  nit: string;
  logo?: string;
  colorCorporativo?: string; // Color hexadecimal personalizado de marca B2B
  plan: 'basico' | 'premium' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'trialing';
  nextBillingDate?: string;
  customMaxSedes?: number;
  customMaxUsuarios?: number;
  customModulesOverride?: {
    agenda?: boolean;
    pacientes?: boolean;
    historiaClinica?: boolean;
    ventasPOS?: boolean;
    promocionesMarketing?: boolean;
    conveniosEmpresariales?: boolean;
    inventoryScraping?: boolean;
  };
  estadoCuenta?: 'activo' | 'suspendido' | 'onboarding';
  whatsappHabilitado?: boolean;
}

export interface Sede {
  id: string;
  empresaId: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  habilitacionSalud: string;
  estado: 'activa' | 'inactiva';
  whatsappConectado?: boolean;
}

export interface Usuario {
  id: string;
  empresaId: string;
  sedesAccess: string[]; // IDs de sedes a las que tiene acceso
  nombre: string;
  email: string;
  role: Role;
  registroMedico?: string; // Para optómetras
  avatar?: string;
}

export interface Paciente {
  id: string;
  empresaId: string;
  nombre: string;
  apellido: string;
  documento: string;
  tipoDocumento: 'CC' | 'TI' | 'RC' | 'CE' | 'PA' | 'PE' | 'PPT' | 'NUIP';
  telefono: string;
  email?: string;
  fechaNacimiento: string; // ISO Date
  eps?: string;
  saldoPendiente: number;
  fechaUltimaVisita?: string;
  genero?: 'M' | 'F' | 'Otro';
  direccion?: string;
  ocupacion?: string;
}

export type StatusType = 'por-llegar' | 'en-sala' | 'en-consulta' | 'cotizando' | 'pagado' | 'no-asistio' | 'confirmada';

export interface RecomendacionClinica {
  material: string; // ej: CR-39, Policarbonato, Alto Índice
  diseno: string; // ej: Visión Sencilla, Progresivo, Ocupacional
  tipo: string; // ej: Terminado, Tallado Convencional, Free Form
  sintomas: string; // Notas de síntomas para contexto de venta
}

export interface Antecedentes {
  ocularesPersonales: string[];
  ocularesFamiliares: string[];
  sistemicosPersonales: string[];
  otros?: string;
}

export interface OjoData {
  esfera: string;
  cilindro: string;
  eje: string;
  adicion?: string;
  avLejos: string;
  avCerca: string;
}

export interface RefraccionHC {
  lensometriaOD?: OjoData;
  lensometriaOI?: OjoData;
  queratometriaOD?: string;
  queratometriaOI?: string;
  retinoscopiaOD?: OjoData;
  retinoscopiaOI?: OjoData;
  subjetivoOD: OjoData;
  subjetivoOI: OjoData;
  dp?: string;
  avSinCorreccionODLejos?: string;
  avSinCorreccionODCerca?: string;
  avSinCorreccionOILejos?: string;
  avSinCorreccionOICerca?: string;
  phOD?: string;
  phOI?: string;
  dpc?: string;
}

export interface SaludOcular {
  biomicroscopiaOD: string;
  biomicroscopiaOI: string;
  oftalmoscopiaOD: string;
  oftalmoscopiaOI: string;
  presionIntraocularOD?: number;
  presionIntraocularOI?: number;
  tonometriaMetodo?: string;
}

export interface DiagnosticoPlan {
  cie10Principal: string; // ej: "H52.1"
  cie10PrincipalNombre: string; // ej: "Miopía"
  cie10Secundario?: string;
  cie10SecundarioNombre?: string;
  planTratamiento: string;
  firmaDigitalConfirmada: boolean;
  nombreProfesional: string;
  registroMedico: string;
}

export interface HistoriaClinica {
  pacienteId: string;
  citaId: string;
  fechaRegistro: string;
  anamnesis: {
    motivo: string;
    usoLentes: string; // 'Ninguno' | 'Monofocal' | 'Bifocal' | 'Progresivo' | 'Lentes de Contacto'
    antecedentes: Antecedentes;
  };
  pruebasPreliminares?: {
    coverTestLejos: string;
    coverTestCerca: string;
    reflejosPupilares: string;
    motilidadOcular: string;
    ppc?: string;
    visionColor?: string;
    estereopsis?: string;
  };
  refraccion: RefraccionHC;
  saludOcular: SaludOcular;
  diagnosticoPlan: DiagnosticoPlan;
  recomendacion: RecomendacionClinica;
}

export interface Cita {
  id: string;
  sedeId: string;
  fechaHora: string; // ISO Datetime
  pacienteId: string;
  profesionalId?: string; // Usuario (Optómetra)
  motivoClinico: string;
  estadoComercial: StatusType;
  prioridad: 'normal' | 'alta' | 'urgente';
  notasAdicionales?: string;
  recomendacion?: RecomendacionClinica; // <-- Nuevo campo Hand-off
  facturaId?: string;
  cufe?: string;
  pdfUrl?: string;
  montoCobrado?: number;
  fechaPago?: string;
  metodoPago?: string;
  promocionAplicadaId?: string;
  descuentoAplicado?: number;
  productosVendidos?: { productoId: string; cantidad: number; precioUnitario: number }[];
}


export interface NavItem {
  iconName: string; // We'll use lucide-react icon names or map them
  label: string;
  href: string;
}

export interface Alerta {
  id: string;
  sedeId: string;
  tipo: 'warning' | 'danger' | 'info';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  dirigidaA: Role | 'all';
}

export interface ProductoInventario {
  id: string;
  categoria: string;
  marca: string;
  modelo: string;
  color: string;
  stock: number;
  minStock: number;
  precio: number; // Para compatibilidad
  precioCompra: number; // Costo de adquisición
  precioVenta: number;  // Precio final al público
  codigoBarras: string; // Código de barras Code 128
  codigoInvima?: string;
  lote?: string;
  vencimiento?: string;
  proveedorId?: string; // Asociado al proveedor que suministra el lente/montura
}

export interface Proveedor {
  id: string;
  empresaId: string;
  nombre: string;
  nit: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

export interface CompraDetalle {
  id: string;
  compraId: string;
  productoId?: string;
  nuevoProductoJson?: {
    categoria: string;
    marca: string;
    modelo: string;
    color: string;
    minStock: number;
    codigoInvima?: string;
    lote?: string;
    vencimiento?: string;
    codigoBarras?: string;
  };
  cantidad: number;
  costoUnitario: number;
  precioVenta?: number;
}

export interface Compra {
  id: string;
  empresaId: string;
  sedeId: string;
  proveedorId: string;
  numeroFactura: string;
  fechaCompra: string; // ISO Date string
  valorCompra: number;
  registradoPor?: string;
  observaciones?: string;
  detalles: CompraDetalle[];
}

export interface ConfiguracionMargenes {
  id: string;
  empresaId: string;
  categoria: string;
  porcentajeMargen: number;
}

export interface Promocion {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'porcentaje' | 'monto-fijo' | 'combo' | 'segunda-unidad';
  valor: number;
  fechaInicio: string; // ISO Date
  fechaFin: string; // ISO Date
  activa: boolean;
  aplicableA: 'lentes' | 'monturas' | 'todo';
  vecesAplicada: number;
  horaInicio?: string; // Formato "HH:MM", ej: "14:00"
  horaFin?: string; // Formato "HH:MM", ej: "17:00"
  diasSemana?: number[]; // 0 (Domingo) a 6 (Sábado)
}

export type OrderStatus = 'enviado-laboratorio' | 'recibido-laboratorio' | 'calidad-optometra' | 'calidad-asesor' | 'listo-entrega' | 'entregado';

export interface TratamientoLente {
  diseno: 'monofocal' | 'bifocal' | 'progresivo' | 'ocupacional';
  fabricacion: 'terminado' | 'tallado-convencional' | 'freeform';
  material: 'cr39' | 'policarbonato' | 'trivex' | '1.60' | '1.67' | '1.74';
  antirreflejo: string; // ID o nombre del tratamiento AR
  fotocromatico: 'ninguno' | 'transitions-gen8' | 'transitions-xtractive' | 'sensity' | 'estandar';
  fotocromaticoColor?: 'gris' | 'cafe' | 'verde' | 'ambar';
  blueBlock: boolean;
  blueBlockTipo?: string;
}

export interface OrdenTrabajo {
  id: string;
  citaId: string;
  pacienteId: string;
  pacienteNombre: string;
  fechaCreacion: string;
  receta: {
    od: string;
    oi: string;
    adicion?: string;
    dp?: string;
  };
  lenteMaterial: string;
  lenteDiseno: string;
  monturaDetalle: string;
  estado: OrderStatus;
  laboratorio: string;
  checkOptometra?: {
    aprobado: boolean;
    fecha: string;
    observaciones?: string;
    profesionalId: string;
  };
  checkAsesor?: {
    aprobado: boolean;
    fecha: string;
    observaciones?: string;
    asesorId: string;
  };
  facturaEmitida?: boolean;
  reciboSatisfaccion?: {
    firmado: boolean;
    fecha: string;
    firmaPng?: string; // Data URL de la firma
    comentarios?: string;
  };
  promoId?: string;
  descuentoCalculado?: number;
  totalFinal?: number;
  subtotal?: number;
  abono?: number;
  cartItems?: { id: string; marca: string; modelo: string; categoria: string; cantidad: number; precio: number }[];
  tratamiento?: TratamientoLente;
  observaciones?: string;
}

export interface Garantia {
  id: string;
  empresaId: string;
  sedeId: string;
  pacienteId: string;
  pacienteNombre: string;
  ordenTrabajoId?: string;
  productoInventarioId?: string;
  productoNombre: string;
  tipoGarantia: 'adaptacion-receta' | 'defecto-montura' | 'tratamiento-lente' | 'rotura' | 'otro';
  fechaReclamacion: string;
  motivoDetalle: string;
  estado: 'bajo-evaluacion' | 'aprobada-laboratorio' | 'aprobada-reemplazo-interno' | 'rechazada' | 'resuelta-entregada';
  resolucionTipo?: 'cambio-lente-laboratorio' | 'cambio-montura-stock' | 'reparacion' | 'devolucion-dinero' | 'sin-garantia' | 'otro';
  resolucionDetalle?: string;
  checkOptometra?: {
    aprobado: boolean;
    observaciones: string;
    profesionalId: string;
    profesionalNombre: string;
    nuevaRefraccion?: {
      od: string;
      oi: string;
    };
    nuevaRefraccionEstructurada?: {
      od: OjoData;
      oi: OjoData;
      dp: string;
    };
    sintomasChecklist?: string[];
    fecha: string;
    esDiferenteFormula?: boolean;
    esMismoOptometra?: boolean;
    esGarantiaPorFormula?: boolean;
  };
  checkLaboratorio?: {
    aceptada: boolean;
    guiaEnvio?: string;
    fechaEnvio?: string;
    fechaRespuesta?: string;
    observaciones?: string;
  };
  costoOptica: number;
  costoPaciente: number;
  fechaResolucion?: string;
}

export interface IncidenteTecnovigilancia {
  id: string;
  fecha: string; // ISO Date
  tipo: 'evento-adverso' | 'incidente-adverso';
  gravedad: 'leve' | 'moderado' | 'serio';
  descripcion: string;
  reportadoPor: string;
  estadoReporte: 'bajo-investigacion' | 'cerrado-notificado-invima' | 'cerrado-interno';
}

export interface AlertaInvima {
  id: string;
  titulo: string;
  fecha: string;
  descripcion: string;
}

export interface EquipoMedico {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  serie: string;
  fechaUltimoMantenimiento: string; // ISO Date
  fechaProximaCalibracion: string; // ISO Date
  tecnicoResponsable: string;
  registroInvima: string; // INVIMA Obligatorio
  clasificacionRiesgo: 'Clase I' | 'Clase IIa' | 'Clase IIb' | 'Clase III'; // Requisito de la Sec. de Salud (Clase I para la mayoría en optometría)
  voltaje?: string;
  potencia?: string;
  frecuenciaCalibracionMeses: number;
  referenteTecnovigilancia: string;
  incidentes: IncidenteTecnovigilancia[];
  alertasInvimaAsociadas: AlertaInvima[];
  estadoCalibracion: 'vigente' | 'proximo-vencer' | 'vencido';
  observaciones?: string;
}

export interface LecturaAmbiental {
  id: string;
  fechaHora: string; // ISO Datetime
  temperatura: number; // en °C
  humedad: number; // en %
  registradoPor: string;
  observaciones?: string;
}

export interface RegistroResiduos {
  id: string;
  fecha: string; // ISO Date
  infecciososBiosanitarios: number; // kg
  infecciososCortopunzantes: number; // kg
  quimicos: number; // kg
  aprovechables: number; // kg
  noAprovechables: number; // kg
  empresaRecolectora: string;
  numeroManifiesto: string;
  registradoPor: string;
  observaciones?: string;
}

export interface RegistroDesinfeccion {
  id: string;
  fechaHora: string; // ISO Datetime
  area: string;
  tipo: 'rutinaria' | 'terminal';
  desinfectante: string;
  registradoPor: string;
  observaciones?: string;
}

export interface ConceptoSanitario {
  id: string;
  fechaInspeccion: string; // ISO Date
  fechaVencimiento: string; // ISO Date
  estadoConcepto: 'favorable' | 'favorable-con-requerimientos' | 'desfavorable';
  numeroRadicado: string;
  funcionarioInspector: string;
  observaciones?: string;
}

export interface ServicioSaneamiento {
  id: string;
  tipo: 'control-plagas' | 'lavado-tanques';
  fechaEjecucion: string; // ISO Date
  fechaVencimiento: string; // ISO Date
  empresaCertificada: string;
  numeroCertificado: string;
  responsableInterno: string;
  observaciones?: string;
}

export interface TransaccionCaja {
  id: string;
  fecha: string; // ISO DateTime
  tipo: 'base' | 'ingreso-abono' | 'ingreso-venta' | 'egreso-gasto';
  monto: number;
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';
  referenciaId?: string; // ID de orden o cita
  descripcion: string;
}

export interface DesgloseCaja {
  billetes: {
    100000: number;
    50000: number;
    20000: number;
    10000: number;
    5000: number;
    2000: number;
  };
  monedas: {
    1000: number;
    500: number;
    200: number;
    100: number;
    50: number;
  };
  vouchers: number; // Suma total de recibos de tarjeta
  otros: number; // Suma de transferencias electrónicas reportadas (Nequi, Daviplata, etc.)
}

export interface MensajeLog {
  id: string;
  tipo: 'gafas' | 'primer-contacto' | 'confirmacion-cita' | 'alerta-clinica' | 'crm' | 'chat';
  pacienteNombre: string;
  pacienteTelefono: string;
  fechaEnvio: string; // ISO DateTime
  mensajeText: string;
  detalleAdicional?: string; // Ej: "Orden #4829", "Cita #103", etc.
  estado: 'enviado' | 'leido' | 'fallido';
  direccion?: 'entrante' | 'saliente'; // Para soportar chat bidireccional
}

export interface CajaSesion {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  sedeId: string;
  fechaApertura: string; // ISO DateTime
  fechaCierre?: string; // ISO DateTime
  montoApertura: number; // Base de caja
  montoCierreDeclarado?: number;
  montoCierreCalculado?: number; // Esperado: apertura + efectivo ingresado - egresos
  diferencia?: number; // Declarado - Calculado
  estado: 'abierta' | 'cerrada';
  transacciones: TransaccionCaja[];
  desglose?: DesgloseCaja;
  observaciones?: string;
  comunicaciones?: {
    mensajesGafas: number;
    primerosContactos: number;
    confirmacionesCitas: number;
    alertasClinicas: number;
    crmPromociones: number;
    mensajesLogs?: MensajeLog[];
  };
  nuevosPacientesIds?: string[];
}



