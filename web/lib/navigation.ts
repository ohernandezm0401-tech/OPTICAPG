import { Role, NavItem } from './types';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Package,
  ClipboardList,
  Stethoscope,
  Eye,
  Tag,
  Settings,
  Building2,
  Shield,
  ShieldCheck,
  Scale,
  Archive,
  BarChart3,
  HeartPulse,
  FileCheck,
  BookOpen,
  PenLine,
  Store,
  MessageCircle,
  ShoppingCart
} from 'lucide-react';
import React from 'react';

export interface NavItemConfig extends NavItem {
  icon: React.ElementType;
}

export const NAV_CONFIG: Record<Role, NavItemConfig[]> = {
  owner: [
    { icon: LayoutDashboard, iconName: 'LayoutDashboard', label: 'Panel Plataforma', href: '/dashboard/owner' },
    { icon: Building2, iconName: 'Building2', label: 'Empresas / Ópticas', href: '/dashboard/owner/empresas' },
    { icon: Users, iconName: 'Users', label: 'Usuarios Globales', href: '/dashboard/owner/usuarios' },
    { icon: BarChart3, iconName: 'BarChart3', label: 'Métricas Globales', href: '/dashboard/owner/metricas' },
    { icon: CreditCard, iconName: 'CreditCard', label: 'Facturación Planes', href: '/dashboard/owner/facturacion' },
    { icon: Shield, iconName: 'Shield', label: 'Seguridad & Logs', href: '/dashboard/owner/seguridad' },
    { icon: Settings, iconName: 'Settings', label: 'Config. Plataforma', href: '/dashboard/owner/configuracion' }
  ],
  admin: [
    { icon: LayoutDashboard, iconName: 'LayoutDashboard', label: 'Dashboard General', href: '/dashboard/admin' },
    { icon: Calendar, iconName: 'Calendar', label: 'Agenda Global', href: '/dashboard/admin/agenda' },
    { icon: Users, iconName: 'Users', label: 'Pacientes & HC', href: '/dashboard/admin/pacientes' },
    { icon: Package, iconName: 'Package', label: 'Inventario & Stock', href: '/dashboard/admin/inventario' },
    { icon: ShoppingCart, iconName: 'ShoppingCart', label: 'Compras y Proveedores', href: '/dashboard/admin/compras' },
    { icon: Tag, iconName: 'Tag', label: 'Promociones', href: '/dashboard/admin/promociones' },
    { icon: CreditCard, iconName: 'CreditCard', label: 'Ventas y Desempeño', href: '/dashboard/admin/ventas' },
    { icon: ShieldCheck, iconName: 'ShieldCheck', label: 'Garantías y Cambios', href: '/dashboard/admin/garantias' },
    { icon: HeartPulse, iconName: 'HeartPulse', label: 'Secretaría de Salud', href: '/dashboard/admin/secretaria-salud' },
    { icon: Building2, iconName: 'Building2', label: 'Sedes y certificados', href: '/dashboard/admin/sedes' },
    { icon: Users, iconName: 'Users', label: 'Usuarios y roles', href: '/dashboard/admin/usuarios' },
    { icon: BookOpen, iconName: 'BookOpen', label: 'Catálogos clínicos', href: '/dashboard/admin/catalogos' },
    { icon: Settings, iconName: 'Settings', label: 'Configuración Sede', href: '/dashboard/admin/configuracion' },
    { icon: Shield, iconName: 'Shield', label: 'Bitácora de auditoría', href: '/dashboard/auditoria' },
    { icon: FileCheck, iconName: 'FileCheck', label: 'Verificador de firmas', href: '/dashboard/admin/verificador-firma' },
    { icon: Shield, iconName: 'Shield', label: 'Política de tratamiento', href: '/dashboard/admin/politica-tratamiento' },
    { icon: Scale, iconName: 'Scale', label: 'Habeas Data y PQR', href: '/dashboard/admin/habeas-data' },
    { icon: Archive, iconName: 'Archive', label: 'Retención de historias', href: '/dashboard/admin/retencion' }
  ],
  asesor: [
    { icon: LayoutDashboard, iconName: 'LayoutDashboard', label: 'Dashboard Comercial', href: '/dashboard/asesor' },
    { icon: Calendar, iconName: 'Calendar', label: 'Agenda', href: '/dashboard/asesor/agenda' },
    { icon: Users, iconName: 'Users', label: 'Pacientes', href: '/dashboard/asesor/pacientes' },
    { icon: ClipboardList, iconName: 'ClipboardList', label: 'Órdenes de Venta', href: '/dashboard/asesor/ordenes-venta' },
    { icon: FileText, iconName: 'FileText', label: 'Seguimiento Órdenes', href: '/dashboard/asesor/entregas' },
    { icon: Store, iconName: 'Store', label: 'Venta Vitrina (POS)', href: '/dashboard/asesor/ventas' },
    { icon: ShieldCheck, iconName: 'ShieldCheck', label: 'Garantías', href: '/dashboard/asesor/garantias' },
    { icon: HeartPulse, iconName: 'HeartPulse', label: 'Secretaría de Salud', href: '/dashboard/asesor/secretaria-salud' },
    { icon: MessageCircle, iconName: 'MessageCircle', label: 'WhatsApp CRM', href: '/dashboard/asesor/whatsapp' },
    { icon: PenLine, iconName: 'PenLine', label: 'Firma de ejemplo', href: '/dashboard/asesor/firma' },
    { icon: Scale, iconName: 'Scale', label: 'Habeas Data y PQR', href: '/dashboard/asesor/habeas-data' }
  ],
  optometra: [
    { icon: Calendar, iconName: 'Calendar', label: 'Mi Agenda Clínica', href: '/dashboard/optometra' },
    { icon: Users, iconName: 'Users', label: 'Pacientes', href: '/dashboard/optometra/pacientes' },
    { icon: ClipboardList, iconName: 'ClipboardList', label: 'Historia Clínica', href: '/dashboard/optometra/historia-clinica' },
    { icon: BookOpen, iconName: 'BookOpen', label: 'Catálogos clínicos', href: '/dashboard/optometra/catalogos' },
    { icon: Stethoscope, iconName: 'Stethoscope', label: 'Fórmulas', href: '/dashboard/optometra/formulas' },
    { icon: Eye, iconName: 'Eye', label: 'Adaptación L.C.', href: '/dashboard/optometra/adaptacion-lc' },
    { icon: FileCheck, iconName: 'FileCheck', label: 'Control de Calidad (QA)', href: '/dashboard/optometra/calidad' },
    { icon: ShieldCheck, iconName: 'ShieldCheck', label: 'Garantías Receta', href: '/dashboard/optometra/garantias' },
    { icon: Shield, iconName: 'Shield', label: 'Mis accesos', href: '/dashboard/auditoria' },
    { icon: PenLine, iconName: 'PenLine', label: 'Firma de ejemplo', href: '/dashboard/optometra/firma' },
    { icon: FileCheck, iconName: 'FileCheck', label: 'Verificador de firmas', href: '/dashboard/optometra/verificador-firma' },
    { icon: Scale, iconName: 'Scale', label: 'Habeas Data y PQR', href: '/dashboard/optometra/habeas-data' }
  ]
};


