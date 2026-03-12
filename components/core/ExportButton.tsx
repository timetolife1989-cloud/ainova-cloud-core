'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface ExportButtonProps {
  moduleId: string;
  table?: string;
  className?: string;
}

export function ExportButton({ moduleId, table, className }: ExportButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const doExport = (format: 'xlsx' | 'pdf') => {
    setOpen(false);
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

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
            <button
              onClick={() => doExport('xlsx')}
              className="w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 text-left flex items-center gap-2"
            >
              📊 Excel (.xlsx)
            </button>
            <button
              onClick={() => doExport('pdf')}
              className="w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-700 text-left flex items-center gap-2"
            >
              📄 PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
