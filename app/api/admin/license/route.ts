import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getLicense } from '@/lib/license';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const license = await getLicense();
  return Response.json({
    tier: license.tier,
    customerName: license.customerName,
    modulesAllowed: license.modulesAllowed,
    featuresAllowed: license.featuresAllowed,
    maxUsers: license.maxUsers,
    expiresAt: license.expiresAt,
    isExpired: license.isExpired,
    isActive: license.isActive,
  });
}
