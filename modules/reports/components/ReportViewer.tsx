'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { X, Download } from 'lucide-react';

interface ReportViewerProps {
  reportId: number;
  reportName: string;
  chartType: string;
  onClose: () => void;
}

interface QueryMeta {
  total: number;
  table: string;
  dateColumn: string;
  numericColumns: string[];
  groupColumns: string[];
  chartType: string;
  dateRange: { from: string; to: string };
}

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function formatColumnName(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ReportViewer({ reportId, reportName, chartType, onClose }: ReportViewerProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [meta, setMeta] = useState<QueryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/modules/reports/query?id=${reportId}`);
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Failed to load data');
      }
      const json = await res.json() as { rows: Record<string, unknown>[]; meta: QueryMeta };
      setRows(json.rows);
      setMeta(json.meta);
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Prepare chart data sorted by date ascending
  const chartData = useMemo(() => {
    if (!meta || !rows.length) return [];
    const dateCol = meta.dateColumn;
    return [...rows]
      .sort((a, b) => String(a[dateCol] ?? '').localeCompare(String(b[dateCol] ?? '')))
      .map(row => {
        const entry: Record<string, unknown> = {};
        // Format date as label
        const dateVal = String(row[dateCol] ?? '');
        entry.name = dateVal.length >= 10 ? dateVal.slice(5, 10) : dateVal;
        // Add numeric values
        for (const col of meta.numericColumns) {
          if (row[col] !== undefined && row[col] !== null) {
            entry[col] = Number(row[col]) || 0;
          }
        }
        return entry;
      });
  }, [rows, meta]);

  // Pie data: aggregate first numeric column
  const pieData = useMemo(() => {
    if (!meta || !rows.length) return [];
    const groupCol = meta.groupColumns[0];
    const valueCol = meta.numericColumns[0];
    if (!groupCol || !valueCol) return [];

    const map = new Map<string, number>();
    for (const row of rows) {
      const key = String(row[groupCol] ?? 'Other');
      map.set(key, (map.get(key) ?? 0) + (Number(row[valueCol]) || 0));
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [rows, meta]);

  // Available numeric columns that have data
  const activeColumns = useMemo(() => {
    if (!meta) return [];
    return meta.numericColumns.filter(col =>
      rows.some(r => r[col] !== undefined && r[col] !== null && Number(r[col]) !== 0)
    );
  }, [rows, meta]);

  const handleExport = () => {
    window.open(`/api/modules/reports/export?format=xlsx&table=${meta?.table ?? ''}`, '_blank');
  };

  const renderChart = () => {
    if (!meta || !chartData.length) return null;

    const type = chartType || meta.chartType || 'bar';

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={150}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Legend />
            {activeColumns.map((col, i) => (
              <Line key={col} type="monotone" dataKey={col} name={formatColumnName(col)}
                stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
            <Legend />
            {activeColumns.map((col, i) => (
              <Area key={col} type="monotone" dataKey={col} name={formatColumnName(col)}
                stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'table') {
      const cols = [meta.dateColumn, ...activeColumns, ...meta.groupColumns.filter(c => rows.some(r => r[c]))];
      return (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-gray-400 text-xs uppercase sticky top-0">
              <tr>
                {cols.map(col => <th key={col} className="px-3 py-2 text-left">{formatColumnName(col)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/50">
                  {cols.map(col => (
                    <td key={col} className="px-3 py-2 text-gray-300">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default: bar chart
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
          <Legend />
          {activeColumns.map((col, i) => (
            <Bar key={col} dataKey={col} name={formatColumnName(col)}
              fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-medium text-white">{reportName}</h3>
            {meta && (
              <p className="text-xs text-gray-500 mt-1">
                {meta.dateRange.from} — {meta.dateRange.to} • {meta.total} {t('reports.rows')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {meta && (
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
                <Download className="w-4 h-4" /> Excel
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="animate-pulse h-[400px] bg-gray-800 rounded-xl" />
          )}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {t('reports.no_data')}
            </div>
          )}
          {!loading && !error && rows.length > 0 && renderChart()}
        </div>
      </div>
    </div>
  );
}
