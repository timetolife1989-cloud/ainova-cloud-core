import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface ProjectRow {
  id: number;
  name: string;
  client_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  actual_cost: number;
  currency: string;
  description: string | null;
  manager_id: number | null;
  created_at: string;
}

// GET /api/modules/projects/projects — list projects
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'projects.view');
  if (!auth.valid) return auth.response;

  const db = getDb();
  const status = request.nextUrl.searchParams.get('status');

  let sql = 'SELECT * FROM projects_projects';
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: string | number }> = [];

  if (status) {
    sql += ' WHERE status = @p0';
    params.push({ name: 'p0', type: 'nvarchar', value: status });
  }

  sql += ' ORDER BY created_at DESC';
  const rows = await db.query<ProjectRow>(sql, params);

  return Response.json({ projects: rows });
}

const ProjectSchema = z.object({
  name: z.string().min(1).max(300),
  clientName: z.string().max(200).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget: z.number().nonnegative().optional(),
  currency: z.string().max(3).optional(),
  description: z.string().max(2000).optional(),
});

// POST /api/modules/projects/projects — create project
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'projects.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = ProjectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const result = await db.query<{ id: number }>(
    `INSERT INTO projects_projects (name, client_name, status, start_date, end_date, budget, currency, description, manager_id)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'nvarchar', value: d.name },
      { name: 'p1', type: 'nvarchar', value: d.clientName ?? '' },
      { name: 'p2', type: 'nvarchar', value: d.status ?? 'planning' },
      { name: 'p3', type: 'nvarchar', value: d.startDate ?? '' },
      { name: 'p4', type: 'nvarchar', value: d.endDate ?? '' },
      { name: 'p5', type: 'float', value: d.budget ?? 0 },
      { name: 'p6', type: 'nvarchar', value: d.currency ?? 'HUF' },
      { name: 'p7', type: 'nvarchar', value: d.description ?? '' },
      { name: 'p8', type: 'int', value: auth.userId ?? 0 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// PUT /api/modules/projects/projects — update project status/details
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'projects.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const updateSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
    name: z.string().min(1).max(300).optional(),
    budget: z.number().nonnegative().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const params: Array<{ name: string; type: 'nvarchar' | 'int' | 'float'; value: string | number }> = [];
  let idx = 0;

  if (d.status) {
    setClauses.push(`status = @p${idx}`);
    params.push({ name: `p${idx}`, type: 'nvarchar', value: d.status });
    idx++;
  }
  if (d.name) {
    setClauses.push(`name = @p${idx}`);
    params.push({ name: `p${idx}`, type: 'nvarchar', value: d.name });
    idx++;
  }
  if (d.budget !== undefined) {
    setClauses.push(`budget = @p${idx}`);
    params.push({ name: `p${idx}`, type: 'float', value: d.budget });
    idx++;
  }

  params.push({ name: `p${idx}`, type: 'int', value: d.id });

  await db.query(
    `UPDATE projects_projects SET ${setClauses.join(', ')} WHERE id = @p${idx}`,
    params
  );

  return Response.json({ ok: true });
}
