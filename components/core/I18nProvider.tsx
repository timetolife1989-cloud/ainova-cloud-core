'use client';

import React from 'react';

// Module-level store — set by I18nProvider during render, read by useTranslation
// Works regardless of React Context module duplication issues
export let _i18nLocale = 'hu';
export let _i18nTranslations: Record<string, string> = {};

export function I18nProvider({
  locale,
  translations,
  children,
}: {
  locale: string;
  translations: Record<string, string>;
  children: React.ReactNode;
}) {
  // Set module-level store DURING RENDER (before children render)
  _i18nLocale = locale;
  _i18nTranslations = translations;
  return <>{children}</>;
}
