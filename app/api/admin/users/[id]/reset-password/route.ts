import { type NextRequest } from 'next/server';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { getAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/constants';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/users/[id]/reset-password
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'api.error.admin_only' }, { status: 403 });
  }

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  const existing = await getAuth().getUserById(userId);
  if (!existing) {
    return Response.json({ error: 'api.error.user_not_found' }, { status: 404 });
  }

  // Generate a random 12-character password (no ambiguous chars)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const newPassword = Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // updatePasswordHash sets first_login = 0 in the adapter, but we want first_login = 1
  // so the user is forced to change on next login. We call updatePasswordHash then
  // separately set firstLogin = true.
  await getAuth().updatePasswordHash(userId, newHash);
  await getAuth().updateUser(userId, { firstLogin: true });

  return Response.json({ ok: true, newPassword });
}
