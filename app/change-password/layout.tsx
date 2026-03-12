import { getLocale, getTranslationsForLocale } from '@/lib/i18n';
import { I18nProvider } from '@/components/core/I18nProvider';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const translations = await getTranslationsForLocale(locale);

  return (
    <I18nProvider locale={locale} translations={translations}>
      {children}
    </I18nProvider>
  );
}
