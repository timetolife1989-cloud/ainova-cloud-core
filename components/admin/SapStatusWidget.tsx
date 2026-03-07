'use client';

import React, { useState, useEffect } from 'react';
import { Database, TrendingUp, Clock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SapSummary {
  counts: {
    visszajelentes_db: number;
    anyagmozgas_db: number;
    normaido_db: number;
    csatorna_db: number;
    heti_igeny_db: number;
    visszajel_min_datum: string | null;
    visszajel_max_datum: string | null;
  };
  imports: {
    import_type: string;
    utolso_import: string;
    ossz_sor: number;
    import_db: number;
  }[];
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  visszajelentes: { label: 'Visszajelentés', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-400' },
  normaido: { label: 'Normaidő', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-400' },
};

export default function SapStatusWidget() {
  const [data, setData] = useState<SapSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sap-import/verify?type=summary', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Hiba');
      }
    } catch {
      setError('Hálózati hiba');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">SAP státusz nem elérhető</span>
        </div>
        <p className="text-gray-400 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasData = data.counts.visszajelentes_db > 0;
  const totalRows = data.counts.visszajelentes_db + data.counts.normaido_db;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">SAP Adatbázis Állapot</h3>
          {hasData ? (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Aktív
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
              Üres
            </span>
          )}
        </div>
        <button
          onClick={loadStatus}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Frissítés"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Táblák sorszámai */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <StatCard label="Visszajelentés" value={data.counts.visszajelentes_db} color="blue" />
        <StatCard label="Normaidő" value={data.counts.normaido_db} color="yellow" />
        <StatCard label="Össz. sor" value={totalRows} color="white" bold />
      </div>

      {/* Dátum tartomány */}
      {hasData && data.counts.visszajel_min_datum && (
        <div className="mb-4">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-500">Visszajelentés időszak</span>
            <p className="text-sm text-gray-300">
              {formatDate(data.counts.visszajel_min_datum)} → {formatDate(data.counts.visszajel_max_datum)}
            </p>
          </div>
        </div>
      )}

      {/* Importok */}
      {data.imports.length > 0 && (
        <div>
          <h4 className="text-xs text-gray-500 mb-2">Utolsó importok</h4>
          <div className="space-y-1.5">
            {data.imports.map(imp => {
              const meta = TYPE_LABELS[imp.import_type] || { label: imp.import_type, icon: <Database className="w-4 h-4" />, color: 'text-gray-400' };
              return (
                <div key={imp.import_type} className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={meta.color}>{meta.icon}</span>
                    <span className="text-sm text-gray-300">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">{imp.ossz_sor.toLocaleString()} sor</span>
                    <span className="text-gray-500">{imp.import_db}× import</span>
                    <span className="text-gray-500">{formatDate(imp.utolso_import)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Üres állapot */}
      {!hasData && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">
            Még nincs importált SAP adat. Használd a fenti drag & drop zónát!
          </p>
        </div>
      )}
    </div>
  );
}

// Helper components
function StatCard({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    white: 'text-white',
  };
  
  return (
    <div className="bg-gray-800/50 rounded-lg px-3 py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <p className={`text-lg ${bold ? 'font-bold' : 'font-semibold'} ${colorMap[color] || 'text-gray-300'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
