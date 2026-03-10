import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

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

  // Permission-based admin panel access
  const canAccessAdmin = await hasPermission(session.role, 'admin.access');
  if (!canAccessAdmin) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
