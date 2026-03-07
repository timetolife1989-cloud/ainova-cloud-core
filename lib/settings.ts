import { getDb } from '@/lib/db';

export async function getSetting(key: string): Promise<string | null> {
  const rows = await getDb().query<{ setting_value: string | null }>(
    'SELECT setting_value FROM core_settings WHERE setting_key = @key',
    [{ name: 'key', type: 'nvarchar', value: key, maxLength: 100 }]
  );
  return rows[0]?.setting_value ?? null;
}

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  await getDb().execute(
    `MERGE core_settings AS target
     USING (SELECT @key AS setting_key) AS source ON target.setting_key = source.setting_key
     WHEN MATCHED THEN
       UPDATE SET setting_value = @value, updated_at = SYSDATETIME(), updated_by = @updatedBy
     WHEN NOT MATCHED THEN
       INSERT (setting_key, setting_value, updated_by) VALUES (@key, @value, @updatedBy);`,
    [
      { name: 'key',       type: 'nvarchar', value: key,               maxLength: 100 },
      { name: 'value',     type: 'nvarchar', value: value },
      { name: 'updatedBy', type: 'nvarchar', value: updatedBy ?? null,  maxLength: 100 },
    ]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await getDb().query<{ setting_key: string; setting_value: string | null }>(
    'SELECT setting_key, setting_value FROM core_settings ORDER BY setting_key'
  );
  return Object.fromEntries(
    rows.map(r => [r.setting_key, r.setting_value ?? ''])
  );
}
