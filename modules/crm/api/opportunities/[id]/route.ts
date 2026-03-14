import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const UpdateOpportunitySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  stage: z.enum(['lead', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  notes: z.string().max(5000).optional(),
});

// PUT — update opportunity (stage change etc.)
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const oppId = parseInt(id, 10);
  if (isNaN(oppId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = UpdateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const fields: string[] = [];
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
  let idx = 0;

  const map: Record<string, [string, 'nvarchar' | 'int']> = {
    title: ['title', 'nvarchar'],
    stage: ['stage', 'nvarchar'],
    value: ['value', 'nvarchar'],
    probability: ['probability', 'int'],
    expectedClose: ['expected_close', 'nvarchar'],
    assignedTo: ['assigned_to', 'int'],
    notes: ['notes', 'nvarchar'],
  };

  for (const [key, [col, type]] of Object.entries(map)) {
    const val = d[key as keyof typeof d];
    if (val !== undefined) {
      fields.push(`${col} = @p${idx}`);
      params.push({ name: `p${idx}`, type, value: type === 'nvarchar' ? String(val) : val });
      idx++;
    }
  }

  if (fields.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

  fields.push('updated_at = GETUTCDATE()');
  params.push({ name: `p${idx}`, type: 'int', value: oppId });

  try {
    await getDb().execute(
      `UPDATE crm_opportunities SET ${fields.join(', ')} WHERE id = @p${idx}`,
      params
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[CRM API] PUT opportunity error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
