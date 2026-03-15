'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { TrendingDown, BarChart3 } from 'lucide-react';

interface TrendPoint {
  period: string;
  totalChecked: number;
  totalRejected: number;
  rejectRate: number;
}

interface ParetoItem {
  code: string;
  count: number;
  cumPercent: number;
}

export default function RejectTrendChart() {
  const { t } = useTranslation();
  const [view, setView] = useState<'trend' | 'pareto'>('trend');
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pareto, setPareto] = useState<ParetoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/modules/quality/reject-trend');
        if (res.ok) {
          const json = await res.json() as { trend?: TrendPoint[]; pareto?: ParetoItem[] };
          setTrend(json.trend ?? []);
          setPareto(json.pareto ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-64" />;
  }

  const maxRate = Math.max(...trend.map(t => t.rejectRate), 1);
  const maxCount = Math.max(...pareto.map(p => p.count), 1);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{t('quality.reject_analysis')}</h3>
        <div className="flex gap-1">
          <button onClick={() => setView('trend')} className={`p-1.5 rounded ${view === 'trend' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <TrendingDown className="w-4 h-4" />
          </button>
          <button onClick={() => setView('pareto')} className={`p-1.5 rounded ${view === 'pareto' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'trend' ? (
        <div>
          {trend.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('common.no_data')}</p>
          ) : (
            <div className="space-y-1">
              {trend.map((point, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{point.period}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${point.rejectRate > 10 ? 'bg-red-500' : point.rejectRate > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.max((point.rejectRate / maxRate) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                      {point.rejectRate.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">{point.totalRejected}/{point.totalChecked}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {pareto.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('common.no_data')}</p>
          ) : (
            <div className="space-y-2">
              {pareto.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-white font-mono w-24 shrink-0 truncate" title={item.code}>{item.code}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                      {item.count}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right shrink-0">{item.cumPercent.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
