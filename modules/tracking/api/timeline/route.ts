import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface HistoryRow {
  id: number;
  item_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

// GET /api/modules/tracking/timeline?itemId=123
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'tracking.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return Response.json({ error: 'itemId is required' }, { status: 400 });
  }

  try {
    const db = getDb();
    const rows = await db.query<HistoryRow>(
      `SELECT id, item_id, old_status, new_status, changed_by, note, created_at
       FROM tracking_history
       WHERE item_id = @p0
       ORDER BY created_at ASC`,
      [{ name: 'p0', type: 'int', value: parseInt(itemId) }]
    );

    const timeline = rows.map(r => ({
      id: r.id,
      itemId: r.item_id,
      oldStatus: r.old_status,
      newStatus: r.new_status,
      changedBy: r.changed_by,
      note: r.note,
      createdAt: String(r.created_at),
    }));

    return Response.json({ timeline });
  } catch (err) {
    console.error('[Tracking Timeline] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
