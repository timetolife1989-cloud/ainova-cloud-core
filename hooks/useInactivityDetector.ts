'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const WARNING_TIME_MS = 25 * 60 * 1000; // Show warning at 25 minutes
const LOGOUT_TIME_MS = 30 * 60 * 1000;  // Auto-logout at 30 minutes
const THROTTLE_MS = 5000;               // Check activity max every 5 seconds

const TRACKED_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Client-side inactivity detection hook.
 * Shows a warning modal at 25 minutes of inactivity.
 * Auto-redirects to login at 30 minutes (matches server-side IDLE_TIMEOUT_MS).
 */
export function useInactivityDetector() {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const logout = useCallback(() => {
    window.location.href = '/login?reason=inactivity';
  }, []);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    clearAllTimers();

    warningTimerRef.current = setTimeout(() => {
      const remaining = Math.round((LOGOUT_TIME_MS - WARNING_TIME_MS) / 1000);
      setRemainingSeconds(remaining);
      setShowWarning(true);

      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_TIME_MS);

    logoutTimerRef.current = setTimeout(logout, LOGOUT_TIME_MS);
  }, [logout, clearAllTimers]);

  const dismissWarning = useCallback(() => {
    resetTimers();
    // Touch server to extend session
    void fetch('/api/auth/validate-session').catch(() => {});
  }, [resetTimers]);

  useEffect(() => {
    let lastActivity = 0;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < THROTTLE_MS) return;
      lastActivity = now;
      // Don't auto-reset if warning is visible (user must click "Continue")
      if (!showWarning) resetTimers();
    };

    TRACKED_EVENTS.forEach(e =>
      window.addEventListener(e, handleActivity, { passive: true })
    );
    resetTimers();

    return () => {
      TRACKED_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearAllTimers();
    };
  }, [resetTimers, clearAllTimers, showWarning]);

  return { showWarning, remainingSeconds, dismissWarning };
}
