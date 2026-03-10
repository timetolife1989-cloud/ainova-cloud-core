'use client';

import { useTranslation } from '@/hooks/useTranslation';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">{t('common.error')}</h1>
        <p className="text-gray-400 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {t('common.refresh')}
        </button>
      </div>
    </div>
  );
}
