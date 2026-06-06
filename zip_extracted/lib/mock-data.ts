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
  CajaSesion 
} from './types';

export const mockEmpresas: Empresa[] = [
  {
    id: 'emp1',
    nombre: 'Ópticas Visión Total S.A.S',
    nit: '900.123.456-7',
    plan: 'enterprise',
    stripeCustomerId: 'cus_R8h3n1a8_vt',
    stripeSubscriptionId: 'sub_1Qenterprise_vt',
    subscriptionStatus: 'active',
    nextBillingDate: '2026-06-15',
    estadoCuenta: 'activo',
    whatsappHabilitado: true
  }
];

export const mockSedes: Sede[] = [
  {
    id: 'sede1',
    empresaId: 'emp1',
    nombre: 'Sucursal Norte',
    ciudad: 'Bogotá',
    direccion: 'Calle 127 # 14-54',
    habilitacionSalud: '11001-08234-01',
    estado: 'activa'
  }
];

export const mockUsuarios: Usuario[] = [
  {
    id: '00000000-0000-0000-0000-000000000000',
    empresaId: '', // Owner has platform-level access
    sedesAccess: ['sede1'],
    nombre: 'Orlando Platform Owner',
    email: 'owner@optisaas.co',
    role: 'owner'
  }
];

export const mockPacientes: Paciente[] = [];

export const mockCitas: Cita[] = [];

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
    codigoBarras: '8053672166677'
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
    codigoBarras: '888392491953'
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
    codigoBarras: '0733905148677'
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
    codigoBarras: '300650359056'
  }
];

export const mockPromociones: Promocion[] = [];

export const mockOrdenesTrabajo: OrdenTrabajo[] = [];

export const mockGarantias: Garantia[] = [];

export const mockEquiposMedicos: EquipoMedico[] = [];

export const mockLecturasAmbientales: LecturaAmbiental[] = [];

export const mockRegistrosResiduos: RegistroResiduos[] = [];

export const mockRegistrosDesinfeccion: RegistroDesinfeccion[] = [];

export const mockConceptoSanitario: ConceptoSanitario = {
  id: 'SAN-001',
  fechaInspeccion: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  fechaVencimiento: new Date(Date.now() + 125 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  estadoConcepto: 'favorable',
  numeroRadicado: 'RAD-2025-SDS-98231',
  funcionarioInspector: 'Dra. Pilar Montoya (Secretaría Distrital de Salud)',
  observaciones: 'Establecimiento cumple con condiciones higiénico-sanitarias. Se recomienda mantener bitácoras.'
};

export const mockSaneamientoLogs: ServicioSaneamiento[] = [];

export const mockCajaSesiones: CajaSesion[] = [];

export function getUsuarioByEmail(email: string): Usuario | undefined {
  return mockUsuarios.find(u => u.email === email);
}

export function getEmpresa(id: string): Empresa | undefined {
  return mockEmpresas.find(e => e.id === id);
}
