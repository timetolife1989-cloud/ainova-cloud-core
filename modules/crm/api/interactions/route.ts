import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const CreateInteractionSchema = z.object({
  customerId: z.number().int().positive(),
  type: z.enum(['call', 'meeting', 'email', 'note']),
  subject: z.string().max(300).optional(),
  description: z.string().max(5000).optional(),
  nextFollowUp: z.string().optional(),
});

// POST — create interaction
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateInteractionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO crm_interactions (customer_id, type, subject, description, next_follow_up, created_by)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
      [
        { name: 'p0', type: 'int', value: d.customerId },
        { name: 'p1', type: 'nvarchar', value: d.type },
        { name: 'p2', type: 'nvarchar', value: d.subject ?? null },
        { name: 'p3', type: 'nvarchar', value: d.description ?? null },
        { name: 'p4', type: 'nvarchar', value: d.nextFollowUp ?? null },
        { name: 'p5', type: 'int', value: auth.userId },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[CRM API] POST interaction error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
