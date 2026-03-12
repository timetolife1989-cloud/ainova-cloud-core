'use client';

import { useInactivityDetector } from '@/hooks/useInactivityDetector';

/**
 * Client-side inactivity warning overlay.
 * Shows a countdown when the user has been idle for 25+ minutes.
 * Auto-redirects to login at 30 minutes (synced with server-side session timeout).
 */
export function InactivityGuard() {
  const { showWarning, remainingSeconds, dismissWarning } = useInactivityDetector();

  if (!showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-amber-500/50 rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
        <div className="text-5xl mb-4">⏱️</div>
        <h3 className="text-xl font-bold text-amber-400 mb-2">
          Inaktivitás észlelve
        </h3>
        <p className="text-gray-300 mb-4">
          A munkamenet hamarosan lejár az inaktivitás miatt.
        </p>
        <div className="text-4xl font-mono font-bold text-amber-300 mb-6">
          {minutes}:{String(seconds).padStart(2, '0')}
        </div>
        <button
          onClick={dismissWarning}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-amber-500/20"
        >
          Folytatom a munkát
        </button>
        <p className="text-xs text-gray-500 mt-4">
          Az inaktív munkamenetek automatikusan lezárásra kerülnek.
        </p>
      </div>
    </div>
  );
}
