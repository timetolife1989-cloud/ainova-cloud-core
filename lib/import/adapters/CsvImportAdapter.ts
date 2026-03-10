import * as fs from 'fs';
import { getDb } from '@/lib/db';
import type { IImportAdapter, ImportConfig, ImportResult, DetectResult, ColumnMapping } from '../types';

export class CsvImportAdapter implements IImportAdapter {
  private delimiter = ';'; // EU default, can be configured

  async readHeaders(filePath: string): Promise<string[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length === 0) return [];

    const firstLine = lines[0].trim();
    // Auto-detect delimiter
    if (firstLine.includes('\t')) {
      this.delimiter = '\t';
    } else if (firstLine.split(',').length > firstLine.split(';').length) {
      this.delimiter = ',';
    }

    return firstLine.split(this.delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  }

  async detect(filePath: string, configs: ImportConfig[]): Promise<DetectResult> {
    const headers = await this.readHeaders(filePath);
    if (headers.length === 0) {
      return { configId: null, configName: null, confidence: 0, detectedColumns: [] };
    }

    let bestMatch: DetectResult = { configId: null, configName: null, confidence: 0, detectedColumns: headers };

    for (const config of configs) {
      if (config.fileType !== 'csv') continue;

      const mappedSources = config.columnMapping.map(m => m.source.toLowerCase());
      const headerLower = headers.map(h => h.toLowerCase());

      let matchCount = 0;
      for (const source of mappedSources) {
        if (headerLower.includes(source)) matchCount++;
      }

      const confidence = mappedSources.length > 0
        ? Math.round((matchCount / mappedSources.length) * 100)
        : 0;

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          configId: config.id,
          configName: config.configName,
          confidence,
          detectedColumns: headers,
        };
      }
    }

    return bestMatch;
  }

  async process(filePath: string, config: ImportConfig, username: string): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalRows = 0;
    let insertedRows = 0;
    let skippedRows = 0;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        return {
          success: false,
          totalRows: 0,
          insertedRows: 0,
          updatedRows: 0,
          skippedRows: 0,
          durationMs: Date.now() - startTime,
          errors: ['A fájl üres vagy csak fejlécet tartalmaz'],
        };
      }

      // Parse headers
      const headers = lines[0].split(this.delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      const columnIndexMap = new Map<string, number>();
      headers.forEach((h, idx) => {
        columnIndexMap.set(h.toLowerCase(), idx);
      });

      const db = getDb();

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        totalRows++;
        const values = line.split(this.delimiter).map(v => v.trim().replace(/^"|"$/g, ''));

        try {
          const rowData: Record<string, unknown> = {};
          let skipRow = false;

          for (const mapping of config.columnMapping) {
            const colIdx = columnIndexMap.get(mapping.source.toLowerCase());
            if (colIdx === undefined) {
              if (mapping.required) {
                skipRow = true;
                break;
              }
              continue;
            }

            const value = values[colIdx] ?? '';
            const transformedValue = this.transformValue(value, mapping);
            rowData[mapping.target] = transformedValue;
          }

          // Apply filters
          for (const filter of config.filters) {
            const colIdx = columnIndexMap.get(filter.column.toLowerCase());
            if (colIdx === undefined) continue;

            const cellValue = values[colIdx] ?? '';
            if (!this.matchesFilter(cellValue, filter.operator, filter.value)) {
              skipRow = true;
              break;
            }
          }

          if (skipRow) {
            skippedRows++;
            continue;
          }

          // Build INSERT statement
          const columns = Object.keys(rowData);
          const vals = Object.values(rowData);
          const placeholders = columns.map((_, idx) => `@p${idx}`);

          const sql = `INSERT INTO ${config.targetTable} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
          const params = vals.map((v, idx) => ({
            name: `p${idx}`,
            type: 'nvarchar' as const,
            value: v === null || v === undefined ? null : String(v),
          }));

          await db.query(sql, params);
          insertedRows++;
        } catch (err) {
          errors.push(`Sor ${i + 1}: ${(err as Error).message}`);
          skippedRows++;
        }
      }

      return {
        success: errors.length === 0,
        totalRows,
        insertedRows,
        updatedRows: 0,
        skippedRows,
        durationMs: Date.now() - startTime,
        errors,
      };
    } catch (err) {
      return {
        success: false,
        totalRows,
        insertedRows,
        updatedRows: 0,
        skippedRows,
        durationMs: Date.now() - startTime,
        errors: [(err as Error).message],
      };
    }
  }

  private transformValue(value: string, mapping: ColumnMapping): unknown {
    if (!value) return null;

    let strValue = value;

    if (mapping.transform) {
      switch (mapping.transform) {
        case 'trim':
          strValue = strValue.trim();
          break;
        case 'uppercase':
          strValue = strValue.toUpperCase();
          break;
        case 'lowercase':
          strValue = strValue.toLowerCase();
          break;
      }
    }

    switch (mapping.type) {
      case 'number':
        return parseInt(strValue, 10) || 0;
      case 'float':
        return parseFloat(strValue.replace(',', '.')) || 0;
      case 'boolean':
        return strValue.toLowerCase() === 'true' || strValue === '1';
      case 'date':
        return new Date(strValue);
      default:
        return strValue;
    }
  }

  private matchesFilter(value: string, operator: string, filterValue: string): boolean {
    const v = value.toLowerCase();
    const f = filterValue.toLowerCase();

    switch (operator) {
      case '=':
        return v === f;
      case '!=':
        return v !== f;
      case 'contains':
        return v.includes(f);
      case 'starts_with':
        return v.startsWith(f);
      case 'in':
        return f.split(',').map(s => s.trim()).includes(v);
      default:
        return true;
    }
  }
}
