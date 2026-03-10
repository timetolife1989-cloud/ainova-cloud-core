'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { PieChart, BarChart3, LineChart, Table, Plus, Eye, Download } from 'lucide-react';

interface SavedReport {
  id: number;
  reportName: string;
  description: string | null;
  sourceModule: string | null;
  sourceTable: string | null;
  chartType: string | null;
  createdBy: string | null;
  createdAt: string;
}

const CHART_ICONS: Record<string, React.ReactNode> = {
  bar: <BarChart3 className="w-5 h-5" />,
  line: <LineChart className="w-5 h-5" />,
  pie: <PieChart className="w-5 h-5" />,
  table: <Table className="w-5 h-5" />,
};

export default function ReportsDashboardPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/reports/data');
      if (res.ok) {
        const json = await res.json() as { reports: SavedReport[] };
        setReports(json.reports);
      }
    } catch {
      // API might not exist yet
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Riportok" subtitle="Riport generátor és elemzések" />
        <div className="animate-pulse mt-6 grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Riportok" subtitle="Riport generátor és elemzések" />
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Új riport
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-900/30 rounded-lg">
              <PieChart className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Mentett riportok</p>
              <p className="text-2xl font-bold text-white">{reports.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Oszlopdiagramok</p>
              <p className="text-2xl font-bold text-white">{reports.filter(r => r.chartType === 'bar').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 rounded-lg">
              <LineChart className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Vonaldiagramok</p>
              <p className="text-2xl font-bold text-white">{reports.filter(r => r.chartType === 'line').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <Table className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Táblázatok</p>
              <p className="text-2xl font-bold text-white">{reports.filter(r => r.chartType === 'table').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports grid */}
      <h3 className="text-sm font-medium text-gray-400 mb-3">Mentett riportok</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-violet-500/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-violet-900/30 rounded-lg text-violet-400">
                {CHART_ICONS[report.chartType ?? 'bar'] ?? <BarChart3 className="w-5 h-5" />}
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-white" title="Megtekintés">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-800 rounded text-gray-500 hover:text-white" title="Exportálás">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h4 className="text-white font-medium mb-1">{report.reportName}</h4>
            <p className="text-xs text-gray-500 line-clamp-2">{report.description ?? 'Nincs leírás'}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
              {report.sourceModule && <span className="px-2 py-0.5 bg-gray-800 rounded">{report.sourceModule}</span>}
              <span>{new Date(report.createdAt).toLocaleDateString('hu-HU')}</span>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nincs mentett riport</p>
            <p className="text-xs text-gray-600 mt-1">Hozz létre egyet az "Új riport" gombbal</p>
          </div>
        )}
      </div>

      {/* Quick report templates */}
      <h3 className="text-sm font-medium text-gray-400 mt-8 mb-3">Gyors riport sablonok</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left hover:border-violet-500/50 transition-colors">
          <BarChart3 className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-white text-sm font-medium">Heti összesítő</p>
          <p className="text-xs text-gray-500">Utolsó 7 nap adatai</p>
        </button>
        <button className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left hover:border-violet-500/50 transition-colors">
          <LineChart className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-white text-sm font-medium">Trend elemzés</p>
          <p className="text-xs text-gray-500">30 napos trend</p>
        </button>
        <button className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left hover:border-violet-500/50 transition-colors">
          <PieChart className="w-6 h-6 text-violet-400 mb-2" />
          <p className="text-white text-sm font-medium">Megoszlás</p>
          <p className="text-xs text-gray-500">Kategória szerinti bontás</p>
        </button>
        <button className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-left hover:border-violet-500/50 transition-colors">
          <Table className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-white text-sm font-medium">Részletes lista</p>
          <p className="text-xs text-gray-500">Táblázatos export</p>
        </button>
      </div>
    </div>
  );
}
