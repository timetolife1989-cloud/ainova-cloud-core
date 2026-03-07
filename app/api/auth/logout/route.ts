// =====================================================================
// Ainova Cloud Core - Logout API Route
// =====================================================================
// Route:    POST /api/auth/logout
// Body:     (none — uses session cookie)
// Response: { ok: true }
// Security: CSRF check, best-effort session invalidation
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { checkCsrf } from '@/lib/api-utils';

// -----------------------------------------------------------------------
// POST /api/auth/logout
// -----------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. CSRF validation (logout is a mutating action)
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  // 2. Extract session ID from cookie
  const sessionId = request.cookies.get('sessionId')?.value;

  // 3. Invalidate session in DB (best-effort — always clear cookie)
  if (sessionId) {
    try {
      await getAuth().logout(sessionId);
      console.log(`[API] Logout successful: session=${sessionId}`);
    } catch (err) {
      // Non-fatal: cookie will still be cleared
      console.error('[API] /auth/logout DB error (continuing with client logout):', err);
    }
  }

  // 4. Build response and delete both cookies
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('sessionId');
  response.cookies.delete('csrf-token');

  return response;
}
