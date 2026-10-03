import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import PageTransition from '@/components/layout/page-transition';
import DashboardGuard from '@/components/layout/dashboard-guard';
import { auth } from '@/lib/auth';
import { decidirAccesoPanel, rutaInicio } from '@/lib/authz/panel';
import { actorDesdeSesion } from '@/lib/authz/sesion';

import { BannerCertificado } from '@/components/sedes/banner-certificado';
import { ToastContainer } from '@/components/ui/toast';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sesion = await auth();
  const ruta = (await headers()).get('x-optisaas-ruta') ?? '';
  if (sesion?.user?.role && ruta.startsWith('/dashboard')) {
    const actor = actorDesdeSesion({
      id: sesion.user.id,
      role: sesion.user.role,
      empresaId: sesion.user.empresaId,
      sedeId: sesion.user.sedeId,
      sedesAccess: sesion.user.sedesAccess,
    });
    if (!decidirAccesoPanel(actor, ruta).permitido) {
      const inicio = rutaInicio(actor.rol);
      const puedeVolver = decidirAccesoPanel(actor, inicio).permitido;
      return (
        <main id="main-content" className="min-h-screen bg-background text-foreground p-8">
          <h1 className="text-2xl font-bold mb-3">No tiene permiso para ver esta sección</h1>
          <p className="text-muted-foreground mb-6">
            Su rol no autoriza el contenido de esta ruta. El acceso a los datos lo decide el servidor.
          </p>
          {puedeVolver ? (
            <Link href={inicio} className="text-primary font-semibold">
              Volver al inicio
            </Link>
          ) : null}
        </main>
      );
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] grid-rows-[56px_1fr_32px] h-screen w-full bg-background overflow-hidden transition-colors duration-300">
      <Sidebar className="hidden md:flex flex-col row-span-3 border-r border-border bg-sidebar-bg text-sidebar-foreground" />
      <Header className="col-start-1 md:col-start-2 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10" />
      <main id="main-content" className="col-start-1 md:col-start-2 overflow-y-auto p-4 md:p-6 bg-background scrollbar-hide">
        <PageTransition>
          <DashboardGuard>
            <BannerCertificado />
            {children}
          </DashboardGuard>
        </PageTransition>
      </main>
      <Footer className="col-start-1 md:col-start-2 border-t border-border bg-card text-muted-foreground" />
      <ToastContainer />
    </div>
  );
}

