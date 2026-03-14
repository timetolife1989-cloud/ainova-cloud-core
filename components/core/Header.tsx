'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  appName: string;
  username: string;
  role: string;
  locale?: string;
}

function getDayName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'long' });
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDateTime(date: Date, locale: string): string {
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getRoleBadgeColor(role: string): string {
  const r = role?.toLowerCase() || '';
  if (r.includes('admin')) return 'bg-purple-600 text-white';
  if (r.includes('manager') || r.includes('vezető')) return 'bg-blue-600 text-white';
  if (r.includes('operator') || r.includes('operátor')) return 'bg-green-600 text-white';
  return 'bg-gray-600 text-white';
}

export function Header({ appName, username, role, locale = 'hu' }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  React.useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — redirect anyway
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="fixed top-0 w-full z-50">
      <div className="relative bg-gradient-to-r from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-xl border-b-2 border-blue-500/30 shadow-2xl shadow-blue-900/40">
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        {/* Subtle animated shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/5 to-blue-500/0"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/5 to-transparent pointer-events-none" />

        <div className="relative h-16 px-2 md:px-6 flex items-center gap-1.5 md:gap-4">

          {/* 1. App Logo + Name */}
          <div
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 md:gap-3 pr-2 md:pr-5 border-r border-gray-700 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {/* Animated geometric logo — matches CoreLogo style */}
            <motion.div
              className="relative w-8 h-8"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="absolute inset-0 rounded-md bg-indigo-600 opacity-80"
                style={{ transform: 'rotate(45deg)' }}
              />
              <div
                className="absolute inset-1 rounded-sm bg-gray-950"
                style={{ transform: 'rotate(45deg)' }}
              />
              <motion.div
                className="absolute inset-2 rounded-sm bg-indigo-400"
                style={{ transform: 'rotate(45deg)' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            <motion.span
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden md:inline text-xl font-bold tracking-wider bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent"
            >
              {appName.toUpperCase()}
            </motion.span>
          </div>

          {/* 2. User info */}
          <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 border-r border-gray-700 flex-shrink-0">
            {/* Avatar */}
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">
              {getInitials(username)}
            </div>
            {/* Name + role — hidden on mobile */}
            <div className="hidden md:flex flex-col">
              <span className="text-white text-sm font-medium leading-tight">
                {username}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${getRoleBadgeColor(role)}`}>
                {role}
              </span>
            </div>
          </div>

          {/* 3. Language Switcher — always visible, even on mobile */}
          <LanguageSwitcher locale={locale} className="flex-shrink-0 px-1.5 md:px-3 border-r border-gray-700" />

          {/* 3b. Search trigger (Ctrl+K) — hidden on mobile */}
          <div className="hidden md:block flex-shrink-0 px-2">
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('toggle-command-palette'))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800/80 hover:bg-gray-700 border border-gray-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-gray-500 text-xs">Ctrl+K</span>
            </button>
          </div>

          {/* 4. Spacer */}
          <div className="flex-1" />

          {/* 4. Date / time — hidden on mobile */}
          <div className="hidden md:flex flex-col items-end text-sm px-4 border-r border-gray-700 flex-shrink-0">
            {currentTime ? (
              <>
                <span className="text-white font-mono font-semibold text-xs">
                  {formatDateTime(currentTime, locale)}
                </span>
                <span className="text-gray-400 text-[10px]">
                  {getDayName(currentTime, locale)} &bull; {getWeekNumber(currentTime)}. {t('common.week_short')}
                </span>
              </>
            ) : (
              <span className="text-gray-500 font-mono text-xs">&mdash;</span>
            )}
          </div>

          {/* 5. Logout */}
          <div className="flex-shrink-0">
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-4 py-2 bg-gradient-to-br from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-lg transition-all duration-300 font-bold shadow-lg shadow-red-900/50 overflow-hidden border border-red-400/30 text-sm"
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-300/30 to-red-400/0"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <span className="relative z-10 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden md:inline tracking-wide">{t('common.logout').toUpperCase()}</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
            </motion.button>
          </div>

          {/* 6. Mobile hamburger — md:hidden */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

        </div>
      </div>

      {/* Mobile Slide-in Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Panel */}
          <div className="absolute top-0 right-0 w-72 h-full bg-gray-900/98 backdrop-blur-xl border-l border-blue-500/20 shadow-2xl overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="text-lg font-bold text-white">{appName}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User info */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(username)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{username}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getRoleBadgeColor(role)}`}>
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="p-3 space-y-1">
              <a
                href="/dashboard"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  pathname === '/dashboard' ? 'bg-blue-600/20 text-blue-300' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                {t('dashboard.title')}
              </a>
              {(role?.toLowerCase().includes('admin')) && (
                <a
                  href="/dashboard/admin"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    pathname?.startsWith('/dashboard/admin') ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('admin.title')}
                </a>
              )}
            </nav>

            {/* Date/time */}
            {currentTime && (
              <div className="px-4 py-3 border-t border-gray-800">
                <p className="text-xs text-gray-400">{formatDateTime(currentTime, locale)}</p>
                <p className="text-[10px] text-gray-500">{getDayName(currentTime, locale)} &bull; {getWeekNumber(currentTime)}. {t('common.week_short')}</p>
              </div>
            )}

            {/* Logout */}
            <div className="p-3 border-t border-gray-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-600/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
