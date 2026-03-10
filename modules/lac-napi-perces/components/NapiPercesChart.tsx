// =====================================================
// AINOVA - Napi Perces Chart komponens
// =====================================================

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AinovaLoader from '@/components/ui/AinovaLoader';
import ChartTooltip from './ChartTooltip';
import { NapiData, KimutatType, KIMUTAT_LABELS } from '../types/index';

interface NapiPercesChartProps {
  data: NapiData[];
  loading: boolean;
  error: string | null;
  activeKimutat: KimutatType;
}

// Custom label az oszlop tetején - összeg megjelenítése
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderBarLabel = (props: any) => {
  const { x, y, width, payload } = props;
  if (!payload || !payload.leadott_ossz) return null;
  
  const total = payload.leadott_ossz;
  if (total === 0) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#94A3B8"
      textAnchor="middle"
      fontSize={9}
      fontWeight="bold"
    >
      {(total / 1000).toFixed(1)}k
    </text>
  );
};

export default function NapiPercesChart({ data, loading, error, activeKimutat }: NapiPercesChartProps) {
  // Szűrés: csak ahol VAN leadás (ahol nincs leadás, azt kiszűrjük)
  const chartData = useMemo(() => {
    return data.filter(d => {
      const hasLeadas = (d.leadott_ossz || 0) > 0 || 
        (d.leadott_siemens_dc || 0) > 0 || 
        (d.leadott_no_siemens || 0) > 0 ||
        (d.leadott_el_tekercses || 0) > 0;
      return hasLeadas;
    });
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col"
    >
      {/* Header - Modern 2026 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/30 to-indigo-500/20 blur-xl" />
        <div className="relative px-6 py-4 bg-gradient-to-r from-slate-800/90 via-slate-800/95 to-slate-800/90 border-b border-cyan-500/30">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-400 to-cyan-400" />
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 tracking-wider">
              PERC LEADÁSOK
            </h3>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-cyan-400 to-cyan-400" />
          </div>
          <p className="text-xs text-slate-400 text-center mt-1.5 font-medium tracking-wide">
            {KIMUTAT_LABELS[activeKimutat]} kimutatás
            {chartData.length > 0 && (
              <span className="text-cyan-400/80 ml-1">
                • {chartData[0]?.datum_label || ''} – {chartData[chartData.length - 1]?.datum_label || ''}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="p-4 h-[400px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <AinovaLoader />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-3">⚠️</div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-slate-500 text-4xl mb-3">📊</div>
              <p className="text-slate-400 text-sm">Nincs adat a kiválasztott időszakra</p>
              <p className="text-slate-500 text-xs mt-2">Az adatok automatikusan betöltődnek az Excel fájlból</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 30, right: 60, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="leadottSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E3A8A" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1E40AF" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="leadottNoSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="leadottElTekercselGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="leadottUtomunkaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FB923C" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              
              <XAxis
                dataKey="datum_label"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
              />
              
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString()}
                label={{
                  value: 'Perc',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  style: { textAnchor: 'middle' },
                }}
              />
              
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                tick={{ fill: '#F59E0B', fontSize: 12 }}
                domain={[0, 150]}
                tickFormatter={(value) => `${value}%`}
                label={{
                  value: '%',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#F59E0B',
                  style: { textAnchor: 'middle' },
                }}
              />
              
              <Tooltip content={<ChartTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-slate-300">{value}</span>}
              />
              
              <Bar
                yAxisId="left"
                dataKey="leadott_siemens_dc"
                name="Siemens DC"
                stackId="leadas"
                fill="url(#leadottSiemensGradient)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="leadott_no_siemens"
                name="No Siemens"
                stackId="leadas"
                fill="url(#leadottNoSiemensGradient)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="leadott_el_tekercses"
                name="Él tekercselés"
                stackId="leadas"
                fill="url(#leadottElTekercselGradient)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="leadott_utomunka"
                name="Utómunka"
                stackId="leadas"
                fill="url(#leadottUtomunkaGradient)"
                radius={[4, 4, 0, 0]}
                label={renderBarLabel}
              />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cel_perc"
                name="Cél perc"
                stroke="#22C55E"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={false}
              />
              
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="leadas_szazalek"
                name="Teljesítmény %"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#1E3A8A' }} />
            <span>Siemens DC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#38BDF8' }} />
            <span>No Siemens</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#8B5CF6' }} />
            <span>Él tekercselés</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#FB923C' }} />
            <span>Utómunka</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#22C55E' }} />
            <span>Cél perc</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
            <span>Teljesítmény %</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
