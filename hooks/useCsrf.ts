'use client';

/**
 * Ainova Cloud Core - CSRF Hook
 *
 * Implements the double-submit cookie pattern:
 *   1. The server sets a `csrf-token` cookie (httpOnly: false) via /api/csrf.
 *   2. This hook reads that cookie value from document.cookie.
 *   3. fetchWithCsrf() copies the token into the `x-csrf-token` request header.
 *   4. The server middleware validates that the cookie and header values match.
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the csrf-token value from document.cookie (client-side only). */
function getCsrfFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCsrfReturn {
  /** The current CSRF token, or null while loading. */
  csrfToken: string | null;
  /**
   * Drop-in replacement for `fetch` that automatically adds the
   * `x-csrf-token` header to every request.
   */
  fetchWithCsrf: (url: string, options?: RequestInit) => Promise<Response>;
}

/**
 * useCsrf — provides a CSRF-aware fetch wrapper.
 *
 * On mount the hook reads the csrf-token cookie.  If the cookie is not yet
 * present it calls GET /api/csrf to trigger the server to set it, then reads
 * the cookie again.
 */
export function useCsrf(): UseCsrfReturn {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const token = getCsrfFromCookie();
    if (token) {
      setCsrfToken(token);
    } else {
      // Ask the server to set the cookie, then read it
      fetch('/api/csrf').then(() => {
        setCsrfToken(getCsrfFromCookie());
      }).catch((err) => {
        console.error('[useCsrf] Failed to fetch CSRF token:', err);
      });
    }
  }, []);

  const fetchWithCsrf = useCallback(
    (url: string, options: RequestInit = {}): Promise<Response> => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-csrf-token': csrfToken ?? '',
        },
      });
    },
    [csrfToken]
  );

  return { csrfToken, fetchWithCsrf };
}
