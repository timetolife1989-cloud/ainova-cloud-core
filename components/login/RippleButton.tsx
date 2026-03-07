'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';

interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function RippleButton({
  children,
  onClick,
  disabled,
  loading,
  type = 'button',
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 1000);

    onClick?.(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className="
        relative w-full py-3
        bg-indigo-600 hover:bg-indigo-700
        text-white font-medium rounded-lg text-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        overflow-hidden
        shadow-lg hover:shadow-xl hover:shadow-indigo-900/30
      "
    >
      {/* Ripple animations */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0, 0.2, 0.4, 1] }}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 70%)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Bejelentkezés...</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
