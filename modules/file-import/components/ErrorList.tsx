'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ImportError {
  id: number;
  importId: number;
  rowNumber: number;
  columnName: string | null;
  errorType: string;
  errorMessage: string;
  rawValue: string | null;
  createdAt: string;
}

interface Props {
  importId?: number;
}

export default function ErrorList({ importId }: Props) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      let url = '/api/modules/file-import/errors';
      if (importId) url += `?importId=${importId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { errors?: ImportError[] };
        setErrors(json.errors ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchErrors(); }, [importId]);

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-48" />;
  }

  const grouped = errors.reduce<Record<string, ImportError[]>>((acc, e) => {
    const key = e.errorType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{t('fileimport.error_list')}</h3>
        <button onClick={() => void fetchErrors()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {errors.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-gray-500 text-sm">{t('fileimport.no_errors')}</p>
        </div>
      ) : (
        <>
          {/* Summary by error type */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(grouped).map(([type, items]) => (
              <span key={type} className="px-2 py-1 bg-red-900/20 border border-red-800/40 rounded text-xs text-red-300">
                {type}: {items.length}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-right px-3 py-2">{t('fileimport.row')}</th>
                  <th className="text-left px-3 py-2">{t('fileimport.column')}</th>
                  <th className="text-left px-3 py-2">{t('fileimport.error_type')}</th>
                  <th className="text-left px-3 py-2">{t('fileimport.message')}</th>
                  <th className="text-left px-3 py-2">{t('fileimport.raw_value')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {errors.slice(0, 100).map(e => (
                  <tr key={e.id} className="hover:bg-gray-800/50">
                    <td className="px-3 py-2 text-right text-gray-400 font-mono text-xs">{e.rowNumber}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs">{e.columnName ?? '-'}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 text-[10px] rounded">{e.errorType}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 text-xs max-w-xs truncate">{e.errorMessage}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs font-mono max-w-xs truncate">{e.rawValue ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {errors.length > 100 && (
              <p className="text-center text-gray-500 text-xs py-2">
                {t('fileimport.showing_first_100', { total: errors.length })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
