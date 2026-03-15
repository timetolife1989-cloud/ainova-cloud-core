import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

interface OeeRow {
  machine_id: number;
  machine_name: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

// GET /api/modules/digital-twin/oee?layoutId=1
// Returns current OEE values per machine (joined from OEE module if available)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'digital-twin.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const layoutId = searchParams.get('layoutId');

  try {
    const db = getDb();

    // Check if oee_records table exists (OEE module may not be installed)
    const tableCheck = await db.query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'oee_records'`,
      []
    );

    if (Number(tableCheck[0]?.cnt) === 0) {
      return Response.json({ oee: [], source: 'unavailable' });
    }

    let sql = `SELECT 
        m.id AS machine_id, m.name AS machine_name,
        ISNULL(o.availability, 0) AS availability,
        ISNULL(o.performance, 0) AS performance,
        ISNULL(o.quality, 0) AS quality,
        ISNULL(o.availability * o.performance * o.quality / 10000, 0) AS oee
      FROM mod_dt_machines m
      LEFT JOIN (
        SELECT machine_id, availability, performance, quality,
               ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY recorded_at DESC) AS rn
        FROM oee_records
      ) o ON o.machine_id = m.linked_oee_id AND o.rn = 1
      WHERE 1=1`;

    const params: Array<{ name: string; type: 'int'; value: unknown }> = [];

    if (layoutId) {
      sql += ' AND m.layout_id = @p0';
      params.push({ name: 'p0', type: 'int', value: parseInt(layoutId) });
    }

    sql += ' ORDER BY m.name';
    const rows = await db.query<OeeRow>(sql, params);

    return Response.json({
      oee: rows.map(r => ({
        machineId: r.machine_id,
        machineName: r.machine_name,
        availability: Math.round(Number(r.availability) * 100) / 100,
        performance: Math.round(Number(r.performance) * 100) / 100,
        quality: Math.round(Number(r.quality) * 100) / 100,
        oee: Math.round(Number(r.oee) * 100) / 100,
      })),
      source: 'oee_records',
    });
  } catch (err) {
    console.error('[DigitalTwin OEE] GET error:', err);
    return Response.json({ error: 'api.error.data_get' }, { status: 500 });
  }
}
