// =====================================================================
// Ainova Cloud Core - Health Check Endpoint
// =====================================================================
// Route:    GET /api/health
// Response: { status, db: { status, responseMs }, uptime, version, timestamp }
// =====================================================================

import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbResponseMs: number | null = null;

  try {
    const start = Date.now();
    await db.query('SELECT 1 AS ping');
    dbResponseMs = Date.now() - start;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'error';
  }

  return Response.json({
    status: 'ok',
    db: {
      status:     dbStatus,
      responseMs: dbResponseMs,
    },
    uptime:    Math.round(process.uptime()),
    version:   process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
