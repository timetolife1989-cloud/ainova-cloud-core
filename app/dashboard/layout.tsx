import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { Header } from '@/components/core/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;

  if (!sessionId) {
    redirect('/login');
  }

  const session = await getAuth().validateSession(sessionId);
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova'}
        username={session.fullName || session.username}
        role={session.role}
      />
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
