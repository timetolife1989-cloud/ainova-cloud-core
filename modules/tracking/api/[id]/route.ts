import { type NextRequest } from 'next/server';
import { checkCsrf } from '@/lib/api-utils';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { z } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'tracking.view');
  if (!auth.valid) return auth.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  try {
    const rows = await getDb().query<{ id: number; reference_code: string | null; title: string; description: string | null; status: string; priority: string; assigned_to: string | null; quantity: number | null; due_date: Date | null; completed_at: Date | null; created_by: string | null; created_at: Date }>(
      'SELECT * FROM tracking_items WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: itemId }]
    );

    if (rows.length === 0) {
      return Response.json({ error: 'Nem található' }, { status: 404 });
    }

    const r = rows[0];
    return Response.json({
      id: r.id,
      referenceCode: r.reference_code,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      assignedTo: r.assigned_to,
      quantity: r.quantity,
      dueDate: r.due_date ? String(r.due_date).split('T')[0] : null,
      completedAt: r.completed_at ? String(r.completed_at) : null,
      createdBy: r.created_by,
      createdAt: String(r.created_at),
    });
  } catch (err) {
    console.error('[Tracking API] GET by ID error:', err);
    return Response.json({ error: 'Hiba' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  referenceCode: z.string().max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assignedTo: z.string().max(100).optional().nullable(),
  quantity: z.number().min(0).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'tracking.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  const body = await request.json() as unknown;
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Érvénytelen adatok' }, { status: 400 });
  }

  const { status, ...rest } = parsed.data;

  try {
    // Get old status for history
    let oldStatus: string | null = null;
    if (status) {
      const current = await getDb().query<{ status: string }>(
        'SELECT status FROM tracking_items WHERE id = @p0',
        [{ name: 'p0', type: 'int', value: itemId }]
      );
      oldStatus = current[0]?.status ?? null;
    }

    const updates: string[] = ['updated_at = SYSDATETIME()'];
    const params: Array<{ name: string; type: 'nvarchar' | 'int'; value: unknown }> = [
      { name: 'id', type: 'int', value: itemId },
    ];
    let paramIdx = 0;

    if (rest.referenceCode !== undefined) {
      updates.push(`reference_code = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.referenceCode });
      paramIdx++;
    }
    if (rest.title !== undefined) {
      updates.push(`title = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.title });
      paramIdx++;
    }
    if (rest.description !== undefined) {
      updates.push(`description = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.description });
      paramIdx++;
    }
    if (status !== undefined) {
      updates.push(`status = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: status });
      paramIdx++;
      
      // Mark completed if status is final
      if (status === 'Kész' || status === 'Lezárt') {
        updates.push('completed_at = SYSDATETIME()');
      }
    }
    if (rest.priority !== undefined) {
      updates.push(`priority = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.priority });
      paramIdx++;
    }
    if (rest.assignedTo !== undefined) {
      updates.push(`assigned_to = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.assignedTo });
      paramIdx++;
    }
    if (rest.quantity !== undefined) {
      updates.push(`quantity = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: String(rest.quantity) });
      paramIdx++;
    }
    if (rest.dueDate !== undefined) {
      updates.push(`due_date = @p${paramIdx}`);
      params.push({ name: `p${paramIdx}`, type: 'nvarchar', value: rest.dueDate });
      paramIdx++;
    }

    await getDb().query(
      `UPDATE tracking_items SET ${updates.join(', ')} WHERE id = @id`,
      params
    );

    // Log status change
    if (status && oldStatus && status !== oldStatus) {
      await getDb().query(
        `INSERT INTO tracking_history (item_id, old_status, new_status, changed_by)
         VALUES (@p0, @p1, @p2, @p3)`,
        [
          { name: 'p0', type: 'int', value: itemId },
          { name: 'p1', type: 'nvarchar', value: oldStatus },
          { name: 'p2', type: 'nvarchar', value: status },
          { name: 'p3', type: 'nvarchar', value: auth.username },
        ]
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Tracking API] PUT error:', err);
    return Response.json({ error: 'Hiba a módosításkor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await checkAuth(request, 'tracking.edit');
  if (!auth.valid) return auth.response;

  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const { id } = await context.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) {
    return Response.json({ error: 'Érvénytelen azonosító' }, { status: 400 });
  }

  try {
    await getDb().query(
      'DELETE FROM tracking_items WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: itemId }]
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[Tracking API] DELETE error:', err);
    return Response.json({ error: 'Hiba a törléskor' }, { status: 500 });
  }
}
