import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import { getActiveModuleIds } from '@/lib/modules/registry';
import { DEPLOYMENT_FLAVOR, DEPLOYMENT_FLAVOR_LABEL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'admin.access');
  if (!auth.valid) return auth.response;

  const db = getDb();

  // DB health check
  let dbStatus: 'connected' | 'error' = 'error';
  let dbResponseMs: number | null = null;
  let userCount = 0;
  let activeUserCount = 0;
  let activeSessionCount = 0;
  let settingsCount = 0;

  try {
    const start = Date.now();
    await db.query('SELECT 1 AS ping');
    dbResponseMs = Date.now() - start;
    dbStatus = 'connected';

    // Parallel stats queries
    const [users, sessions, settings] = await Promise.all([
      db.query<{ total: number; active: number }>(
        'SELECT COUNT(*) AS total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active FROM core_users'
      ),
      db.query<{ active: number }>(
        'SELECT COUNT(*) AS active FROM core_sessions WHERE expires_at > SYSDATETIME()'
      ),
      db.query<{ total: number }>(
        'SELECT COUNT(*) AS total FROM core_settings'
      ),
    ]);

    userCount          = Number(users[0]?.total  ?? 0);
    activeUserCount    = Number(users[0]?.active ?? 0);
    activeSessionCount = Number(sessions[0]?.active ?? 0);
    settingsCount      = Number(settings[0]?.total ?? 0);
  } catch { /* already error */ }

  const activeModules = await getActiveModuleIds().catch(() => []);

  return Response.json({
    db: {
      status:     dbStatus,
      responseMs: dbResponseMs,
    },
    users: {
      total:  userCount,
      active: activeUserCount,
    },
    sessions: {
      active: activeSessionCount,
    },
    settings: {
      count: settingsCount,
    },
    modules: {
      active: activeModules,
      count:  activeModules.length,
    },
    node: {
      version:         process.version,
      uptime:          Math.round(process.uptime()),
      uptimeFormatted: formatUptime(process.uptime()),
    },
    deployment: {
      flavor:      DEPLOYMENT_FLAVOR,
      flavorLabel: DEPLOYMENT_FLAVOR_LABEL[DEPLOYMENT_FLAVOR],
    },
    timestamp: new Date().toISOString(),
  });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}n ${h}ó ${m}p`;
  if (h > 0) return `${h}ó ${m}p ${s}mp`;
  return `${m}p ${s}mp`;
}
