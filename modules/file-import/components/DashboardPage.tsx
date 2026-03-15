'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { FileUp, Upload, Check, AlertTriangle, FileSpreadsheet, Clock, CheckCircle, XCircle } from 'lucide-react';
import ImportPreview from './ImportPreview';
import ErrorList from './ErrorList';

interface ImportConfig {
  id: number;
  configName: string;
  fileType: string;
  targetTable: string;
}

interface ImportLog {
  id: number;
  configName: string;
  filename: string;
  rowsTotal: number;
  rowsInserted: number;
  rowsSkipped: number;
  status: string;
  importedAt: string;
  importedBy: string;
}

interface DetectResult {
  configId: number | null;
  configName: string | null;
  confidence: number;
  detectedColumns: string[];
}

export default function FileImportDashboardPage() {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<ImportConfig[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [uploadedFile, setUploadedFile] = useState<{ path: string; name: string } | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/file-import/data');
      if (res.ok) {
        const json = await res.json() as { configs?: ImportConfig[]; logs?: ImportLog[] };
        setConfigs(json.configs ?? []);
        setLogs(json.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setDetectResult(null);
    setSelectedConfigId(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/modules/file-import/data', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json() as { ok?: boolean; filePath?: string; error?: string };
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? t('import.upload_error'));

      setUploadedFile({ path: uploadJson.filePath!, name: file.name });

      // Detect file type
      const detectRes = await fetch('/api/modules/file-import/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect', filePath: uploadJson.filePath }),
      });

      const detectJson = await detectRes.json() as DetectResult;
      setDetectResult(detectJson);

      if (detectJson.configId) {
        setSelectedConfigId(detectJson.configId);
      }
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!uploadedFile || !selectedConfigId) return;

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/modules/file-import/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          action: 'process',
          filePath: uploadedFile.path,
          configId: selectedConfigId,
        }),
      });

      const json = await res.json() as { success?: boolean; totalRows?: number; insertedRows?: number; skippedRows?: number; errors?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? t('import.import_error'));

      if (json.success) {
        setSuccess(t('import.success').replace('{inserted}', String(json.insertedRows)).replace('{skipped}', String(json.skippedRows)));
      } else {
        setError(`${t('import.partial_success')} ${json.errors?.slice(0, 3).join(', ')}`);
      }

      setUploadedFile(null);
      setDetectResult(null);
      setSelectedConfigId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setUploadedFile(null);
    setDetectResult(null);
    setSelectedConfigId(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader title={t('file_import.title')} subtitle={t('file_import.subtitle')} />

      {/* Upload area */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
        {!uploadedFile ? (
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-cyan-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-gray-400">{t('import.uploading')}</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-500 mb-3" />
                <p className="text-gray-400">{t('import.drop_hint')}</p>
                <p className="text-xs text-gray-600 mt-1">{t('import.file_types')}</p>
              </>
            )}
          </label>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-cyan-400" />
              <div className="flex-1">
                <p className="text-white font-medium">{uploadedFile.name}</p>
                {detectResult && (
                  <p className="text-xs text-gray-500">
                    {detectResult.detectedColumns.length} {t('import.columns')} • 
                    {detectResult.configName ? ` ${t('import.detected')}: ${detectResult.configName} (${detectResult.confidence}%)` : ` ${t('import.no_config_detected')}`}
                  </p>
                )}
              </div>
              <button onClick={reset} className="text-gray-500 hover:text-gray-300 text-sm">{t('import.cancel')}</button>
            </div>

            {/* Config selection */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">{t('import.config_label')}</label>
              <select
                value={selectedConfigId ?? ''}
                onChange={e => setSelectedConfigId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
              >
                <option value="">{t('import.select_config')}</option>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.configName} ({c.fileType.toUpperCase()} → {c.targetTable})
                  </option>
                ))}
              </select>
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={!selectedConfigId || processing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('import.in_progress')}
                </>
              ) : (
                <>
                  <FileUp className="w-5 h-5" />
                  {t('import.start')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}
      </div>

      {/* Import Preview */}
      <div className="mt-6">
        <ImportPreview />
      </div>

      {/* Error List */}
      <div className="mt-6">
        <ErrorList />
      </div>

      {/* Available configs */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">{t('import.available_configs')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {configs.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white text-sm font-medium">{c.configName}</p>
                <p className="text-xs text-gray-500">{c.fileType.toUpperCase()} → {c.targetTable}</p>
              </div>
            </div>
          ))}
          {configs.length === 0 && (
            <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">{t('import.no_configs')}</p>
              <p className="text-xs text-gray-600 mt-1">{t('import.no_configs_hint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
