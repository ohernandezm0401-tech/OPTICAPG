import {
  Empresa,
  Sede,
  Usuario,
  Paciente,
  Cita,
  ProductoInventario,
  Promocion,
  OrdenTrabajo,
  Garantia,
  EquipoMedico,
  LecturaAmbiental,
  RegistroResiduos,
  RegistroDesinfeccion,
  ConceptoSanitario,
  ServicioSaneamiento,
  CajaSesion,
  Alerta,
} from './types';

function atHour(hour: number, minute = 0, dayOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const mockEmpresas: Empresa[] = [
  {
    id: 'emp1',
    nombre: 'Ópticas Visión Total S.A.S',
    nit: '900.123.456-7',
    plan: 'enterprise',
    stripeCustomerId: 'cus_demo_visiontotal',
    stripeSubscriptionId: 'sub_demo_visiontotal',
    subscriptionStatus: 'active',
    nextBillingDate: '2026-06-15',
    estadoCuenta: 'activo',
    whatsappHabilitado: true,
  },
  {
    id: 'emp2',
    nombre: 'OptiCentro Express',
    nit: '901.555.210-3',
    plan: 'premium',
    stripeCustomerId: 'cus_demo_opticentro',
    stripeSubscriptionId: 'sub_demo_opticentro',
    subscriptionStatus: 'active',
    nextBillingDate: '2026-07-01',
    estadoCuenta: 'activo',
    whatsappHabilitado: true,
  },
];

export const mockSedes: Sede[] = [
  {
    id: 'sede1',
    empresaId: 'emp1',
    nombre: 'Sucursal Norte',
    ciudad: 'Bogotá',
    direccion: 'Calle 127 # 14-54',
    habilitacionSalud: '11001-08234-01',
    estado: 'activa',
  },
  {
    id: 'sede2',
    empresaId: 'emp1',
    nombre: 'Sucursal Sur',
    ciudad: 'Bogotá',
    direccion: 'Autopista Sur # 34-12',
    habilitacionSalud: '11001-08234-02',
    estado: 'activa',
  },
  {
    id: 'sede3',
    empresaId: 'emp2',
    nombre: 'Sede Centro',
    ciudad: 'Medellín',
    direccion: 'Carrera 43A # 1-50',
    habilitacionSalud: '05001-01990-01',
    estado: 'activa',
  },
];

export const mockUsuarios: Usuario[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    empresaId: '',
    sedesAccess: ['sede1', 'sede2', 'sede3'],
    nombre: 'Owner de plataforma (demo)',
    email: 'owner@optisaas.co',
    role: 'owner',
  },
  {
    id: 'usr-admin-vt',
    empresaId: 'emp1',
    sedesAccess: ['sede1', 'sede2'],
    nombre: 'Laura Gómez',
    email: 'admin@visiontotal.com',
    role: 'admin',
  },
  {
    id: 'usr-asesor-vt',
    empresaId: 'emp1',
    sedesAccess: ['sede1'],
    nombre: 'Carlos Mendoza',
    email: 'carlos@visiontotal.com',
    role: 'asesor',
  },
  {
    id: 'usr-opto-vt',
    empresaId: 'emp1',
    sedesAccess: ['sede1'],
    nombre: 'Dra. Camila Vega',
    email: 'dra.vega@visiontotal.com',
    role: 'optometra',
    registroMedico: 'OPT-2019-44821',
  },
  {
    id: 'usr-admin-oc',
    empresaId: 'emp2',
    sedesAccess: ['sede3'],
    nombre: 'Andrés Ríos',
    email: 'admin@opticentro.com',
    role: 'admin',
  },
];

// Etiquetas sintéticas para módulos aún no migrados (citas, ventas).
// El registro de pacientes de recepción vive en PostgreSQL (T13) y no en el navegador.
export const mockPacientes: Paciente[] = [
  {
    id: 'pac1',
    empresaId: 'emp1',
    nombre: 'María',
    apellido: 'García',
    documento: '1023456789',
    tipoDocumento: 'CC',
    telefono: '3001112233',
    email: 'maria.garcia@example.com',
    fechaNacimiento: '1988-04-12',
    eps: 'Sanitas',
    saldoPendiente: 0,
    fechaUltimaVisita: atHour(9, 0, -1).slice(0, 10),
    genero: 'F',
    direccion: 'Calle 100 # 15-20',
    ocupacion: 'Diseñadora',
  },
  {
    id: 'pac2',
    empresaId: 'emp1',
    nombre: 'Roberto',
    apellido: 'Díaz',
    documento: '80111222',
    tipoDocumento: 'CC',
    telefono: '3104445566',
    fechaNacimiento: '1975-11-02',
    eps: 'Sura',
    saldoPendiente: 180000,
    genero: 'M',
    ocupacion: 'Contador',
  },
  {
    id: 'pac3',
    empresaId: 'emp1',
    nombre: 'Ana',
    apellido: 'Ruiz',
    documento: '52333444',
    tipoDocumento: 'CC',
    telefono: '3207778899',
    fechaNacimiento: '1996-01-20',
    eps: 'Compensar',
    saldoPendiente: 0,
    genero: 'F',
    ocupacion: 'Docente',
  },
  {
    id: 'pac4',
    empresaId: 'emp1',
    nombre: 'Luis',
    apellido: 'Pérez',
    documento: '79444555',
    tipoDocumento: 'CC',
    telefono: '3012223344',
    fechaNacimiento: '1990-08-08',
    eps: 'Nueva EPS',
    saldoPendiente: 0,
    genero: 'M',
  },
  {
    id: 'pac5',
    empresaId: 'emp2',
    nombre: 'Sofía',
    apellido: 'Mejía',
    documento: '1122334455',
    tipoDocumento: 'CC',
    telefono: '3045556677',
    fechaNacimiento: '2001-03-15',
    eps: 'Savia Salud',
    saldoPendiente: 0,
    genero: 'F',
    direccion: 'El Poblado',
  },
];

export const mockCitas: Cita[] = [
  {
    id: 'cita-norte-1',
    sedeId: 'sede1',
    fechaHora: atHour(9, 0, 0),
    pacienteId: 'pac1',
    profesionalId: 'usr-opto-vt',
    motivoClinico: 'Control anual de miopía',
    estadoComercial: 'por-llegar',
    prioridad: 'normal',
  },
  {
    id: 'cita-norte-2',
    sedeId: 'sede1',
    fechaHora: atHour(10, 30, 0),
    pacienteId: 'pac2',
    profesionalId: 'usr-opto-vt',
    motivoClinico: 'Adaptación de progresivos',
    estadoComercial: 'en-sala',
    prioridad: 'alta',
  },
  {
    id: 'cita-norte-3',
    sedeId: 'sede1',
    fechaHora: atHour(8, 0, 0),
    pacienteId: 'pac3',
    profesionalId: 'usr-opto-vt',
    motivoClinico: 'Visión borrosa de cerca',
    estadoComercial: 'en-consulta',
    prioridad: 'normal',
  },
  {
    id: 'cita-norte-ayer',
    sedeId: 'sede1',
    fechaHora: atHour(16, 0, -1),
    pacienteId: 'pac1',
    profesionalId: 'usr-opto-vt',
    motivoClinico: 'Entrega de fórmula y venta de lentes',
    estadoComercial: 'pagado',
    prioridad: 'normal',
    montoCobrado: 650000,
    metodoPago: 'TARJETA',
    fechaPago: atHour(17, 10, -1),
    cufe: 'CUFE-DEMO-NORTE-001',
    recomendacion: {
      material: 'Policarbonato',
      diseno: 'Progresivo',
      tipo: 'Free Form',
      sintomas: 'Fatiga visual en cerca',
    },
  },
  {
    id: 'cita-sur-1',
    sedeId: 'sede2',
    fechaHora: atHour(11, 0, 0),
    pacienteId: 'pac4',
    profesionalId: 'usr-opto-vt',
    motivoClinico: 'Primera valoración',
    estadoComercial: 'en-sala',
    prioridad: 'normal',
  },
  {
    id: 'cita-medellin-1',
    sedeId: 'sede3',
    fechaHora: atHour(15, 0, 0),
    pacienteId: 'pac5',
    motivoClinico: 'Control de lentes de contacto',
    estadoComercial: 'confirmada',
    prioridad: 'normal',
    montoCobrado: 220000,
  },
];

export const mockInventario: ProductoInventario[] = [
  {
    id: 'inv1',
    categoria: 'Monturas',
    marca: 'Ray-Ban',
    modelo: 'Clubmaster RB3016',
    color: 'Negro/Dorado',
    stock: 15,
    minStock: 3,
    precio: 450000,
    precioCompra: 200000,
    precioVenta: 450000,
    codigoBarras: '8053672166677',
  },
  {
    id: 'inv2',
    categoria: 'Monturas',
    marca: 'Oakley',
    modelo: 'Holbrook OO9102',
    color: 'Negro Mate/Gris',
    stock: 8,
    minStock: 2,
    precio: 520000,
    precioCompra: 250000,
    precioVenta: 520000,
    codigoBarras: '888392491953',
  },
  {
    id: 'inv3',
    categoria: 'Lentes de Contacto',
    marca: 'Acuvue',
    modelo: 'Oasys 2-Week',
    color: 'Transparente',
    stock: 24,
    minStock: 5,
    precio: 120000,
    precioCompra: 60000,
    precioVenta: 120000,
    codigoBarras: '0733905148677',
    codigoInvima: 'INVIMA 2018DM-0001842',
    lote: 'LT-9982',
    vencimiento: '2026-12-31',
  },
  {
    id: 'inv4',
    categoria: 'Insumos',
    marca: 'Opti-Free',
    modelo: 'PureMoist 300ml',
    color: 'Líquido',
    stock: 30,
    minStock: 10,
    precio: 45000,
    precioCompra: 22000,
    precioVenta: 45000,
    codigoBarras: '300650359056',
  },
];

export const mockPromociones: Promocion[] = [
  {
    id: 'promo1',
    codigo: 'PROGRESIVO15',
    nombre: '15% en progresivos',
    descripcion: 'Descuento en lentes progresivos de la sede Norte',
    tipo: 'porcentaje',
    valor: 15,
    fechaInicio: atHour(0, 0, -10).slice(0, 10),
    fechaFin: atHour(0, 0, 40).slice(0, 10),
    activa: true,
    aplicableA: 'lentes',
    vecesAplicada: 4,
  },
];

export const mockOrdenesTrabajo: OrdenTrabajo[] = [
  {
    id: 'OT-4829',
    citaId: 'cita-norte-ayer',
    pacienteId: 'pac1',
    pacienteNombre: 'María García',
    fechaCreacion: atHour(17, 20, -1),
    receta: { od: '-2.25 -0.75 x 180', oi: '-1.75 -0.50 x 175', adicion: '+1.75', dp: '62' },
    lenteMaterial: 'Policarbonato',
    lenteDiseno: 'Progresivo',
    monturaDetalle: 'Ray-Ban Clubmaster RB3016',
    estado: 'calidad-asesor',
    laboratorio: 'Lab Óptico Andino',
    subtotal: 650000,
    totalFinal: 650000,
    facturaEmitida: true,
  },
  {
    id: 'OT-4901',
    citaId: 'cita-sur-1',
    pacienteId: 'pac4',
    pacienteNombre: 'Luis Pérez',
    fechaCreacion: atHour(11, 40, 0),
    receta: { od: '+1.00', oi: '+1.25' },
    lenteMaterial: 'CR-39',
    lenteDiseno: 'Monofocal',
    monturaDetalle: 'Oakley Holbrook',
    estado: 'enviado-laboratorio',
    laboratorio: 'Lab Óptico Andino',
  },
];

export const mockGarantias: Garantia[] = [
  {
    id: 'GAR-1042',
    empresaId: 'emp1',
    sedeId: 'sede1',
    pacienteId: 'pac2',
    pacienteNombre: 'Roberto Díaz',
    ordenTrabajoId: 'OT-4700',
    productoNombre: 'Progresivo free-form',
    tipoGarantia: 'adaptacion-receta',
    fechaReclamacion: atHour(9, 0, -2),
    motivoDetalle: 'Incomodidad en zona intermedia a los 5 días de entrega',
    estado: 'bajo-evaluacion',
    costoOptica: 0,
    costoPaciente: 0,
  },
  {
    id: 'GAR-2201',
    empresaId: 'emp2',
    sedeId: 'sede3',
    pacienteId: 'pac5',
    pacienteNombre: 'Sofía Mejía',
    productoNombre: 'Acuvue Oasys',
    tipoGarantia: 'otro',
    fechaReclamacion: atHour(14, 0, -3),
    motivoDetalle: 'Caja abierta con lente roto. Reposición de cortesía.',
    estado: 'aprobada-reemplazo-interno',
    costoOptica: 60000,
    costoPaciente: 0,
  },
];

export const mockEquiposMedicos: EquipoMedico[] = [
  {
    id: 'eq1',
    nombre: 'Lensómetro digital',
    marca: 'Nidek',
    modelo: 'LM-1800P',
    serie: 'LM-DEMO-001',
    fechaUltimoMantenimiento: atHour(0, 0, -40).slice(0, 10),
    fechaProximaCalibracion: atHour(0, 0, 140).slice(0, 10),
    tecnicoResponsable: 'Servicio Biomédico Demo',
    registroInvima: 'INVIMA 2019DM-000991',
    clasificacionRiesgo: 'Clase I',
    frecuenciaCalibracionMeses: 12,
    referenteTecnovigilancia: 'Laura Gómez',
    incidentes: [],
    alertasInvimaAsociadas: [],
    estadoCalibracion: 'vigente',
  },
];

export const mockLecturasAmbientales: LecturaAmbiental[] = [
  {
    id: 'amb1',
    fechaHora: atHour(8, 15, 0),
    temperatura: 22,
    humedad: 48,
    registradoPor: 'Carlos Mendoza',
  },
];

export const mockRegistrosResiduos: RegistroResiduos[] = [];

export const mockRegistrosDesinfeccion: RegistroDesinfeccion[] = [
  {
    id: 'des1',
    fechaHora: atHour(7, 40, 0),
    area: 'Consultorio 1',
    tipo: 'rutinaria',
    desinfectante: 'Alcohol isopropílico 70%',
    registradoPor: 'Carlos Mendoza',
  },
];

export const mockConceptoSanitario: ConceptoSanitario = {
  id: 'SAN-001',
  fechaInspeccion: atHour(0, 0, -240).slice(0, 10),
  fechaVencimiento: atHour(0, 0, 125).slice(0, 10),
  estadoConcepto: 'favorable',
  numeroRadicado: 'RAD-2025-SDS-98231',
  funcionarioInspector: 'Inspección de demostración (Secretaría de Salud)',
  observaciones: 'Establecimiento de demostración. Bitácoras al día.',
};

export const mockSaneamientoLogs: ServicioSaneamiento[] = [];

export const mockCajaSesiones: CajaSesion[] = [
  {
    id: 'CJ-DEMO-1',
    usuarioId: 'usr-asesor-vt',
    usuarioNombre: 'Carlos Mendoza',
    sedeId: 'sede1',
    fechaApertura: atHour(8, 0, -1),
    fechaCierre: atHour(18, 0, -1),
    montoApertura: 150000,
    montoCierreDeclarado: 150000,
    montoCierreCalculado: 150000,
    diferencia: 0,
    estado: 'cerrada',
    transacciones: [],
  },
];

export const mockAlertas: Alerta[] = [
  {
    id: 'al1',
    sedeId: 'sede1',
    tipo: 'warning',
    titulo: 'Registro INVIMA',
    mensaje: 'Lote de lentes de contacto LT-9982 vence en diciembre de 2026.',
    fecha: atHour(8, 0, 0),
    leida: false,
    dirigidaA: 'admin',
  },
  {
    id: 'al2',
    sedeId: 'sede1',
    tipo: 'danger',
    titulo: 'Historia sin firma',
    mensaje: 'Hay una historia clínica de hoy pendiente de firma digital.',
    fecha: atHour(8, 30, 0),
    leida: false,
    dirigidaA: 'optometra',
  },
  {
    id: 'al3',
    sedeId: 'sede3',
    tipo: 'info',
    titulo: 'Agenda de Medellín',
    mensaje: 'Hay un control de lentes de contacto confirmado para hoy.',
    fecha: atHour(9, 0, 0),
    leida: false,
    dirigidaA: 'admin',
  },
];

export function getUsuarioByEmail(email: string): Usuario | undefined {
  const normalized = email.trim().toLowerCase();
  return mockUsuarios.find((usuario) => usuario.email.toLowerCase() === normalized);
}

export function getUsuarioById(id: string): Usuario | undefined {
  return mockUsuarios.find((usuario) => usuario.id === id);
}

export function getEmpresa(id: string): Empresa | undefined {
  return mockEmpresas.find((empresa) => empresa.id === id);
}

export function getEmpresaById(id: string): Empresa | undefined {
  return getEmpresa(id);
}

export function getSedesByEmpresa(empresaId: string): Sede[] {
  return mockSedes.filter((sede) => sede.empresaId === empresaId);
}

export function getSedeById(id: string): Sede | undefined {
  return mockSedes.find((sede) => sede.id === id);
}

export function getCitasBySede(sedeId: string): Cita[] {
  return mockCitas.filter((cita) => cita.sedeId === sedeId);
}

export function getPacientesByEmpresa(empresaId: string): Paciente[] {
  return mockPacientes.filter((paciente) => paciente.empresaId === empresaId);
}

export function getAlertasBySede(sedeId: string): Alerta[] {
  return mockAlertas.filter((alerta) => alerta.sedeId === sedeId);
}
