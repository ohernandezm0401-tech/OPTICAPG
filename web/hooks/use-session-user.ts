'use client';

import { useSession } from 'next-auth/react';
import { useClinicStore } from '@/lib/store';
import { Role } from '@/lib/types';

export function useSessionUser() {
  const { data: session, status, update } = useSession();
  const empresas = useClinicStore((state) => state.empresas);
  const sedes = useClinicStore((state) => state.sedes);
  const usuarios = useClinicStore((state) => state.usuarios);

  const email = session?.user?.email || '';
  const empresaId = session?.user?.empresaId || '';
  const sedeId = session?.user?.sedeId || '';
  const usuario = usuarios.find((item) => item.email.toLowerCase() === email.toLowerCase());
  const empresa = empresas.find((item) => item.id === empresaId);
  const accessibleSedes = usuario
    ? sedes.filter((sede) => usuario.sedesAccess.includes(sede.id))
    : sedes.filter((sede) => sede.empresaId === empresaId);
  const sede = sedes.find((item) => item.id === sedeId) || accessibleSedes[0];

  return {
    status,
    session,
    role: session?.user?.role as Role | undefined,
    nombre: session?.user?.name || '',
    email,
    empresaId,
    sedeId: sede?.id || sedeId,
    empresa,
    sede,
    sedes: accessibleSedes,
    registroMedico: usuario?.registroMedico,
    updateSede: (nextSedeId: string) => update({ sedeId: nextSedeId }),
  };
}
