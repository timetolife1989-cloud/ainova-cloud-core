import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const CreateSiteSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  address: z.string().max(500).nullable().optional(),
});

interface SiteRow {
  id: number;
  name: string;
  code: string;
  address: string | null;
  is_active: number;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<SiteRow>(
    'SELECT id, name, code, address, is_active, created_at FROM core_sites ORDER BY name',
    []
  );

  return Response.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      address: r.address,
      isActive: !!r.is_active,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = CreateSiteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, code, address } = parsed.data;

  const result = await getDb().query<{ id: number }>(
    `INSERT INTO core_sites (name, code, address)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2)`,
    [
      { name: 'p0', type: 'nvarchar', value: name },
      { name: 'p1', type: 'nvarchar', value: code },
      { name: 'p2', type: 'nvarchar', value: address ?? null },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
