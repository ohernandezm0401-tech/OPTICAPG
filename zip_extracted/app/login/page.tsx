'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Stethoscope, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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

      if (res?.error) {
        setError('Credenciales inválidas. Intente nuevamente.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Ocurrió un error inesperado.');
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
            <p className="text-muted-foreground mb-8">Ingresa tus credenciales para acceder al sistema.</p>

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

            <div className="mt-10 pt-6 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                ¿Problemas para ingresar? Contacte al administrador de su sede o envíe un ticket a <span className="text-primary font-medium">soporte@optisaas.co</span>
              </p>
            </div>
            
            {/* Dev mode hints */}
            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-500 mb-2 uppercase">Credenciales de Prueba (Dev)</p>
              <ul className="text-[11px] text-amber-700 dark:text-amber-600 space-y-1">
                <li><span className="font-mono bg-white dark:bg-black/20 px-1 py-0.5 rounded">owner@optisaas.co</span> (Owner — Plataforma)</li>
                <li><span className="font-mono bg-white dark:bg-black/20 px-1 py-0.5 rounded">admin@visiontotal.com</span> (Admin — Empresa)</li>
                <li><span className="font-mono bg-white dark:bg-black/20 px-1 py-0.5 rounded">carlos@visiontotal.com</span> (Asesor)</li>
                <li><span className="font-mono bg-white dark:bg-black/20 px-1 py-0.5 rounded">dra.vega@visiontotal.com</span> (Optómetra)</li>
                <li>Pwd: cualquier texto</li>
              </ul>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
