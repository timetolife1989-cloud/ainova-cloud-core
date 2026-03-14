import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { getLocale, getTranslationsForLocale } from '@/lib/i18n';
import { HudFrame } from '@/components/core/HudFrame';
import { LazyCommandPalette } from '@/components/core/LazyCommandPalette';
import { I18nProvider } from '@/components/core/I18nProvider';
import { LazyInactivityGuard } from '@/components/core/LazyInactivityGuard';
import { LazyNeuronBackground } from '@/components/ui/LazyNeuronBackground';



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

  // Parallel: locale + translations resolved together
  const locale = await getLocale();
  const translations = await getTranslationsForLocale(locale);

  return (
    <I18nProvider locale={locale} translations={translations}>
      <div className="min-h-screen relative">
        <LazyNeuronBackground nodeCount={60} connectionDistance={200} overlayOpacity={0.6} />
        <HudFrame
          appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova Cloud Intelligence'}
          username={session.fullName || session.username}
          role={session.role}
          locale={locale}
        >
          {children}
        </HudFrame>
        <LazyCommandPalette />
        <LazyInactivityGuard />
      </div>
    </I18nProvider>
  );
}
