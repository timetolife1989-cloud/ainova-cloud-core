'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InputField } from './InputField';
import { RippleButton } from './RippleButton';
import { useTranslation } from '@/hooks/useTranslation';

type GlowState = 'idle' | 'success' | 'error';

// Error messages will be handled by useTranslation hook

function getBorderColor(state: GlowState): string {
  if (state === 'error') return 'rgba(239, 68, 68, 0.8)';
  if (state === 'success') return 'rgba(16, 185, 129, 0.8)';
  return 'rgba(99, 102, 241, 0.3)';
}

function getGlowColor(state: GlowState): string {
  if (state === 'error') return 'rgba(239, 68, 68, 0.5)';
  if (state === 'success') return 'rgba(16, 185, 129, 0.5)';
  return 'rgba(99, 102, 241, 0.3)';
}


export function LoginContainer() {
  const router = useRouter();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [glowState, setGlowState] = useState<GlowState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setGlowState('error');
    setTimeout(() => {
      setGlowState('idle');
      setErrorMessage('');
    }, 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      showError(t('auth.login_failed'));
      return;
    }

    setLoading(true);
    setGlowState('idle');

    try {
      // 1. Fetch CSRF token
      const csrfRes = await fetch('/api/csrf');
      if (!csrfRes.ok) {
        showError(t('auth.server_error'));
        return;
      }
      const { token: csrfToken } = (await csrfRes.json()) as { token: string };

      // 2. POST login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), password, rememberMe }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        success?: boolean;
        error?: string;
        user?: { firstLogin?: boolean };
        firstLogin?: boolean;
        role?: string;
      };

      if (!data.ok && !data.success) {
        const code = data.error ?? 'server_error';
        if (code === 'invalid_credentials') {
          showError(t('auth.login_failed'));
        } else if (code === 'rate_limited') {
          showError(t('auth.rate_limited'));
        } else if (code === 'account_disabled') {
          showError(t('auth.account_disabled'));
        } else if (code.startsWith('auth.error.')) {
          showError(t(code));
        } else {
          showError(t('auth.server_error'));
        }
        return;
      }

      // 3. Success
      setGlowState('success');

      if (data.user) {
        sessionStorage.setItem('user', JSON.stringify(data.user));
      }

      const isFirstLogin = data.firstLogin ?? data.user?.firstLogin ?? false;

      // Immediate redirect with full page reload to ensure cookies are set
      setTimeout(() => {
        window.location.href = isFirstLogin ? '/change-password?firstLogin=true' : '/dashboard';
      }, 500);
    } catch {
      showError(t('auth.error.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const isError = glowState === 'error';
  const isSuccess = glowState === 'success';

  return (
    <div className="relative flex flex-col items-center w-full">
      {/* Animated neon frame */}
      <AnimatePresence>
        {(isError || isSuccess) && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="absolute -inset-4 rounded-3xl pointer-events-none"
            style={{
              border: `2px solid ${getBorderColor(glowState)}`,
              boxShadow: `
                0 0 20px ${getGlowColor(glowState)},
                0 0 40px ${getGlowColor(glowState)},
                inset 0 0 20px ${getGlowColor(glowState)}
              `,
            }}
          />
        )}
      </AnimatePresence>

      {/* Pulsating underglow */}
      <motion.div
        animate={{
          background: isError
            ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.4) 0%, rgba(127,29,29,0.2) 40%, transparent 70%)'
            : isSuccess
            ? 'radial-gradient(ellipse at center, rgba(16,185,129,0.4) 0%, rgba(6,95,70,0.2) 40%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(99,102,241,0.4) 0%, rgba(67,56,202,0.2) 40%, transparent 70%)',
        }}
        transition={{ duration: 0.3 }}
        className="absolute -inset-1 rounded-2xl opacity-60 blur-xl pointer-events-none"
      />

      {/* 3D Glass card */}
      <motion.div
        animate={{
          x: isError ? [0, -5, 5, -5, 5, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
        className="relative w-full rounded-2xl p-8 overflow-hidden"
        style={{
          background:
            'linear-gradient(145deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 50%, rgba(5,5,10,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `
            inset 0 1px 0 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 0 rgba(0,0,0,0.3),
            0 25px 50px -12px rgba(0,0,0,0.8),
            0 0 0 1px rgba(0,0,0,0.5)
          `,
          backdropFilter: 'blur(20px)',
          transform: 'perspective(1000px) rotateX(2deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Inner shine */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)',
          }}
        />

        {/* Form */}
        <div className="relative z-10">
          <form onSubmit={handleSubmit} noValidate>
            <InputField
              label={t('auth.username')}
              type="text"
              value={username}
              onChange={setUsername}
              placeholder={t('auth.username')}
              disabled={loading || isSuccess}
              autoComplete="username"
            />

            <InputField
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t('auth.password')}
              disabled={loading || isSuccess}
              autoComplete="current-password"
            />

            <label className="flex items-center gap-2 mt-4 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                disabled={loading || isSuccess}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
              />
              <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {t('auth.remember_me')}
              </span>
            </label>

            <div className="mt-6">
              <RippleButton
                type="submit"
                loading={loading}
                disabled={loading || isSuccess}
              >
                {t('auth.login_button')}
              </RippleButton>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {isError && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 px-6 py-4 rounded-2xl text-center w-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(127,29,29,0.2) 100%)',
              border: '1px solid rgba(239,68,68,0.4)',
              boxShadow:
                '0 0 30px rgba(239,68,68,0.3), 0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="text-xl text-red-400"
              >
                ✕
              </motion.span>
              <p
                className="text-sm font-semibold"
                style={{
                  color: '#EF4444',
                  textShadow: '0 0 10px rgba(239,68,68,0.5)',
                }}
              >
                {errorMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-6 px-6 py-4 rounded-2xl text-center w-full"
            style={{
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,95,70,0.2) 100%)',
              border: '1px solid rgba(16,185,129,0.4)',
              boxShadow:
                '0 0 30px rgba(16,185,129,0.3), 0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                className="text-xl text-emerald-400"
              >
                ✓
              </motion.span>
              <p
                className="text-sm font-semibold"
                style={{
                  color: '#10B981',
                  textShadow: '0 0 10px rgba(16,185,129,0.5)',
                }}
              >
                {t('auth.login_success')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
