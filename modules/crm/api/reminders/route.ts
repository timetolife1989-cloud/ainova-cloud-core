import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — active reminders for current user
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<Record<string, unknown>>(
      `SELECT r.id, r.customer_id, c.name AS customer_name,
              r.opportunity_id, r.title, r.due_date, r.is_completed, r.created_at
       FROM crm_reminders r
       LEFT JOIN crm_customers c ON c.id = r.customer_id
       WHERE r.user_id = @p0 AND r.is_completed = 0
       ORDER BY r.due_date ASC`,
      [{ name: 'p0', type: 'int', value: auth.userId }]
    );

    return Response.json({ reminders: rows });
  } catch (err) {
    console.error('[CRM API] GET reminders error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateReminderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  title: z.string().min(1).max(200),
  dueDate: z.string(),
});

// POST — create reminder
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO crm_reminders (customer_id, opportunity_id, user_id, title, due_date)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4)`,
      [
        { name: 'p0', type: 'int', value: d.customerId ?? null },
        { name: 'p1', type: 'int', value: d.opportunityId ?? null },
        { name: 'p2', type: 'int', value: auth.userId },
        { name: 'p3', type: 'nvarchar', value: d.title },
        { name: 'p4', type: 'nvarchar', value: d.dueDate },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[CRM API] POST reminder error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
