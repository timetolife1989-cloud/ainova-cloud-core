'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

const LOCALE_LABELS: Record<string, { flag: string; label: string }> = {
  hu: { flag: '🇭🇺', label: 'Magyar' },
  en: { flag: '🇬🇧', label: 'English' },
  de: { flag: '🇩🇪', label: 'Deutsch' },
};

interface LanguageSwitcherProps {
  /** Current locale. If omitted, reads from useTranslation() hook. */
  locale?: string;
  /** Compact mode shows only the flag icon (for tight spaces) */
  compact?: boolean;
  /** CSS classes for the wrapper */
  className?: string;
}

export function LanguageSwitcher({ locale: localeProp, compact = false, className }: LanguageSwitcherProps) {
  const router = useRouter();
  const { t, locale: hookLocale } = useTranslation();
  const locale = localeProp || hookLocale || 'hu';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocaleChange = async (newLocale: string) => {
    setOpen(false);
    if (newLocale === locale) return;

    try {
      const csrfRes = await fetch('/api/csrf');
      if (!csrfRes.ok) throw new Error('CSRF token fetch failed');
      const { token } = await csrfRes.json();

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify({ key: 'app_locale', value: newLocale }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to save locale: ${res.status} ${errorText}`);
      }

      window.location.reload();
    } catch (err) {
      console.error('[LanguageSwitcher] Locale change failed:', err);
      alert(`${t('common.lang_change_failed')}: ${err instanceof Error ? err.message : ''}`);
    }
  };

  const current = LOCALE_LABELS[locale];

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm border border-transparent hover:border-white/10"
      >
        <span className="text-base">{current?.flag ?? '🌐'}</span>
        {!compact && (
          <span className="text-gray-300 text-xs font-medium">{locale.toUpperCase()}</span>
        )}
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full right-0 mt-1 bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]"
          >
            {Object.entries(LOCALE_LABELS).map(([code, { flag, label }]) => (
              <button
                key={code}
                onClick={() => handleLocaleChange(code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-600/30 transition-colors ${
                  code === locale ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300'
                }`}
              >
                <span>{flag}</span>
                <span>{label}</span>
                {code === locale && <span className="ml-auto text-blue-400">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
