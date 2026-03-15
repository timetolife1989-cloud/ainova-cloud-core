'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Upload, Eye, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface PreviewRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

interface PreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  columns: string[];
  preview: PreviewRow[];
}

export default function ImportPreview() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [configId, setConfigId] = useState('');
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCsrfToken = () =>
    document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (configId) formData.append('configId', configId);

      const res = await fetch('/api/modules/file-import/preview', {
        method: 'POST',
        headers: { 'X-CSRF-Token': getCsrfToken() },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? t('common.error'));
      }

      const json = await res.json() as PreviewResult;
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{t('fileimport.preview_title')}</h3>

      <div className="flex items-end gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('fileimport.select_file')}</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 file:mr-2 file:bg-gray-800 file:border-0 file:text-gray-300 file:rounded file:px-2 file:py-1 file:text-xs"
          />
        </div>
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-400 mb-1">{t('fileimport.config_id')}</label>
          <input
            type="text"
            value={configId}
            onChange={e => setConfigId(e.target.value)}
            placeholder="ID"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          />
        </div>
        <button
          onClick={handlePreview}
          disabled={!file || loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Eye className="w-4 h-4" />{loading ? t('common.loading') : t('fileimport.preview')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-950 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('fileimport.total_rows')}</p>
              <p className="text-lg font-bold text-white">{result.totalRows}</p>
            </div>
            <div className="bg-gray-950 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('fileimport.valid_rows')}</p>
              <p className="text-lg font-bold text-green-400">{result.validRows}</p>
            </div>
            <div className="bg-gray-950 rounded-lg p-3">
              <p className="text-xs text-gray-500">{t('fileimport.error_rows')}</p>
              <p className="text-lg font-bold text-red-400">{result.errorRows}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  {result.columns.map(col => (
                    <th key={col} className="text-left px-3 py-2">{col}</th>
                  ))}
                  <th className="text-center px-3 py-2">{t('fileimport.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {result.preview.slice(0, 50).map(row => (
                  <tr key={row.rowIndex} className={row.valid ? '' : 'bg-red-900/10'}>
                    <td className="px-3 py-2 text-gray-500 text-xs">{row.rowIndex}</td>
                    {result.columns.map(col => (
                      <td key={col} className="px-3 py-2 text-gray-300 text-xs truncate max-w-xs">
                        {row.data[col] ?? ''}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      {row.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-400 inline" />
                      ) : (
                        <span className="text-red-400 text-[10px]" title={row.errors.join(', ')}>
                          <AlertTriangle className="w-4 h-4 inline" /> {row.errors.length}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
