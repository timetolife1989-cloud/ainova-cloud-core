import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — item details + recent movements
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'inventory.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  try {
    const items = await getDb().query<{ id: number; sku: string; item_name: string; category: string | null; current_qty: number; min_qty: number; location: string | null }>(
      'SELECT id, sku, item_name, category, current_qty, min_qty, location FROM inventory_items WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: itemId }]
    );
    if (items.length === 0) return Response.json({ error: 'error.not_found' }, { status: 404 });

    const movements = await getDb().query<{ id: number; movement_type: string; quantity: number; reference: string | null; notes: string | null; created_by: string | null; created_at: Date }>(
      'SELECT TOP 30 id, movement_type, quantity, reference, notes, created_by, created_at FROM inventory_movements WHERE item_id = @p0 ORDER BY created_at DESC',
      [{ name: 'p0', type: 'int', value: itemId }]
    );

    const i = items[0];
    return Response.json({
      item: { id: i.id, sku: i.sku, itemName: i.item_name, category: i.category, currentQty: i.current_qty, minQty: i.min_qty, location: i.location },
      movements: movements.map(m => ({
        id: m.id, movementType: m.movement_type, quantity: m.quantity,
        reference: m.reference, notes: m.notes, createdBy: m.created_by,
        createdAt: String(m.created_at),
      })),
    });
  } catch (err) {
    console.error('[Inventory API] GET item error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}

const MovementSchema = z.object({
  movementType: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().min(0.01),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// POST — add movement (bevét/kiadás) & update current_qty
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'inventory.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return Response.json({ error: 'api.error.invalid_id' }, { status: 400 });

  const body = await request.json() as unknown;
  const parsed = MovementSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? 'error.validation' }, { status: 400 });

  const { movementType, quantity, reference, notes } = parsed.data;

  try {
    // Insert movement
    await getDb().query(
      `INSERT INTO inventory_movements (item_id, movement_type, quantity, reference, notes, created_by)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5)`,
      [
        { name: 'p0', type: 'int', value: itemId },
        { name: 'p1', type: 'nvarchar', value: movementType },
        { name: 'p2', type: 'nvarchar', value: String(quantity) },
        { name: 'p3', type: 'nvarchar', value: reference ?? null },
        { name: 'p4', type: 'nvarchar', value: notes ?? null },
        { name: 'p5', type: 'nvarchar', value: auth.username },
      ]
    );

    // Update current_qty
    const delta = movementType === 'in' ? quantity : -quantity;
    await getDb().query(
      `UPDATE inventory_items SET current_qty = current_qty + @p0, updated_at = SYSDATETIME() WHERE id = @p1`,
      [
        { name: 'p0', type: 'nvarchar', value: String(delta) },
        { name: 'p1', type: 'int', value: itemId },
      ]
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[Inventory API] POST movement error:', err);
    return Response.json({ error: 'error.server' }, { status: 500 });
  }
}
