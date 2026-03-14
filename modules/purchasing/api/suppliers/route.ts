import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface SupplierRow {
  id: number;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  payment_terms: string;
  currency: string;
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
}

// GET — suppliers list
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.view');
  if (!auth.valid) return auth.response;

  try {
    const rows = await getDb().query<SupplierRow>(
      `SELECT id, name, contact_name, email, phone, address, tax_number,
              payment_terms, currency, rating, notes, is_active, created_at
       FROM purchasing_suppliers
       WHERE is_active = 1
       ORDER BY name`
    );

    return Response.json({
      suppliers: rows.map(r => ({
        id: r.id,
        name: r.name,
        contactName: r.contact_name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        taxNumber: r.tax_number,
        paymentTerms: r.payment_terms,
        currency: r.currency,
        rating: r.rating,
        notes: r.notes,
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[Purchasing API] GET suppliers error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateSupplierSchema = z.object({
  name: z.string().min(1).max(200),
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

// POST — create supplier
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'purchasing.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO purchasing_suppliers (name, contact_name, email, phone, address, tax_number, payment_terms, currency, rating, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9)`,
      [
        { name: 'p0', type: 'nvarchar', value: d.name },
        { name: 'p1', type: 'nvarchar', value: d.contactName ?? null },
        { name: 'p2', type: 'nvarchar', value: d.email ?? null },
        { name: 'p3', type: 'nvarchar', value: d.phone ?? null },
        { name: 'p4', type: 'nvarchar', value: d.address ?? null },
        { name: 'p5', type: 'nvarchar', value: d.taxNumber ?? null },
        { name: 'p6', type: 'nvarchar', value: d.paymentTerms ?? '30 nap' },
        { name: 'p7', type: 'nvarchar', value: d.currency ?? 'HUF' },
        { name: 'p8', type: 'nvarchar', value: d.rating !== undefined ? String(d.rating) : null },
        { name: 'p9', type: 'nvarchar', value: d.notes ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Purchasing API] POST supplier error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
