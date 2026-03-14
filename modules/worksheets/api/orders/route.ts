import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import type { QueryParam } from '@/lib/db/IDatabase';
import { z } from 'zod';

const createSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerId: z.number().int().optional(),
  customerPhone: z.string().max(50).optional(),
  subject: z.string().min(1).max(300),
  subjectId: z.string().max(100).optional(),
  faultDesc: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.number().int().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assignedTo');

  let sql = `SELECT o.*, u.username AS assigned_to_name
    FROM worksheets_orders o
    LEFT JOIN core_users u ON u.id = o.assigned_to
    WHERE 1=1`;
  const params: QueryParam[] = [];
  let pi = 0;

  if (status) {
    params.push({ name: `p${pi}`, type: 'nvarchar', value: status });
    sql += ` AND o.status = @p${pi++}`;
  }
  if (assignedTo) {
    params.push({ name: `p${pi}`, type: 'int', value: parseInt(assignedTo, 10) });
    sql += ` AND o.assigned_to = @p${pi++}`;
  }

  sql += ' ORDER BY o.created_at DESC';

  const db = await getDb();
  const orders = await db.query<Record<string, unknown>>(sql, params);

  return Response.json({ orders });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'worksheets.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const db = await getDb();

  // Generate order number WO-YYYY-NNNN
  const year = new Date().getFullYear();
  const countRows = await db.query<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM worksheets_orders WHERE order_number LIKE @p0`,
    [{ name: 'p0', type: 'nvarchar', value: `WO-${year}-%` }]
  );
  const seq = (countRows[0]?.cnt ?? 0) + 1;
  const orderNumber = `WO-${year}-${String(seq).padStart(4, '0')}`;

  // Get default labor rate from settings
  let laborRate = 5000;
  try {
    const sr = await db.query<{ value: string }>(
      `SELECT value FROM core_settings WHERE key = 'worksheets_default_labor_rate'`, []
    );
    if (sr.length > 0) laborRate = parseFloat(sr[0].value) || 5000;
  } catch { /* use default */ }

  await db.execute(
    `INSERT INTO worksheets_orders
      (order_number, customer_id, customer_name, customer_phone, subject, subject_id,
       fault_desc, priority, assigned_to, estimated_hours, estimated_cost, labor_rate, notes)
    VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12)`,
    [
      { name: 'p0', type: 'nvarchar', value: orderNumber },
      { name: 'p1', type: 'int', value: d.customerId ?? null },
      { name: 'p2', type: 'nvarchar', value: d.customerName },
      { name: 'p3', type: 'nvarchar', value: d.customerPhone ?? null },
      { name: 'p4', type: 'nvarchar', value: d.subject },
      { name: 'p5', type: 'nvarchar', value: d.subjectId ?? null },
      { name: 'p6', type: 'nvarchar', value: d.faultDesc ?? null },
      { name: 'p7', type: 'nvarchar', value: d.priority ?? 'normal' },
      { name: 'p8', type: 'int', value: d.assignedTo ?? null },
      { name: 'p9', type: 'float', value: d.estimatedHours ?? null },
      { name: 'p10', type: 'float', value: d.estimatedCost ?? null },
      { name: 'p11', type: 'float', value: laborRate },
      { name: 'p12', type: 'nvarchar', value: d.notes ?? null },
    ]
  );

  return Response.json({ orderNumber }, { status: 201 });
}
