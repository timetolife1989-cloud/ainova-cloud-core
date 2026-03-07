// =====================================================================
// Ainova Cloud Core - Validate Session API Route
// =====================================================================
// Route:    GET /api/auth/validate-session
// Cookies:  sessionId (read from cookie)
// Response: { userId, username, fullName, role } | 401
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';

// -----------------------------------------------------------------------
// GET /api/auth/validate-session
// -----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  // 1. Extract session ID from cookie
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Nincs bejelentkezve' },
      { status: 401 }
    );
  }

  // 2. Validate session via auth adapter
  let session;
  try {
    session = await getAuth().validateSession(sessionId);
  } catch (err) {
    console.error('[API] /auth/validate-session error:', err);
    return NextResponse.json(
      { error: 'Munkamenet ellenőrzése sikertelen' },
      { status: 500 }
    );
  }

  // 3. Session invalid or expired
  if (!session) {
    return NextResponse.json(
      { error: 'Érvénytelen vagy lejárt munkamenet' },
      { status: 401 }
    );
  }

  // 4. Return session info
  return NextResponse.json({
    userId:   session.userId,
    username: session.username,
    fullName: session.fullName,
    role:     session.role,
  });
}
