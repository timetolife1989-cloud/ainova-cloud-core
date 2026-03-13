/**
 * API Gateway — API Key authentication middleware
 * External systems can access data via API key instead of session.
 */

import { getDb } from '@/lib/db';
import { NextRequest } from 'next/server';
import { apiError, HTTP_STATUS } from '@/lib/api-utils';

interface ApiKeyRow {
  id: number;
  name: string;
  permissions: string;
  rate_limit: number;
  is_active: number;
  expires_at: string | null;
}

export interface ApiKeyAuth {
  valid: true;
  keyId: number;
  keyName: string;
  permissions: string[];
}

export interface ApiKeyError {
  valid: false;
  response: Response;
}

/**
 * Check X-API-Key header for external API access.
 */
export async function checkApiKey(
  request: NextRequest,
  requiredPermission?: string
): Promise<ApiKeyAuth | ApiKeyError> {
  const apiKey = request.headers.get('X-API-Key');

  if (!apiKey) {
    return { valid: false, response: apiError('API key required', HTTP_STATUS.UNAUTHORIZED) };
  }

  try {
    const rows = await getDb().query<ApiKeyRow>(
      `SELECT id, name, permissions, rate_limit, is_active, expires_at
       FROM core_api_keys
       WHERE api_key = @p0`,
      [{ name: 'p0', type: 'nvarchar', value: apiKey }]
    );

    if (rows.length === 0) {
      return { valid: false, response: apiError('Invalid API key', HTTP_STATUS.UNAUTHORIZED) };
    }

    const key = rows[0];

    if (!key.is_active) {
      return { valid: false, response: apiError('API key is disabled', HTTP_STATUS.FORBIDDEN) };
    }

    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return { valid: false, response: apiError('API key expired', HTTP_STATUS.FORBIDDEN) };
    }

    const permissions: string[] = JSON.parse(key.permissions || '[]');

    if (requiredPermission && !permissions.includes(requiredPermission) && !permissions.includes('*')) {
      return { valid: false, response: apiError('Insufficient permissions', HTTP_STATUS.FORBIDDEN) };
    }

    // Update last_used_at (fire and forget)
    getDb().execute(
      'UPDATE core_api_keys SET last_used_at = SYSDATETIME() WHERE id = @p0',
      [{ name: 'p0', type: 'int', value: key.id }]
    ).catch(() => {});

    return {
      valid: true,
      keyId: key.id,
      keyName: key.name,
      permissions,
    };
  } catch (err) {
    console.error('[API Gateway] Key check failed:', err);
    return { valid: false, response: apiError('API key validation failed', HTTP_STATUS.INTERNAL_ERROR) };
  }
}

/**
 * Generate a cryptographically secure API key.
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  // Format as 4 segments of 8 hex chars: xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
  return `${hex.slice(0, 8)}-${hex.slice(8, 16)}-${hex.slice(16, 24)}-${hex.slice(24, 32)}`;
}
