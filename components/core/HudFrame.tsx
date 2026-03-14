'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';

// ─── LED strip color states ───
type LedState = 'idle' | 'success' | 'error' | 'navigate';

const LED_COLORS: Record<LedState, { color: string; glow: string }> = {
  idle:     { color: 'rgba(180, 210, 255, 0.45)', glow: 'rgba(140, 180, 255, 0.25)' },
  navigate: { color: 'rgba(74, 222, 128, 0.6)',   glow: 'rgba(74, 222, 128, 0.3)' },
  success:  { color: 'rgba(74, 222, 128, 0.7)',   glow: 'rgba(74, 222, 128, 0.35)' },
  error:    { color: 'rgba(248, 113, 113, 0.7)',   glow: 'rgba(248, 113, 113, 0.35)' },
};

const LED_DURATIONS: Record<LedState, number> = {
  idle: 0,
  navigate: 1500,
  success: 2000,
  error: 3000,
};

interface HudFrameProps {
  appName: string;
  username: string;
  role: string;
  locale?: string;
  children: React.ReactNode;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatTime(date: Date): string {
  return date.toLocaleString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDayName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

function getRoleBadgeColor(role: string): string {
  const r = role?.toLowerCase() || '';
  if (r.includes('admin')) return 'text-purple-400 border-purple-500/50';
  if (r.includes('manager') || r.includes('vezető')) return 'text-blue-400 border-blue-500/50';
  if (r.includes('operator') || r.includes('operátor')) return 'text-green-400 border-green-500/50';
  return 'text-gray-400 border-gray-500/50';
}

export function HudFrame({ appName, username, role, locale = 'hu', children }: HudFrameProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ledState, setLedState] = useState<LedState>('idle');

  // Navigation → green flash
  useEffect(() => {
    setMobileMenuOpen(false);
    setLedState('navigate');
    const timer = setTimeout(() => setLedState('idle'), LED_DURATIONS.navigate);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Listen for custom events: hud-led-success, hud-led-error
  useEffect(() => {
    const onSuccess = () => {
      setLedState('success');
      setTimeout(() => setLedState('idle'), LED_DURATIONS.success);
    };
    const onError = () => {
      setLedState('error');
      setTimeout(() => setLedState('idle'), LED_DURATIONS.error);
    };
    document.addEventListener('hud-led-success', onSuccess);
    document.addEventListener('hud-led-error', onError);
    return () => {
      document.removeEventListener('hud-led-success', onSuccess);
      document.removeEventListener('hud-led-error', onError);
    };
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="hud-frame fixed inset-0 flex flex-col z-10">
      {/* ═══ HEADER ═══ */}
      <header className="hud-header relative z-50 flex-shrink-0">
        {/* LED strip — CSS animation, no JS overhead */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[1px] ${ledState === 'idle' ? 'hud-led-pulse' : 'hud-led-flash'}`}
          style={{ backgroundColor: LED_COLORS[ledState].color }}
        />
        <div
          className={`absolute -bottom-[3px] left-0 right-0 h-[4px] blur-sm ${ledState === 'idle' ? 'hud-led-pulse' : 'hud-led-flash'}`}
          style={{ backgroundColor: LED_COLORS[ledState].glow }}
        />

        <div className="flex items-center h-12 px-3 md:px-5">
          {/* Logo */}
          <div
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-400/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-blue-400/80" />
            </div>
            <span className="hidden md:inline text-sm font-semibold tracking-wider text-gray-200 group-hover:text-white transition-colors">
              {appName}
            </span>
          </div>

          <div className="hud-separator mx-3" />

          {/* User */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 font-semibold text-xs">
              {getInitials(username)}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-sm text-gray-200 font-medium leading-tight">{username}</span>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${getRoleBadgeColor(role).split(' ')[0]}`}>
                {role}
              </span>
            </div>
          </div>

          <div className="hud-separator mx-3 hidden md:block" />

          <LanguageSwitcher locale={locale} className="flex-shrink-0" />

          <div className="hud-separator mx-3 hidden md:block" />

          {/* Search */}
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('toggle-command-palette'))}
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/8 hover:border-white/15 bg-white/3 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <span className="text-gray-600 text-[10px] font-mono">CTRL+K</span>
          </button>

          <div className="flex-1" />

          {/* Status dot */}
          <div className="hidden md:flex items-center gap-1.5 mr-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">ONLINE</span>
          </div>

          {/* Time */}
          {currentTime && (
            <div className="hidden md:flex flex-col items-end mr-4 flex-shrink-0">
              <span className="text-sm font-mono text-gray-300 tabular-nums">
                {formatTime(currentTime)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {formatDate(currentTime)} &bull; {getDayName(currentTime, locale)} &bull; W{getWeekNumber(currentTime)}
              </span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="hud-btn-danger flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:inline">{t('common.logout').toUpperCase()}</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden ml-2 p-1.5 rounded hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ═══ CONTENT — glass panel fills below header ═══ */}
      <main className="flex-1 overflow-y-auto hud-content">
        <div className="glass-panel relative p-4 md:p-6 min-h-full rounded-none border-x-0 border-b-0">
          {children}
        </div>
      </main>

      {/* ═══ MOBILE MENU ═══ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-[#080e1c]/95 backdrop-blur-xl border-l border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="text-sm font-semibold text-gray-200 tracking-wider">{appName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded hover:bg-white/5">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 font-semibold text-sm">
                  {getInitials(username)}
                </div>
                <div>
                  <p className="text-gray-200 text-sm font-medium">{username}</p>
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${getRoleBadgeColor(role).split(' ')[0]}`}>{role}</span>
                </div>
              </div>
            </div>
            <nav className="p-3 space-y-1">
              <a href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname === '/dashboard' ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/3'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {t('dashboard.title')}
              </a>
              {role?.toLowerCase().includes('admin') && (
                <a href="/dashboard/admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${pathname?.startsWith('/dashboard/admin') ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/3'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('admin.title')}
                </a>
              )}
            </nav>
            {currentTime && (
              <div className="px-4 py-3 border-t border-white/5">
                <p className="text-xs text-gray-500 font-mono">{formatDate(currentTime)} {formatTime(currentTime)}</p>
              </div>
            )}
            <div className="p-3 border-t border-white/5">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
