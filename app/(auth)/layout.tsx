import { getLocale, getTranslationsForLocale } from '@/lib/i18n';
import { I18nProvider } from '@/components/core/I18nProvider';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = 'hu';
  let translations: Record<string, string> = {};

  try {
    locale = await getLocale();
    translations = await getTranslationsForLocale(locale);
  } catch {
    // Fallback: import hu.json directly if DB is unreachable
    const fallback = await import('@/lib/i18n/fallback/hu.json');
    translations = fallback.default;
  }

  return (
    <I18nProvider locale={locale} translations={translations}>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        {children}
      </div>
    </I18nProvider>
  );
}
