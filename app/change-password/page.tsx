'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

interface SessionUser {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  firstLogin?: boolean;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load session user + CSRF token + firstLogin flag
  useEffect(() => {
    // Read user from sessionStorage
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      try {
        const userData: SessionUser = JSON.parse(userStr);
        setUser(userData);
        if (userData.firstLogin) setIsFirstLogin(true);
      } catch {
        // ignore parse errors
      }
    }

    // Check URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get('firstLogin') === 'true') {
      setIsFirstLogin(true);
    }

    // Fetch CSRF token
    fetch('/api/csrf')
      .then((r) => r.json())
      .then((d: { token: string }) => setCsrfToken(d.token))
      .catch(() => {/* non-fatal */});
  }, []);

  // Redirect to /login if no session at all
  useEffect(() => {
    const timer = setTimeout(() => {
      const userStr = sessionStorage.getItem('user');
      if (!userStr) {
        router.replace('/login');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  const validatePasswords = (): boolean => {
    const errors: string[] = [];

    if (!currentPassword) errors.push(t('auth.cp_err_current_required'));
    if (!newPassword) errors.push(t('auth.cp_err_new_required'));
    if (!confirmPassword) errors.push(t('auth.cp_err_confirm_required'));

    if (newPassword && newPassword.length < 8)
      errors.push(t('auth.cp_err_min_length'));

    if (newPassword && !/[A-Z]/.test(newPassword))
      errors.push(t('auth.cp_err_uppercase'));

    if (newPassword && !/[a-z]/.test(newPassword))
      errors.push(t('auth.cp_err_lowercase'));

    if (
      newPassword &&
      !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)
    )
      errors.push(t('auth.cp_err_special'));

    if (newPassword && confirmPassword && newPassword !== confirmPassword)
      errors.push(t('auth.cp_err_mismatch'));

    if (currentPassword && newPassword && currentPassword === newPassword)
      errors.push(t('auth.cp_err_same'));

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    if (!validatePasswords()) return;

    setLoading(true);

    try {
      if (!csrfToken) {
        throw new Error(t('auth.cp_csrf_missing'));
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        message?: string;
      };

      if (!data.success) {
        throw new Error(data.error ?? t('auth.error.unexpected'));
      }

      setSuccess(data.message ?? t('auth.cp_success_msg'));

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear firstLogin flag from session
      if (user) {
        const updatedUser: SessionUser = { ...user, firstLogin: false };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }

      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.error.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (isFirstLogin) {
      setError(t('auth.cp_first_login_required'));
      return;
    }
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full space-y-4">

        {/* First-login banner */}
        {isFirstLogin && (
          <div className="p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
            <p className="text-orange-400 text-sm font-medium">
              ⚠️ {t('auth.cp_first_login_warn')}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <p className="text-yellow-400 text-sm font-medium mb-2">
              {t('auth.cp_fix_errors')}
            </p>
            <ul className="text-yellow-500 text-xs space-y-1 list-disc list-inside">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
            <p className="text-green-500 text-xs mt-1">
              {t('auth.cp_redirect')}
            </p>
          </div>
        )}

        {/* Main card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background:
              'linear-gradient(145deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow:
              'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.8)',
          }}
        >
          <div className="mb-6">
            {!isFirstLogin && (
              <button
                onClick={handleBack}
                className="text-xs text-gray-400 hover:text-gray-300 mb-4 transition-colors block"
              >
                {t('auth.cp_back')}
              </button>
            )}

            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400 mb-2">
              {process.env.NEXT_PUBLIC_APP_NAME ?? 'AINOVA'}
            </p>
            <h1 className="text-2xl font-semibold text-white mb-1">
              {t('auth.cp_title')}
            </h1>
            {user && (
              <p className="text-sm text-gray-400">
                {t('auth.cp_logged_in', { username: user.username })}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Current password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 block">
                {t('auth.cp_current_password')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || !!success}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all"
              />
            </div>

            {/* New password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 block">
                {t('auth.cp_new_password')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || !!success}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('auth.cp_hint')}
              </p>
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-400 block">
                {t('auth.cp_confirm_password')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || !!success}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.cp_submitting') : success ? t('auth.cp_success') : t('auth.cp_submit')}
            </button>
          </form>

          {/* Security info */}
          <div className="mt-6 p-3 bg-indigo-900/10 border border-indigo-800/30 rounded-lg">
            <p className="text-indigo-400 text-xs font-medium mb-1">
              {t('auth.cp_security_title')}
            </p>
            <p className="text-indigo-500 text-xs">
              {t('auth.cp_security_text')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
