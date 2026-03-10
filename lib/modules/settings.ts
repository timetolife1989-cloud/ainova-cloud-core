import { getDb } from '@/lib/db';

interface ModuleSettingRow {
  setting_key: string;
  setting_value: string | null;
}

/**
 * Egy modul beállítás lekérése.
 */
export async function getModuleSetting(moduleId: string, key: string): Promise<string | null> {
  try {
    const rows = await getDb().query<ModuleSettingRow>(
      `SELECT setting_value FROM core_module_settings WHERE module_id = @p0 AND setting_key = @p1`,
      [
        { name: 'p0', type: 'nvarchar', value: moduleId },
        { name: 'p1', type: 'nvarchar', value: key },
      ]
    );
    return rows[0]?.setting_value ?? null;
  } catch (err) {
    console.error('[ModuleSettings] Failed to get setting:', err);
    return null;
  }
}

/**
 * Egy modul beállítás mentése (upsert).
 */
export async function setModuleSetting(
  moduleId: string,
  key: string,
  value: string,
  updatedBy?: string
): Promise<void> {
  try {
    await getDb().query(
      `MERGE core_module_settings AS target
       USING (SELECT @p0 AS module_id, @p1 AS setting_key) AS source
       ON target.module_id = source.module_id AND target.setting_key = source.setting_key
       WHEN MATCHED THEN
         UPDATE SET setting_value = @p2, updated_by = @p3, updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (module_id, setting_key, setting_value, updated_by)
         VALUES (@p0, @p1, @p2, @p3);`,
      [
        { name: 'p0', type: 'nvarchar', value: moduleId },
        { name: 'p1', type: 'nvarchar', value: key },
        { name: 'p2', type: 'nvarchar', value: value },
        { name: 'p3', type: 'nvarchar', value: updatedBy ?? null },
      ]
    );
  } catch (err) {
    console.error('[ModuleSettings] Failed to set setting:', err);
    throw err;
  }
}

/**
 * Egy modul összes beállításának lekérése.
 */
export async function getAllModuleSettings(moduleId: string): Promise<Record<string, string>> {
  try {
    const rows = await getDb().query<ModuleSettingRow>(
      `SELECT setting_key, setting_value FROM core_module_settings WHERE module_id = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: moduleId }]
    );

    const result: Record<string, string> = {};
    for (const row of rows) {
      if (row.setting_value !== null) {
        result[row.setting_key] = row.setting_value;
      }
    }
    return result;
  } catch (err) {
    console.error('[ModuleSettings] Failed to get all settings:', err);
    return {};
  }
}
