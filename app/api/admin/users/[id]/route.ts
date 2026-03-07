import { type NextRequest } from 'next/server';
import { checkSession, checkCsrf } from '@/lib/api-utils';
import { getAuth } from '@/lib/auth';
import { UpdateUserSchema } from '@/lib/validators/user';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin' && session.role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  const user = await getAuth().getUserById(userId);
  if (!user) {
    return Response.json({ error: 'Felhasználó nem található' }, { status: 404 });
  }

  return Response.json({ ok: true, user });
}

// PUT /api/admin/users/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Csak admin módosíthat felhasználót' }, { status: 403 });
  }

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  const existing = await getAuth().getUserById(userId);
  if (!existing) {
    return Response.json({ error: 'Felhasználó nem található' }, { status: 404 });
  }

  const body = await request.json() as unknown;
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
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
  const session = await checkSession(request);
  if (!session.valid) return session.response;
  if (session.role !== 'admin') {
    return Response.json({ error: 'Csak admin deaktiválhat felhasználót' }, { status: 403 });
  }

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  // Prevent self-deactivation
  if (userId === session.userId) {
    return Response.json({ error: 'Saját magadat nem deaktiválhatod' }, { status: 400 });
  }

  const existing = await getAuth().getUserById(userId);
  if (!existing) {
    return Response.json({ error: 'Felhasználó nem található' }, { status: 404 });
  }

  await getAuth().updateUser(userId, { isActive: false });

  return Response.json({ ok: true });
}
