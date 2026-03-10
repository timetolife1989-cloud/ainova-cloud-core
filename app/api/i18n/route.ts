import { getLocale, getTranslationsForLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function GET() {
  const locale = await getLocale();
  const translations = await getTranslationsForLocale(locale);

  return new Response(JSON.stringify({ locale, translations }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
