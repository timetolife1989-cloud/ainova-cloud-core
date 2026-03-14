import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface TaskRow {
  id: number;
  project_id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  status: string;
  assigned_name: string | null;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  sort_order: number;
}

// GET /api/modules/projects/tasks?projectId=X — list tasks for a project
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'projects.view');
  if (!auth.valid) return auth.response;

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

  const db = getDb();
  const rows = await db.query<TaskRow>(
    'SELECT * FROM projects_tasks WHERE project_id = @p0 ORDER BY sort_order, id',
    [{ name: 'p0', type: 'int', value: parseInt(projectId, 10) }]
  );

  return Response.json({ tasks: rows });
}

const TaskSchema = z.object({
  projectId: z.number().int().positive(),
  parentId: z.number().int().positive().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  assignedName: z.string().max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedHours: z.number().nonnegative().optional(),
});

// POST /api/modules/projects/tasks — create task
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'projects.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const d = parsed.data;
  const db = getDb();

  // Get max sort_order for the project
  const maxOrder = await db.query<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM projects_tasks WHERE project_id = @p0',
    [{ name: 'p0', type: 'int', value: d.projectId }]
  );

  const result = await db.query<{ id: number }>(
    `INSERT INTO projects_tasks (project_id, parent_id, title, description, assigned_name, start_date, due_date, estimated_hours, sort_order)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
    [
      { name: 'p0', type: 'int', value: d.projectId },
      { name: 'p1', type: 'int', value: d.parentId ?? 0 },
      { name: 'p2', type: 'nvarchar', value: d.title },
      { name: 'p3', type: 'nvarchar', value: d.description ?? '' },
      { name: 'p4', type: 'nvarchar', value: d.assignedName ?? '' },
      { name: 'p5', type: 'nvarchar', value: d.startDate ?? '' },
      { name: 'p6', type: 'nvarchar', value: d.dueDate ?? '' },
      { name: 'p7', type: 'float', value: d.estimatedHours ?? 0 },
      { name: 'p8', type: 'int', value: (maxOrder[0]?.max_order ?? 0) + 1 },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}

// PUT /api/modules/projects/tasks — update task status/details
export async function PUT(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const auth = await checkAuth(request, 'projects.edit');
  if (!auth.valid) return auth.response;

  const body = await request.json();
  const updateSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
    actualHours: z.number().nonnegative().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
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
  if (d.actualHours !== undefined) {
    setClauses.push(`actual_hours = @p${idx}`);
    params.push({ name: `p${idx}`, type: 'float', value: d.actualHours });
    idx++;
  }
  if (d.sortOrder !== undefined) {
    setClauses.push(`sort_order = @p${idx}`);
    params.push({ name: `p${idx}`, type: 'int', value: d.sortOrder });
    idx++;
  }

  params.push({ name: `p${idx}`, type: 'int', value: d.id });

  await db.query(
    `UPDATE projects_tasks SET ${setClauses.join(', ')} WHERE id = @p${idx}`,
    params
  );

  return Response.json({ ok: true });
}
