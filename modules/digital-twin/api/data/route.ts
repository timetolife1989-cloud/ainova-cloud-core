import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface MachineRow {
  id: number;
  layout_id: number;
  name: string;
  machine_type: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  status: string;
  linked_oee_id: number | null;
  linked_plc_id: number | null;
  meta_json: string | null;
}

interface LayoutRow {
  id: number;
  name: string;
  is_active: boolean;
}

export async function GET() {
  try {
    const db = getDb();

    const layouts = await db.query<LayoutRow>(
      `SELECT id, name, is_active FROM mod_dt_layouts WHERE is_active = 1 ORDER BY id`,
      []
    );

    if (layouts.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const items = [];
    for (const layout of layouts) {
      const machines = await db.query<MachineRow>(
        `SELECT id, layout_id, name, machine_type, pos_x, pos_y, width, height, status, linked_oee_id, linked_plc_id, meta_json
         FROM mod_dt_machines WHERE layout_id = @p0 ORDER BY id`,
        [{ name: 'p0', type: 'int', value: layout.id }]
      );

      items.push({
        id: layout.id,
        name: layout.name,
        machines: machines.map(m => ({
          id: m.id,
          name: m.name,
          machineType: m.machine_type,
          posX: Number(m.pos_x),
          posY: Number(m.pos_y),
          width: Number(m.width),
          height: Number(m.height),
          status: m.status,
          linkedOeeId: m.linked_oee_id,
          linkedPlcId: m.linked_plc_id,
          meta: m.meta_json ? JSON.parse(m.meta_json) : null,
        })),
      });
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[ACI][digital-twin] GET data error:', err);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = getDb();

    if (action === 'update-status') {
      const { machineId, status } = body;
      const validStatuses = ['running', 'idle', 'warning', 'error', 'maintenance'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      await db.execute(
        `UPDATE mod_dt_machines SET status = @p0 WHERE id = @p1`,
        [
          { name: 'p0', type: 'nvarchar', value: status },
          { name: 'p1', type: 'int', value: Number(machineId) },
        ]
      );
      return NextResponse.json({ success: true });
    }

    if (action === 'update-position') {
      const { machineId, posX, posY } = body;
      await db.execute(
        `UPDATE mod_dt_machines SET pos_x = @p0, pos_y = @p1 WHERE id = @p2`,
        [
          { name: 'p0', type: 'float', value: Number(posX) },
          { name: 'p1', type: 'float', value: Number(posY) },
          { name: 'p2', type: 'int', value: Number(machineId) },
        ]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[ACI][digital-twin] POST data error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
