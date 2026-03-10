/**
 * Excel Export Utility
 * Uses exceljs (already in dependencies) for server-side .xlsx generation.
 */
import ExcelJS from 'exceljs';

export interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
}

export interface ExcelExportOptions {
  title: string;
  sheetName?: string;
  companyName?: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  locale?: string;
}

/**
 * Generates an Excel buffer (.xlsx) from structured data.
 */
export async function generateExcelBuffer(options: ExcelExportOptions): Promise<Uint8Array> {
  const { title, sheetName, companyName, columns, rows, locale = 'hu' } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName ?? 'Ainova Cloud Core';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName ?? title.slice(0, 31));

  // Title row
  const titleRow = sheet.addRow([title]);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };
  sheet.mergeCells(1, 1, 1, columns.length);

  // Subtitle row
  const dateLabel = locale === 'hu' ? 'Létrehozva' : locale === 'de' ? 'Erstellt' : 'Generated';
  const subRow = sheet.addRow([`${dateLabel}: ${new Date().toLocaleString(locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-US' : 'hu-HU')}`]);
  subRow.font = { size: 10, color: { argb: 'FF64748B' } };
  sheet.mergeCells(2, 1, 2, columns.length);

  // Empty row
  sheet.addRow([]);

  // Header row
  const headerValues = columns.map(c => c.label);
  const headerRow = sheet.addRow(headerValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
    };
  });

  // Set column widths
  columns.forEach((col, idx) => {
    const excelCol = sheet.getColumn(idx + 1);
    excelCol.width = col.width ?? Math.max(col.label.length + 4, 15);
  });

  // Data rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const values = columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return val;
    });
    const dataRow = sheet.addRow(values);

    // Alternating row colors
    if (i % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    dataRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.font = { size: 11 };
    });
  }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  // Auto filter
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: columns.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Returns a Next.js Response with the Excel file.
 */
export async function createExcelResponse(options: ExcelExportOptions): Promise<Response> {
  const buffer = await generateExcelBuffer(options);
  const fileName = `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
