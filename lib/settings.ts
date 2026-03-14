import { getDb } from '@/lib/db';

// ── Settings cache (30s TTL) ──
const _settingsCache = new Map<string, { value: string | null; at: number }>();
const SETTINGS_CACHE_TTL = 30_000;

export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = _settingsCache.get(key);
  if (cached && (now - cached.at) < SETTINGS_CACHE_TTL) {
    return cached.value;
  }

  const rows = await getDb().query<{ setting_value: string | null }>(
    'SELECT setting_value FROM core_settings WHERE setting_key = @key',
    [{ name: 'key', type: 'nvarchar', value: key, maxLength: 100 }]
  );
  const value = rows[0]?.setting_value ?? null;
  _settingsCache.set(key, { value, at: now });
  return value;
}

export function clearSettingsCache(): void {
  _settingsCache.clear();
}

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  // Invalidate cache for this key
  _settingsCache.delete(key);
  const db = getDb();
  const params = [
    { name: 'key',       type: 'nvarchar' as const, value: key,               maxLength: 100 },
    { name: 'value',     type: 'nvarchar' as const, value: value },
    { name: 'updatedBy', type: 'nvarchar' as const, value: updatedBy ?? null,  maxLength: 100 },
  ];

  // Try UPDATE first
  const result = await db.execute(
    `UPDATE core_settings SET setting_value = @value, updated_by = @updatedBy, updated_at = SYSDATETIME() WHERE setting_key = @key`,
    params
  );

  // If no row matched, INSERT
  if (result.rowsAffected === 0) {
    await db.execute(
      `INSERT INTO core_settings (setting_key, setting_value, updated_by) VALUES (@key, @value, @updatedBy)`,
      params
    );
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await getDb().query<{ setting_key: string; setting_value: string | null }>(
    'SELECT setting_key, setting_value FROM core_settings ORDER BY setting_key'
  );
  const result: Record<string, string> = {};
  const now = Date.now();
  for (const r of rows) {
    const value = r.setting_value ?? '';
    result[r.setting_key] = value;
    // Warm per-key cache
    _settingsCache.set(r.setting_key, { value: r.setting_value, at: now });
  }
  return result;
}

/**
 * Fetch multiple settings in a single DB query.
 * Populates the per-key cache for subsequent getSetting() calls.
 */
export async function getSettingsBulk(keys: string[]): Promise<Record<string, string | null>> {
  if (keys.length === 0) return {};

  const now = Date.now();
  const result: Record<string, string | null> = {};
  const missing: string[] = [];

  // Check cache first
  for (const key of keys) {
    const cached = _settingsCache.get(key);
    if (cached && (now - cached.at) < SETTINGS_CACHE_TTL) {
      result[key] = cached.value;
    } else {
      missing.push(key);
    }
  }

  // Fetch only missing keys from DB
  if (missing.length > 0) {
    const placeholders = missing.map((_, i) => `@p${i}`).join(', ');
    const params = missing.map((key, i) => ({
      name: `p${i}`,
      type: 'nvarchar' as const,
      value: key,
      maxLength: 100,
    }));

    const rows = await getDb().query<{ setting_key: string; setting_value: string | null }>(
      `SELECT setting_key, setting_value FROM core_settings WHERE setting_key IN (${placeholders})`,
      params
    );

    const fetchedNow = Date.now();
    const fetched = new Map(rows.map(r => [r.setting_key, r.setting_value]));
    for (const key of missing) {
      const value = fetched.get(key) ?? null;
      result[key] = value;
      _settingsCache.set(key, { value, at: fetchedNow });
    }
  }

  return result;
}
