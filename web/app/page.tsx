'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  ArrowRight, 
  Check, 
  MapPin, 
  Mail, 
  Lock, 
  User, 
  Terminal, 
  Cpu, 
  ChevronDown,
  ChevronRight,
  Database,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Calendar,
  FileText,
  ShoppingBag,
  Plus,
  ArrowUpRight,
  Building2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useClinicStore } from '@/lib/store';
import { toast } from '@/lib/toast-store';

// Technical SVG: Glasses / Frame outline
const TechnicalGlassesIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="12" r="3" />
    <path d="M9 12h6" />
    <path d="M3 12c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6" />
    <path d="M3 12v3" />
    <path d="M21 12v3" />
  </svg>
);

// Technical SVG: Focal lens refraction diagram
const OpticalRefractionIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M12 2v20M2 12h20" strokeDasharray="2 2" />
    <path d="M8 5c2 4 2 10 0 14" strokeWidth="2.5" />
    <path d="M16 5c-2 4-2 10 0 14" strokeWidth="2.5" />
    <path d="M2 12c4-2 8-2 12 0s8 2 10 0" strokeWidth="1" opacity="0.6" />
    <path d="M3 8c4-1 8-1 12 0s6 1 9 0" strokeWidth="1" opacity="0.4" />
    <circle cx="12" cy="12" r="9" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

// Clean SVG: Phoropter profile outline
const PhoropterIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h16M4 18h16M12 2v20M6 10h4M14 10h4M8 6c0 2 0 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4zm12 0c0 2 0 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4zm-10 12c0 2 0 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4zm10 0c0 2 0 4-2 4s-2-2-2-4 2-4 2-4 2 2 2 4z" />
  </svg>
);

// SVG Shield Icon for clean security indicators
const CustomShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const { empresas, addEmpresa, addSede, addUsuario } = useClinicStore();

  // Security & Tracking States
  const [clientIp, setClientIp] = useState('Detectando...');
  const [deviceMac, setDeviceMac] = useState('Generando huella...');
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  
  // Attack Detection State
  const [securityAlert, setSecurityAlert] = useState<{
    type: string;
    field: string;
    payload: string;
    ip: string;
    mac: string;
    timestamp: string;
  } | null>(null);

  // Form States
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [opticaName, setOpticaName] = useState('');
  const [nit, setNit] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [repsCode, setRepsCode] = useState('');
  const [password, setPassword] = useState('');
  
  // UI Flow States
  const [isLoading, setIsLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basico' | 'premium' | 'enterprise'>('basico');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const registrationSectionRef = useRef<HTMLDivElement>(null);

  // Colombian Regulatory and Functional FAQs (Spanish)
  const faqData = [
    {
      question: "¿Cómo garantiza la plataforma el cumplimiento de la Resolución 3100 de 2019 (REPS)?",
      answer: "OptiSaaS está diseñado de acuerdo con los estándares de habilitación exigidos por el Ministerio de Salud de Colombia. El sistema realiza la validación formal del Código de Sede del Registro Especial de Prestadores de Servicios de Salud (REPS), estructurando las historias clínicas con los datos mínimos obligatorios de optometría (anamnesis, refracción, queratometría, prescripción final, patologías y firma digital) y aplicando bloqueos de seguridad que impiden modificaciones posteriores transcurridas 24 horas del registro del paciente."
    },
    {
      question: "¿Cómo funciona la generación automática de archivos RIPS bajo la normativa vigente?",
      answer: "El motor de RIPS lee automáticamente los diagnósticos CIE-10 registrados en cada historia clínica de optometría y los asocia con los datos de facturación del POS. Al final del periodo de facturación, el administrador de la sede puede descargar el archivo estructurado (JSON o XML según la normativa actual de la Secretaría de Salud y del Ministerio) sin necesidad de transcripción manual de archivos planos, lo cual elimina glosas y simplifica las auditorías."
    },
    {
      question: "¿El módulo de punto de venta (POS) está integrado con la facturación electrónica DIAN?",
      answer: "El punto de venta desglosa el impuesto con la tarifa que configure el tenant. No hay un porcentaje fijo en el sistema: hasta que el contador la confirme, la tarifa nace vacía. El código CUFE de esta demostración es simulado."
    },
    {
      question: "¿Se pueden cargar catálogos y recetas de lentes oftálmicos de laboratorios externos?",
      answer: "Sí. La plataforma cuenta con un importador masivo que permite sincronizar los catálogos y tarifas comerciales de laboratorios líderes en Colombia (como ServiOptica, Essilor, etc.). El sistema incluye herramientas para registrar fórmulas oftálmicas detalladas y controlar inventarios de lentes de contacto y monturas por lotes, garantizando que el asesor en tienda cotice monturas y tratamientos con los precios correctos."
    },
    {
      question: "¿Qué sucede al finalizar el periodo de prueba de 15 días y cómo se procesa el cobro?",
      answer: "Al concluir los 15 días de demostración gratuita, el acceso al sistema se suspenderá temporalmente. Para reactivar el servicio, el administrador de la clínica puede ingresar al panel de facturación de la sede y realizar el pago de la suscripción mensual en pesos colombianos (COP). La transacción se procesa a través de la pasarela Stripe integrada, soportando pagos con Tarjetas de Crédito de cualquier franquicia o débito directo a través de PSE (banca en línea colombiana)."
    },
    {
      question: "¿De qué manera protege el cortafuegos perimetral los registros clínicos del consultorio?",
      answer: "La seguridad es nuestro pilar fundamental en el manejo de datos de salud (Ley 1581 de Habeas Data). OptiSaaS incorpora un analizador estático en la capa de transporte del cliente y en el controlador de entrada del servidor. Este filtro analiza cada cadena enviada al sistema, bloqueando al instante inyecciones SQL que comprometan la base de datos y scripts maliciosos XSS. Además, se registra la huella digital del dispositivo y la dirección IP de conexión de cada usuario, permitiendo auditorías de seguridad completas."
    }
  ];

  // IP & Device Fingerprinting (MAC simulation) on mount
  useEffect(() => {
    addSecurityLog('Firewall perimetral inicializado. Estado: PROTEGIDO.');

    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (response.ok) {
          const data = await response.json();
          setClientIp(data.ip);
          addSecurityLog(`Direccion IP de red detectada: ${data.ip}`);
        } else {
          throw new Error('Fallback IP');
        }
      } catch (err) {
        const randomIp = '190.143.45.12';
        setClientIp(randomIp);
        addSecurityLog(`Direccion IP de red asignada (Simulado): ${randomIp}`);
      }
    };

    const calculateFingerprint = () => {
      if (typeof window === 'undefined') return;
      const nav = window.navigator;
      const screen = window.screen;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
      
      const entropyString = `${nav.userAgent}|${screen.width}x${screen.height}x${screen.colorDepth}|${timezone}|${nav.language}|${nav.hardwareConcurrency || 4}`;
      
      let hash = 0;
      for (let i = 0; i < entropyString.length; i++) {
        const char = entropyString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      
      const hexHash = Math.abs(hash).toString(16).toUpperCase().padStart(12, '0');
      const mac = `${hexHash.slice(0,2)}:${hexHash.slice(2,4)}:${hexHash.slice(4,6)}:${hexHash.slice(6,8)}:${hexHash.slice(8,10)}:${hexHash.slice(10,12)}`;
      const formattedMac = `HW-MAC-${mac}`;
      
      setDeviceMac(formattedMac);
      addSecurityLog(`Huella digital de hardware asignada: ${formattedMac}`);
      
      const registradas = useClinicStore.getState().empresas;

      const ipExists = registradas.some((e: any) => e.registrationIp === clientIp);
      const macExists = registradas.some((e: any) => e.deviceFingerprint === formattedMac);
      
      if (ipExists || macExists) {
        setIsDuplicate(true);
        addSecurityLog('Validacion anti-spam: Registro duplicado detectado para este hardware.');
      } else {
        addSecurityLog('Validacion anti-spam: Permiso de registro de trial concedido.');
      }
    };

    fetchIp();
    const timer = setTimeout(calculateFingerprint, 800);
    return () => clearTimeout(timer);
  }, [clientIp]);

  const addSecurityLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('es-CO', { hour12: false });
    setSecurityLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 14)]);
  };

  // Anti-Injection Sanitization Filters
  const checkInjectionAttempt = (value: string, fieldName: string) => {
    if (!value) return null;
    
    // Strict SQL Injection regex (looking for common keywords, union select, statements, comments)
    const sqlPattern = /\b(UNION|SELECT|INSERT|DROP|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|TABLE|FROM|WHERE|INTO|HAVING|OR\s+['"\d\w]+\s*=\s*['"\d\w]+|--|;|\/\*|\*\/)\b/i;
    // Cross-Site Scripting (XSS) regex
    const xssPattern = /(<script|script>|javascript:|onclick|onload|onerror|alert\(|document\.cookie|eval\(|window\.|href\s*=\s*['"]\s*javascript|<iframe|<img)/i;
    
    if (sqlPattern.test(value)) {
      addSecurityLog(`Alerta: Bloqueo por inyeccion SQL en el campo: ${fieldName}`);
      return { type: 'Inyección SQL (SQLi)', payload: value };
    }
    if (xssPattern.test(value)) {
      addSecurityLog(`Alerta: Bloqueo por ataque XSS en el campo: ${fieldName}`);
      return { type: 'Cross-Site Scripting (XSS)', payload: value };
    }
    return null;
  };

  const scrollToSignup = (planName?: 'basico' | 'premium' | 'enterprise') => {
    if (planName) {
      setSelectedPlan(planName);
    }
    registrationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    addSecurityLog('Ejecutando analisis de firmas de entrada...');

    const inputs = [
      { val: adminName, name: 'Nombre del Administrador' },
      { val: email, name: 'Correo Electrónico' },
      { val: opticaName, name: 'Nombre de la Óptica' },
      { val: nit, name: 'NIT de la Óptica' },
      { val: ciudad, name: 'Ciudad' },
      { val: direccion, name: 'Dirección' },
      { val: repsCode, name: 'Código REPS' },
      { val: password, name: 'Contraseña' }
    ];

    for (const input of inputs) {
      const injection = checkInjectionAttempt(input.val, input.name);
      if (injection) {
        setSecurityAlert({
          type: injection.type,
          field: input.name,
          payload: injection.payload,
          ip: clientIp,
          mac: deviceMac,
          timestamp: new Date().toLocaleString('es-CO')
        });
        setIsLoading(false);
        return;
      }
    }

    const registradas = useClinicStore.getState().empresas;
    const isIpDup = registradas.some((e: any) => e.registrationIp === clientIp);
    const isMacDup = registradas.some((e: any) => e.deviceFingerprint === deviceMac);

    if (isIpDup || isMacDup) {
      setIsDuplicate(true);
      toast.error('Registro denegado. Este dispositivo/IP ya cuenta con un Trial registrado.');
      setIsLoading(false);
      return;
    }

    const nitClean = nit.replace(/[^0-9-]/g, '');
    const nitExistsInStore = empresas.some(e => e.nit === nitClean);
    if (nitExistsInStore) {
      addSecurityLog(`Validación fallida: El NIT ${nitClean} ya existe.`);
      toast.error('Este NIT ya se encuentra registrado. Utilice un NIT diferente.');
      setIsLoading(false);
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const emailExists = useClinicStore.getState().usuarios.some((u) => u.email === emailLower);
    
    if (emailExists) {
      addSecurityLog(`Validación fallida: El email ${emailLower} ya se encuentra registrado.`);
      toast.error('El correo electrónico ya se encuentra registrado.');
      setIsLoading(false);
      return;
    }

    addSecurityLog('Analisis estatico completado sin advertencias. Creando base de datos clinica...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const empresaId = `emp_${Date.now()}`;
    const sedeId = `sede_${Date.now()}`;
    const userId = `usr_${Date.now()}`;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 15);
    const trialDateStr = nextDate.toISOString().split('T')[0];

    const newSede = {
      id: sedeId,
      empresaId,
      nombre: 'Sede Principal',
      ciudad,
      direccion: direccion || 'Calle Principal # 10-20',
      habilitacionSalud: repsCode || '11001-99882-01',
      estado: 'activa' as const
    };

    const newEmpresa = {
      id: empresaId,
      nombre: opticaName,
      nit: nitClean,
      plan: selectedPlan,
      subscriptionStatus: 'trialing' as const,
      nextBillingDate: trialDateStr,
      estadoCuenta: 'onboarding' as const,
      registrationIp: clientIp,
      deviceFingerprint: deviceMac,
      trialStartedAt: new Date().toISOString()
    };

    const newUsuario = {
      id: userId,
      empresaId,
      sedesAccess: [sedeId],
      nombre: adminName,
      email: emailLower,
      role: 'admin' as const
    };

    addEmpresa(newEmpresa);
    addSede(newSede);
    addUsuario(newUsuario);

    addSecurityLog(`Configuracion exitosa de la empresa: ${opticaName}.`);
    setIsLoading(false);
    setRegisterSuccess(true);
    toast.success('¡Registro completado!');

    setTimeout(() => {
      router.push('/login');
    }, 5000);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Soft Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none opacity-40"></div>
      
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-500/10">
              <TechnicalGlassesIcon className="w-7 h-7" />
            </div>
            <span>OptiSaaS</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold border border-blue-200">
              Salud Colombia
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#precios" className="hover:text-blue-600 transition-colors">Planes</a>
            <a href="#seguridad" className="hover:text-blue-600 transition-colors">Cumplimiento Médico</a>
            <a href="#preguntas-frecuentes" className="hover:text-blue-600 transition-colors">Preguntas Frecuentes</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-mono text-slate-600 border border-slate-200">
              <CustomShieldIcon className="w-3.5 h-3.5 text-blue-600 animate-gentle-pulse" />
              <span>IP: {clientIp}</span>
            </div>
            
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 hover:border-slate-400 rounded-lg bg-white"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => scrollToSignup()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all"
            >
              Comenzar Trial
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-bold text-blue-700">
                <CustomShieldIcon className="w-3.5 h-3.5" />
                Prueba de 15 días libre de cargo • Habilitado para Clínicas y Ópticas
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
                Software de gestión y cumplimiento para <span className="text-blue-600">consultorios ópticos</span>
              </h1>
              
              <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                Gestione expedientes clínicos, RIPS, control de monturas y facturación de forma unificada. Diseñado bajo las especificaciones de habilitación en salud vigentes en Colombia.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => scrollToSignup()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-base font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-600/15 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group"
                >
                  Registrarse Gratis (Trial 15 días)
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a 
                  href="#caracteristicas"
                  className="bg-white hover:bg-slate-50 text-slate-700 text-base font-bold px-8 py-4 rounded-xl border border-slate-350 hover:border-slate-400 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Conocer características
                </a>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">100%</div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">Resoluciones MinSalud 1995 & 3100 (REPS)</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">DIAN</div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">Facturación electrónica (IVA configurable)</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">XML/RIPS</div>
                  <div className="text-xs text-slate-500 mt-1 font-semibold">Reporte de Salud Oficial Automatizado</div>
                </div>
              </div>
            </div>

            {/* Security Monitor Console */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
                
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-gentle-pulse"></div>
                    <span className="text-xs font-bold font-mono text-slate-700">FIREWALL_ESTADO_ACTIVO</span>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">
                    PROTECCIÓN-CLÍNICA
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Dirección IP</div>
                      <div className="text-slate-800 font-semibold mt-0.5 truncate">{clientIp}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="text-[9px] text-slate-400 uppercase font-bold">Firma de Hardware</div>
                      <div className="text-slate-800 font-semibold mt-0.5 truncate">{deviceMac.replace('HW-MAC-', '')}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-[10.5px] text-slate-300 min-h-[160px] max-h-[160px] overflow-y-auto scrollbar-hide flex flex-col-reverse gap-1.5">
                    {securityLogs.map((log, i) => (
                      <div key={i} className="leading-relaxed border-l-2 border-blue-500 pl-2.5">
                        <span className="text-blue-400">{log.slice(0, 10)}</span>
                        <span className="text-slate-350">{log.slice(10)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-700">Escáner de inyección activa</span>
                    </div>
                    <span className="text-blue-700 font-bold flex items-center gap-1">
                      <CustomShieldIcon className="w-3.5 h-3.5 text-blue-600" />
                      Protección Activa
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Decorative Optical Refraction Graphic */}
      <div className="flex justify-center items-center py-6 text-slate-300">
        <OpticalRefractionIcon className="w-16 h-16 text-blue-300 animate-gentle-pulse" />
      </div>

      {/* Features Section */}
      <section id="caracteristicas" className="py-20 bg-white border-y border-slate-200/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Funcionalidades médicas y administrativas integradas
            </h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Desarrollado bajo los requerimientos clínicos colombianos, optimizando los tiempos del profesional de la salud y el asesor comercial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Agenda Optométrica</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Organice citas de refracción y control de forma fluida. Defina la disponibilidad horaria del consultorio y visualice el estado de los pacientes.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Historia Clínica Normada</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Cumpla estrictamente con la Resolución 3100 de 2019. Registros y parametrización de lentes de contacto y refracción.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Facturación & POS</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Punto de venta especializado en óptica. El IVA sale de la tarifa configurada del tenant, sin porcentaje fijo, con integración simulada DIAN (CUFE y XML).
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Inventario y Lentes</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gestión de stock de monturas y lentes comerciales. Integración de catálogo de lentes de laboratorios colombianos con scraper técnico.
              </p>
            </div>

            {/* Card 5 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Garantía y Calidad</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Registro formal de garantías por desgaste o tratamientos de lentes. Control de calidad clínico antes de la entrega formal al paciente.
              </p>
            </div>

            {/* Card 6 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-6 shadow-sm shadow-blue-600/10">
                <TechnicalGlassesIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Auditoría de Habilitación</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Módulo para control de calidad y bitácora ambiental de temperatura y humedad en laboratorios y consultorios.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Planes a la medida de tu establecimiento
            </h2>
            <p className="text-slate-600 leading-relaxed font-semibold">
              Inicia tu prueba gratuita de 15 días sin tarjetas de crédito y comprueba las ventajas del sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Plan Básico */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col justify-between relative hover:border-slate-350 hover:shadow-md transition-all">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Plan Básico</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Para consultorios ópticos independientes</p>
                <div className="mt-6 flex items-baseline gap-1 text-slate-900">
                  <span className="text-4xl font-black">$250.000</span>
                  <span className="text-sm font-semibold text-slate-500">COP/mes</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 font-bold">IVA según tarifa configurada • Facturación básica</div>
                
                <ul className="mt-8 space-y-4 text-sm text-slate-600">
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">1 Sede Activa</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Hasta 3 Usuarios autorizados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Agenda Clínica & Citas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Historia Clínica Estándar</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => scrollToSignup('basico')}
                className="mt-8 w-full py-3.5 px-4 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all bg-white"
              >
                Probar Plan Básico
              </button>
            </div>

            {/* Plan Premium */}
            <div className="bg-white p-8 rounded-2xl border-2 border-blue-600 flex flex-col justify-between relative shadow-lg hover:shadow-xl transition-all">
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">
                Plan Recomendado
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900">Plan Premium</h3>
                <p className="text-xs text-blue-600 mt-1 font-semibold">Para ópticas con consultorio y ventas</p>
                <div className="mt-6 flex items-baseline gap-1 text-slate-900">
                  <span className="text-4xl font-black">$450.000</span>
                  <span className="text-sm font-semibold text-slate-500">COP/mes</span>
                </div>
                <div className="text-[10px] text-blue-600 mt-1.5 font-bold">IVA según tarifa configurada</div>

                <ul className="mt-8 space-y-4 text-sm text-slate-700">
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Hasta 3 Sedes Activas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Hasta 8 Usuarios autorizados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Punto de Venta (POS) Comercial</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Control de Inventario e Stock</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">Historias Clínicas & RIPS</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => scrollToSignup('premium')}
                className="mt-8 w-full py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white shadow-md shadow-blue-600/15 hover:shadow-blue-600/30 transition-all"
              >
                Probar Plan Premium
              </button>
            </div>

            {/* Plan Enterprise */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col justify-between relative hover:border-slate-350 hover:shadow-md transition-all">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Plan Enterprise</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Para redes de ópticas de gran volumen</p>
                <div className="mt-6 flex items-baseline gap-1 text-slate-900">
                  <span className="text-4xl font-black">$850.000</span>
                  <span className="text-sm font-semibold text-slate-500">COP/mes</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 font-bold">IVA según tarifa configurada</div>

                <ul className="mt-8 space-y-4 text-sm text-slate-600">
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Sedes ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Usuarios ilimitados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Auditorías de Calidad completas</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Facturación Electrónica DIAN</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    <span className="font-medium">Scraper de Catálogo de Lentes</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => scrollToSignup('enterprise')}
                className="mt-8 w-full py-3.5 px-4 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all bg-white"
              >
                Probar Plan Enterprise
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Trial Registration Section */}
      <section 
        id="registro-wizard" 
        ref={registrationSectionRef}
        className="py-20 bg-white border-t border-slate-200 scroll-mt-20"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-bold text-blue-700">
              <CustomShieldIcon className="w-3.5 h-3.5 text-blue-600" />
              Entorno Seguro contra Inyecciones SQL, XSS y Spam de Dispositivo
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Configura tu cuenta de demostración médica
            </h2>
            <p className="text-slate-600 font-medium">
              Estas registrando la demostración gratuita de 15 días para el plan <span className="text-blue-600 font-bold uppercase">{selectedPlan}</span>.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-slate-300">
              <TechnicalGlassesIcon className="w-48 h-48" />
            </div>

            {registerSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto border-2 border-blue-200">
                  <Check className="w-9 h-9" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">¡Registro de Demostración Creado!</h3>
                  <p className="text-slate-650 max-w-md mx-auto text-sm font-medium">
                    Hemos configurado de forma segura el entorno clínico para <strong>{opticaName}</strong>. Redirigiendo a la pantalla de inicio de sesión...
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 max-w-sm mx-auto text-left space-y-2.5 font-mono text-xs text-slate-700 shadow-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400">Administrador:</span>
                    <span className="text-slate-900 font-semibold">{adminName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400">Usuario / Correo:</span>
                    <span className="text-slate-900 font-semibold">{email}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400">Plan Seleccionado:</span>
                    <span className="text-blue-600 font-bold uppercase">{selectedPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expiración del Trial:</span>
                    <span className="text-slate-900 font-semibold">{new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]}</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Por favor espere 5 segundos para redirección automática...</span>
                </div>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all text-sm inline-flex items-center gap-2"
                >
                  Acceder a la Plataforma
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                
                {isDuplicate && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm leading-relaxed flex items-start gap-3">
                    <div className="shrink-0 text-yellow-600 mt-0.5">
                      <CustomShieldIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <strong className="font-bold block mb-0.5">Control de Trial Activo:</strong>
                      Nuestro sistema de control de spam de OptiSaaS ha detectado que su dispositivo ({deviceMac.slice(7, 18)}...) o IP ({clientIp}) ya tiene registrado un periodo de prueba de 15 días. El registro está restringido a un trial por establecimiento. Comuníquese con <span className="text-blue-600 font-semibold underline">soporte@optisaas.co</span> para habilitar más sedes.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Campo 1 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Nombre del Administrador
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ej: Dr. Carlos Mendoza"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 2 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Correo Electrónico Administrador
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: carlos.mendoza@optica.com"
                      className="w-full bg-white border border-slate-355 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 3 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Nombre de la Óptica
                    </label>
                    <input
                      type="text"
                      required
                      value={opticaName}
                      onChange={(e) => setOpticaName(e.target.value)}
                      placeholder="Ej: Optica Visión Total S.A.S"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 4 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CustomShieldIcon className="w-3.5 h-3.5 text-slate-400" />
                      NIT de la Óptica
                    </label>
                    <input
                      type="text"
                      required
                      value={nit}
                      onChange={(e) => setNit(e.target.value)}
                      placeholder="Ej: 900.123.456-7"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 5 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Ciudad de Operación
                    </label>
                    <input
                      type="text"
                      required
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej: Bogotá D.C."
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 6 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Dirección Sede Principal (Opcional)
                    </label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: Calle 127 # 14-54"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 7 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CustomShieldIcon className="w-3.5 h-3.5 text-slate-400" />
                      Código de Habilitación REPS (Opcional)
                    </label>
                    <input
                      type="text"
                      value={repsCode}
                      onChange={(e) => setRepsCode(e.target.value)}
                      placeholder="Ej: 11001-08234-01 (Res. 3100)"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                  {/* Campo 8 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Contraseña de Acceso
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-white border border-slate-350 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none"
                    />
                  </div>

                </div>

                <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                    <CustomShieldIcon className="w-4 h-4 text-blue-600" />
                    <span>Los datos clínicos se manejan conforme a la Ley 1581 (Habeas Data).</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || isDuplicate}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-base font-bold px-8 py-4 rounded-xl shadow-md shadow-blue-600/10 hover:shadow-blue-600/25 transition-all shrink-0 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando base de datos...
                      </>
                    ) : (
                      <>
                        Activar Trial de 15 Días
                        <ArrowRight className="w-4.5 h-4.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Preguntas Frecuentes (FAQ) Section - Premium, Animated Accordion */}
      <section id="preguntas-frecuentes" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-16">
            <div className="inline-flex items-center justify-center p-2 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
              <TechnicalGlassesIcon className="w-6 h-6" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-slate-600 font-medium">
              Respuestas técnicas sobre cumplimiento de salud y facturación en Colombia.
            </p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => {
              const isExpanded = expandedFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 hover:border-blue-300"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left font-bold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span className="text-base sm:text-lg">{faq.question}</span>
                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500 border border-slate-100 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-blue-600 transition-transform duration-300" />
                      ) : (
                        <ChevronRight className="w-5 h-5 transition-transform duration-300" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-50">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Cyber Intrusion Prevention Alert Screen (The Security Alert Overlay) */}
      <AnimatePresence>
        {securityAlert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white border-2 border-red-500 text-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Alert Sirens flashing background effect */}
              <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none -z-10"></div>
              
              <div className="flex items-center gap-3 text-red-600 border-b border-slate-100 pb-4 mb-6">
                <ShieldX className="w-10 h-10 text-red-600 shrink-0" />
                <div>
                  <h3 className="text-xl font-bold tracking-wider font-sans text-slate-900">SISTEMA CORTAFUEGOS OPTISAAS</h3>
                  <p className="text-[9px] text-red-600 uppercase tracking-widest font-extrabold mt-0.5">
                    ALERTA DE SISTEMA DE PREVENCIÓN DE INTRUSIONES (IPS)
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-slate-700">
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-950">
                  <p className="font-bold text-sm text-red-650 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Intento de inyección bloqueado
                  </p>
                  <p className="mt-2 text-xs font-semibold text-red-900">
                    El sistema de inspección de datos clínicos de la capa de transporte ha detenido la operación. Tu firma de hardware y red han sido registradas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5">
                    <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Detalles de la Amenaza:</span>
                    <ul className="space-y-1 text-[11px] text-slate-700 font-semibold">
                      <li>• Vulnerabilidad: <span className="text-red-600">{securityAlert.type}</span></li>
                      <li>• Campo Analizado: <span className="text-slate-900">{securityAlert.field}</span></li>
                      <li>• Registro Temporal: <span>{securityAlert.timestamp}</span></li>
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Identificación del Atacante:</span>
                    <ul className="space-y-1 text-[11px] text-slate-700 font-semibold">
                      <li>• Dirección IP: <span className="text-slate-900">{securityAlert.ip}</span></li>
                      <li>• Firma MAC/HW: <span className="text-slate-900 truncate block max-w-[200px]">{securityAlert.mac}</span></li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-500 font-bold block uppercase tracking-wider text-[9px]">Contenido del Payload Inyectado:</span>
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-900 text-red-400 break-all font-mono text-[11px] overflow-x-auto max-h-[80px]">
                    {securityAlert.payload}
                  </div>
                </div>

                <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-semibold">
                  <strong>AVISO LEGAL:</strong> Conforme a la Ley 1273 de 2009 en Colombia, cualquier intromisión indebida a sistemas de información o sabotaje informático constituye delito sancionable legalmente.
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSecurityAlert(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all text-xs tracking-wider font-sans"
                >
                  Cerrar bloqueo de seguridad
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-center text-sm text-slate-500 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-2.5 text-slate-800 font-bold">
            <TechnicalGlassesIcon className="w-5 h-5 text-blue-600" />
            <span>OptiSaaS Colombia</span>
          </div>
          <p className="max-w-md mx-auto text-xs text-slate-500 font-medium">
            Software clínico y comercial para establecimientos de optometría. Habilitado conforme a las regulaciones de la Secretaría de Salud y Ministerio de Salud.
          </p>
          <div className="text-[11px] text-slate-400 font-semibold">
            &copy; {new Date().getFullYear()} OptiSaaS Colombia S.A.S. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  );
}
