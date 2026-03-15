'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Users, TrendingUp } from 'lucide-react';

interface CustomerSummary {
  customerName: string;
  totalShipments: number;
  totalValue: number;
  totalWeight: number;
}

interface MonthlyTrend {
  month: string;
  shipmentCount: number;
  totalValue: number;
}

export default function CustomerBreakdownChart() {
  const { t } = useTranslation();
  const [view, setView] = useState<'breakdown' | 'trend'>('breakdown');
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/modules/delivery/customer-summary');
        if (res.ok) {
          const json = await res.json() as { customers?: CustomerSummary[]; monthlyTrend?: MonthlyTrend[] };
          setCustomers(json.customers ?? []);
          setTrend(json.monthlyTrend ?? []);
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

  const maxValue = Math.max(...customers.map(c => c.totalValue), 1);
  const maxTrendValue = Math.max(...trend.map(t => t.totalValue), 1);
  const totalAllValue = customers.reduce((s, c) => s + c.totalValue, 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{t('delivery.customer_analysis')}</h3>
        <div className="flex gap-1">
          <button onClick={() => setView('breakdown')} className={`p-1.5 rounded ${view === 'breakdown' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => setView('trend')} className={`p-1.5 rounded ${view === 'trend' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'breakdown' ? (
        <div>
          {customers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('common.no_data')}</p>
          ) : (
            <div className="space-y-2">
              {customers.slice(0, 10).map((c, idx) => {
                const pct = totalAllValue > 0 ? ((c.totalValue / totalAllValue) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-white w-28 shrink-0 truncate" title={c.customerName}>{c.customerName}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${(c.totalValue / maxValue) * 100}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                        {c.totalValue.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right shrink-0">{pct}%</span>
                    <span className="text-xs text-gray-500 w-8 text-right shrink-0">{c.totalShipments}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          {trend.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">{t('common.no_data')}</p>
          ) : (
            <div className="space-y-1">
              {trend.map((point, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{point.month}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-5 relative overflow-hidden">
                    <div
                      className="h-full bg-teal-500/70 rounded-full transition-all"
                      style={{ width: `${(point.totalValue / maxTrendValue) * 100}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                      {point.totalValue.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right shrink-0">{point.shipmentCount} db</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
