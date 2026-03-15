import { type NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

interface MachineRow {
  id: number;
  name: string;
  machine_type: string;
  status: string;
  pos_x: number;
  pos_y: number;
}

// GET /api/modules/digital-twin/sse?layoutId=1
// Server-Sent Events endpoint: pushes machine status updates every 30 seconds
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const layoutId = searchParams.get('layoutId') ?? '1';

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { closed = true; }
      };

      const fetchAndSend = async () => {
        try {
          const db = getDb();
          const machines = await db.query<MachineRow>(
            `SELECT id, name, machine_type, status, pos_x, pos_y
             FROM mod_dt_machines WHERE layout_id = @p0 ORDER BY id`,
            [{ name: 'p0', type: 'int', value: parseInt(layoutId) }]
          );

          send({
            type: 'machines',
            timestamp: new Date().toISOString(),
            machines: machines.map(m => ({
              id: m.id,
              name: m.name,
              machineType: m.machine_type,
              status: m.status,
              posX: Number(m.pos_x),
              posY: Number(m.pos_y),
            })),
          });
        } catch (err) {
          send({ type: 'error', message: String(err) });
        }
      };

      // Initial push
      await fetchAndSend();

      // Poll every 30 seconds
      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return; }
        await fetchAndSend();
      }, 30_000);

      // Listen for client disconnect
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
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
