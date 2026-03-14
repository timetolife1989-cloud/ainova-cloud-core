import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

// GET — customer detail + interactions + opportunities
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const custId = parseInt(id, 10);
  if (isNaN(custId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    const db = getDb();

    const custRows = await db.query<Record<string, unknown>>(
      `SELECT * FROM crm_customers WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: custId }]
    );
    if (!custRows.length) return Response.json({ error: 'Not found' }, { status: 404 });

    const interactions = await db.query<Record<string, unknown>>(
      `SELECT i.*, u.username AS created_by_name
       FROM crm_interactions i
       LEFT JOIN core_users u ON u.id = i.created_by
       WHERE i.customer_id = @p0 ORDER BY i.interaction_date DESC`,
      [{ name: 'p0', type: 'int', value: custId }]
    );

    const opportunities = await db.query<Record<string, unknown>>(
      `SELECT o.*, u.username AS assigned_to_name
       FROM crm_opportunities o
       LEFT JOIN core_users u ON u.id = o.assigned_to
       WHERE o.customer_id = @p0 ORDER BY o.created_at DESC`,
      [{ name: 'p0', type: 'int', value: custId }]
    );

    return Response.json({
      customer: custRows[0],
      interactions,
      opportunities,
    });
  } catch (err) {
    console.error('[CRM API] GET customer detail error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(2000).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  country: z.string().length(2).optional(),
  taxNumber: z.string().max(30).optional(),
  euTaxNumber: z.string().max(30).optional(),
  customerType: z.enum(['company', 'individual']).optional(),
  source: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
});

// PUT — update customer
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const custId = parseInt(id, 10);
  if (isNaN(custId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = UpdateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const fields: string[] = [];
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
  let idx = 0;

  const map: Record<string, string> = {
    name: 'name', companyName: 'company_name', email: 'email', phone: 'phone',
    address: 'address', city: 'city', postalCode: 'postal_code', country: 'country',
    taxNumber: 'tax_number', euTaxNumber: 'eu_tax_number', customerType: 'customer_type',
    source: 'source', notes: 'notes',
  };

  for (const [key, col] of Object.entries(map)) {
    if (d[key as keyof typeof d] !== undefined) {
      fields.push(`${col} = @p${idx}`);
      params.push({ name: `p${idx}`, type: 'nvarchar', value: d[key as keyof typeof d] ?? null });
      idx++;
    }
  }

  if (fields.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

  fields.push('updated_at = GETUTCDATE()');
  params.push({ name: `p${idx}`, type: 'int', value: custId });

  try {
    await getDb().execute(
      `UPDATE crm_customers SET ${fields.join(', ')} WHERE id = @p${idx}`,
      params
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[CRM API] PUT customer error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}

// DELETE — soft delete customer
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'crm.delete');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const custId = parseInt(id, 10);
  if (isNaN(custId)) return Response.json({ error: 'Invalid ID' }, { status: 400 });

  try {
    await getDb().execute(
      `UPDATE crm_customers SET is_active = 0, updated_at = GETUTCDATE() WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: custId }]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[CRM API] DELETE customer error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
