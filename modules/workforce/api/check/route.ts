import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

/**
 * GET /api/modules/workforce/check?date=YYYY-MM-DD&shift=shiftName
 * Check if workforce data already exists for a given date+shift.
 * Used for overwrite protection before saving.
 */
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'workforce.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const shift = searchParams.get('shift');

  if (!date || !shift) {
    return Response.json({ error: 'date and shift required' }, { status: 400 });
  }

  try {
    const rows = await getDb().query<{
      id: number;
      recorded_by: string | null;
      created_at: string;
      updated_at: string | null;
    }>(
      `SELECT id, recorded_by, created_at, updated_at
       FROM workforce_daily
       WHERE record_date = @p0 AND shift_name = @p1
       ORDER BY created_at DESC`,
      [
        { name: 'p0', type: 'nvarchar', value: date },
        { name: 'p1', type: 'nvarchar', value: shift },
      ]
    );

    if (rows.length === 0) {
      return Response.json({ exists: false });
    }

    return Response.json({
      exists: true,
      count: rows.length,
      lastRecord: {
        id: rows[0].id,
        savedBy: rows[0].recorded_by ?? 'unknown',
        savedAt: rows[0].updated_at ?? rows[0].created_at,
      },
    });
  } catch (err) {
    console.error('[Workforce API] Check error:', err);
    return Response.json({ error: 'api.error.check' }, { status: 500 });
  }
}
