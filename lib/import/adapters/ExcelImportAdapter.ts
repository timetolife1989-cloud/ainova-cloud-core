import ExcelJS from 'exceljs';
import { getDb } from '@/lib/db';
import type { IImportAdapter, ImportConfig, ImportResult, DetectResult, ColumnMapping } from '../types';

export class ExcelImportAdapter implements IImportAdapter {
  async readHeaders(filePath: string): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) return [];

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });

    return headers.filter(h => h !== '');
  }

  async detect(filePath: string, configs: ImportConfig[]): Promise<DetectResult> {
    const headers = await this.readHeaders(filePath);
    if (headers.length === 0) {
      return { configId: null, configName: null, confidence: 0, detectedColumns: [] };
    }

    let bestMatch: DetectResult = { configId: null, configName: null, confidence: 0, detectedColumns: headers };

    for (const config of configs) {
      if (config.fileType !== 'excel') continue;

      // Check column mapping match
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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        return {
          success: false,
          totalRows: 0,
          insertedRows: 0,
          updatedRows: 0,
          skippedRows: 0,
          durationMs: Date.now() - startTime,
          errors: ['No worksheet found in file'],
        };
      }

      // Get headers
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value ?? '').trim();
      });

      // Build column index map
      const columnIndexMap = new Map<string, number>();
      headers.forEach((h, idx) => {
        columnIndexMap.set(h.toLowerCase(), idx);
      });

      const db = getDb();

      // Process rows
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        totalRows++;

        try {
          // Extract values based on column mapping
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

            let value = row.getCell(colIdx + 1).value;

            // Apply transforms
            const transformedValue = this.transformValue(value, mapping);
            rowData[mapping.target] = transformedValue;
          }

          // Apply filters
          for (const filter of config.filters) {
            const colIdx = columnIndexMap.get(filter.column.toLowerCase());
            if (colIdx === undefined) continue;

            const cellValue = String(row.getCell(colIdx + 1).value ?? '');
            if (!this.matchesFilter(cellValue, filter.operator, filter.value)) {
              skipRow = true;
              break;
            }
          }

          if (skipRow) {
            skippedRows++;
            return;
          }

          // Build INSERT statement
          const columns = Object.keys(rowData);
          const values = Object.values(rowData);
          const placeholders = columns.map((_, i) => `@p${i}`);

          const sql = `INSERT INTO ${config.targetTable} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
          const params = values.map((v, i) => ({
            name: `p${i}`,
            type: 'nvarchar' as const,
            value: v === null || v === undefined ? null : String(v),
          }));

          // Queue for batch insert (simplified: immediate insert)
          db.query(sql, params).catch(err => {
            errors.push(`Row ${rowNumber}: ${(err as Error).message}`);
          });

          insertedRows++;
        } catch (err) {
          errors.push(`Row ${rowNumber}: ${(err as Error).message}`);
          skippedRows++;
        }
      });

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

  private transformValue(value: unknown, mapping: ColumnMapping): unknown {
    if (value === null || value === undefined) return null;

    let strValue = String(value);

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
        if (value instanceof Date) return value;
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
