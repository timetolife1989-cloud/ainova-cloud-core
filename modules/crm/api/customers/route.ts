import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// GET — customers list with search
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type');

  try {
    let sql = `SELECT id, name, company_name, email, phone, city, customer_type, source, is_active, created_at
               FROM crm_customers WHERE is_active = 1`;
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [];
    let idx = 0;

    if (q) {
      sql += ` AND (name LIKE @p${idx} OR company_name LIKE @p${idx} OR email LIKE @p${idx} OR phone LIKE @p${idx})`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: `%${q}%` });
      idx++;
    }
    if (type) {
      sql += ` AND customer_type = @p${idx}`;
      params.push({ name: `p${idx}`, type: 'nvarchar', value: type });
      idx++;
    }

    sql += ' ORDER BY name';

    const rows = await getDb().query<{
      id: number; name: string; company_name: string | null; email: string | null;
      phone: string | null; city: string | null; customer_type: string;
      source: string | null; is_active: boolean; created_at: Date;
    }>(sql, params);

    return Response.json({ customers: rows });
  } catch (err) {
    console.error('[CRM API] GET customers error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(200),
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

// POST — create customer
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'crm.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO crm_customers
        (name, company_name, email, phone, address, city, postal_code, country,
         tax_number, eu_tax_number, customer_type, source, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12)`,
      [
        { name: 'p0', type: 'nvarchar', value: d.name },
        { name: 'p1', type: 'nvarchar', value: d.companyName ?? null },
        { name: 'p2', type: 'nvarchar', value: d.email ?? null },
        { name: 'p3', type: 'nvarchar', value: d.phone ?? null },
        { name: 'p4', type: 'nvarchar', value: d.address ?? null },
        { name: 'p5', type: 'nvarchar', value: d.city ?? null },
        { name: 'p6', type: 'nvarchar', value: d.postalCode ?? null },
        { name: 'p7', type: 'nvarchar', value: d.country ?? 'HU' },
        { name: 'p8', type: 'nvarchar', value: d.taxNumber ?? null },
        { name: 'p9', type: 'nvarchar', value: d.euTaxNumber ?? null },
        { name: 'p10', type: 'nvarchar', value: d.customerType ?? 'company' },
        { name: 'p11', type: 'nvarchar', value: d.source ?? null },
        { name: 'p12', type: 'nvarchar', value: d.notes ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[CRM API] POST customer error:', err);
    return Response.json({ error: 'api.error.data_save' }, { status: 500 });
  }
}
