import React from 'react';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import PageTransition from '@/components/layout/page-transition';
import DashboardGuard from '@/components/layout/dashboard-guard';

import { ToastContainer } from '@/components/ui/toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] grid-rows-[56px_1fr_32px] h-screen w-full bg-background overflow-hidden transition-colors duration-300">
      <Sidebar className="hidden md:flex flex-col row-span-3 border-r border-border bg-sidebar-bg text-sidebar-foreground" />
      <Header className="col-start-1 md:col-start-2 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10" />
      <main id="main-content" className="col-start-1 md:col-start-2 overflow-y-auto p-4 md:p-6 bg-background scrollbar-hide">
        <PageTransition>
          <DashboardGuard>
            {children}
          </DashboardGuard>
        </PageTransition>
      </main>
      <Footer className="col-start-1 md:col-start-2 border-t border-border bg-card text-muted-foreground" />
      <ToastContainer />
    </div>
  );
}

