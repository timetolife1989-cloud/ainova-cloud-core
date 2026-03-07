// =====================================================
// AINOVA - Műszakbontás Leadás Chart komponens
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
  ResponsiveContainer,
} from 'recharts';
import AinovaLoader from '@/components/ui/AinovaLoader';
import { NapiData, KimutatType, KIMUTAT_LABELS } from './types';

interface MuszakLeadasChartProps {
  data: NapiData[];
  loading: boolean;
  error: string | null;
  activeKimutat: KimutatType;
}

// Egyedi tooltip a műszakbontáshoz
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MuszakTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const muszakCel = Math.round((data.cel_perc || 0) / 3);
  const osszLeadas = (data.leadott_de || 0) + (data.leadott_du || 0) + (data.leadott_ej || 0);
  // cel_szamitott: 0 = Excel, 1 = létszám×480, 2 = admin beállítás
  const celSzamitott = data.cel_szamitott || 0;
  const lejelentettFo = data.lejelentett_fo || 0;

  // Cél forrás megjelenítése
  const getCelForras = () => {
    switch (celSzamitott) {
      case 2: return { icon: '⚙️', text: 'Admin', color: 'text-purple-400' };
      case 1: return { icon: '📊', text: 'Létszám', color: 'text-cyan-400' };
      default: return { icon: '📄', text: 'Excel', color: 'text-slate-400' };
    }
  };
  const celForras = getCelForras();

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[240px]">
      <p className="text-white font-bold mb-2 text-sm">{label}</p>
      
      <div className="space-y-2 text-xs">
        {/* Cél sor - jelezve a forrást */}
        <div className="flex justify-between border-b border-slate-600 pb-1">
          <span className="text-slate-400 flex items-center gap-1">
            Napi cél
            <span className={celForras.color} title={`Forrás: ${celForras.text}`}>{celForras.icon}</span>:
          </span>
          <span className="text-white">{data.cel_perc?.toLocaleString()} perc</span>
        </div>
        
        {/* Ha számított cél (létszám alapú), mutassuk a képletet */}
        {celSzamitott === 1 && lejelentettFo > 0 && (
          <div className="flex justify-between text-cyan-300 text-[10px] border-b border-slate-700 pb-1">
            <span>({lejelentettFo} fő × 480 perc)</span>
          </div>
        )}
        
        <div className="flex justify-between border-b border-slate-600 pb-1">
          <span className="text-green-400 font-semibold">Műszak cél (napi÷3):</span>
          <span className="text-green-400 font-bold">{muszakCel.toLocaleString()} perc</span>
        </div>
        
        <div className="space-y-1 pt-1">
          <div className="flex justify-between">
            <span className="text-yellow-400 font-medium">Délelőtt {data.de_csapat ? `(${data.de_csapat})` : ''}:</span>
            <span className="text-white">{(data.leadott_de || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-400 font-medium">Délután {data.du_csapat ? `(${data.du_csapat})` : ''}:</span>
            <span className="text-white">{(data.leadott_du || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-indigo-400 font-medium">Éjszaka {data.ej_csapat ? `(${data.ej_csapat})` : ''}:</span>
            <span className="text-white">{(data.leadott_ej || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
          <span className="text-cyan-400 font-bold">ÖSSZESEN:</span>
          <span className="text-cyan-400 font-bold">{osszLeadas.toLocaleString()} perc</span>
        </div>

        <div className="flex justify-between border-t border-slate-700 pt-1">
          <span className="text-amber-500 font-semibold">Hatékonyság:</span>
          <span className={`font-bold ${data.leadas_szazalek >= 100 ? 'text-green-400' : data.leadas_szazalek >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
            {data.leadas_szazalek?.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function MuszakLeadasChart({ data, loading, error, activeKimutat }: MuszakLeadasChartProps) {
  // Szűrés: csak ahol VAN leadás (ahol nincs leadás, azt kiszűrjük)
  // + műszakos cél (napi/3) és összeg számítás
  const chartData = useMemo(() => {
    return data
      .filter(d => {
        const hasLeadas = (d.leadott_de || 0) + (d.leadott_du || 0) + (d.leadott_ej || 0) > 0;
        return hasLeadas;
      })
      .map(d => ({
        ...d,
        muszak_cel: Math.round((d.cel_perc || 0) / 3),
        ossz_leadas: (d.leadott_de || 0) + (d.leadott_du || 0) + (d.leadott_ej || 0),
      }));
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col mt-6"
    >
      {/* Header - Modern 2026 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/30 to-blue-500/20 blur-xl" />
        <div className="relative px-6 py-4 bg-gradient-to-r from-slate-800/90 via-slate-800/95 to-slate-800/90 border-b border-indigo-500/30">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent via-indigo-400 to-indigo-400" />
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 tracking-wider">
              PERC LEADÁSOK MŰSZAKBONTÁSBAN
            </h3>
            <div className="h-px w-12 bg-gradient-to-l from-transparent via-indigo-400 to-indigo-400" />
          </div>
          <p className="text-xs text-slate-400 text-center mt-1.5 font-medium tracking-wide">
            {KIMUTAT_LABELS[activeKimutat]} kimutatás
            {chartData.length > 0 && (
              <span className="text-indigo-400/80 ml-1">
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
            <div className="text-center text-slate-500">Nincs adat a kiválasztott időszakra.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="muszakDEGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EAB308" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#A16207" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="muszakDUGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#065F46" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="muszakEJGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3730A3" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              
              <XAxis
                dataKey="datum_label"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
              />
              
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickFormatter={(val) => val.toLocaleString()}
                label={{
                  value: 'Perc',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  style: { textAnchor: 'middle' },
                }}
              />
              
              <Tooltip content={<MuszakTooltip />} />
              
              {/* Legend disabled - using custom footer legend instead */}
              
              {/* Grouped Bars for shifts - NO stackId = side by side */}
              <Bar
                dataKey="leadott_de"
                name="Délelőtt"
                fill="url(#muszakDEGradient)"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="leadott_du"
                name="Délután"
                fill="url(#muszakDUGradient)"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                dataKey="leadott_ej"
                name="Éjszaka"
                fill="url(#muszakEJGradient)"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              
              {/* Műszakos cél vonal (napi cél / 3) */}
              <Line
                type="monotone"
                dataKey="muszak_cel"
                name="Műszak cél (napi÷3)"
                stroke="#22C55E"
                strokeWidth={3}
                strokeDasharray="8 4"
                dot={false}
              />
              
              {/* Napi cél vonal (SUMM) */}
              <Line
                type="monotone"
                dataKey="cel_perc"
                name="Napi cél (perc)"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              
              {/* Összes leadott perc pontok */}
              <Line
                type="monotone"
                dataKey="ossz_leadas"
                name="Össz. leadott perc"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={{ fill: '#06B6D4', strokeWidth: 0, r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer legend - clear and informative */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#EAB308' }} />
            <span>Délelőtt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#10B981' }} />
            <span>Délután</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: '#6366F1' }} />
            <span>Éjszaka</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#22C55E' }} />
            <span>Műszak cél (napi÷3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0.5" style={{ borderStyle: 'dashed', borderWidth: '1.5px', borderColor: '#EF4444' }} />
            <span>Napi perc cél</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#06B6D4' }} />
            <span>Össz. leadott perc</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
