'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';

type ImportType = 'visszajelentes' | 'norma_friss' | 'routing' | 'anyagmozgas' | null;
type DropzoneState = 'idle' | 'dragging' | 'detecting' | 'ready' | 'importing' | 'success' | 'error';

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  duration?: string;
  details?: {
    totalRows?: number;
    insertedRows?: number;
    updatedRows?: number;
    skipped?: number;
    importId?: number;
    [key: string]: unknown;
  };
  stats?: Record<string, unknown>;
}

interface ProgressData {
  phase: string;
  message?: string;
  percent?: number;
  totalRows?: number;
  inserted?: number;
  speed?: number;
  elapsed?: number;
  eta?: number;
  fileSizeMB?: string;
}

// 2 lépéses import: 1) upload disk-re → 2) detect fejléc → 3) process streaming
// Ez kezeli a 50MB+ fájlokat is memória-hatékonyan

async function uploadAndDetect(file: File): Promise<{ type: ImportType; confidence: number; filePath: string }> {
  // 1. Upload disk-re
  const formData = new FormData();
  formData.append('file', file);
  const uploadRes = await fetch('/api/munkaterv/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadJson.success) throw new Error(uploadJson.error || 'Feltöltés sikertelen');

  // 2. Detect fejléc (streaming, disk-ről)
  const detectRes = await fetch('/api/munkaterv/process', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: uploadJson.filePath, action: 'detect' }),
  });
  const detectJson = await detectRes.json();

  return {
    type: (detectJson.success && detectJson.confidence >= 30 ? detectJson.detectedType : 'visszajelentes') as ImportType,
    confidence: detectJson.confidence || 0,
    filePath: uploadJson.filePath,
  };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  visszajelentes: {
    label: 'SAP Visszajelentés',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  norma_friss: {
    label: 'Normaidők',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20 border-emerald-500/30',
  },
  routing: {
    label: 'Router / Munkaterv',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
  },
  anyagmozgas: {
    label: 'MM Anyagmozgás (MB51)',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20 border-amber-500/30',
  },
};

// LED border stílusok állapot szerint
function getBorderStyle(state: DropzoneState): string {
  switch (state) {
    case 'dragging':
      return 'border-blue-400 bg-blue-500/10 scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.3)]';
    case 'detecting':
    case 'importing':
      return 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.4)] animate-pulse';
    case 'success':
      return 'border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)] animate-[pulse_2s_ease-in-out_3]';
    case 'error':
      return 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]';
    case 'ready':
      return 'border-gray-500 bg-gray-900/50';
    default:
      return 'border-gray-700 bg-gray-900/30 hover:border-gray-500 hover:bg-gray-900/50';
  }
}

export default function SapImportDropzone() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedType, setDetectedType] = useState<ImportType>(null);
  const [serverFilePath, setServerFilePath] = useState<string | null>(null);
  const [state, setState] = useState<DropzoneState>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress polling import közben (2s-enként)
  useEffect(() => {
    if (state !== 'importing') {
      setProgress(null);
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/munkaterv/progress');
        const data = await res.json();
        if (data.phase && data.phase !== 'idle') setProgress(data);
      } catch { /* ok */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [state]);

  const activeType = detectedType;

  const handleFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setServerFilePath(null);
    setState('detecting');
    try {
      const detected = await uploadAndDetect(file);
      setDetectedType(detected.type);
      setServerFilePath(detected.filePath);
      setState('ready');
    } catch {
      setDetectedType('visszajelentes');
      setState('ready');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFile) setState('dragging');
  }, [selectedFile]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFile) setState('idle');
  }, [selectedFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xlsm|xls)$/i.test(file.name)) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!selectedFile || !activeType) return;

    setState('importing');
    setResult(null);

    try {
      let res: Response;

      if (!serverFilePath) {
        throw new Error('A fájl nincs a szerveren — próbáld újra');
      }
      // Minden típus az egységes /api/munkaterv/process endpointra megy
      res = await fetch('/api/munkaterv/process', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: serverFilePath, type: activeType }),
      });

      const json = await res.json();
      setResult(json);
      setState(json.success ? 'success' : 'error');
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Hálózati hiba — ellenőrizd a szervert',
      });
      setState('error');
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setDetectedType(null);
    setResult(null);
    setState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isWorking = state === 'detecting' || state === 'importing';

  return (
    <div className="space-y-4">
      {/* Dropzone with LED border */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`
          relative border-2 rounded-xl p-8 text-center transition-all duration-500 cursor-pointer
          ${selectedFile ? '' : 'border-dashed'}
          ${getBorderStyle(state)}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xlsm,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="space-y-3">
            <Upload className="w-10 h-10 text-gray-500 mx-auto" />
            <div>
              <p className="text-gray-300 font-medium">Húzd ide az Excel fájlt</p>
              <p className="text-gray-500 text-sm mt-1">vagy kattints a tallózáshoz (.xlsx, .xlsm)</p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-800 text-left text-xs text-gray-400 space-y-2">
              <p className="font-medium text-gray-300">Támogatott típusok és tippek:</p>
              <ul className="space-y-1 pl-4 list-disc marker:text-gray-600">
                <li><span className="text-amber-400 font-medium">MM Anyagmozgás (MB51)</span>: Napi/Heti logisztikai leadások.</li>
                <li><span className="text-blue-400 font-medium">SAP Visszajelentések</span>: Napi SQVI export (próba.XLSX formátum).</li>
                <li><span className="text-green-400 font-medium">Normaidők</span>: Gömböcz Gábor Excel táblája (percek és EUR értékek).</li>
                <li><span className="text-purple-400 font-medium">Router / Munkaterv</span>: SAP routing export (heti egyszer, műveletekhez).</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fájl info */}
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className={`w-8 h-8 ${state === 'success' ? 'text-green-400' : state === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
              <div className="text-left">
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-gray-500 text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              {!isWorking && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="ml-4 p-1 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Felismert típus — csak szöveges, nem kattintható */}
            {!isWorking && state !== 'success' && activeType && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-gray-500 text-sm">Felismert típus:</span>
                <span className={`text-sm font-medium ${TYPE_CONFIG[activeType].color}`}>
                  {TYPE_CONFIG[activeType].label}
                </span>
              </div>
            )}

            {/* Állapot jelző */}
            {state === 'detecting' && (
              <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fájl felismerése...
              </div>
            )}

            {state === 'importing' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progress?.message || 'Importálás indítása...'}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-md mx-auto">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${progress?.percent || 2}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{progress?.percent ? `${progress.percent}%` : ''}</span>
                    <span>
                      {progress?.inserted ? `${progress.inserted.toLocaleString()} sor` : ''}
                      {progress?.speed ? ` · ${progress.speed.toLocaleString()} sor/s` : ''}
                      {progress?.eta && progress.eta > 0 ? ` · ~${progress.eta}s hátra` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Import gomb */}
            {state === 'ready' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleImport(); }}
                disabled={!activeType}
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all"
              >
                {`Importálás: ${activeType ? TYPE_CONFIG[activeType].label : '?'}`}
              </button>
            )}

            {/* Sikeres eredmény */}
            {state === 'success' && result && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">{result.message || 'Import sikeres!'}</span>
                </div>
                {result.duration && (
                  <p className="text-gray-500 text-sm">Időtartam: {result.duration}</p>
                )}
                {result.details && (
                  <div className="text-xs text-gray-400 space-y-1 mt-1">
                    {result.details.insertedRows !== undefined && (
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-green-400 font-medium">+{result.details.insertedRows.toLocaleString()}</span>
                        <span className="text-gray-500">új sor beillesztve</span>
                      </div>
                    )}
                    {result.details.updatedRows !== undefined && result.details.updatedRows > 0 && (
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-blue-400 font-medium">~{result.details.updatedRows.toLocaleString()}</span>
                        <span className="text-gray-500">sor frissítve (SAP változás)</span>
                      </div>
                    )}
                    {result.details.totalRows !== undefined && (
                      <div className="text-gray-600 text-center">
                        {result.details.totalRows.toLocaleString()} sor az Excelben
                        {result.details.skipped ? ` · ${result.details.skipped.toLocaleString()} kihagyva` : ''}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="mt-2 px-4 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-all"
                >
                  Új import
                </button>
              </div>
            )}

            {/* Hiba eredmény */}
            {state === 'error' && result && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Import sikertelen</span>
                </div>
                <p className="text-red-300 text-sm">{result.error || 'Ismeretlen hiba'}</p>
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3 text-left">
                  <p className="font-medium text-gray-400 mb-1">Teendő:</p>
                  {result.error?.includes('CSRF') && <p>• Jelentkezz be újra az admin panelbe</p>}
                  {result.error?.includes('Hálózat') && <p>• Ellenőrizd a hálózati kapcsolatot és a szerver állapotát</p>}
                  {result.error?.includes('fájl') && <p>• Ellenőrizd, hogy a fájl .xlsx formátumú és nem sérült</p>}
                  {result.error?.includes('Szerver') && <p>• A szerver nem tudta feldolgozni a fájlt — lehet túl nagy vagy hibás formátumú</p>}
                  {!result.error?.includes('CSRF') && !result.error?.includes('Hálózat') && !result.error?.includes('fájl') && !result.error?.includes('Szerver') && (
                    <p>• Próbáld újra, vagy ellenőrizd a szerver logokat</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setState('ready'); setResult(null); }}
                    className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all"
                  >
                    Újrapróbálás
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    className="px-4 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-gray-200 transition-all"
                  >
                    Másik fájl
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
