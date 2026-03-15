// Ainova Cloud Intelligence — Service Worker (PWA)
const CACHE_NAME = 'ainova-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, API calls, SSE
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Never cache in development (localhost)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Cache-first for static assets (immutable hashed files from production builds only)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(css|woff2?|ttf|svg|png|ico|webp)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Dashboard pages — always network-first, offline fallback
  if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Other pages — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached || caches.match('/offline.html'));

      return cached || fetchPromise;
    })
  );
});
