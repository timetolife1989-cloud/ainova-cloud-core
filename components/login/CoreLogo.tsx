'use client';

import { motion } from 'framer-motion';

interface CoreLogoProps {
  appName?: string;
}

export function CoreLogo({ appName = 'Ainova' }: CoreLogoProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Animated geometric icon — outer ring rotates slowly, inner core pulses */}
      <motion.div
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {/* Outer diamond */}
        <div
          className="absolute inset-0 rounded-lg bg-indigo-600 opacity-80"
          style={{ transform: 'rotate(45deg)' }}
        />
        {/* Dark cutout */}
        <div
          className="absolute inset-2 rounded-md bg-gray-950"
          style={{ transform: 'rotate(45deg)' }}
        />
        {/* Inner pulsing core */}
        <motion.div
          className="absolute inset-3 rounded-sm bg-indigo-400"
          style={{ transform: 'rotate(45deg)' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* App name */}
      <div className="text-center">
        <motion.h1
          className="text-2xl font-bold tracking-wider text-white"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {appName.toUpperCase()}
        </motion.h1>
        <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase">
          Cloud Core
        </p>
      </div>
    </div>
  );
}
