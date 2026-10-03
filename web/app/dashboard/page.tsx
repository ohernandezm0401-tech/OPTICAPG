import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardIndexPage() {
  const session = await auth();

  if (!session?.user?.role) {
    redirect('/login');
  }

  const rol = session.user.role;
  if (rol === 'owner' || rol === 'owner_plataforma' || rol === 'soporte' || rol === 'soporte_plataforma') {
    redirect('/dashboard/owner');
  }
  redirect(`/dashboard/${rol}`);
}
