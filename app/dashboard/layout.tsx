import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getLocale, getTranslationsForLocale } from '@/lib/i18n';
import { Header } from '@/components/core/Header';
import { CommandPalette } from '@/components/core/CommandPalette';
import { I18nProvider } from '@/components/core/I18nProvider';

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

  const locale = await getLocale();
  const translations = await getTranslationsForLocale(locale);

  return (
    <I18nProvider locale={locale} translations={translations}>
      <div className="min-h-screen bg-gray-950">
        <Header
          appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova'}
          username={session.fullName || session.username}
          role={session.role}
          locale={locale}
        />
        <main className="pt-16">
          {children}
        </main>
        <CommandPalette />
      </div>
    </I18nProvider>
  );
}
