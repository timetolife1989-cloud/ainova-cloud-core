import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface CostRow {
  id: number;
  project_id: number;
  description: string;
  amount: number;
  cost_type: string;
  cost_date: string;
  created_at: string;
}

// GET /api/modules/projects/costs?projectId=X — list costs for a project
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'projects.view');
  if (!auth.valid) return auth.response;

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

  const db = getDb();
  const rows = await db.query<CostRow>(
    'SELECT * FROM projects_costs WHERE project_id = @p0 ORDER BY cost_date DESC',
    [{ name: 'p0', type: 'int', value: parseInt(projectId, 10) }]
  );

  return Response.json({ costs: rows });
}

const CostSchema = z.object({
  projectId: z.number().int().positive(),
  description: z.string().min(1).max(300),
  amount: z.number().positive(),
  costType: z.enum(['material', 'labor', 'subcontract', 'other']).optional(),
  costDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST /api/modules/projects/costs — add cost entry, auto-updates actual_cost on project
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'projects.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = CostSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();
  const today = new Date().toISOString().split('T')[0] ?? '';

  await db.query(
    `INSERT INTO projects_costs (project_id, description, amount, cost_type, cost_date, created_by)
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
    [
      { name: 'p0', type: 'int', value: d.projectId },
      { name: 'p1', type: 'nvarchar', value: d.description },
      { name: 'p2', type: 'float', value: d.amount },
      { name: 'p3', type: 'nvarchar', value: d.costType ?? 'material' },
      { name: 'p4', type: 'nvarchar', value: d.costDate ?? today },
      { name: 'p5', type: 'int', value: auth.userId ?? 0 },
    ]
  );

  // Update actual_cost on the project
  const totals = await db.query<{ total: number }>(
    'SELECT ISNULL(SUM(amount), 0) AS total FROM projects_costs WHERE project_id = @p0',
    [{ name: 'p0', type: 'int', value: d.projectId }]
  );

  await db.query(
    'UPDATE projects_projects SET actual_cost = @p0, updated_at = GETUTCDATE() WHERE id = @p1',
    [
      { name: 'p0', type: 'float', value: totals[0]?.total ?? 0 },
      { name: 'p1', type: 'int', value: d.projectId },
    ]
  );

  return Response.json({ ok: true }, { status: 201 });
}
