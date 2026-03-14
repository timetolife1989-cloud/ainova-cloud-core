'use client';

import { useCallback, useState, useEffect } from 'react';
import { _i18nLocale, _i18nTranslations } from '@/components/core/I18nProvider';

type Translations = Record<string, string>;

export function useTranslation() {
  // Check if I18nProvider has set translations (dashboard pages)
  const hasProvider = Object.keys(_i18nTranslations).length > 0;

  const [fetchedTranslations, setFetchedTranslations] = useState<Translations>({});
  const [fetchedLocale, setFetchedLocale] = useState<string>('hu');
  const [loading, setLoading] = useState(!hasProvider);

  // Fallback: fetch from API when outside I18nProvider (login, setup, etc.)
  useEffect(() => {
    if (hasProvider) return;
    fetch(`/api/i18n?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`i18n fetch failed: ${res.status}`);
        return res.json();
      })
      .then((data: { translations: Translations; locale: string }) => {
        setFetchedTranslations(data.translations);
        setFetchedLocale(data.locale);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useTranslation] Failed to load translations:', err);
        setFetchedTranslations({});
        setLoading(false);
      });
  }, [hasProvider]);

  const locale = hasProvider ? _i18nLocale : fetchedLocale;
  const translations = hasProvider ? _i18nTranslations : fetchedTranslations;

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }, [translations]);

  return { t, locale, loading };
}
