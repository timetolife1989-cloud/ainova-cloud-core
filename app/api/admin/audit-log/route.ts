import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';

// GET /api/admin/audit-log?page=1&eventType=&username=&success=&dateFrom=&dateTo=
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'audit.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const page      = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize  = 50;
  const offset    = (page - 1) * pageSize;
  const eventType = searchParams.get('eventType');
  const username  = searchParams.get('username');
  const success   = searchParams.get('success');
  const dateFrom  = searchParams.get('dateFrom');
  const dateTo    = searchParams.get('dateTo');

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: Array<{ name: string; type: 'nvarchar' | 'bit' | 'datetime2' | 'int'; value: unknown; maxLength?: number }> = [];

  if (eventType) {
    conditions.push('event_type = @eventType');
    params.push({ name: 'eventType', type: 'nvarchar', value: eventType, maxLength: 50 });
  }
  if (username) {
    conditions.push('username LIKE @username');
    params.push({ name: 'username', type: 'nvarchar', value: `%${username}%`, maxLength: 110 });
  }
  if (success !== null && success !== '') {
    conditions.push('success = @success');
    params.push({ name: 'success', type: 'bit', value: success === 'true' ? 1 : 0 });
  }
  if (dateFrom) {
    conditions.push('created_at >= @dateFrom');
    params.push({ name: 'dateFrom', type: 'datetime2', value: new Date(dateFrom) });
  }
  if (dateTo) {
    conditions.push('created_at <= @dateTo');
    params.push({ name: 'dateTo', type: 'datetime2', value: new Date(dateTo) });
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [logs, countResult] = await Promise.all([
    getDb().query<{
      id: number;
      event_type: string;
      user_id: number | null;
      username: string | null;
      ip_address: string | null;
      details: string | null;
      success: number;
      created_at: Date;
    }>(
      `SELECT id, event_type, user_id, username, ip_address, details, success, created_at
       FROM core_audit_log ${where}
       ORDER BY created_at DESC
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      [...params,
        { name: 'offset',   type: 'int', value: offset   },
        { name: 'pageSize', type: 'int', value: pageSize  },
      ]
    ),
    getDb().query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM core_audit_log ${where}`,
      params
    ),
  ]);

  return Response.json({
    logs: logs.map(l => ({
      id:        l.id,
      eventType: l.event_type,
      userId:    l.user_id,
      username:  l.username,
      ipAddress: l.ip_address,
      details:   l.details,
      success:   Boolean(l.success),
      createdAt: l.created_at,
    })),
    total:    countResult[0]?.total ?? 0,
    page,
    pageSize,
  });
}
