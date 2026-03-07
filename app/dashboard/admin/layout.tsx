import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  if (!sessionId) redirect('/login');

  const session = await getAuth().validateSession(sessionId);
  if (!session) redirect('/login');

  // Only admin role can access admin panel
  if (session.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
