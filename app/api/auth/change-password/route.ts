// =====================================================================
// Ainova Cloud Intelligence - Change Password API Route
// =====================================================================
// Route:    POST /api/auth/change-password
// Body:     { currentPassword: string, newPassword: string (min 8) }
// Response: { ok: true } | error
// Security: Session required, CSRF check, bcrypt verify + hash
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getAuth } from '@/lib/auth';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { BCRYPT_ROUNDS } from '@/lib/constants';

// -----------------------------------------------------------------------
// Validation schema
// -----------------------------------------------------------------------

const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'auth.cp_err_current_required')
    .max(500, 'auth.error.password_too_long'),
  newPassword: z
    .string()
    .min(8, 'auth.cp_err_min_length')
    .max(500, 'auth.error.password_too_long'),
});

// -----------------------------------------------------------------------
// POST /api/auth/change-password
// -----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. CSRF validation
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  // 2. Session validation
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  const { userId } = session;

  // 3. Parse and validate body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'auth.error.invalid_json' },
      { status: 400 }
    );
  }

  const parsed = ChangePasswordSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'auth.error.invalid_input';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  // 4. Fetch current password hash from DB
  let currentHash: string | null;
  try {
    currentHash = await getAuth().getPasswordHash(userId);
  } catch (err) {
    console.error('[API] /auth/change-password getPasswordHash error:', err);
    return NextResponse.json(
      { error: 'auth.error.server_error' },
      { status: 500 }
    );
  }

  if (!currentHash) {
    return NextResponse.json(
      { error: 'auth.error.user_not_found' },
      { status: 404 }
    );
  }

  // 5. Verify current password
  const isValid = await bcrypt.compare(currentPassword, currentHash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'auth.error.invalid_current_password' },
      { status: 401 }
    );
  }

  // 6. Hash new password
  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // 7. Persist new hash (also sets first_login = 0 in the adapter)
  try {
    await getAuth().updatePasswordHash(userId, newHash);
  } catch (err) {
    console.error('[API] /auth/change-password updatePasswordHash error:', err);
    return NextResponse.json(
      { error: 'auth.error.server_error' },
      { status: 500 }
    );
  }

  // 8. Regenerate session: delete old, create new
  const oldSessionId = request.cookies.get('sessionId')?.value;
  let newSessionId: string | null = null;

  if (oldSessionId) {
    try {
      // Logout invalidates the old session in DB
      await getAuth().logout(oldSessionId);
      // Login creates a fresh session (re-use login flow via adapter)
      const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown';
      // We can't call login() again without the plain-text password (already hashed).
      // Instead, create a new session directly by calling validateSession on a fresh
      // login — but the adapter doesn't expose createSession() publicly.
      // Safe fallback: keep the old session deleted; client will be redirected to login.
      // This is the correct security posture: force re-authentication after password change.
      console.log(`[API] Session invalidated after password change: user=${session.username}, ip=${ip}`);
    } catch (err) {
      // Non-fatal — old session may already be gone
      console.error('[API] /auth/change-password session cleanup error (non-blocking):', err);
    }
  }

  // 9. Build response — clear session cookie so client must re-login
  const response = NextResponse.json({ ok: true });

  if (newSessionId) {
    // If we had a way to create a new session, set it here
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('sessionId', newSessionId, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: 'lax',
      maxAge:   86400,
      path:     '/',
    });
  } else {
    // Force re-login: clear both cookies
    response.cookies.delete('sessionId');
    response.cookies.delete('csrf-token');
  }

  console.log(`[API] Password changed successfully: user=${session.username}`);

  return response;
}
