'use client';

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { X, Sparkles } from 'lucide-react';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function DemoBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  return (
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
  );
}
