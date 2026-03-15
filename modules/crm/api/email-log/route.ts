import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface InteractionRow {
  id: number;
  customer_id: number;
  customer_name: string;
  type: string;
  subject: string | null;
  description: string | null;
  interaction_date: string;
}

// GET /api/modules/crm/email-log?customerId=1 — list email interactions for a customer
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  try {
    const db = getDb();
    let sql = `SELECT i.id, i.customer_id, c.name AS customer_name, i.type, i.subject, i.description, i.interaction_date
               FROM crm_interactions i
               JOIN crm_customers c ON i.customer_id = c.id
               WHERE i.type = 'email'`;
    const params: Array<{ name: string; type: 'int'; value: unknown }> = [];

    if (customerId) {
      sql += ' AND i.customer_id = @p0';
      params.push({ name: 'p0', type: 'int', value: parseInt(customerId) });
    }

    sql += ' ORDER BY i.interaction_date DESC';
    const rows = await db.query<InteractionRow>(sql, params);

    return Response.json({
      emails: rows.map(r => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        subject: r.subject,
        description: r.description,
        date: String(r.interaction_date),
      })),
    });
  } catch (err) {
    console.error('[CRM EmailLog] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const LogEmailSchema = z.object({
  customerId: z.number(),
  subject: z.string().min(1).max(300),
  body: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  nextFollowUp: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST /api/modules/crm/email-log — log an email interaction automatically
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = LogEmailSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const { customerId, subject, body: emailBody, direction, nextFollowUp } = parsed.data;

  try {
    const db = getDb();
    const desc = `[${direction ?? 'outbound'}] ${emailBody ?? ''}`.trim();

    const result = await db.query<{ id: number }>(
      `INSERT INTO crm_interactions (customer_id, type, subject, description, next_follow_up, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, 'email', @p1, @p2, @p3, @p4)`,
      [
        { name: 'p0', type: 'int', value: customerId },
        { name: 'p1', type: 'nvarchar', value: subject },
        { name: 'p2', type: 'nvarchar', value: desc },
        { name: 'p3', type: 'nvarchar', value: nextFollowUp ?? null },
        { name: 'p4', type: 'int', value: auth.userId ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[CRM EmailLog] POST error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
