import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — pipeline list (all opportunities)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');

  try {
    let sql = `SELECT o.id, o.customer_id, c.name AS customer_name, o.title, o.stage,
                      o.value, o.currency, o.probability, o.expected_close,
                      o.assigned_to, u.username AS assigned_to_name, o.notes, o.created_at
               FROM crm_opportunities o
               JOIN crm_customers c ON c.id = o.customer_id
               LEFT JOIN core_users u ON u.id = o.assigned_to
               WHERE 1=1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let idx = 0;

    if (stage) {
      sql += ` AND o.stage = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: stage });
      idx++;
    }

    sql += ' ORDER BY o.created_at DESC';

    const rows = await getDb().query<Record<string, unknown>>(sql, params);
    return Response.json({ opportunities: rows });
  } catch (err) {
    console.error('[CRM API] GET opportunities error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateOpportunitySchema = z.object({
  customerId: z.number().int().positive(),
  title: z.string().min(1).max(300),
  stage: z.enum(['lead', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
});

// POST — create opportunity
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO crm_opportunities
        (customer_id, title, stage, value, currency, probability, expected_close, assigned_to, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)`,
      [
        { name: 'p0', type: 'int', value: d.customerId },
        { name: 'p1', type: 'nvarchar', value: d.title },
        { name: 'p2', type: 'nvarchar', value: d.stage ?? 'lead' },
        { name: 'p3', type: 'nvarchar', value: d.value != null ? String(d.value) : null },
        { name: 'p4', type: 'nvarchar', value: d.currency ?? 'HUF' },
        { name: 'p5', type: 'int', value: d.probability ?? 0 },
        { name: 'p6', type: 'nvarchar', value: d.expectedClose ?? null },
        { name: 'p7', type: 'int', value: d.assignedTo ?? null },
        { name: 'p8', type: 'nvarchar', value: d.notes ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[CRM API] POST opportunity error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
