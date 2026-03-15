import { type NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { getDb } from '@/lib/db';
import * as ExcelJS from 'exceljs';

export const runtime = 'nodejs';

interface WorkforceExportRow {
  record_date: string;
  shift_name: string | null;
  area_name: string | null;
  planned_count: number;
  actual_count: number;
  absent_count: number;
  overtime_hours: number;
  overtime_workers: number;
  notes: string | null;
  recorded_by: string | null;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const SUM_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2D5A3D' },
};

// GET /api/modules/workforce/export?format=xlsx
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'workforce.view');
  if (!auth.valid) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'xlsx';

  if (format === 'pdf') {
    return Response.json({ error: 'PDF export not yet implemented' }, { status: 501 });
  }

  try {
    const db = getDb();
    const rows = await db.query<WorkforceExportRow>(
      `SELECT record_date, shift_name, area_name, planned_count, actual_count,
              absent_count, overtime_hours, overtime_workers, notes, recorded_by
       FROM workforce_daily
       ORDER BY record_date DESC, shift_name`
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AINOVA';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Workforce', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = [
      { header: 'Date', key: 'record_date', width: 12 },
      { header: 'Shift', key: 'shift_name', width: 14 },
      { header: 'Area', key: 'area_name', width: 18 },
      { header: 'Planned', key: 'planned_count', width: 10 },
      { header: 'Actual', key: 'actual_count', width: 10 },
      { header: 'Absent', key: 'absent_count', width: 10 },
      { header: 'Attendance %', key: 'attendance_pct', width: 14 },
      { header: 'OT Hours', key: 'overtime_hours', width: 10 },
      { header: 'OT Workers', key: 'overtime_workers', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Recorded By', key: 'recorded_by', width: 16 },
    ];

    // Header row styling
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 25;

    // Data rows
    rows.forEach((r, idx) => {
      const planned = Number(r.planned_count) || 0;
      const actual = Number(r.actual_count) || 0;
      const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;

      const excelRow = sheet.addRow({
        record_date: String(r.record_date).split('T')[0],
        shift_name: r.shift_name ?? '-',
        area_name: r.area_name ?? '-',
        planned_count: planned,
        actual_count: actual,
        absent_count: Number(r.absent_count) || 0,
        attendance_pct: pct,
        overtime_hours: Number(r.overtime_hours) || 0,
        overtime_workers: Number(r.overtime_workers) || 0,
        notes: r.notes ?? '',
        recorded_by: r.recorded_by ?? '',
      });

      // Attendance % formatting
      const pctCell = excelRow.getCell('attendance_pct');
      pctCell.numFmt = '0"%"';
      if (pct < 80) {
        pctCell.font = { bold: true, color: { argb: 'FFFF0000' } };
      } else if (pct < 95) {
        pctCell.font = { color: { argb: 'FFFF8C00' } };
      }

      // Alternating row colors
      if (idx % 2 === 1) {
        excelRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        });
      }
    });

    // Summary row
    const lastDataRow = rows.length + 1;
    const sumRow = sheet.addRow({});
    sumRow.getCell(1).value = 'TOTAL';
    sumRow.getCell(1).font = { bold: true };

    [4, 5, 6, 8, 9].forEach(col => {
      const cell = sumRow.getCell(col);
      const letter = String.fromCharCode(64 + col);
      cell.value = { formula: `SUM(${letter}2:${letter}${lastDataRow})` };
      cell.numFmt = '#,##0';
    });

    // Avg attendance %
    const avgCell = sumRow.getCell(7);
    avgCell.value = { formula: `AVERAGE(G2:G${lastDataRow})` };
    avgCell.numFmt = '0"%"';

    sumRow.eachCell(cell => {
      cell.fill = SUM_FILL;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: lastDataRow, column: 11 } };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="workforce-export-${dateStr}.xlsx"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[Workforce Export] Error:', err);
    return Response.json({ error: 'api.error.export' }, { status: 500 });
  }
}
