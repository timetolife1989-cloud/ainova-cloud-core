import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface ItemRow {
  id: number;
  sku: string;
  item_name: string;
  category: string | null;
  current_qty: number;
  min_qty: number;
  max_qty: number | null;
  unit_name: string | null;
  location: string | null;
  is_active: boolean;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'inventory.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

  try {
    let sql = `SELECT id, sku, item_name, category, current_qty, min_qty, max_qty, unit_name, location, is_active, created_at
               FROM inventory_items WHERE is_active = 1`;
    const params: Array<{ name: string; type: 'nvarchar'; value: unknown }> = [];
    let paramIdx = 0;

    if (category) {
      sql += ` AND category = @p${paramIdx}`;
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: category });
      paramIdx++;
    }
    if (lowStockOnly) {
      sql += ' AND current_qty <= min_qty';
    }

    sql += ' ORDER BY item_name';

    const rows = await getDb().query<ItemRow>(sql, params);

    const items = rows.map(r => ({
      id: r.id,
      sku: r.sku,
      itemName: r.item_name,
      category: r.category,
      currentQty: r.current_qty,
      minQty: r.min_qty,
      maxQty: r.max_qty,
      unitName: r.unit_name,
      location: r.location,
      isActive: Boolean(r.is_active),
      createdAt: String(r.created_at),
    }));

    return Response.json({ items });
  } catch (err) {
    console.error('[Inventory API] GET error:', err);
    return Response.json({ error: 'Hiba az adatok lekérésekor' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  sku: z.string().min(1).max(50),
  itemName: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  minQty: z.number().min(0).optional(),
  maxQty: z.number().min(0).optional(),
  unitName: z.string().max(50).optional(),
  location: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'inventory.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json() as unknown;
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { sku, itemName, category, minQty, maxQty, unitName, location } = parsed.data;

  try {
    const result = await getDb().query<{ id: number }>(
      `INSERT INTO inventory_items (sku, item_name, category, min_qty, max_qty, unit_name, location)
       OUTPUT INSERTED.id
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)`,
      [
        { name: 'p0', type: 'nvarchar', value: sku },
        { name: 'p1', type: 'nvarchar', value: itemName },
        { name: 'p2', type: 'nvarchar', value: category ?? null },
        { name: 'p3', type: 'nvarchar', value: String(minQty ?? 0) },
        { name: 'p4', type: 'nvarchar', value: maxQty !== undefined ? String(maxQty) : null },
        { name: 'p5', type: 'nvarchar', value: unitName ?? null },
        { name: 'p6', type: 'nvarchar', value: location ?? null },
      ]
    );

    return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
  } catch (err) {
    console.error('[Inventory API] POST error:', err);
    return Response.json({ error: 'Hiba a létrehozáskor' }, { status: 500 });
  }
}
