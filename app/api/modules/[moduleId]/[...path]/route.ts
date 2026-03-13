import { NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { isModuleAllowed } from '@/lib/license';
import { getActiveModuleIds } from '@/lib/modules/registry';

interface Props {
  params: Promise<{ moduleId: string; path: string[] }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'GET');
}

export async function POST(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'POST');
}

export async function PUT(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: Props) {
  return handleModuleRequest(request, await params, 'DELETE');
}

async function handleModuleRequest(
  request: NextRequest,
  params: { moduleId: string; path: string[] },
  method: string
): Promise<NextResponse> {
  const { moduleId, path } = params;

  // Session check
  const session = await checkSession(request);
  if (!session.valid) return session.response as NextResponse;

  // Licenc check
  const allowed = await isModuleAllowed(moduleId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'license.module_not_allowed' },
      { status: 403 }
    );
  }

  // Active module check
  const activeIds = await getActiveModuleIds();
  if (!activeIds.includes(moduleId)) {
    return NextResponse.json(
      { error: 'api.error.module_not_active' },
      { status: 404 }
    );
  }

  // Dynamic handler loading — multiple resolution strategies
  const subPath = path.join('/');
  let handler: Record<string, unknown> | null = null;
  let routeParams: Record<string, string> = {};

  // Strategy 1: exact subpath (e.g. modules/fleet/api/data/route)
  try {
    handler = await import(`@/modules/${moduleId}/api/${subPath}/route`);
  } catch {
    // Strategy 2: last numeric segment as [id] (e.g. path=['data','123'] or path=['123'])
    if (!handler) {
      const lastSegment = path[path.length - 1];
      if (/^\d+$/.test(lastSegment)) {
        try {
          handler = await import(`@/modules/${moduleId}/api/[id]/route`);
          routeParams = { id: lastSegment };
        } catch {
          // continue to fallback
        }
      }
    }

    // Strategy 4: fallback to root module route (e.g. modules/workforce/api/route)
    if (!handler) {
      try {
        handler = await import(`@/modules/${moduleId}/api/route`);
      } catch {
        return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
      }
    }
  }

  const fn = handler?.[method];
  if (typeof fn === 'function') {
    // Pass route context with params (for [id] routes)
    const context = { params: Promise.resolve(routeParams) };
    return fn(request, context);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
