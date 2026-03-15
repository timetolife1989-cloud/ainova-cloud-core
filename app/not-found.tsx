import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-white">
          Page not found
        </h2>
        <p className="text-gray-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
