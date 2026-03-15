'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface ExportButtonProps {
  moduleId: string;
  table?: string;
  className?: string;
}

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function ExportButton({ moduleId, table, className }: ExportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showDemoMsg, setShowDemoMsg] = useState(false);

  const doExport = (format: 'xlsx' | 'pdf') => {
    setOpen(false);
    if (isDemo) {
      setShowDemoMsg(true);
      setTimeout(() => setShowDemoMsg(false), 5000);
      return;
    }
    const params = new URLSearchParams({ format });
    if (table) params.set('table', table);
    window.open(`/api/modules/${moduleId}/export?${params}`, '_blank');
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 border border-gray-700 transition-colors"
      >
        <span>⬇</span>
        {t('export.title') !== 'export.title' ? t('export.title') : 'Export'}
      </button>

      {showDemoMsg && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-600 rounded-xl shadow-2xl p-4 min-w-[280px] animate-in fade-in">
          <p className="text-sm text-indigo-100 font-medium mb-1">🔒 {t('demo.export_blocked_title')}</p>
          <p className="text-xs text-indigo-300">{t('demo.export_blocked_desc')}</p>
          <a href="mailto:info@ainovacloud.com" className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-200 underline">
            {t('demo.request_offer')}
          </a>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
            <button
              onClick={() => doExport('xlsx')}
              className="w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 text-left flex items-center gap-2"
            >
              📊 Excel (.xlsx)
              {isDemo && <span className="text-xs text-indigo-400 ml-auto">🔒</span>}
            </button>
            <button
              onClick={() => doExport('pdf')}
              className="w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 text-left flex items-center gap-2"
            >
              📄 PDF
              {isDemo && <span className="text-xs text-indigo-400 ml-auto">🔒</span>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
