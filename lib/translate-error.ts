'use client';

/**
 * Translates API error messages to user-friendly text.
 * If the error is an i18n key (e.g., "error.no_permission"), it gets translated.
 * If it's already a plain text message, returns as-is.
 */
export function translateApiError(
  error: string,
  t: (key: string) => string
): string {
  // Check if it looks like an i18n key (dot-separated, no spaces, lowercase)
  if (/^[a-z][a-z0-9_.]+$/.test(error)) {
    const translated = t(error);
    // If translation returns the key itself, it wasn't found — return generic error
    if (translated === error) {
      return t('common.error') || 'Hiba történt';
    }
    return translated;
  }
  // Raw error message — return as-is (but this shouldn't happen in production)
  return error;
}

/**
 * Wraps a raw error (from catch block) into a translated user-friendly message.
 * Usage in catch blocks:
 *   catch (e) { setError(getErrorMessage(e, t)); }
 */
export function getErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey = 'common.error'
): string {
  const raw = error instanceof Error ? error.message : t(fallbackKey);
  return translateApiError(raw, t);
}
