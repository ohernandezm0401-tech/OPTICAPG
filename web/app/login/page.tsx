'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Stethoscope, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MENSAJE_CREDENCIALES_INVALIDAS, MENSAJE_MFA_INVALIDO } from '@/lib/auth/puerto';

type PasoMfa = 'enrolar' | 'verificar';

type AltaTotpCliente = {
  secreto: string;
  svg: string;
  codigos: string[];
};

function leerPendiente(code: string | null | undefined): { paso: PasoMfa; ticket: string; passkey: boolean } | null {
  if (!code) return null;
  const partes = code.split(':');
  if (partes.length < 3) return null;
  const paso = partes[0];
  const marca = partes[partes.length - 1];
  const ticket = partes.slice(1, -1).join(':');
  if ((paso !== 'enrolar' && paso !== 'verificar') || !ticket) return null;
  return { paso, ticket, passkey: marca === '1' };
}

function qrConfiable(svg: string): string {
  if (!svg.startsWith('<svg ') || svg.includes('<script') || svg.toLowerCase().includes('javascript:')) return '';
  return svg;
}

async function entrarConPase(pase: string, correo: string) {
  return signIn('credentials', { redirect: false, email: correo, pase });
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState<{ paso: PasoMfa; ticket: string; passkey: boolean } | null>(null);
  const [alta, setAlta] = useState<AltaTotpCliente | null>(null);
  const [codigo, setCodigo] = useState('');
  const router = useRouter();

  const entrar = () => {
    router.push('/dashboard');
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      const siguiente = leerPendiente(res?.code);
      if (siguiente) {
        setPendiente(siguiente);
        if (siguiente.paso === 'enrolar') {
          const respuesta = await fetch('/api/auth/mfa/totp', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ accion: 'preparar', ticket: siguiente.ticket }),
          });
          const cuerpo = (await respuesta.json()) as { secreto?: string; svg?: string; codigos?: string[] };
          if (!respuesta.ok || !cuerpo.secreto || !cuerpo.svg) {
            setError(MENSAJE_MFA_INVALIDO);
            setPendiente(null);
          } else {
            setAlta({ secreto: cuerpo.secreto, svg: cuerpo.svg, codigos: cuerpo.codigos ?? [] });
          }
        }
        return;
      }

      if (res?.error) {
        setError(MENSAJE_CREDENCIALES_INVALIDAS);
      } else {
        entrar();
      }
    } catch {
      setError('Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendiente) return;
    setIsLoading(true);
    setError('');
    try {
      const respuesta = await fetch('/api/auth/mfa/totp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar', ticket: pendiente.ticket, codigo }),
      });
      const cuerpo = (await respuesta.json()) as { pase?: string };
      if (!respuesta.ok || !cuerpo.pase) {
        setError(MENSAJE_MFA_INVALIDO);
        return;
      }
      const sesion = await entrarConPase(cuerpo.pase, email);
      if (sesion?.error) setError(MENSAJE_MFA_INVALIDO);
      else entrar();
    } catch {
      setError(MENSAJE_MFA_INVALIDO);
    } finally {
      setIsLoading(false);
    }
  };

  const usarLlave = async () => {
    if (!pendiente) return;
    setIsLoading(true);
    setError('');
    try {
      const publico = globalThis.PublicKeyCredential as
        | {
            parseCreationOptionsFromJSON?: (opciones: unknown) => PublicKeyCredentialCreationOptions;
            parseRequestOptionsFromJSON?: (opciones: unknown) => PublicKeyCredentialRequestOptions;
          }
        | undefined;
      const modo = pendiente.paso === 'enrolar' ? 'registro' : 'autenticacion';
      const opcionesRes = await fetch('/api/auth/mfa/passkey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'opciones', modo, ticket: pendiente.ticket }),
      });
      const opcionesCuerpo = (await opcionesRes.json()) as { opciones?: unknown };
      const parsear =
        modo === 'registro' ? publico?.parseCreationOptionsFromJSON : publico?.parseRequestOptionsFromJSON;
      if (!opcionesRes.ok || !opcionesCuerpo.opciones || !parsear || !navigator.credentials) {
        setError(MENSAJE_MFA_INVALIDO);
        return;
      }
      const opciones = parsear(opcionesCuerpo.opciones);
      const credencial =
        modo === 'registro'
          ? await navigator.credentials.create({ publicKey: opciones as PublicKeyCredentialCreationOptions })
          : await navigator.credentials.get({ publicKey: opciones as PublicKeyCredentialRequestOptions });
      const json =
        credencial && 'toJSON' in credencial && typeof credencial.toJSON === 'function' ? credencial.toJSON() : null;
      if (!json) {
        setError(MENSAJE_MFA_INVALIDO);
        return;
      }
      const confirmacion = await fetch('/api/auth/mfa/passkey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar', modo, ticket: pendiente.ticket, respuesta: json }),
      });
      const cuerpo = (await confirmacion.json()) as { pase?: string };
      if (!confirmacion.ok || !cuerpo.pase) {
        setError(MENSAJE_MFA_INVALIDO);
        return;
      }
      const sesion = await entrarConPase(cuerpo.pase, email);
      if (sesion?.error) setError(MENSAJE_MFA_INVALIDO);
      else entrar();
    } catch {
      setError(MENSAJE_MFA_INVALIDO);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans">
      {/* Left Column: Branding & Decor */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-700 opacity-90 z-0"></div>
        <div className="absolute top-0 left-0 right-0 h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent z-0"></div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 text-2xl font-black tracking-tight"
          >
            <Eye className="w-8 h-8 text-cyan-300" />
            OptiSaaS <span className="font-medium text-blue-200 text-sm mt-1">v3.0</span>
          </motion.div>
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold leading-tight mb-6"
          >
            Gestión inteligente para ópticas modernas.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-blue-100 text-lg mb-8"
          >
            Plataforma multi-sede que integra agenda, historia clínica electrónica, facturación e inventario con cumplimiento normativo completo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex gap-4 text-blue-200 text-sm font-medium"
          >
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"><Stethoscope className="w-4 h-4"/> Res. 1995/3100</span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"><Eye className="w-4 h-4"/> RIPS Automáticos</span>
          </motion.div>
        </div>
        
        <div className="relative z-10 text-blue-300 text-sm font-medium">
          &copy; {new Date().getFullYear()} OptiSaaS Colombia. Todos los derechos reservados.
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-2xl font-black tracking-tight text-primary mb-12">
            <Eye className="w-8 h-8" />
            OptiSaaS
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold mb-2">Bienvenido de nuevo</h2>
            <p className="text-muted-foreground mb-8">
              {pendiente
                ? 'Confirma el segundo factor para entrar.'
                : 'Ingresa tus credenciales para acceder al sistema.'}
            </p>

            {pendiente ? (
            <form onSubmit={confirmarCodigo} className="space-y-5">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md border border-destructive/20 flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {pendiente.paso === 'enrolar' && alta && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Escanea el código con tu aplicación de autenticación o escribe el secreto.
                  </p>
                  {qrConfiable(alta.svg) ? (
                    <div
                      className="mx-auto w-48 bg-white p-2 rounded-md"
                      data-testid="qr-totp"
                      dangerouslySetInnerHTML={{ __html: qrConfiable(alta.svg) }}
                    />
                  ) : null}
                  <p className="text-xs text-muted-foreground">Secreto (ingreso manual)</p>
                  <code data-testid="secreto-totp" className="block break-all text-sm font-mono bg-slate-100 dark:bg-slate-900 p-2 rounded-md">
                    {alta.secreto}
                  </code>
                  {alta.codigos.length > 0 && (
                    <div data-testid="codigos-recuperacion">
                      <p className="text-sm font-medium mb-1">Códigos de recuperación. Guárdalos: se muestran una sola vez.</p>
                      <ul className="text-sm font-mono space-y-1">
                        {alta.codigos.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {pendiente.paso === 'verificar' && (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Escribe el código de tu aplicación de autenticación o un código de recuperación.
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="codigo-mfa">
                  Código de verificación
                </label>
                <input
                  id="codigo-mfa"
                  inputMode="text"
                  autoComplete="one-time-code"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
              </button>
              {(pendiente.paso === 'enrolar' || pendiente.passkey) && (
                <button
                  type="button"
                  onClick={usarLlave}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-md border border-input text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-70"
                >
                  {pendiente.paso === 'enrolar' ? 'Registrar llave de acceso' : 'Entrar con llave de acceso'}
                </button>
              )}
            </form>
            ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md border border-destructive/20 flex items-start gap-2"
                >
                  <Lock className="w-4 h-4 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                    placeholder="usuario@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                    Contraseña
                  </label>
                  <a href="#" className="text-sm font-semibold text-primary hover:text-blue-700 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Ingresar al Sistema
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            )}

            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                ¿Problemas para ingresar? Contacte al administrador de su sede o envíe un ticket a <span className="text-primary font-medium">soporte@optisaas.co</span>
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-500 mb-1 uppercase">Solo desarrollo — no usar en producción</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-600 mb-2">Cuentas sintéticas locales. Genérelas con <span className="font-mono bg-white dark:bg-black/20 px-1 py-0.5 rounded">npm run seed:dev</span> y úselas solo con APP_MODE=demo. Nunca existen en producción.</p>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
}
