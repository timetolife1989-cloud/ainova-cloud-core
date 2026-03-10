'use client';

import { useCallback, useState, useEffect } from 'react';
import { _i18nLocale, _i18nTranslations } from '@/components/core/I18nProvider';

export function useTranslation() {
  // Read from module-level store (set by I18nProvider during render)
  // Force a re-render after mount to ensure latest data is picked up
  const [, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const locale = _i18nLocale;
  const translations = _i18nTranslations;

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = _i18nTranslations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }, []);

  return { t, locale, loading: false };
}
