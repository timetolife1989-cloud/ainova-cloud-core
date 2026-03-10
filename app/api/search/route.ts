import { NextRequest } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { getActiveModules } from '@/lib/modules/registry';

/**
 * Global search API — searches modules and pages.
 * GET /api/search?q=keyword
 */
export async function GET(request: NextRequest) {
  const session = await checkSession(request);
  if (!session.valid) {
    return Response.json({ results: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').toLowerCase().trim();
  if (!q) {
    return Response.json({ results: [] });
  }

  const modules = await getActiveModules(session.role);

  const results = modules
    .filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    )
    .map(m => ({
      id: `mod-${m.id}`,
      title: m.name,
      description: m.description,
      href: m.href,
      category: 'Modul',
      icon: m.icon ?? '📦',
    }));

  return Response.json({ results: results.slice(0, 10) });
}
