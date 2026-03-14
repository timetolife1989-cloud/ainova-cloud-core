import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

// ── Types ──

interface CustomerRow {
  id: number;
  customer_name: string;
  tax_number: string | null;
  eu_tax_number: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_street: string | null;
  address_country: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
}

// ── GET: List customers ──

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'invoicing.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  try {
    let sql = `SELECT id, customer_name, tax_number, eu_tax_number,
                      address_zip, address_city, address_street, address_country,
                      email, phone, contact_person, notes, is_active, created_at
               FROM invoicing_customers WHERE is_active = 1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let pi = 0;

    if (search) {
      sql += ` AND (customer_name LIKE @p${pi} OR tax_number LIKE @p${pi})`;
      params.push({ name: `p${pi}`, type: 'nvarchar', value: `%${search}%` });
      pi++;
    }

    sql += ' ORDER BY customer_name';

    const rows = await getDb().query<CustomerRow>(sql, params);

    return Response.json({
      customers: rows.map(r => ({
        id: r.id,
        customerName: r.customer_name,
        taxNumber: r.tax_number,
        euTaxNumber: r.eu_tax_number,
        addressZip: r.address_zip,
        addressCity: r.address_city,
        addressStreet: r.address_street,
        addressCountry: r.address_country,
        email: r.email,
        phone: r.phone,
        contactPerson: r.contact_person,
        notes: r.notes,
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at),
      })),
    });
  } catch (err) {
    console.error('[Invoicing API] GET customers error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}

// ── POST: Create customer ──

// Hungarian tax number: 8 digits, dash, 1 digit, dash, 2 digits
const TAX_NUMBER_REGEX = /^\d{8}-\d-\d{2}$/;

const CreateCustomerSchema = z.object({
  customerName: z.string().min(1).max(200),
  taxNumber: z.string().max(20).optional().refine(
    v => !v || TAX_NUMBER_REGEX.test(v),
    { message: 'Invalid Hungarian tax number format (expected: 12345678-1-12)' }
  ),
  euTaxNumber: z.string().max(20).optional(),
  addressZip: z.string().max(10).optional(),
  addressCity: z.string().max(100).optional(),
  addressStreet: z.string().max(200).optional(),
  addressCountry: z.string().length(2).optional(),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  contactPerson: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'invoicing.create');
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
      `INSERT INTO invoicing_customers
         (customer_name, tax_number, eu_tax_number, address_zip, address_city, address_street, address_country, email, phone, contact_person, notes)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10)`,
      [
        { name: 'p0',  type: 'nvarchar', value: d.customerName },
        { name: 'p1',  type: 'nvarchar', value: d.taxNumber ?? null },
        { name: 'p2',  type: 'nvarchar', value: d.euTaxNumber ?? null },
        { name: 'p3',  type: 'nvarchar', value: d.addressZip ?? null },
        { name: 'p4',  type: 'nvarchar', value: d.addressCity ?? null },
        { name: 'p5',  type: 'nvarchar', value: d.addressStreet ?? null },
        { name: 'p6',  type: 'nvarchar', value: d.addressCountry ?? 'HU' },
        { name: 'p7',  type: 'nvarchar', value: d.email || null },
        { name: 'p8',  type: 'nvarchar', value: d.phone ?? null },
        { name: 'p9',  type: 'nvarchar', value: d.contactPerson ?? null },
        { name: 'p10', type: 'nvarchar', value: d.notes ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Invoicing API] POST customer error:', err);
    return Response.json({ error: 'api.error.data_create' }, { status: 500 });
  }
}
