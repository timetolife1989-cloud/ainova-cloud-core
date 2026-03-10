import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { generateApiKey } from '@/lib/api-gateway/middleware';
import { z } from 'zod';

const CreateKeySchema = z.object({
  name: z.string().min(1).max(200),
  permissions: z.array(z.string()).default([]),
  rateLimit: z.number().int().min(1).max(100000).default(1000),
  expiresAt: z.string().nullable().optional(),
});

interface ApiKeyRow {
  id: number;
  name: string;
  api_key: string;
  permissions: string;
  rate_limit: number;
  is_active: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<ApiKeyRow>(
    'SELECT id, name, api_key, permissions, rate_limit, is_active, last_used_at, created_at, expires_at FROM core_api_keys ORDER BY created_at DESC',
    []
  );

  return Response.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      apiKey: r.api_key.slice(0, 8) + '...' + r.api_key.slice(-4),
      permissions: JSON.parse(r.permissions || '[]'),
      rateLimit: r.rate_limit,
      isActive: !!r.is_active,
      lastUsedAt: r.last_used_at,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
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
