// =====================================================================
// Ainova Cloud Intelligence - Login API Route
// =====================================================================
// Route:    POST /api/auth/login
// Body:     { username: string, password: string }
// Response: { ok: true, role, firstLogin } | { error: string }
// Cookies:  sessionId (httpOnly), csrf-token (JS-readable)
// Security: Zod validation, IP extraction, rate limit passthrough
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { generateCsrfToken, getCsrfCookieOptions, CSRF_COOKIE_NAME } from '@/lib/csrf';

// -----------------------------------------------------------------------
// Validation schema
// -----------------------------------------------------------------------

const LoginSchema = z.object({
  username: z
    .string()
    .min(1, 'A felhasználónév nem lehet üres')
    .max(100, 'A felhasználónév túl hosszú')
    .transform((v) => v.trim()),
  password: z
    .string()
    .min(1, 'A jelszó nem lehet üres')
    .max(500, 'A jelszó túl hosszú'),
});

// -----------------------------------------------------------------------
// POST /api/auth/login
// -----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Érvénytelen JSON formátum' },
      { status: 400 }
    );
  }

  // 2. Validate with Zod
  const parsed = LoginSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Érvénytelen bemenet';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { username, password } = parsed.data;

  // 3. Extract client IP (proxy-aware)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip =
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // 4. Attempt login via auth adapter
  let result;
  try {
    result = await getAuth().login(username, password, ip);
  } catch (err) {
    console.error('[API] /auth/login unexpected error:', err);
    return NextResponse.json(
      { error: 'Váratlan hiba történt. Próbáld újra.' },
      { status: 500 }
    );
  }

  // 5. Handle failure
  if (!result.success) {
    const statusMap: Record<string, number> = {
      invalid_credentials: 401,
      account_disabled:    403,
      rate_limited:        429,
      server_error:        500,
    };
    const status = statusMap[result.error ?? ''] ?? 401;
    return NextResponse.json({ error: result.error ?? 'invalid_credentials' }, { status });
  }

  // 6. Build success response
  const response = NextResponse.json({
    ok: true,
    role:       result.role,
    firstLogin: result.firstLogin ?? false,
  });

  // 7. Set session cookie (httpOnly — XSS-safe)
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set('sessionId', result.sessionId!, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: 'lax',
    maxAge:   86400, // 24 hours
    path:     '/',
  });

  // 8. Set CSRF token cookie (httpOnly: false — JS must read it)
  const csrfToken = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

  console.log(`[API] Login successful: user=${username}, session=${result.sessionId}, ip=${ip}`);

  return response;
}
