import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { processAiQuery } from '@/lib/ai/assistant';

/**
 * AI Assistant query endpoint.
 * POST /api/ai/query { question: string }
 */
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'dashboard.view');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const question = String(body?.question ?? '').trim();

  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 });
  }

  if (question.length > 1000) {
    return Response.json({ error: 'Question too long (max 1000 chars)' }, { status: 400 });
  }

  const locale = String(body?.locale ?? 'hu');
  const result = await processAiQuery(question, locale);

  return Response.json(result);
}
