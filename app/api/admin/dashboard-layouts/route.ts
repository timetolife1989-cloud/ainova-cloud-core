import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const WidgetSchema = z.object({
  id: z.string(),
  type: z.enum(['kpi', 'bar', 'line', 'pie', 'table', 'gauge', 'heatmap']),
  title: z.string(),
  moduleId: z.string().optional(),
  query: z.string().optional(),
  w: z.number().int().min(1).max(12).default(3),
  h: z.number().int().min(1).max(6).default(2),
  x: z.number().int().min(0).default(0),
  y: z.number().int().min(0).default(0),
  config: z.record(z.string(), z.string()).optional(),
});

const SaveLayoutSchema = z.object({
  name: z.string().min(1).max(200).default('Default'),
  widgets: z.array(WidgetSchema),
  isDefault: z.boolean().default(false),
});

interface LayoutRow {
  id: number;
  user_id: number;
  name: string;
  layout_json: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'dashboard.view');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<LayoutRow>(
    'SELECT id, user_id, name, layout_json, is_default, created_at, updated_at FROM core_dashboard_layouts WHERE user_id = @p0 ORDER BY is_default DESC, name',
    [{ name: 'p0', type: 'int', value: auth.userId }]
  );

  return Response.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      widgets: JSON.parse(r.layout_json || '[]'),
      isDefault: !!r.is_default,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'dashboard.view');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = SaveLayoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, widgets, isDefault } = parsed.data;

  if (isDefault) {
    await getDb().execute(
      'UPDATE core_dashboard_layouts SET is_default = 0 WHERE user_id = @p0',
      [{ name: 'p0', type: 'int', value: auth.userId }]
    );
  }

  const result = await getDb().query<{ id: number }>(
    `INSERT INTO core_dashboard_layouts (user_id, name, layout_json, is_default)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3)`,
    [
      { name: 'p0', type: 'int', value: auth.userId },
      { name: 'p1', type: 'nvarchar', value: name },
      { name: 'p2', type: 'nvarchar', value: JSON.stringify(widgets) },
      { name: 'p3', type: 'bit', value: isDefault ? 1 : 0 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
