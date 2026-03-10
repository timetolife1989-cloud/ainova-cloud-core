import { type NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { hasPermission } from '@/lib/rbac';

export async function checkAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<
  | { valid: true; userId: number; username: string; fullName: string; role: string }
  | { valid: false; response: NextResponse }
> {
  const session = await checkSession(request);
  if (!session.valid) return session;

  if (requiredPermission) {
    const allowed = await hasPermission(session.role, requiredPermission);
    if (!allowed) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Nincs jogosultságod ehhez a művelethez.' },
          { status: 403 }
        ),
      };
    }
  }

  return session;
}
