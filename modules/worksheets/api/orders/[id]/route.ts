import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import type { SqlParamType, QueryParam } from '@/lib/db/IDatabase';

type RouteContext = { params: Promise<{ id: string }> };

const STATUS_FLOW: Record<string, string[]> = {
  received: ['diagnosing', 'in_progress'],
  diagnosing: ['in_progress'],
  in_progress: ['testing', 'completed'],
  testing: ['in_progress', 'completed'],
  completed: ['invoiced'],
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'worksheets.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const db = await getDb();

  const orders = await db.query<Record<string, unknown>>(
    `SELECT o.*, u.username AS assigned_to_name
     FROM worksheets_orders o
     LEFT JOIN core_users u ON u.id = o.assigned_to
     WHERE o.id = @p0`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );
  if (orders.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

  const labor = await db.query<Record<string, unknown>>(
    `SELECT l.*, u.username AS worker_name
     FROM worksheets_labor l
     LEFT JOIN core_users u ON u.id = l.worker_id
     WHERE l.order_id = @p0
     ORDER BY l.work_date DESC`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );

  const materials = await db.query<Record<string, unknown>>(
    `SELECT * FROM worksheets_materials WHERE order_id = @p0 ORDER BY created_at DESC`,
    [{ name: 'p0', type: 'int', value: orderId }]
  );

  return Response.json({ order: orders[0], labor, materials });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const db = await getDb();

  // Check status transitions
  if (body.status) {
    const current = await db.query<{ status: string }>(
      `SELECT status FROM worksheets_orders WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: orderId }]
    );
    if (current.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

    const allowed = STATUS_FLOW[current[0].status] ?? [];
    if (!allowed.includes(String(body.status))) {
      return Response.json(
        { error: `Cannot transition from '${current[0].status}' to '${body.status}'` },
        { status: 400 }
      );
    }
  }

  const fieldMap: Record<string, { col: string; type: SqlParamType }> = {
    customerName: { col: 'customer_name', type: 'nvarchar' },
    customerPhone: { col: 'customer_phone', type: 'nvarchar' },
    subject: { col: 'subject', type: 'nvarchar' },
    subjectId: { col: 'subject_id', type: 'nvarchar' },
    faultDesc: { col: 'fault_desc', type: 'nvarchar' },
    diagnosis: { col: 'diagnosis', type: 'nvarchar' },
    status: { col: 'status', type: 'nvarchar' },
    priority: { col: 'priority', type: 'nvarchar' },
    assignedTo: { col: 'assigned_to', type: 'int' },
    estimatedHours: { col: 'estimated_hours', type: 'float' },
    estimatedCost: { col: 'estimated_cost', type: 'float' },
    notes: { col: 'notes', type: 'nvarchar' },
    customerSignature: { col: 'customer_signature', type: 'nvarchar' },
  };

  const sets: string[] = ['updated_at = GETUTCDATE()'];
  const params: QueryParam[] = [];
  let pi = 0;

  for (const [key, mapping] of Object.entries(fieldMap)) {
    if (body[key] !== undefined) {
      params.push({ name: `p${pi}`, type: mapping.type, value: body[key] });
      sets.push(`${mapping.col} = @p${pi++}`);
    }
  }

  // If status changes to 'completed', set completed_at
  if (body.status === 'completed') {
    sets.push('completed_at = GETUTCDATE()');
  }

  params.push({ name: `p${pi}`, type: 'int', value: orderId });

  await db.execute(
    `UPDATE worksheets_orders SET ${sets.join(', ')} WHERE id = @p${pi}`,
    params
  );

  return Response.json({ success: true });
}
