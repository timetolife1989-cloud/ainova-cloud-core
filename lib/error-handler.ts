/**
 * Ainova Cloud Intelligence - Error Message Sanitization
 * Prevents information disclosure through error messages.
 */

/**
 * Sanitize an error message for the current environment.
 * In development: returns the full error message for debugging.
 * In production: returns a generic, safe message to avoid leaking internals.
 */
export function sanitizeErrorMessage(
  error: unknown,
  isDevelopment: boolean = process.env.NODE_ENV !== 'production'
): string {
  if (isDevelopment) {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  // Production: generic messages only — never reveal schema/table/path details
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Database errors — don't reveal schema or table names
    if (message.includes('table') || message.includes('column') || message.includes('constraint')) {
      return 'Adatbázis hiba történt';
    }

    // SQL errors — don't reveal query details
    if (message.includes('sql') || message.includes('query')) {
      return 'Adatbázis hiba történt';
    }

    // Network errors — don't reveal server details
    if (
      message.includes('enotfound') ||
      message.includes('econnrefused') ||
      message.includes('etimedout')
    ) {
      return 'Hálózati hiba történt';
    }

    // File system errors — don't reveal paths
    if (
      message.includes('enoent') ||
      message.includes('eacces') ||
      message.includes('eperm')
    ) {
      return 'Fájl hozzáférési hiba történt';
    }

    // Authentication errors — don't reveal whether the user exists
    if (message.includes('user not found') || message.includes('invalid credentials')) {
      return 'Hibás felhasználónév vagy jelszó';
    }
  }

  return 'Váratlan hiba történt';
}

/**
 * Build a safe error response object for API routes.
 * Includes a `_debug` field in development for easier troubleshooting.
 */
export function createSafeErrorResponse(error: unknown, customMessage?: string) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return {
    success: false,
    error: customMessage ?? sanitizeErrorMessage(error, isDevelopment),
    ...(isDevelopment && error instanceof Error && { _debug: error.message }),
  };
}
