import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { generateApiKey } from '@/lib/api-gateway/middleware';
import { z } from 'zod';

interface ApiKeyRow {
  id: number;
  name: string;
  api_key: string;
  permissions: string;
  rate_limit: number;
  is_active: number;
  last_used_at: string | null;
  created_by: number | null;
  created_at: string;
  expires_at: string | null;
}

// GET /api/modules/api-gateway/keys — list all API keys
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'api-gateway.view');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<ApiKeyRow>(
    `SELECT id, name, api_key, permissions, rate_limit, is_active, last_used_at, created_by, created_at, expires_at
     FROM core_api_keys ORDER BY created_at DESC`,
    []
  );

  return Response.json({
    keys: rows.map(r => ({
      id: r.id,
      name: r.name,
      apiKeyMasked: r.api_key.slice(0, 8) + '••••' + r.api_key.slice(-4),
      permissions: JSON.parse(r.permissions || '[]') as string[],
      rateLimit: r.rate_limit,
      isActive: !!r.is_active,
      lastUsedAt: r.last_used_at,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    })),
  });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  permissions: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).max(100000).default(1000),
  expiresAt: z.string().nullable().optional(),
});

// POST /api/modules/api-gateway/keys — create new API key
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'api-gateway.manage');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { name, permissions, rateLimit, expiresAt } = parsed.data;
  const apiKey = generateApiKey();

  const result = await getDb().query<{ id: number }>(
    `INSERT INTO core_api_keys (name, api_key, permissions, rate_limit, created_by, expires_at)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'nvarchar', value: name },
      { name: 'p1', type: 'nvarchar', value: apiKey },
      { name: 'p2', type: 'nvarchar', value: JSON.stringify(permissions) },
      { name: 'p3', type: 'int', value: rateLimit },
      { name: 'p4', type: 'int', value: auth.userId },
      { name: 'p5', type: 'nvarchar', value: expiresAt ?? null },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id, apiKey }, { status: 201 });
}

// PUT /api/modules/api-gateway/keys — toggle active/inactive
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'api-gateway.manage');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const updateSchema = z.object({
    id: z.number().int().positive(),
    isActive: z.boolean(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  await getDb().query(
    'UPDATE core_api_keys SET is_active = @p0 WHERE id = @p1',
    [
      { name: 'p0', type: 'int', value: parsed.data.isActive ? 1 : 0 },
      { name: 'p1', type: 'int', value: parsed.data.id },
    ]
  );

  return Response.json({ ok: true });
}

// DELETE /api/modules/api-gateway/keys — delete key
export async function DELETE(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'api-gateway.manage');
  if (!auth.valid) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  await getDb().query('DELETE FROM core_api_keys WHERE id = @p0', [
    { name: 'p0', type: 'int', value: parseInt(id, 10) },
  ]);

  return Response.json({ ok: true });
}
