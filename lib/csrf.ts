/**
 * Ainova Cloud Intelligence - CSRF Protection
 * Cross-Site Request Forgery protection via the double-submit cookie pattern.
 */

/**
 * Generate a CSRF token.
 * Uses the Web Crypto API for Next.js Edge Runtime compatibility.
 * @returns 32-character hex string
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate a CSRF token pair (double-submit pattern).
 * @param cookieToken - Token from the csrf-token cookie
 * @param headerToken - Token from the X-CSRF-Token request header
 * @returns true if both tokens are present and equal
 */
export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }

  return mismatch === 0;
}

/** Cookie name for the CSRF token */
export const CSRF_COOKIE_NAME = 'csrf-token';

/** Request header name for the CSRF token */
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Returns cookie options for the CSRF token cookie.
 *
 * IMPORTANT: httpOnly MUST be false here.
 * The double-submit CSRF pattern requires the browser's JavaScript to read
 * the csrf-token cookie value and copy it into the X-CSRF-Token request
 * header on every mutating request. If httpOnly were true, JS could not
 * access the cookie and the pattern would break entirely.
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: false, // Must be false — JS needs to read this cookie (see comment above)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };
}
