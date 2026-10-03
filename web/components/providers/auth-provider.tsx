'use client';

import { SessionProvider } from 'next-auth/react';
import React, { useEffect } from 'react';
import { useClinicStore } from '@/lib/store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useClinicStore.getState().initializeStoreFromSupabase();
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

