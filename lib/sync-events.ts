import { getDb } from '@/lib/db';

export type SyncEventStatus = 'success' | 'error' | 'warning' | 'info';
export type SyncEventType =
  | 'import_start'
  | 'import_success'
  | 'import_error'
  | 'sync_error'
  | 'sync_success';

export interface SyncEvent {
  id: number;
  moduleId: string;
  eventType: SyncEventType;
  status: SyncEventStatus;
  message: string | null;
  details: string | null;
  rowsAffected: number | null;
  triggeredBy: string | null;
  createdAt: Date;
}

export interface SyncStatusSummary {
  /** Overall health: green = all ok, yellow = warnings, red = errors */
  health: 'ok' | 'warning' | 'error' | 'unknown';
  /** Last sync event timestamp */
  lastEventAt: Date | null;
  /** Latest error message (if any) */
  lastError: string | null;
  /** Count of errors in the last 24h */
  errorCount24h: number;
  /** Count of successful imports in the last 24h */
  successCount24h: number;
  /** Per-module summary */
  modules: ModuleSyncStatus[];
}

export interface ModuleSyncStatus {
  moduleId: string;
  lastEventAt: Date | null;
  lastStatus: SyncEventStatus | null;
  lastMessage: string | null;
  errorCount24h: number;
}

/**
 * Write a sync event. Call this from any import/sync handler.
 * Non-blocking — errors are swallowed so they never break the import flow.
 */
export async function writeSyncEvent(
  moduleId: string,
  eventType: SyncEventType,
  status: SyncEventStatus,
  opts?: {
    message?: string;
    details?: string;
    rowsAffected?: number;
    triggeredBy?: string;
  }
): Promise<void> {
  try {
    await getDb().execute(
      `INSERT INTO core_sync_events
         (module_id, event_type, status, message, details, rows_affected, triggered_by)
       VALUES (@moduleId, @eventType, @status, @message, @details, @rowsAffected, @triggeredBy)`,
      [
        { name: 'moduleId',     type: 'nvarchar', value: moduleId,                    maxLength: 50  },
        { name: 'eventType',    type: 'nvarchar', value: eventType,                   maxLength: 50  },
        { name: 'status',       type: 'nvarchar', value: status,                      maxLength: 20  },
        { name: 'message',      type: 'nvarchar', value: opts?.message   ?? null,     maxLength: 500 },
        { name: 'details',      type: 'nvarchar', value: opts?.details   ?? null                    },
        { name: 'rowsAffected', type: 'int',      value: opts?.rowsAffected ?? null                 },
        { name: 'triggeredBy',  type: 'nvarchar', value: opts?.triggeredBy ?? null,   maxLength: 100 },
      ]
    );
  } catch (err) {
    // Non-blocking: log but never throw
    console.warn('[SyncEvents] Failed to write sync event:', err);
  }
}

/**
 * Get overall sync status summary for the admin panel widget.
 * Returns 'unknown' health if DB is unreachable.
 */
export async function getSyncStatusSummary(): Promise<SyncStatusSummary> {
  try {
    // Overall 24h stats
    const overallRows = await getDb().query<{
      errorCount24h: number;
      successCount24h: number;
      lastEventAt: Date | null;
    }>(
      `SELECT
         SUM(CASE WHEN status = 'error' AND created_at >= DATEADD(HOUR, -24, SYSDATETIME()) THEN 1 ELSE 0 END) AS errorCount24h,
         SUM(CASE WHEN status = 'success' AND created_at >= DATEADD(HOUR, -24, SYSDATETIME()) THEN 1 ELSE 0 END) AS successCount24h,
         MAX(created_at) AS lastEventAt
       FROM core_sync_events`
    );

    // Latest error
    const lastErrorRows = await getDb().query<{ message: string }>(
      `SELECT TOP 1 message FROM core_sync_events
       WHERE status = 'error'
       ORDER BY created_at DESC`
    );

    // Per-module summary
    const moduleRows = await getDb().query<{
      moduleId: string;
      lastEventAt: Date | null;
      lastStatus: SyncEventStatus | null;
      lastMessage: string | null;
      errorCount24h: number;
    }>(
      `SELECT
         module_id AS moduleId,
         MAX(created_at) AS lastEventAt,
         MAX(CASE WHEN created_at = (SELECT MAX(created_at) FROM core_sync_events s2 WHERE s2.module_id = s.module_id) THEN status END) AS lastStatus,
         MAX(CASE WHEN created_at = (SELECT MAX(created_at) FROM core_sync_events s2 WHERE s2.module_id = s.module_id) THEN message END) AS lastMessage,
         SUM(CASE WHEN status = 'error' AND created_at >= DATEADD(HOUR, -24, SYSDATETIME()) THEN 1 ELSE 0 END) AS errorCount24h
       FROM core_sync_events s
       GROUP BY module_id`
    );

    const overall = overallRows[0];
    const errorCount24h = Number(overall?.errorCount24h ?? 0);
    const successCount24h = Number(overall?.successCount24h ?? 0);

    let health: 'ok' | 'warning' | 'error' | 'unknown' = 'unknown';
    if (overall?.lastEventAt) {
      if (errorCount24h > 0) health = 'error';
      else if (successCount24h > 0) health = 'ok';
      else health = 'warning';
    }

    return {
      health,
      lastEventAt: overall?.lastEventAt ?? null,
      lastError: lastErrorRows[0]?.message ?? null,
      errorCount24h,
      successCount24h,
      modules: moduleRows.map(r => ({
        moduleId: r.moduleId,
        lastEventAt: r.lastEventAt,
        lastStatus: r.lastStatus,
        lastMessage: r.lastMessage,
        errorCount24h: Number(r.errorCount24h ?? 0),
      })),
    };
  } catch {
    return {
      health: 'unknown',
      lastEventAt: null,
      lastError: 'Failed to retrieve sync status',
      errorCount24h: 0,
      successCount24h: 0,
      modules: [],
    };
  }
}
