// =====================================================================
// Ainova Cloud Intelligence - CSRF Token Endpoint
// =====================================================================
// Route:    GET /api/csrf
// Response: { ok: true, token: string }
// Cookie:   csrf-token (httpOnly: false — JS must read it)
// =====================================================================

import { NextResponse } from 'next/server';
import { generateCsrfToken, getCsrfCookieOptions, CSRF_COOKIE_NAME } from '@/lib/csrf';

// -----------------------------------------------------------------------
// GET /api/csrf
// -----------------------------------------------------------------------

export async function GET() {
  const token = generateCsrfToken();

  const response = NextResponse.json({
    ok:    true,
    token,
  });

  // Set cookie so the browser stores it; also return in body so the
  // client can use it immediately without reading document.cookie.
  response.cookies.set(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());

  return response;
}
