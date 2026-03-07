'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  appName: string;
  username: string;
  role: string;
}

const HU_DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'] as const;

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('hu-HU', {
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

export function Header({ appName, username, role }: HeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
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

        <div className="relative h-16 px-6 flex items-center gap-4">

          {/* 1. App Logo + Name */}
          <div
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-3 pr-5 border-r border-gray-700 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
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
              className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent"
            >
              {appName.toUpperCase()}
            </motion.span>
          </div>

          {/* 2. User info */}
          <div className="flex items-center gap-3 px-4 border-r border-gray-700 flex-shrink-0">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {getInitials(username)}
            </div>
            {/* Name + role */}
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium leading-tight">
                {username}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${getRoleBadgeColor(role)}`}>
                {role}
              </span>
            </div>
          </div>

          {/* 3. Spacer */}
          <div className="flex-1" />

          {/* 4. Date / time */}
          <div className="flex flex-col items-end text-sm px-4 border-r border-gray-700 flex-shrink-0">
            <span className="text-white font-mono font-semibold text-xs">
              {formatDateTime(currentTime)}
            </span>
            <span className="text-gray-400 text-[10px]">
              {HU_DAYS[currentTime.getDay()]} &bull; {getWeekNumber(currentTime)}. hét
            </span>
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
                <span className="tracking-wide">KILÉPÉS</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />
            </motion.button>
          </div>

        </div>
      </div>
    </header>
  );
}
