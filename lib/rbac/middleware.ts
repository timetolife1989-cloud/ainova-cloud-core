import { type NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { hasPermission } from '@/lib/rbac';

/** Check if demo mode is active */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

/** Operations blocked in demo mode */
const DEMO_BLOCKED_ACTIONS = new Set([
  'export', 'print', 'delete', 'users.manage', 'admin.access',
]);

export async function checkAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<
  | { valid: true; userId: number; username: string; fullName: string; role: string }
  | { valid: false; response: NextResponse }
> {
  const session = await checkSession(request);
  if (!session.valid) return session;

  // Demo mode: block sensitive operations
  if (isDemoMode() && requiredPermission && DEMO_BLOCKED_ACTIONS.has(requiredPermission)) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'error.demo_restricted' },
        { status: 403 }
      ),
    };
  }

  if (requiredPermission) {
    const allowed = await hasPermission(session.role, requiredPermission);
    if (!allowed) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'error.no_permission' },
          { status: 403 }
        ),
      };
    }
  }

  return session;
}
