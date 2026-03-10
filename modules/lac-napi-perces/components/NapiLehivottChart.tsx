// =====================================================
// AINOVA - Napi Lehívott Chart komponens
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
import { NapiData, KimutatType } from '../types/index';

interface NapiLehivottChartProps {
  data: NapiData[];
  loading: boolean;
  error: string | null;
  activeKimutat: KimutatType;
}

// Custom tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[180px]">
      <p className="text-white font-bold mb-2 text-sm">{label}</p>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between border-b border-slate-600 pb-2">
          <span className="text-green-400">Cél:</span>
          <span className="text-white font-semibold">{data.cel_perc?.toLocaleString()} perc</span>
        </div>
        
        <div className="space-y-1">
          <p className="text-cyan-400 font-medium">Lehívott részletesen:</p>
          <div className="flex justify-between">
            <span className="text-blue-300">Siemens DC:</span>
            <span className="text-white">{data.lehivott_siemens_dc?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyan-300">No Siemens:</span>
            <span className="text-white">{data.lehivott_no_siemens?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
            <span className="text-cyan-400 font-semibold">Összesen:</span>
            <span className="text-cyan-400 font-bold">{data.lehivott_ossz?.toLocaleString()} perc</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-400">Lehívott euró:</span>
            <span className="text-amber-400 font-bold">{data.lehivott_euro?.toLocaleString()} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Lehívás %:</span>
            <span className={`font-bold ${data.lehivas_szazalek >= 100 ? 'text-green-400' : data.lehivas_szazalek >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
              {data.lehivas_szazalek?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NapiLehivottChart({ data, loading, error }: NapiLehivottChartProps) {
  // Szűrés: csak ahol VAN lehívás adat (ahol nincs lehívás, azt kiszűrjük)
  const chartData = useMemo(() => {
    return data.filter(d => {
      const hasLehivas = (d.lehivott_ossz || 0) > 0 || (d.lehivott_siemens_dc || 0) > 0 || (d.lehivott_no_siemens || 0) > 0;
      return hasLehivas;
    });
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col"
    >
      {/* Header - Modern 2026 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-purple-500/30 to-fuchsia-500/20 blur-xl" />
        <div className="relative px-6 py-4 bg-gradient-to-r from-slate-800/90 via-slate-800/95 to-slate-800/90 border-b border-violet-500/30">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-violet-400 to-violet-400" />
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 tracking-wider">
              LEHÍVÁSOK ALAKULÁSA
            </h3>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-violet-400 to-violet-400" />
          </div>
          <p className="text-xs text-slate-400 text-center mt-1.5 font-medium tracking-wide">
            EUR & Perc
            {chartData.length > 0 && (
              <span className="text-violet-400/80 ml-1">
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
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
              <defs>
                {/* Lehívott gradients */}
                <linearGradient id="lehivottSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E40AF" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="lehivottNoSiemensGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              
              <XAxis
                dataKey="datum_label"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
              />
              
              {/* Left Y Axis - Perc */}
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
              
              {/* Right Y Axis - Euró */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#F59E0B"
                tick={{ fill: '#F59E0B', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                label={{
                  value: 'Euró',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#F59E0B',
                  style: { textAnchor: 'middle' },
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-slate-300">{value}</span>}
              />
              
              {/* Lehívott - Stacked bars */}
              <Bar
                yAxisId="left"
                dataKey="lehivott_siemens_dc"
                name="Lehívott Siemens DC"
                stackId="lehivott"
                fill="url(#lehivottSiemensGradient)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="lehivott_no_siemens"
                name="Lehívott No Siemens"
                stackId="lehivott"
                fill="url(#lehivottNoSiemensGradient)"
                radius={[4, 4, 0, 0]}
              />
              
              {/* Cél vonal */}
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
              
              {/* Lehívott euró vonal */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="lehivott_euro"
                name="Lehívott euró"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 0, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend description */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#1E40AF' }} />
            <span>Lehívott Siemens DC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#0EA5E9' }} />
            <span>Lehívott No Siemens</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#22C55E' }} />
            <span>Cél perc</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
            <span>Lehívott euró</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
