import { getDb } from '@/lib/db';
import { getSetting } from '@/lib/settings';

import huFallback from './fallback/hu.json';
import enFallback from './fallback/en.json';
import deFallback from './fallback/de.json';

type TranslationMap = Record<string, string>;

const FALLBACK_MAP: Record<string, TranslationMap> = {
  hu: huFallback,
  en: enFallback,
  de: deFallback,
};

const SUPPORTED_LOCALES = ['hu', 'en', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

interface TranslationRow {
  translation_key: string;
  translation_value: string;
}

// Cache: locale → translations
const _cache = new Map<string, TranslationMap>();
let _cacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

/**
 * Get the current locale from settings.
 */
export async function getLocale(): Promise<SupportedLocale> {
  try {
    const locale = await getSetting('app_locale');
    if (locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
      return locale as SupportedLocale;
    }
  } catch {
    // fallback
  }
  return (process.env.DEFAULT_LOCALE as SupportedLocale) ?? 'en';
}

/**
 * Get translations for a given locale (DB + fallback merge).
 */
export async function getTranslationsForLocale(locale: string): Promise<TranslationMap> {
  const now = Date.now();
  
  // Cache check
  if ((now - _cacheAt) < CACHE_TTL && _cache.has(locale)) {
    return _cache.get(locale)!;
  }

  // Fallback alap
  const fallback = FALLBACK_MAP[locale] ?? FALLBACK_MAP.hu;
  const result: TranslationMap = { ...fallback };

  // DB override
  try {
    const rows = await getDb().query<TranslationRow>(
      'SELECT translation_key, translation_value FROM core_translations WHERE locale = @p0',
      [{ name: 'p0', type: 'nvarchar', value: locale }]
    );

    for (const row of rows) {
      result[row.translation_key] = row.translation_value;
    }
  } catch (err) {
    console.error('[i18n] Failed to load translations from DB:', err);
  }

  _cache.set(locale, result);
  _cacheAt = now;

  return result;
}

/**
 * Get translation by key.
 * Parameter interpolation: {name} → value
 */
export async function t(key: string, params?: Record<string, string | number>): Promise<string> {
  const locale = await getLocale();
  const translations = await getTranslationsForLocale(locale);

  let value = translations[key];

  // If missing in current locale, try Hungarian fallback
  if (!value && locale !== 'hu') {
    const huTranslations = await getTranslationsForLocale('hu');
    value = huTranslations[key];
  }

  // Ha sehol sincs, visszaadjuk a kulcsot
  if (!value) {
    return key;
  }

  // Parameter interpolation
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return value;
}

/**
 * Clear cache (call after locale change).
 */
export function clearTranslationCache(): void {
  _cache.clear();
  _cacheAt = 0;
}

/**
 * List of supported locales.
 */
export function getSupportedLocales(): readonly SupportedLocale[] {
  return SUPPORTED_LOCALES;
}
