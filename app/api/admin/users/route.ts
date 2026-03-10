import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getAuth } from '@/lib/auth';
import { CreateUserSchema } from '@/lib/validators/user';
import { canCreateUser } from '@/lib/license';
import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS, DEFAULT_PAGE_SIZE } from '@/lib/constants';

// GET /api/admin/users?search=&role=&isActive=&page=
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'users.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const filter = {
    search:   searchParams.get('search')   ?? undefined,
    role:     searchParams.get('role')     ?? undefined,
    isActive: searchParams.has('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined,
    page:     parseInt(searchParams.get('page') ?? '1', 10),
    pageSize: DEFAULT_PAGE_SIZE,
  };

  const result = await getAuth().listUsers(filter);
  return Response.json(result);
}

// POST /api/admin/users
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'users.manage');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const userLimitOk = await canCreateUser();
  if (!userLimitOk) {
    return Response.json(
      { error: 'Elérte a maximális felhasználó számot a jelenlegi licenccsomagban.' },
      { status: 403 }
    );
  }

  const body = await request.json() as unknown;
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { username, fullName, email, role, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const id = await getAuth().createUser({
    username,
    passwordHash,
    fullName,
    email: email || undefined,
    role,
  });

  return Response.json({ ok: true, id }, { status: 201 });
}
