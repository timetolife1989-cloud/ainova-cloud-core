import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — single supplier
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  try {
    const rows = await getDb().query<{
      id: number; name: string; contact_name: string | null; email: string | null;
      phone: string | null; address: string | null; tax_number: string | null;
      payment_terms: string; currency: string; rating: number | null;
      notes: string | null; is_active: boolean; created_at: Date; updated_at: Date;
    }>(
      'SELECT * FROM purchasing_suppliers WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: supplierId }]
    );

    if (rows.length === 0) return Response.json({ error: 'error.not_found' }, { status: 404 });

    const r = rows[0];
    return Response.json({
      supplier: {
        id: r.id, name: r.name, contactName: r.contact_name, email: r.email,
        phone: r.phone, address: r.address, taxNumber: r.tax_number,
        paymentTerms: r.payment_terms, currency: r.currency, rating: r.rating,
        notes: r.notes, isActive: Boolean(r.is_active),
        createdAt: String(r.created_at), updatedAt: String(r.updated_at),
      },
    });
  } catch (err) {
    console.error('[Purchasing API] GET supplier error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const UpdateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  taxNumber: z.string().max(30).optional(),
  paymentTerms: z.string().max(50).optional(),
  currency: z.string().length(3).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
});

// PUT — update supplier
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = UpdateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;
  const setClauses: string[] = [];
  const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
  let idx = 0;

  if (d.name !== undefined) { setClauses.push(`name = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.name }); idx++; }
  if (d.contactName !== undefined) { setClauses.push(`contact_name = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.contactName }); idx++; }
  if (d.email !== undefined) { setClauses.push(`email = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.email }); idx++; }
  if (d.phone !== undefined) { setClauses.push(`phone = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.phone }); idx++; }
  if (d.address !== undefined) { setClauses.push(`address = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.address }); idx++; }
  if (d.taxNumber !== undefined) { setClauses.push(`tax_number = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.taxNumber }); idx++; }
  if (d.paymentTerms !== undefined) { setClauses.push(`payment_terms = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.paymentTerms }); idx++; }
  if (d.currency !== undefined) { setClauses.push(`currency = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.currency }); idx++; }
  if (d.rating !== undefined) { setClauses.push(`rating = @p${idx}`); params.push({ name: `p${idx}`, type: 'int', value: d.rating }); idx++; }
  if (d.notes !== undefined) { setClauses.push(`notes = @p${idx}`); params.push({ name: `p${idx}`, type: 'nvarchar', value: d.notes }); idx++; }

  if (setClauses.length === 0) {
    return Response.json({ error: 'error.validation' }, { status: 400 });
  }

  setClauses.push('updated_at = GETDATE()');

  try {
    params.push({ name: `p${idx}`, type: 'int', value: supplierId });
    await getDb().execute(
      `UPDATE purchasing_suppliers SET ${setClauses.join(', ')} WHERE id = @p${idx}`,
      params
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Purchasing API] PUT supplier error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

// DELETE — soft-delete supplier
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const supplierId = parseInt(id, 10);
  if (isNaN(supplierId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  try {
    await getDb().execute(
      'UPDATE purchasing_suppliers SET is_active = 0, updated_at = GETDATE() WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: supplierId }]
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Purchasing API] DELETE supplier error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
