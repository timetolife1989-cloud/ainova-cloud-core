// =====================================================
// AINOVA - Napi Euró Chart komponens
// =====================================================

'use client';

import { motion } from 'framer-motion';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AinovaLoader from '@/components/ui/AinovaLoader';
import { NapiData, KimutatType } from './types';

interface NapiEuroChartProps {
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
        <div className="flex justify-between">
          <span className="text-emerald-400">Leadott euró:</span>
          <span className="text-emerald-400 font-bold">{data.leadott_euro?.toLocaleString()} €</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-400">Lehívott euró:</span>
          <span className="text-amber-400 font-bold">{data.lehivott_euro?.toLocaleString()} €</span>
        </div>
        <div className="flex justify-between border-t border-slate-600 pt-2 mt-2">
          <span className="text-slate-400">Különbség:</span>
          <span className={`font-bold ${(data.leadott_euro - data.lehivott_euro) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(data.leadott_euro - data.lehivott_euro)?.toLocaleString()} €
          </span>
        </div>
      </div>
    </div>
  );
};

export default function NapiEuroChart({ data, loading, error }: NapiEuroChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col"
    >
      {/* Header - Modern 2026 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/30 to-teal-500/20 blur-xl" />
        <div className="relative px-6 py-4 bg-gradient-to-r from-slate-800/90 via-slate-800/95 to-slate-800/90 border-b border-emerald-500/30">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-emerald-400 to-emerald-400" />
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 tracking-wider">
              LEHÍVÁSOK ÉS LEADÁSOK ÉRTÉKE (EUR)
            </h3>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-emerald-400 to-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 text-center mt-1.5 font-medium tracking-wide">
            {data.length > 0 && (
              <span className="text-emerald-400/80">
                {data[0]?.datum_label || ''} – {data[data.length - 1]?.datum_label || ''}
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
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-slate-500 text-4xl mb-3">💶</div>
              <p className="text-slate-400 text-sm">Nincs euró adat a kiválasztott időszakra</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                {/* Leadott euró gradient */}
                <linearGradient id="leadottEuroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
                </linearGradient>
                {/* Lehívott euró gradient */}
                <linearGradient id="lehivottEuroGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              
              <XAxis
                dataKey="datum_label"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
              />
              
              {/* Y Axis - Euró */}
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                label={{
                  value: 'Euró',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  style: { textAnchor: 'middle' },
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-slate-300">{value}</span>}
              />
              
              {/* Leadott euró area */}
              <Area
                type="monotone"
                dataKey="leadott_euro"
                name="Leadott euró"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#leadottEuroGradient)"
              />
              
              {/* Lehívott euró line */}
              <Line
                type="monotone"
                dataKey="lehivott_euro"
                name="Lehívott euró"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend description */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded" style={{ background: 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.2) 100%)' }} />
            <span>Leadott euró (terület)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#F59E0B' }} />
            <span>Lehívott euró (szaggatott)</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
