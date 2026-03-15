'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import {
  NapiData,
  KimutatType,
  PAGE_SIZES,
  KimutatSelector,
  NapiPercesChart,
  MuszakLeadasChart,
  NapiPercesTable,
} from './index';
import NapiLehivottChart from './NapiLehivottChart';
import NapiEuroChart from './NapiEuroChart';
import { Download } from 'lucide-react';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 perc

export default function NapiPercesPage() {
  const { t } = useTranslation();
  // State
  const [activeKimutat, setActiveKimutat] = useState<KimutatType>('napi');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<NapiData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Page size based on kimutat type
  const pageSize = PAGE_SIZES[activeKimutat];

  // Fetch data function
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const params = new URLSearchParams({
        type: activeKimutat,
        offset: offset.toString(),
      });

      const response = await fetch(`/api/napi-perces?${params.toString()}`);
      if (!response.ok) throw new Error(t('napi.fetch_error'));

      const result = await response.json() as { data?: NapiData[] };
      setData(result.data ?? []);

      if (result.data && result.data.length > 0) {
        const first = result.data[0];
        if (activeKimutat === 'napi') {
          setTotalItems(first.total_days ?? 0);
        } else if (activeKimutat === 'heti') {
          setTotalItems(first.total_weeks ?? 0);
        } else {
          setTotalItems(first.total_months ?? 0);
        }
      }
    } catch (err) {
      if (!silent) {
        setError(getErrorMessage(err, t));
        setData([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeKimutat, offset]);

  // Initial fetch
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Auto refresh — 10 percenként, nem igényel gyakoribb frissítést
  useEffect(() => {
    const interval = setInterval(() => void fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePrevious = () => {
    if (activeKimutat !== 'havi' && totalItems > offset + pageSize) setOffset(offset + pageSize);
  };

  const handleNext = () => {
    if (activeKimutat !== 'havi' && offset > 0) setOffset(Math.max(0, offset - pageSize));
  };

  const handleKimutatChange = (kimutat: KimutatType) => {
    setActiveKimutat(kimutat);
    setOffset(0);
  };

  // Excel export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/napi-perces/export?type=${activeKimutat}&offset=${offset}`);
      if (!response.ok) throw new Error(t('napi.export_error'));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ??
        'napi-perces-export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert(t('napi.export_error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <DashboardSectionHeader
        title={t('napi.title')}
        subtitle={t('napi.subtitle')}
      />

      {/* Export gomb */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => void handleExport()}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          {isExporting ? t('napi.exporting') : t('napi.export')}
        </button>
      </div>

      <KimutatSelector
        active={activeKimutat}
        onSelect={handleKimutatChange}
        offset={offset}
        totalItems={totalItems}
        pageSize={pageSize}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <NapiPercesChart data={data} loading={loading} error={error} activeKimutat={activeKimutat} />

      <div className="mt-6">
        <MuszakLeadasChart data={data} loading={loading} error={error} activeKimutat={activeKimutat} />
      </div>

      <div className="mt-6">
        <NapiLehivottChart data={data} loading={loading} error={error} activeKimutat={activeKimutat} />
      </div>

      <div className="mt-6">
        <NapiEuroChart data={data} loading={loading} error={error} activeKimutat={activeKimutat} />
      </div>

      {!loading && data.length > 0 && (
        <NapiPercesTable data={data} activeKimutat={activeKimutat} />
      )}
    </div>
  );
}
