import { type NextRequest } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { getSyncStatusSummary } from '@/lib/sync-events';

export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  // Any logged-in user can see sync status (not just admin)
  const summary = await getSyncStatusSummary();
  return Response.json(summary);
}
