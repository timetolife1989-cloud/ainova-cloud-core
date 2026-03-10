import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '@/lib/db';
import { ExcelImportAdapter } from './adapters/ExcelImportAdapter';
import { CsvImportAdapter } from './adapters/CsvImportAdapter';
import type { ImportConfig, ImportResult, DetectResult, IImportAdapter, ColumnMapping, ImportFilter } from './types';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

interface ImportConfigRow {
  id: number;
  config_name: string;
  module_id: string | null;
  file_type: string;
  target_table: string;
  column_mapping: string | null;
  filters: string | null;
  unit_id: number | null;
  detect_rules: string | null;
  is_active: boolean;
}

/**
 * Ensure upload directory exists.
 */
function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Save uploaded file to disk.
 */
export async function saveUploadedFile(file: File): Promise<string> {
  ensureUploadDir();

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${timestamp}_${safeName}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Get adapter based on file type.
 */
function getAdapter(fileType: string): IImportAdapter {
  switch (fileType) {
    case 'csv':
      return new CsvImportAdapter();
    case 'excel':
    default:
      return new ExcelImportAdapter();
  }
}

/**
 * Detect file type from extension.
 */
function detectFileTypeFromPath(filePath: string): 'excel' | 'csv' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return 'csv';
  return 'excel';
}

/**
 * Load all active import configs from database.
 */
export async function getAllImportConfigs(): Promise<ImportConfig[]> {
  try {
    const rows = await getDb().query<ImportConfigRow>(
      `SELECT id, config_name, module_id, file_type, target_table, 
              column_mapping, filters, unit_id, detect_rules, is_active
       FROM core_import_configs WHERE is_active = 1`
    );

    return rows.map(row => ({
      id: row.id,
      configName: row.config_name,
      moduleId: row.module_id,
      fileType: (row.file_type as 'excel' | 'csv' | 'json') ?? 'excel',
      targetTable: row.target_table,
      columnMapping: row.column_mapping ? JSON.parse(row.column_mapping) as ColumnMapping[] : [],
      filters: row.filters ? JSON.parse(row.filters) as ImportFilter[] : [],
      unitId: row.unit_id,
      detectRules: row.detect_rules ? JSON.parse(row.detect_rules) as Record<string, unknown> : null,
      isActive: Boolean(row.is_active),
    }));
  } catch (err) {
    console.error('[Import] Failed to load configs:', err);
    return [];
  }
}

/**
 * Load a single import config by ID.
 */
export async function getImportConfigById(configId: number): Promise<ImportConfig | null> {
  try {
    const rows = await getDb().query<ImportConfigRow>(
      `SELECT id, config_name, module_id, file_type, target_table, 
              column_mapping, filters, unit_id, detect_rules, is_active
       FROM core_import_configs WHERE id = @p0`,
      [{ name: 'p0', type: 'int', value: configId }]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      configName: row.config_name,
      moduleId: row.module_id,
      fileType: (row.file_type as 'excel' | 'csv' | 'json') ?? 'excel',
      targetTable: row.target_table,
      columnMapping: row.column_mapping ? JSON.parse(row.column_mapping) as ColumnMapping[] : [],
      filters: row.filters ? JSON.parse(row.filters) as ImportFilter[] : [],
      unitId: row.unit_id,
      detectRules: row.detect_rules ? JSON.parse(row.detect_rules) as Record<string, unknown> : null,
      isActive: Boolean(row.is_active),
    };
  } catch (err) {
    console.error('[Import] Failed to load config:', err);
    return null;
  }
}

/**
 * Detect file type and matching config.
 */
export async function detectFileType(filePath: string): Promise<DetectResult> {
  const fileType = detectFileTypeFromPath(filePath);
  const adapter = getAdapter(fileType);
  const configs = await getAllImportConfigs();

  return adapter.detect(filePath, configs);
}

/**
 * Read headers from file.
 */
export async function readFileHeaders(filePath: string): Promise<string[]> {
  const fileType = detectFileTypeFromPath(filePath);
  const adapter = getAdapter(fileType);
  return adapter.readHeaders(filePath);
}

/**
 * Process import with given config.
 */
export async function processImport(
  filePath: string,
  configId: number,
  username: string
): Promise<ImportResult> {
  const config = await getImportConfigById(configId);
  if (!config) {
    return {
      success: false,
      totalRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      durationMs: 0,
      errors: ['Import konfiguráció nem található'],
    };
  }

  const adapter = getAdapter(config.fileType);
  const result = await adapter.process(filePath, config, username);

  // Log import result
  try {
    await getDb().query(
      `INSERT INTO core_import_log 
       (config_id, config_name, filename, rows_total, rows_inserted, rows_updated, rows_skipped, duration_ms, imported_by, status, error_message)
       VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10)`,
      [
        { name: 'p0', type: 'int', value: configId },
        { name: 'p1', type: 'nvarchar', value: config.configName },
        { name: 'p2', type: 'nvarchar', value: path.basename(filePath) },
        { name: 'p3', type: 'int', value: result.totalRows },
        { name: 'p4', type: 'int', value: result.insertedRows },
        { name: 'p5', type: 'int', value: result.updatedRows },
        { name: 'p6', type: 'int', value: result.skippedRows },
        { name: 'p7', type: 'int', value: result.durationMs },
        { name: 'p8', type: 'nvarchar', value: username },
        { name: 'p9', type: 'nvarchar', value: result.success ? 'success' : (result.errors.length > 0 ? 'partial' : 'error') },
        { name: 'p10', type: 'nvarchar', value: result.errors.slice(0, 10).join('\n') || null },
      ]
    );
  } catch (err) {
    console.error('[Import] Failed to log import:', err);
  }

  return result;
}

/**
 * Clean up uploaded file after processing.
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}
