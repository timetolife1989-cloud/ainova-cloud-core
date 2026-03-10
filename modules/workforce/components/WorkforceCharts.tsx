'use client';

import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell,
} from 'recharts';
import { CalendarDays, CalendarRange, Calendar, CalendarClock } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
interface WorkforceDaily {
  id: number;
  recordDate: string;
  shiftName: string | null;
  areaName: string | null;
  plannedCount: number;
  actualCount: number;
  absentCount: number;
  notes: string | null;
  recordedBy: string | null;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Props {
  items: WorkforceDaily[];
  t: (key: string) => string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** ISO week number */
function getWeekNumber(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function groupKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T00:00:00');
  switch (period) {
    case 'daily':
      return dateStr; // YYYY-MM-DD
    case 'weekly': {
      const w = getWeekNumber(d);
      return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`;
    }
    case 'monthly':
      return dateStr.slice(0, 7); // YYYY-MM
    case 'yearly':
      return dateStr.slice(0, 4); // YYYY
  }
}

function labelForKey(key: string, period: Period): string {
  switch (period) {
    case 'daily':
      return key.slice(5); // MM-DD
    case 'weekly':
      return key.replace('-W', '/W');
    case 'monthly': {
      const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sze', 'Okt', 'Nov', 'Dec'];
      const m = parseInt(key.slice(5), 10) - 1;
      return `${months[m]} ${key.slice(0, 4)}`;
    }
    case 'yearly':
      return key;
  }
}

interface AggRow {
  key: string;
  label: string;
  planned: number;
  actual: number;
  absent: number;
  rate: number;
  entries: number;
}

function aggregate(items: WorkforceDaily[], period: Period): AggRow[] {
  const map = new Map<string, { planned: number; actual: number; absent: number; count: number }>();

  for (const it of items) {
    const k = groupKey(it.recordDate, period);
    const existing = map.get(k) ?? { planned: 0, actual: 0, absent: 0, count: 0 };
    existing.planned += it.plannedCount;
    existing.actual += it.actualCount;
    existing.absent += it.absentCount;
    existing.count += 1;
    map.set(k, existing);
  }

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({
      key,
      label: labelForKey(key, period),
      planned: v.planned,
      actual: v.actual,
      absent: v.absent,
      rate: v.planned > 0 ? Math.round((v.actual / v.planned) * 100) : 0,
      entries: v.count,
    }));
}

// ── Custom Tooltip ───────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, t }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-gray-300 mb-2 border-b border-gray-700 pb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm py-0.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="text-white font-semibold">
            {entry.dataKey === 'rate' ? `${entry.value}%` : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Attendance Rate Badge Color ──────────────────────────────────────

function getRateColor(rate: number): string {
  if (rate >= 95) return '#10B981'; // green
  if (rate >= 85) return '#22D3EE'; // cyan
  if (rate >= 70) return '#F59E0B'; // amber
  return '#EF4444'; // red
}

// ── Period Selector ──────────────────────────────────────────────────

const PERIODS: { id: Period; icon: React.ElementType; label: string }[] = [
  { id: 'daily', icon: CalendarDays, label: 'Napi' },
  { id: 'weekly', icon: CalendarRange, label: 'Heti' },
  { id: 'monthly', icon: Calendar, label: 'Havi' },
  { id: 'yearly', icon: CalendarClock, label: 'Éves' },
];

// ── Main Component ───────────────────────────────────────────────────

export default function WorkforceCharts({ items, t }: Props) {
  const [period, setPeriod] = useState<Period>('daily');

  const data = useMemo(() => aggregate(items, period), [items, period]);

  // Overall stats for the current view
  const totals = useMemo(() => {
    const p = data.reduce((s, d) => s + d.planned, 0);
    const a = data.reduce((s, d) => s + d.actual, 0);
    const ab = data.reduce((s, d) => s + d.absent, 0);
    return {
      planned: p,
      actual: a,
      absent: ab,
      avgRate: p > 0 ? Math.round((a / p) * 100) : 0,
      periods: data.length,
    };
  }, [data]);

  if (items.length === 0) return null;

  return (
    <div className="mt-8 space-y-6">

      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
            {t('workforce.charts_title')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{t('workforce.charts_subtitle')}</p>
        </div>

        {/* Period tabs */}
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-0.5">
          {PERIODS.map(p => {
            const Icon = p.icon;
            const active = period === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart 1: Létszám Összehasonlítás (Bar) ────────────────── */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('workforce.chart_headcount')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('workforce.chart_headcount_desc')}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-gray-400">{t('workforce.planned')}</span>
              <span className="text-white font-bold">{totals.planned}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-400">{t('workforce.actual')}</span>
              <span className="text-white font-bold">{totals.actual}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-400">{t('workforce.absent')}</span>
              <span className="text-white font-bold">{totals.absent}</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barGap={2} barCategoryGap="20%">
            <defs>
              <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F87171" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="planned"
              name={t('workforce.planned')}
              fill="url(#gradPlanned)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="actual"
              name={t('workforce.actual')}
              fill="url(#gradActual)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="absent"
              name={t('workforce.absent')}
              fill="url(#gradAbsent)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Chart 2: Jelenlét Arány Trend (Area) ──────────────────── */}
      <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{t('workforce.chart_rate')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('workforce.chart_rate_desc')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${totals.avgRate >= 90 ? 'text-emerald-400' : totals.avgRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
              {totals.avgRate}%
            </span>
            <span className="text-xs text-gray-500">{t('workforce.chart_avg')}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<ChartTooltip t={t} />} />
            {/* Threshold lines */}
            <Area
              type="monotone"
              dataKey="rate"
              name={t('workforce.attendance_rate')}
              stroke="#22D3EE"
              strokeWidth={2.5}
              fill="url(#gradRate)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const color = getRateColor(payload.rate);
                return (
                  <circle
                    key={`dot-${props.index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="#111827"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#111827' }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Threshold legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 95%+</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> 85-94%</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 70-84%</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> &lt;70%</span>
        </div>
      </div>

      {/* ── Chart 3: Területi Bontás (Horizontal Bar) ─────────────── */}
      {items.some(i => i.areaName) && (
        <AreaBreakdown items={items} t={t} />
      )}
    </div>
  );
}

// ── Area Breakdown Sub-component ─────────────────────────────────────

function AreaBreakdown({ items, t }: { items: WorkforceDaily[]; t: (key: string) => string }) {
  const areaData = useMemo(() => {
    const map = new Map<string, { planned: number; actual: number; absent: number }>();
    for (const it of items) {
      const area = it.areaName ?? '—';
      const existing = map.get(area) ?? { planned: 0, actual: 0, absent: 0 };
      existing.planned += it.plannedCount;
      existing.actual += it.actualCount;
      existing.absent += it.absentCount;
      map.set(area, existing);
    }
    return [...map.entries()]
      .map(([area, v]) => ({
        area,
        planned: v.planned,
        actual: v.actual,
        absent: v.absent,
        rate: v.planned > 0 ? Math.round((v.actual / v.planned) * 100) : 0,
      }))
      .sort((a, b) => b.planned - a.planned);
  }, [items]);

  if (areaData.length <= 1) return null;

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{t('workforce.chart_area')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('workforce.chart_area_desc')}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, areaData.length * 50)}>
        <BarChart data={areaData} layout="vertical" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
          />
          <YAxis
            dataKey="area"
            type="category"
            tick={{ fill: '#D1D5DB', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
          <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} iconType="circle" iconSize={8} />
          <Bar dataKey="actual" name={t('workforce.actual')} fill="#10B981" radius={[0, 6, 6, 0]} maxBarSize={24} />
          <Bar dataKey="planned" name={t('workforce.planned')} fill="#6366F1" radius={[0, 6, 6, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
