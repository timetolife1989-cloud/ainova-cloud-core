import { cache } from 'react';
import { getAuth } from '@/lib/auth';
import type { SessionInfo } from '@/lib/auth';

/**
 * React.cache-wrapped session validation.
 * Deduplicates validateSession calls within the same server request
 * (e.g., layout + page both calling validateSession with the same sessionId).
 */
export const getCachedSession = cache(
  async (sessionId: string): Promise<SessionInfo | null> => {
    return getAuth().validateSession(sessionId);
  }
);
