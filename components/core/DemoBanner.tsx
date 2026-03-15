'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { X, Sparkles } from 'lucide-react';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function DemoBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  // Block Ctrl+P / Cmd+P printing in demo mode
  useEffect(() => {
    if (!isDemo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isDemo) return null;

  return (
    <>
      {/* Print block CSS + DEMO watermark */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          body::after {
            visibility: visible !important;
            content: 'DEMO - demo.ainovacloud.com';
            position: fixed; top: 40%; left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px; font-weight: bold;
            color: rgba(99, 102, 241, 0.3);
          }
        }
      `}</style>

      {/* Watermark overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] select-none" aria-hidden="true">
        <div className="absolute bottom-4 right-4 text-indigo-500/20 text-xl font-bold tracking-widest rotate-0">
          DEMO
        </div>
      </div>

      {/* Banner */}
      {!dismissed && (
        <div className="relative bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-indigo-900/90 border-b border-indigo-700 px-4 py-2.5 text-center">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-sm text-indigo-100 font-medium">
              {t('demo.banner_text')}
            </span>
            <a
              href="mailto:info@ainovacloud.com?subject=ACI%20aj%C3%A1nlatk%C3%A9r%C3%A9s"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              {t('demo.request_offer')}
            </a>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
