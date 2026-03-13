import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAuth } from '@/lib/auth';
import { UpdateUserSchema } from '@/lib/validators/user';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'users.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  const user = await getAuth().getUserById(userId);
  if (!user) {
    return Response.json({ error: 'api.error.user_not_found' }, { status: 404 });
  }

  return Response.json({ ok: true, user });
}

// PUT /api/admin/users/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'users.manage');
  if (!auth.valid) return auth.response;

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

  const body = await request.json() as unknown;
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { fullName, email, role, isActive } = parsed.data;

  await getAuth().updateUser(userId, {
    fullName,
    email: email === '' ? null : email,
    role,
    isActive,
  });

  return Response.json({ ok: true });
}

// DELETE /api/admin/users/[id]  — soft delete (deactivate)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'users.manage');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });
  }

  // Prevent self-deactivation
  if (userId === auth.userId) {
    return Response.json({ error: 'api.error.cannot_deactivate_self' }, { status: 400 });
  }

  const existing = await getAuth().getUserById(userId);
  if (!existing) {
    return Response.json({ error: 'api.error.user_not_found' }, { status: 404 });
  }

  await getAuth().updateUser(userId, { isActive: false });

  return Response.json({ ok: true });
}
