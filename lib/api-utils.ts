// =====================================================
// Ainova Cloud Intelligence - API Utility Functions
// =====================================================
// Central API helpers: error handling, response formatting,
// session checking, CSRF validation.
// =====================================================

import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';
import { validateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

// =====================================================
// Types
// =====================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// =====================================================
// Error Handling
// =====================================================

/**
 * Safely extract an error message without using `error: any`.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Ismeretlen hiba történt';
}

/**
 * Build an API error response.
 */
export function apiError(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_ERROR,
  options?: { code?: string; details?: string }
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: message,
      ...(options?.code    && { code:    options.code }),
      ...(options?.details && { details: options.details }),
    },
    { status }
  );
}

/**
 * Build an API success response.
 */
export function apiSuccess<T>(
  data?: T,
  options?: { message?: string; status?: number }
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      ...(data !== undefined    && { data }),
      ...(options?.message      && { message: options.message }),
    },
    { status: options?.status ?? HTTP_STATUS.OK }
  );
}

// =====================================================
// Common error shortcuts
// =====================================================

export const ApiErrors = {
  unauthorized:   () => apiError('Nincs bejelentkezve',          HTTP_STATUS.UNAUTHORIZED),
  invalidSession: () => apiError('Érvénytelen munkamenet',       HTTP_STATUS.UNAUTHORIZED),
  forbidden:      (message = 'Nincs jogosultság') => apiError(message, HTTP_STATUS.FORBIDDEN),
  notFound:       (resource = 'Erőforrás') => apiError(`${resource} nem található`, HTTP_STATUS.NOT_FOUND),
  badRequest:     (message: string) => apiError(message, HTTP_STATUS.BAD_REQUEST),
  conflict:       (message: string) => apiError(message, HTTP_STATUS.CONFLICT),
  internal: (error: unknown, context?: string) => {
    const message = getErrorMessage(error);
    console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);
    return apiError('Szerver hiba történt', HTTP_STATUS.INTERNAL_ERROR, { details: message });
  },
} as const;

// =====================================================
// Session check helper
// =====================================================

export interface SessionCheckResult {
  valid: true;
  userId: number;
  username: string;
  fullName: string;
  role: string;
}

export interface SessionCheckError {
  valid: false;
  response: NextResponse<ApiErrorResponse>;
}

/**
 * Validate the session cookie and return session info.
 *
 * Usage:
 *   const session = await checkSession(request);
 *   if (!session.valid) return session.response;
 *   // session.userId, session.role, etc. are now available
 */
export async function checkSession(
  request: NextRequest
): Promise<SessionCheckResult | SessionCheckError> {
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return { valid: false, response: ApiErrors.unauthorized() };
  }

  const session = await getAuth().validateSession(sessionId);

  if (!session) {
    return { valid: false, response: ApiErrors.invalidSession() };
  }

  return {
    valid:    true,
    userId:   session.userId,
    username: session.username,
    fullName: session.fullName,
    role:     session.role,
  };
}

// =====================================================
// CSRF check helper
// =====================================================

/**
 * Validate the CSRF double-submit token pair.
 * Reads the csrf-token cookie and the X-CSRF-Token header and compares them.
 *
 * Usage:
 *   const csrf = checkCsrf(request);
 *   if (!csrf.valid) return csrf.response;
 */
export function checkCsrf(
  request: NextRequest
): { valid: true } | { valid: false; response: NextResponse<ApiErrorResponse> } {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;

  if (!validateCsrfToken(cookieToken, headerToken)) {
    return {
      valid: false,
      response: apiError('Érvénytelen CSRF token', HTTP_STATUS.FORBIDDEN, { code: 'CSRF_INVALID' }),
    };
  }

  return { valid: true };
}

// =====================================================
// Date / Calendar helpers
// =====================================================

/**
 * Count working days (Mon–Fri) in a given month.
 * Does not account for public holidays — calendar weekdays only.
 */
export function getWorkDaysInMonth(year: number, month: number): number {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    date.setDate(i);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
  }
  return count;
}
