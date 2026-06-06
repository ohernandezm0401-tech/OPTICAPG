import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardIndexPage() {
  const session = await auth();

  if (!session?.user?.role) {
    redirect('/login');
  }

  redirect(`/dashboard/${session.user.role}`);
}
