import { NextRequest } from 'next/server';
import { checkSession } from '@/lib/api-utils';
import { getEventBus } from '@/lib/sse/event-bus';
import type { SseEvent } from '@/lib/sse/event-bus';

/**
 * Server-Sent Events endpoint for real-time module updates.
 * GET /api/sse/[moduleId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await checkSession(request);
  if (!session.valid) return session.response;

  const { moduleId } = await params;
  const channel = moduleId === 'all' ? '*' : `module:${moduleId}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', moduleId })}\n\n`));

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Subscribe to events
      const unsubscribe = getEventBus().subscribe(channel, (event: SseEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client disconnected
        }
      });

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
