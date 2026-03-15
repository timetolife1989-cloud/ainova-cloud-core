'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-red-400 mb-4">Hiba történt</h1>
        <p className="text-gray-400 mb-6 text-sm">{error.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            Újrapróbálás
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-700 text-sm font-medium"
          >
            Vissza a főoldalra
          </button>
        </div>
      </div>
    </div>
  );
}
