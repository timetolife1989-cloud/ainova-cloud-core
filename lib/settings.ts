import { getDb } from '@/lib/db';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await getDb().query<{ setting_value: string | null }>(
    'SELECT setting_value FROM core_settings WHERE setting_key = @key',
    [{ name: 'key', type: 'nvarchar', value: key, maxLength: 100 }]
  );
  return rows[0]?.setting_value ?? null;
}

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
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
  return Object.fromEntries(
    rows.map(r => [r.setting_key, r.setting_value ?? ''])
  );
}
