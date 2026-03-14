import { NextRequest, NextResponse } from 'next/server';

// =====================================================
// Global Edge Middleware — Rate Limiting & Bot Protection
// =====================================================

// In-memory rate limit store (per-instance, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_API = 120;       // API: 120 req/min per IP
const RATE_LIMIT_MAX_AUTH = 10;       // Auth routes: 10 req/min per IP

// Suspicious bot patterns
const BOT_UA_PATTERNS = [
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /scrapy/i,
  /httpclient/i,
  /java\//i,
  /libwww/i,
  /lwp-/i,
  /mechanize/i,
  /phantom/i,
  /selenium/i,
  /headless/i,
  /puppeteer/i,
  /crawl/i,
  /spider/i,
  /bot(?!.*(?:google|bing|slack|discord|telegram|whatsapp))/i,
  /scraper/i,
  /harvest/i,
  /extract/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /dirbust/i,
  /gobuster/i,
  /nuclei/i,
  /wfuzz/i,
  /burp/i,
  /zap\//i,
];

// Paths that require no auth check (public)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/api/auth/login',
  '/api/csrf',
  '/api/health',
  '/api/setup',
  '/api/i18n',
  '/manifest.json',
  '/sw.js',
];

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

function isBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.length < 5) return true; // No/empty UA = suspicious
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function checkRateLimit(key: string, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: max - entry.count };
}

// Cleanup stale entries periodically (prevent memory leak)
if (typeof globalThis !== 'undefined') {
  const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes
  const doCleanup = () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now >= entry.resetAt) rateLimitMap.delete(key);
    }
  };
  // Use a global flag to avoid duplicate intervals across hot reloads
  const g = globalThis as unknown as { _aciRateLimitCleanup?: boolean };
  if (!g._aciRateLimitCleanup) {
    g._aciRateLimitCleanup = true;
    setInterval(doCleanup, CLEANUP_INTERVAL);
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // --- 1. Static assets / Next.js internals — skip entirely ---
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/uploads/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') && !pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  // --- 2. Bot protection on API routes ---
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/health')) {
    // Allow legitimate API key access (external integrations)
    const hasApiKey = request.headers.has('x-api-key');

    if (!hasApiKey && isBot(userAgent)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: { 'Retry-After': '3600' } }
      );
    }
  }

  // --- 3. Rate limiting ---
  if (pathname.startsWith('/api/')) {
    const isAuthRoute = pathname.startsWith('/api/auth/');
    const max = isAuthRoute ? RATE_LIMIT_MAX_AUTH : RATE_LIMIT_MAX_API;
    const rateLimitKey = `${ip}:${isAuthRoute ? 'auth' : 'api'}`;

    const { allowed, remaining } = checkRateLimit(rateLimitKey, max);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(max),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(max));
    response.headers.set('X-RateLimit-Remaining', String(remaining));

    // --- 4. Anti-scraping headers on API responses ---
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    return response;
  }

  // --- 5. Page-level bot blocking (data scraping protection) ---
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/change-password')) {
    if (isBot(userAgent)) {
      // Redirect bots away from authenticated areas
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Edge auth check: redirect immediately if no session cookie
    const sessionId = request.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Only run middleware on relevant paths
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/change-password/:path*',
  ],
};
