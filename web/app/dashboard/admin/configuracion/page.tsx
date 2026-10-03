'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Settings, 
  CreditCard, 
  Receipt, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Lock, 
  X, 
  ExternalLink,
  Sparkles,
  Info,
  BadgePercent,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  Users
} from 'lucide-react';
import { useClinicStore } from '@/lib/store';
import { PLANES_CONFIG } from '@/lib/plans-config';
import { toast } from '@/lib/toast-store';
import { motion, AnimatePresence } from 'motion/react';

// Mock Bank list for PSE in Colombia
const BANCOS_COLOMBIA = [
  'Bancolombia',
  'Banco de Bogotá',
  'Davivienda',
  'Nequi',
  'DaviPlata',
  'Banco BBVA',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Scotiabank Colpatria',
  'Itaú',
  'Lulo Bank',
  'RappiPay'
];

interface MockInvoice {
  id: string;
  date: string;
  concept: string;
  net: number;
  tax: number | null;
  total: number;
  status: 'pagado' | 'pendiente' | 'fallido';
}

export default function AdminConfiguracionPage() {
  const { data: session } = useSession();
  const { 
    empresas, 
    sedes, 
    usuarios, 
    updateEmpresa, 
    updateSede, 
    addSede, 
    deleteSede, 
    addUsuario, 
    updateUsuario, 
    deleteUsuario,
    configuracionMargenes,
    configurarMargen
  } = useClinicStore();

  const [activeTab, setActiveTab] = useState<'sede' | 'sedes' | 'usuarios' | 'margenes' | 'suscripcion' | 'facturas'>('sede');

  // Identify tenant context
  const empresaId = session?.user?.empresaId;
  const activeSedeId = session?.user?.sedeId;

  const empresa = useMemo(() => {
    return empresas.find(e => e.id === empresaId) || null;
  }, [empresas, empresaId]);

  const activeSede = useMemo(() => {
    return sedes.find(s => s.id === activeSedeId) || null;
  }, [sedes, activeSedeId]);

  // Sede form states
  const [sedeNombre, setSedeNombre] = useState('');
  const [sedeCiudad, setSedeCiudad] = useState('');
  const [sedeDireccion, setSedeDireccion] = useState('');
  const [sedeHabilitacion, setSedeHabilitacion] = useState('');

  // Empresa B2B custom brand states
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaNit, setEmpresaNit] = useState('');
  const [empresaColor, setEmpresaColor] = useState('#2563eb');

  // Sedes Management state
  const [showSedeModal, setShowSedeModal] = useState(false);
  const [editingSedeId, setEditingSedeId] = useState<string | null>(null);
  const [newSedeNombre, setNewSedeNombre] = useState('');
  const [newSedeCiudad, setNewSedeCiudad] = useState('');
  const [newSedeDireccion, setNewSedeDireccion] = useState('');
  const [newSedeHabilitacion, setNewSedeHabilitacion] = useState('');

  // Users Management state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'optometra' | 'asesor' | 'admin'>('asesor');
  const [newUserRegistroMedico, setNewUserRegistroMedico] = useState('');
  const [newUserSedesAccess, setNewUserSedesAccess] = useState<string[]>([]);
  const [newUserPassword, setNewUserPassword] = useState('');

  // Filtered lists for the active company
  const sedesEmpresa = useMemo(() => {
    return sedes.filter(s => s.empresaId === empresaId);
  }, [sedes, empresaId]);

  const usuariosEmpresa = useMemo(() => {
    return usuarios.filter(u => u.empresaId === empresaId);
  }, [usuarios, empresaId]);

  const handleOpenCreateSede = () => {
    setEditingSedeId(null);
    setNewSedeNombre('');
    setNewSedeCiudad('');
    setNewSedeDireccion('');
    setNewSedeHabilitacion('');
    setShowSedeModal(true);
  };

  const handleOpenEditSede = (sede: any) => {
    setEditingSedeId(sede.id);
    setNewSedeNombre(sede.nombre);
    setNewSedeCiudad(sede.ciudad);
    setNewSedeDireccion(sede.direccion);
    setNewSedeHabilitacion(sede.habilitacionSalud);
    setShowSedeModal(true);
  };

  const handleCreateOrUpdateSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSedeNombre || !newSedeCiudad || !newSedeDireccion || !newSedeHabilitacion) {
      toast.warning('Por favor completa todos los campos.');
      return;
    }

    if (editingSedeId) {
      updateSede(editingSedeId, {
        nombre: newSedeNombre,
        ciudad: newSedeCiudad,
        direccion: newSedeDireccion,
        habilitacionSalud: newSedeHabilitacion
      });
      toast.success('Sede actualizada con éxito.');
    } else {
      const maxSedes = PLANES_CONFIG[empresa?.plan || 'basico'].maxSedes;
      if (sedesEmpresa.length >= maxSedes) {
        toast.error(`Límite de sedes alcanzado. Tu plan actual permite un máximo de ${maxSedes} sedes.`);
        return;
      }

      addSede({
        id: `sede-${Date.now().toString().slice(-4)}`,
        empresaId: empresaId || '',
        nombre: newSedeNombre,
        ciudad: newSedeCiudad,
        direccion: newSedeDireccion,
        habilitacionSalud: newSedeHabilitacion,
        estado: 'activa'
      });
      toast.success('Nueva sede creada con éxito.');
    }

    setShowSedeModal(false);
    setEditingSedeId(null);
  };

  const handleDeleteSede = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta sede? Se cancelará el acceso de los colaboradores asociados a ella.')) {
      deleteSede(id);
      toast.success('Sede eliminada con éxito.');
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('asesor');
    setNewUserRegistroMedico('');
    setNewUserSedesAccess([]);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    setNewUserName(user.nombre);
    setNewUserEmail(user.email);
    setNewUserPassword('');
    setNewUserRole(user.role);
    setNewUserRegistroMedico(user.registroMedico || '');
    setNewUserSedesAccess(user.sedesAccess || []);
    setShowUserModal(true);
  };

  const handleCreateOrUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserRole || newUserSedesAccess.length === 0 || (!editingUserId && !newUserPassword)) {
      toast.warning('Por favor completa todos los campos obligatorios y selecciona al menos una sede.');
      return;
    }

    if (editingUserId) {
      updateUsuario(editingUserId, {
        nombre: newUserName,
        email: newUserEmail,
        role: newUserRole,
        registroMedico: newUserRole === 'optometra' ? newUserRegistroMedico : undefined,
        sedesAccess: newUserSedesAccess
      });
      toast.success('Colaborador actualizado con éxito.');
    } else {
      const maxUsuarios = PLANES_CONFIG[empresa?.plan || 'basico'].maxUsuarios;
      if (usuariosEmpresa.length >= maxUsuarios) {
        toast.error(`Límite de usuarios alcanzado. Tu plan actual permite un máximo de ${maxUsuarios} colaboradores.`);
        return;
      }

      addUsuario({
        id: `usr-${Date.now().toString().slice(-4)}`,
        empresaId: empresaId || '',
        nombre: newUserName,
        email: newUserEmail,
        role: newUserRole,
        registroMedico: newUserRole === 'optometra' ? newUserRegistroMedico : undefined,
        sedesAccess: newUserSedesAccess
      }, newUserPassword);
      toast.success('Colaborador registrado con éxito.');
    }

    setShowUserModal(false);
    setEditingUserId(null);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este colaborador del sistema? Perderá acceso inmediato.')) {
      deleteUsuario(id);
      toast.success('Colaborador eliminado con éxito.');
    }
  };

  // Stripe checkout state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<'basico' | 'premium' | 'enterprise' | null>(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'card' | 'pse'>('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Card payment form states
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // PSE payment form states
  const [pseBank, setPseBank] = useState('');
  const [pseEmail, setPseEmail] = useState('');
  const [pseDocNumber, setPseDocNumber] = useState('');

  // Populate Sede and Empresa details when loaded
  useEffect(() => {
    if (activeSede) {
      setSedeNombre(activeSede.nombre);
      setSedeCiudad(activeSede.ciudad);
      setSedeDireccion(activeSede.direccion);
      setSedeHabilitacion(activeSede.habilitacionSalud);
    }
    if (empresa) {
      setEmpresaNombre(empresa.nombre);
      setEmpresaNit(empresa.nit);
      setEmpresaColor(empresa.colorCorporativo || '#2563eb');
    }
  }, [activeSede, empresa]);

  // Generate historical invoices based on plan and nit
  const historicalInvoices = useMemo<MockInvoice[]>(() => {
    if (!empresa) return [];
    const planDetails = PLANES_CONFIG[empresa.plan];
    const basePrice = planDetails.priceCOP;
    // TODO(Q-31): la tarifa de IVA no tiene valor por defecto.
    const tax = null;
    const total = basePrice;

    const invoices: MockInvoice[] = [
      {
        id: `FAC-SAAS-${empresa.id.slice(-4)}-102`,
        date: new Date().toISOString().split('T')[0],
        concept: `Suscripción Mensual SaaS OptiSaaS - Plan ${planDetails.name}`,
        net: basePrice,
        tax: tax,
        total: total,
        status: empresa.estadoCuenta === 'suspendido' ? 'pendiente' : 'pagado'
      }
    ];

    // Add prior month if not onboarding
    if (empresa.estadoCuenta !== 'onboarding') {
      const priorDate = new Date();
      priorDate.setMonth(priorDate.getMonth() - 1);
      invoices.push({
        id: `FAC-SAAS-${empresa.id.slice(-4)}-101`,
        date: priorDate.toISOString().split('T')[0],
        concept: `Suscripción Mensual SaaS OptiSaaS - Plan ${planDetails.name}`,
        net: basePrice,
        tax: tax,
        total: total,
        status: 'pagado'
      });
    }

    return invoices;
  }, [empresa]);

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!empresa || !activeSede) {
    return (
      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm text-center">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
        <h3 className="font-bold text-foreground">Error de Contexto</h3>
        <p className="text-muted-foreground text-xs mt-1">No se encontró información de la clínica asociada a tu usuario.</p>
      </div>
    );
  }

  // Handle saving Sede and Empresa settings
  const handleSaveSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sedeNombre || !sedeCiudad || !sedeDireccion || !sedeHabilitacion || !empresaNombre || !empresaNit) {
      toast.warning('Por favor completa todos los campos requeridos.');
      return;
    }

    updateSede(activeSede.id, {
      nombre: sedeNombre,
      ciudad: sedeCiudad,
      direccion: sedeDireccion,
      habilitacionSalud: sedeHabilitacion
    });

    updateEmpresa(empresa.id, {
      nombre: empresaNombre,
      nit: empresaNit,
      colorCorporativo: empresaColor
    });

    toast.success('Configuración de sede y personalización de marca de la empresa guardadas correctamente.');
  };

  // Open Checkout Modal for plan
  const handlePlanSelection = (planKey: 'basico' | 'premium' | 'enterprise') => {
    if (planKey === empresa.plan && empresa.estadoCuenta === 'activo') {
      toast.info('Ya te encuentras suscrito a este plan.');
      return;
    }
    setSelectedPlanKey(planKey);
    setShowCheckoutModal(true);
  };

  // Simulate Payment Processing
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanKey) return;

    if (checkoutPaymentMethod === 'card') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
        toast.warning('Por favor llena los campos de tu tarjeta.');
        return;
      }
    } else {
      if (!pseBank || !pseEmail || !pseDocNumber) {
        toast.warning('Por favor completa tu información para PSE.');
        return;
      }
    }

    setIsProcessingPayment(true);
    
    // Simulate payment sequence steps
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Step 2: PSE routing simulation
    if (checkoutPaymentMethod === 'pse') {
      toast.info('Redirigiendo a pasarela bancaria segura de Stripe Colombia (PSE)...');
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Update global store
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    updateEmpresa(empresa.id, {
      plan: selectedPlanKey,
      estadoCuenta: 'activo',
      subscriptionStatus: 'active',
      nextBillingDate: formattedNextDate,
      stripeCustomerId: empresa.stripeCustomerId || `cus_${Math.random().toString(36).substring(2, 9)}`,
      stripeSubscriptionId: `sub_${Math.random().toString(36).substring(2, 9)}`
    });

    setIsProcessingPayment(false);
    setShowCheckoutModal(false);
    toast.success(`¡Suscripción al Plan ${PLANES_CONFIG[selectedPlanKey].name} activa! Disfruta del servicio.`);
  };

  // Generate XML DIAN representation for download
  const handleDownloadXml = (invoice: MockInvoice) => {
    const cufe = `cufe-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoice.id}</cbc:ID>
  <cbc:UUID schemeID="CUFE">${cufe}</cbc:UUID>
  <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>OptiSaaS Colombia S.A.S</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>901234567-8</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${empresa.nombre}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${empresa.nit}</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <!-- TODO(Q-31): IVA sin tarifa configurada; no se declara porcentaje -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${invoice.tax ?? ''}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${invoice.net}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${invoice.net}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${invoice.total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${invoice.total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optisaas-factura-dian-${invoice.id}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`XML de factura electrónica (DIAN) descargado con éxito.`);
  };

  const handleDownloadPdf = (invoice: MockInvoice) => {
    // Generate text Representation of PDF Invoice
    const textContent = `
=========================================
      FACTURA ELECTRÓNICA DE VENTA
=========================================
Proveedor: OptiSaaS Colombia S.A.S
NIT: 901.234.567-8
Email: facturacion@optisaas.co
-----------------------------------------
Factura Nro: ${invoice.id}
Fecha de Emisión: ${invoice.date}
Moneda: Pesos Colombianos (COP)
-----------------------------------------
Adquirente: ${empresa.nombre}
NIT: ${empresa.nit}
Sede: ${activeSede.nombre} - ${activeSede.ciudad}
-----------------------------------------
Detalle del Cargo:
- ${invoice.concept}

Subtotal (Neto): $ ${invoice.net.toLocaleString('es-CO')} COP
IVA:             sin tarifa configurada
TOTAL COBRADO:   $ ${invoice.total.toLocaleString('es-CO')} COP
-----------------------------------------
Método de Pago: Pasarela Stripe Colombia (PSE/Débito)
CUFE: CUFE-SAAS-COP-394820293-${invoice.id.slice(-3)}
=========================================
Representación Gráfica. DIAN Resolución 3100.
    `;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optisaas-factura-dian-${invoice.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`PDF (texto representativo) descargado con éxito.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración & Suscripción</h1>
        <p className="text-muted-foreground text-sm">Gestiona la información de la sede, las licencias del software y los pagos fiscales en COP.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/35 p-1 rounded-xl border border-border w-max">
        <button
          onClick={() => setActiveTab('sede')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'sede' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" style={{ color: activeTab === 'sede' ? empresaColor : 'inherit' }} />
          Empresa / Sede Principal
        </button>
        <button
          onClick={() => setActiveTab('sedes')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'sedes' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" style={{ color: activeTab === 'sedes' ? empresaColor : 'inherit' }} />
          Gestión de Sedes
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'usuarios' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" style={{ color: activeTab === 'usuarios' ? empresaColor : 'inherit' }} />
          Colaboradores (Usuarios)
        </button>
        <button
          onClick={() => setActiveTab('margenes')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'margenes' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BadgePercent className="w-4 h-4" style={{ color: activeTab === 'margenes' ? empresaColor : 'inherit' }} />
          Márgenes de Venta
        </button>
        <button
          onClick={() => setActiveTab('suscripcion')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'suscripcion' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="w-4 h-4" style={{ color: activeTab === 'suscripcion' ? empresaColor : 'inherit' }} />
          Suscripción SaaS
        </button>
        <button
          onClick={() => setActiveTab('facturas')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'facturas' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" style={{ color: activeTab === 'facturas' ? empresaColor : 'inherit' }} />
          Facturas (DIAN)
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: SEDE SETTINGS */}
        {activeTab === 'sede' && (
          <motion.div
            key="tab-sede"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Identificación, Habilitación y Personalización</h3>
                <p className="text-muted-foreground text-xs">Completa los requisitos del REPS (Res. 3100) y personaliza el nombre, NIT y color de marca para los documentos e impresiones.</p>
              </div>

              <form className="space-y-6" onSubmit={handleSaveSede}>
                
                {/* SECCIÓN 1: DATOS DE LA EMPRESA / ÓPTICA */}
                <div className="space-y-4 border-b border-border/55 pb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">1. Personalización de Marca (Óptica B2B)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Nombre Comercial de la Óptica *</label>
                      <input
                        type="text"
                        required
                        value={empresaNombre}
                        onChange={(e) => setEmpresaNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors"
                        placeholder="Ej: Ópticas Visión Total"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">NIT de la Óptica *</label>
                      <input
                        type="text"
                        required
                        value={empresaNit}
                        onChange={(e) => setEmpresaNit(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors font-mono"
                        placeholder="Ej: 900.123.456-7"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Color de Marca Corporativo</label>
                      <div className="flex gap-3 items-center">
                        <input
                          type="color"
                          value={empresaColor}
                          onChange={(e) => setEmpresaColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-border bg-background p-0.5"
                        />
                        <input
                          type="text"
                          value={empresaColor}
                          onChange={(e) => setEmpresaColor(e.target.value)}
                          placeholder="#2563eb"
                          className="w-32 px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors font-mono text-center"
                        />
                        <span className="text-[10px] text-muted-foreground leading-normal">
                          Este color se usará para acentos en reportes, recibos de laboratorio e historias clínicas.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: DATOS DE LA SEDE (REPS) */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">2. Configuración de la Sede</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Nombre de la Sede *</label>
                      <input
                        type="text"
                        required
                        value={sedeNombre}
                        onChange={(e) => setSedeNombre(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors"
                        placeholder="Ej: Sede Norte"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Código de Habilitación REPS *</label>
                      <input
                        type="text"
                        required
                        value={sedeHabilitacion}
                        onChange={(e) => setSedeHabilitacion(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors font-mono"
                        placeholder="Ej: 1100100021-01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Ciudad *</label>
                      <input
                        type="text"
                        required
                        value={sedeCiudad}
                        onChange={(e) => setSedeCiudad(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors"
                        placeholder="Ej: Bogotá"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Dirección *</label>
                      <input
                        type="text"
                        required
                        value={sedeDireccion}
                        onChange={(e) => setSedeDireccion(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-colors"
                        placeholder="Ej: Calle 100 #15-30"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Guardar Configuración y Marca
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Cumplimiento REPS</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  De acuerdo con la **Resolución 3100 de 2019**, el Código de Habilitación de Salud (REPS) debe figurar en toda representación digital de historias clínicas e impresiones de fórmulas.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Asegúrate de ingresar el código asignado por la Secretaría de Salud correspondiente para evitar incidentes durante auditorías e inspecciones.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SEDES MANAGEMENT */}
        {activeTab === 'sedes' && (
          <motion.div
            key="tab-sedes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-foreground">Sedes de la Óptica</h3>
                <p className="text-muted-foreground text-xs">
                  Tu plan actual (<strong style={{ color: empresaColor }}>{PLANES_CONFIG[empresa.plan].name}</strong>) te permite crear hasta <strong>{PLANES_CONFIG[empresa.plan].maxSedes === 999 ? 'Ilimitadas' : PLANES_CONFIG[empresa.plan].maxSedes}</strong> sedes.
                  Has creado <strong>{sedesEmpresa.length}</strong> sedes.
                </p>
              </div>
              <button
                onClick={handleOpenCreateSede}
                disabled={sedesEmpresa.length >= PLANES_CONFIG[empresa.plan].maxSedes}
                className="bg-primary text-white hover:brightness-110 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: empresaColor }}
              >
                <Plus className="w-4 h-4" />
                Nueva Sede
              </button>
            </div>

            {sedesEmpresa.length >= PLANES_CONFIG[empresa.plan].maxSedes && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3.5 text-xs flex items-start gap-2 animate-fade-in font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Límite de sedes alcanzado. Para abrir nuevas sedes comerciales de tu óptica, por favor mejora tu suscripción en la pestaña <strong>Suscripción SaaS</strong>.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sedesEmpresa.map((sede) => (
                <div key={sede.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start border-b border-border/40 pb-2">
                      <h4 className="font-extrabold text-sm text-foreground">{sede.nombre}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${sede.estado === 'activa' ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'}`}>
                        {sede.estado}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><span className="font-semibold text-foreground">Ciudad:</span> {sede.ciudad}</p>
                      <p><span className="font-semibold text-foreground">Dirección:</span> {sede.direccion}</p>
                      <p className="font-mono text-[11px]"><span className="font-semibold text-foreground font-sans">Habilitación REPS:</span> {sede.habilitacionSalud}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/40 mt-3 justify-end">
                    <button
                      onClick={() => handleOpenEditSede(sede)}
                      className="p-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-xs font-bold flex items-center gap-1 border border-border"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {sede.id !== activeSedeId && (
                      <button
                        onClick={() => handleDeleteSede(sede.id)}
                        className="p-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 3: USUARIOS / COLABORADORES MANAGEMENT */}
        {activeTab === 'usuarios' && (
          <motion.div
            key="tab-usuarios"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div>
                <h3 className="text-base font-bold text-foreground">Colaboradores & Permisos</h3>
                <p className="text-muted-foreground text-xs">
                  Tu plan actual (<strong style={{ color: empresaColor }}>{PLANES_CONFIG[empresa.plan].name}</strong>) te permite crear hasta <strong>{PLANES_CONFIG[empresa.plan].maxUsuarios === 999 ? 'Ilimitados' : PLANES_CONFIG[empresa.plan].maxUsuarios}</strong> usuarios.
                  Has registrado <strong>{usuariosEmpresa.length}</strong> colaboradores.
                </p>
              </div>
              <button
                onClick={handleOpenCreateUser}
                disabled={usuariosEmpresa.length >= PLANES_CONFIG[empresa.plan].maxUsuarios}
                className="bg-primary text-white hover:brightness-110 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: empresaColor }}
              >
                <UserPlus className="w-4 h-4" />
                Registrar Colaborador
              </button>
            </div>

            {usuariosEmpresa.length >= PLANES_CONFIG[empresa.plan].maxUsuarios && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl p-3.5 text-xs flex items-start gap-2 animate-fade-in font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Límite de colaboradores alcanzado. Para registrar más optómetras o asesores en el sistema, por favor mejora tu suscripción en la pestaña <strong>Suscripción SaaS</strong>.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {usuariosEmpresa.map((user) => (
                <div key={user.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start border-b border-border/40 pb-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground">{user.nombre}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{user.email}</p>
                      </div>
                      <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-primary/10 text-primary' :
                        user.role === 'optometra' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {user.role === 'optometra' ? 'Optómetra' : user.role === 'asesor' ? 'Asesor' : 'Administrador'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      {user.role === 'optometra' && user.registroMedico && (
                        <p className="font-mono text-[11px]">
                          <span className="font-semibold text-foreground font-sans">Reg. Médico:</span> {user.registroMedico}
                        </p>
                      )}
                      
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground block font-sans">Sedes Autorizadas:</span>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {user.sedesAccess && user.sedesAccess.length > 0 ? (
                            user.sedesAccess.map(sid => {
                              const sName = sedes.find(s => s.id === sid)?.nombre || 'Sede Desconocida';
                              return (
                                <span key={sid} className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded-md text-foreground font-medium">
                                  {sName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-destructive italic font-sans">Sin sedes asignadas</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/40 mt-3 justify-end">
                    <button
                      onClick={() => handleOpenEditUser(user)}
                      className="p-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-xs font-bold flex items-center gap-1 border border-border"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    {user.id !== session?.user?.id && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB: MÁRGENES DE VENTA */}
        {activeTab === 'margenes' && (
          <motion.div
            key="tab-margenes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Reglas de Precios y Márgenes por Categoría</h3>
                <p className="text-muted-foreground text-xs">
                  Configure el porcentaje de ganancia predeterminado para cada categoría de producto. Al registrar una nueva compra de inventario, el sistema calculará de forma automática el precio de venta sugerido sumando este porcentaje al costo unitario del proveedor.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Ajustar Márgenes de Ganancia</h4>
                  <div className="space-y-4">
                    {configuracionMargenes.map((margen) => (
                      <div key={margen.id} className="bg-secondary/20 border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="font-extrabold text-sm text-foreground block">{margen.categoria}</span>
                          <span className="text-[10px] text-muted-foreground">Fórmula: Costo × (1 + {margen.porcentajeMargen}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={margen.porcentajeMargen}
                            onChange={(e) => configurarMargen(margen.categoria, Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 bg-background border border-input rounded-lg p-2 text-sm text-center font-bold font-mono text-primary"
                          />
                          <span className="text-sm font-bold text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4 h-fit">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider">Simulador de Precio de Venta</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Ingrese un valor de compra de prueba para ver el precio de venta final calculado bajo sus márgenes vigentes:
                  </p>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground block mb-1">Costo Unitario del Proveedor ($)</label>
                      <input
                        type="number"
                        defaultValue="100000"
                        id="sim-cost"
                        onChange={(e) => {
                          const cost = parseFloat(e.target.value) || 0;
                          configuracionMargenes.forEach(m => {
                            const price = Math.round(cost * (1 + m.porcentajeMargen / 100));
                            const el = document.getElementById(`sim-price-${m.id}`);
                            if (el) el.innerText = `$ ${price.toLocaleString()}`;
                          });
                        }}
                        className="w-full bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary font-mono text-foreground"
                      />
                    </div>

                    <div className="border-t border-border/60 pt-3 space-y-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Precio sugerido final:</span>
                      {configuracionMargenes.map((m) => {
                        const price = Math.round(100000 * (1 + m.porcentajeMargen / 100));
                        return (
                          <div key={m.id} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{m.categoria} (+{m.porcentajeMargen}%)</span>
                            <strong id={`sim-price-${m.id}`} className="font-mono text-foreground">$ {price.toLocaleString()}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SAAS SUBSCRIPTION */}
        {activeTab === 'suscripcion' && (
          <motion.div
            key="tab-suscripcion"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Subscription status card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-black tracking-widest block mb-0.5">Suscripción SaaS Activa</span>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-foreground">Plan {PLANES_CONFIG[empresa.plan].name}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    empresa.estadoCuenta === 'activo' ? 'bg-success/15 text-success border-success/20' :
                    empresa.estadoCuenta === 'suspendido' ? 'bg-destructive/15 text-destructive border-destructive/20' :
                    'bg-warning/15 text-warning-foreground border-warning/20'
                  }`}>
                    {empresa.estadoCuenta === 'activo' ? 'Al Día / Activo' : 
                     empresa.estadoCuenta === 'suspendido' ? 'Suspendido' : 'Periodo Demo'}
                  </span>
                </div>
                {empresa.nextBillingDate && (
                  <p className="text-xs text-muted-foreground mt-1">Próxima facturación: <span className="font-mono font-bold text-foreground">{empresa.nextBillingDate}</span></p>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toast.info('Portal de Stripe. Aquí actualizarías tarjetas o métodos PSE directos.')}
                  className="bg-secondary text-foreground hover:bg-secondary/80 border border-border px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  Stripe Customer Portal
                </button>
              </div>
            </div>

            {/* Plan list grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(Object.keys(PLANES_CONFIG) as Array<'basico' | 'premium' | 'enterprise'>).map(planKey => {
                const conf = PLANES_CONFIG[planKey];
                const isCurrent = empresa.plan === planKey && empresa.estadoCuenta === 'activo';
                return (
                  <div 
                    key={planKey}
                    className={`bg-card border rounded-2xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden ${
                      isCurrent ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    {planKey === 'premium' && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-bl-xl">
                        Recomendado
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-black tracking-widest">{conf.name}</span>
                        <div className="text-2xl font-black text-foreground mt-1">
                          $ {conf.priceCOP.toLocaleString('es-CO')}
                          <span className="text-xs text-muted-foreground font-normal"> COP/mes</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">IVA: sin tarifa configurada</p>
                      </div>

                      <ul className="text-xs text-muted-foreground space-y-2 border-t border-border/50 pt-4">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span>Hasta <strong>{conf.maxSedes}</strong> sede{conf.maxSedes > 1 ? 's' : ''}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span>Hasta <strong>{conf.maxUsuarios}</strong> usuarios</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span><strong>{conf.maxHistoriasMes.toLocaleString('es-CO')}</strong> HC al mes</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          {conf.modules.ventasPOS ? (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          )}
                          <span className={!conf.modules.ventasPOS ? 'line-through opacity-50' : ''}>Punto de Venta (POS) & DIAN</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          {conf.modules.promocionesMarketing ? (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                          )}
                          <span className={!conf.modules.promocionesMarketing ? 'line-through opacity-50' : ''}>Módulo de Promociones</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6 border-t border-border/40 mt-6">
                      <button
                        onClick={() => handlePlanSelection(planKey)}
                        disabled={isCurrent}
                        className={`w-full font-bold text-xs p-3 rounded-xl transition-all shadow-sm ${
                          isCurrent 
                            ? 'bg-secondary text-muted-foreground border border-border cursor-default shadow-none'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {isCurrent ? 'Plan Actual Activado' : 'Contratar Plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: INVOICE HISTORY */}
        {activeTab === 'facturas' && (
          <motion.div
            key="tab-facturas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-border bg-secondary/20 font-bold text-foreground">
              Facturas Electrónicas Emitidas
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-background border-b border-border font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Fecha</th>
                    <th className="px-6 py-3.5">Factura ID</th>
                    <th className="px-6 py-3.5">Concepto</th>
                    <th className="px-6 py-3.5">Base</th>
                    <th className="px-6 py-3.5">Estado</th>
                    <th className="px-6 py-3.5 text-right">Documentos Legales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historicalInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-secondary/15 transition-colors font-medium">
                      <td className="px-6 py-4 font-mono text-xs">{inv.date}</td>
                      <td className="px-6 py-4 font-bold text-foreground">{inv.id}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{inv.concept}</td>
                      <td className="px-6 py-4">
                        <div className="text-foreground font-mono font-bold">$ {inv.total.toLocaleString('es-CO')} COP</div>
                        <div className="text-[10px] text-muted-foreground font-mono">IVA: sin tarifa configurada</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          inv.status === 'pagado' ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning-foreground border-warning/20'
                        }`}>
                          {inv.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            className="bg-secondary hover:bg-secondary/80 text-foreground border border-border px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                            PDF
                          </button>
                          <button
                            onClick={() => handleDownloadXml(inv)}
                            className="bg-primary text-white hover:bg-primary/90 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            XML (DIAN)
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* STRIPE CHECKOUT MODAL (Tarjeta/PSE) */}
      <AnimatePresence>
        {showCheckoutModal && selectedPlanKey && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { if (!isProcessingPayment) setShowCheckoutModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/10">
                <div>
                  <h3 className="font-black text-foreground flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-primary" />
                    Pasarela Stripe Colombia
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Pago seguro para activar el Plan {PLANES_CONFIG[selectedPlanKey].name}</p>
                </div>
                {!isProcessingPayment && (
                  <button 
                    onClick={() => setShowCheckoutModal(false)}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Modal body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                
                {/* Billing Summary & Tax breakdown */}
                <div className="bg-secondary/30 border border-border/80 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Base Imponible (Software SaaS):</span>
                    <span className="font-mono text-foreground">$ {PLANES_CONFIG[selectedPlanKey].priceCOP.toLocaleString('es-CO')} COP</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                    <span>Impuesto IVA:</span>
                    <span className="font-mono text-foreground">Sin tarifa configurada</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/50 pt-2 font-black text-foreground">
                    <span>Total a pagar (base, COP):</span>
                    <span className="font-mono text-primary">$ {PLANES_CONFIG[selectedPlanKey].priceCOP.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>

                {/* Checkout Payment Method Selector */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutPaymentMethod('card')}
                    disabled={isProcessingPayment}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      checkoutPaymentMethod === 'card' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border text-muted-foreground hover:text-foreground bg-background'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Tarjeta de Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutPaymentMethod('pse')}
                    disabled={isProcessingPayment}
                    className={`flex-1 p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      checkoutPaymentMethod === 'pse' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border text-muted-foreground hover:text-foreground bg-background'
                    }`}
                  >
                    <BadgePercent className="w-4 h-4 text-emerald-600" />
                    PSE (Bancos Colombia)
                  </button>
                </div>

                {/* Form based on selected method */}
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {checkoutPaymentMethod === 'card' ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">Nombre en la Tarjeta *</label>
                        <input
                          type="text"
                          required
                          value={cardName}
                          disabled={isProcessingPayment}
                          onChange={e => setCardName(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          placeholder="Ej: Fernando Gómez"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">Número de Tarjeta *</label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          disabled={isProcessingPayment}
                          onChange={e => setCardNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-50"
                          placeholder="4242 4242 4242 4242"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground">Expiración *</label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            disabled={isProcessingPayment}
                            onChange={e => setCardExpiry(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-50"
                            placeholder="MM/AA"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground">CVC *</label>
                          <input
                            type="password"
                            required
                            value={cardCvc}
                            disabled={isProcessingPayment}
                            onChange={e => setCardCvc(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-50"
                            placeholder="•••"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">Selecciona tu Banco *</label>
                        <select
                          required
                          value={pseBank}
                          disabled={isProcessingPayment}
                          onChange={e => setPseBank(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        >
                          <option value="">Selecciona una entidad financiera...</option>
                          {BANCOS_COLOMBIA.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">Correo Registrado en PSE *</label>
                        <input
                          type="email"
                          required
                          value={pseEmail}
                          disabled={isProcessingPayment}
                          onChange={e => setPseEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          placeholder="ejemplo@pse.com.co"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">NIT o CC del Titular *</label>
                        <input
                          type="text"
                          required
                          value={pseDocNumber}
                          disabled={isProcessingPayment}
                          onChange={e => setPseDocNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono disabled:opacity-50"
                          placeholder="Ej: 901234567"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-border mt-6">
                    <button
                      type="button"
                      disabled={isProcessingPayment}
                      onClick={() => setShowCheckoutModal(false)}
                      className="flex-1 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessingPayment}
                      className="flex-1 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isProcessingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          Confirmar Pago Seguro
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREAR/EDITAR SEDE */}
      <AnimatePresence>
        {showSedeModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSedeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/10">
                <h3 className="font-extrabold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-5 h-5 text-primary" style={{ color: empresaColor }} />
                  {editingSedeId ? 'Editar Sede Comercial' : 'Crear Nueva Sede'}
                </h3>
                <button 
                  onClick={() => setShowSedeModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateSede} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Nombre de la Sede *</label>
                  <input
                    type="text"
                    required
                    value={newSedeNombre}
                    onChange={e => setNewSedeNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Ej: Sede Unicentro"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Ciudad *</label>
                  <input
                    type="text"
                    required
                    value={newSedeCiudad}
                    onChange={e => setNewSedeCiudad(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Ej: Bogotá"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Dirección *</label>
                  <input
                    type="text"
                    required
                    value={newSedeDireccion}
                    onChange={e => setNewSedeDireccion(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Ej: Carrera 15 # 124-30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Código Habilitación REPS *</label>
                  <input
                    type="text"
                    required
                    value={newSedeHabilitacion}
                    onChange={e => setNewSedeHabilitacion(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono text-foreground"
                    placeholder="Ej: 1100100021-02"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSedeModal(false)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 hover:brightness-110"
                    style={{ backgroundColor: empresaColor }}
                  >
                    {editingSedeId ? 'Guardar Cambios' : 'Crear Sede'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREAR/EDITAR COLABORADOR */}
      <AnimatePresence>
        {showUserModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUserModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border flex justify-between items-center bg-secondary/10">
                <h3 className="font-extrabold text-foreground flex items-center gap-1.5">
                  <UserPlus className="w-5 h-5" style={{ color: empresaColor }} />
                  {editingUserId ? 'Editar Colaborador' : 'Registrar Colaborador'}
                </h3>
                <button 
                  onClick={() => setShowUserModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateUser} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="Ej: Dra. Diana Silva"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder="diana@visiontotal.com"
                  />
                </div>
                
                {!editingUserId && (
                  <div className="space-y-1.5 animate-in slide-in-from-right-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Contraseña *</label>
                    <input
                      type="password"
                      required={!editingUserId}
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Rol / Cargo *</label>
                    <select
                      required
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                      <option value="asesor">Asesor Comercial</option>
                      <option value="optometra">Optómetra Clínico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  {newUserRole === 'optometra' && (
                    <div className="space-y-1.5 animate-in slide-in-from-right-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Reg. Médico *</label>
                      <input
                        type="text"
                        required
                        value={newUserRegistroMedico}
                        onChange={e => setNewUserRegistroMedico(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-input rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary font-mono text-foreground"
                        placeholder="RM-12345-CO"
                      />
                    </div>
                  )}
                </div>

                {/* SEDES ACCESS LIST */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground block font-sans">Sedes Autorizadas * (Selecciona al menos una)</label>
                  <div className="bg-secondary/40 border border-border rounded-xl p-3 space-y-2 max-h-[140px] overflow-y-auto">
                    {sedesEmpresa.map(sede => {
                      const isChecked = newUserSedesAccess.includes(sede.id);
                      return (
                        <label key={sede.id} className="flex items-center gap-2 cursor-pointer text-xs text-foreground font-medium select-none">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={e => {
                              if (e.target.checked) {
                                setNewUserSedesAccess(prev => [...prev, sede.id]);
                              } else {
                                setNewUserSedesAccess(prev => prev.filter(sid => sid !== sede.id));
                              }
                            }} 
                            className="rounded text-primary focus:ring-primary w-3.5 h-3.5" 
                            style={{ '--tw-ring-color': empresaColor } as React.CSSProperties}
                          />
                          <span>{sede.nombre} ({sede.ciudad})</span>
                        </label>
                      );
                    })}
                    {sedesEmpresa.length === 0 && (
                      <p className="text-[10px] text-destructive italic">Debes crear al menos una sede primero.</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                    style={{ backgroundColor: empresaColor }}
                  >
                    {editingUserId ? 'Guardar Cambios' : 'Registrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
