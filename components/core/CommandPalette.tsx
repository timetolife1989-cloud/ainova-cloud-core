'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  href: string;
  category: string;
  icon?: string;
}

const STATIC_PAGES: SearchResult[] = [
  { id: 'dash', title: 'Dashboard', href: '/dashboard', category: 'Navigation', icon: '🏠' },
  { id: 'admin', title: 'Admin Panel', href: '/dashboard/admin', category: 'Navigation', icon: '⚙️' },
  { id: 'users', title: 'Felhasználók', href: '/dashboard/admin/users', category: 'Admin', icon: '👥' },
  { id: 'roles', title: 'Szerepkörök', href: '/dashboard/admin/roles', category: 'Admin', icon: '🔐' },
  { id: 'modules', title: 'Modulok', href: '/dashboard/admin/modules', category: 'Admin', icon: '📦' },
  { id: 'settings', title: 'Beállítások', href: '/dashboard/admin/settings', category: 'Admin', icon: '🎨' },
  { id: 'license', title: 'Licenc', href: '/dashboard/admin/license', category: 'Admin', icon: '📄' },
  { id: 'audit', title: 'Audit Napló', href: '/dashboard/admin/audit-log', category: 'Admin', icon: '📋' },
  { id: 'diag', title: 'Diagnosztika', href: '/dashboard/admin/diagnostics', category: 'Admin', icon: '🔧' },
  { id: 'units', title: 'Mértékegységek', href: '/dashboard/admin/units', category: 'Admin', icon: '📏' },
  { id: 'locale', title: 'Nyelv & Formátumok', href: '/dashboard/admin/locale', category: 'Admin', icon: '🌐' },
  { id: 'import', title: 'Import Konfigurációk', href: '/dashboard/admin/import-configs', category: 'Admin', icon: '📥' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        setQuery('');
        setResults([]);
        setSelectedIdx(0);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    function handleCustom() { toggle(); }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('toggle-command-palette', handleCustom);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('toggle-command-palette', handleCustom);
    };
  }, [open, toggle]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(STATIC_PAGES.slice(0, 8));
      setSelectedIdx(0);
      return;
    }

    const q = query.toLowerCase();
    const filtered = STATIC_PAGES.filter(
      p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q))
    );

    // Also search modules via API (debounced)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          const apiResults: SearchResult[] = (data.results ?? []).map((r: SearchResult) => ({
            ...r,
            category: r.category ?? 'Modul',
          }));
          setResults([...filtered, ...apiResults].slice(0, 12));
        } else {
          setResults(filtered.slice(0, 12));
        }
      } catch {
        setResults(filtered.slice(0, 12));
      }
    }, 200);

    setResults(filtered.slice(0, 12));
    setSelectedIdx(0);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101]"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Keresés oldalak, modulok között..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                />
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded text-[10px] font-mono">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-[320px] overflow-y-auto py-2">
                {results.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    Nincs találat &quot;{query}&quot; keresésre
                  </div>
                ) : (
                  results.map((result, idx) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === selectedIdx ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{result.icon ?? '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        {result.description && <div className="text-xs text-gray-500 truncate">{result.description}</div>}
                      </div>
                      <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded flex-shrink-0">{result.category}</span>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-4 text-[10px] text-gray-600">
                <span>↑↓ navigáció</span>
                <span>↵ megnyitás</span>
                <span>esc bezárás</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
