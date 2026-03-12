import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Demo environment auto-reset endpoint.
 * Called by Vercel Cron (vercel.json) every 24h.
 * Resets all module data tables to default demo state.
 *
 * Security: requires CRON_SECRET header matching env var.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const results: string[] = [];

    // Tables to reset (order matters for FK constraints)
    const tables = [
      'mod_dt_machines', 'mod_dt_layouts',
      'scheduling_allocations', 'scheduling_capacity',
      'shift_assignments', 'shift_definitions',
      'delivery_shipments',
      'quality_8d_reports', 'quality_inspections',
      'maintenance_log', 'maintenance_schedules', 'maintenance_assets',
      'performance_targets', 'performance_entries',
      'oee_records', 'oee_machines',
      'fleet_refuels', 'fleet_trips', 'fleet_vehicles',
      'inventory_movements', 'inventory_items',
      'tracking_history', 'tracking_items',
      'workforce_daily',
      'core_notifications', 'core_sync_events', 'core_audit_log',
      'reports_saved',
      'mod_plc_devices',
    ];

    for (const t of tables) {
      try {
        await db.execute(`DELETE FROM ${t}`, []);
        results.push(`✓ ${t}`);
      } catch {
        results.push(`- ${t} (skip)`);
      }
    }

    // Clear sessions (force re-login)
    try { await db.execute(`DELETE FROM core_sessions`, []); } catch { /* skip */ }

    // Reset non-admin users
    try {
      await db.execute(
        `DELETE FROM core_users WHERE username IN ('manager_hu','manager_de','operator1','operator2','operator3','ainova_owner')`,
        []
      );
    } catch { /* skip */ }

    results.push('✓ sessions + temp users cleared');
    console.log(`[ACI][demo-reset] Reset complete: ${results.length} operations`);

    return NextResponse.json({
      success: true,
      message: 'Demo environment reset. Run seed to repopulate.',
      timestamp: new Date().toISOString(),
      operations: results.length,
    });
  } catch (err) {
    console.error('[ACI][demo-reset] Error:', err);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
