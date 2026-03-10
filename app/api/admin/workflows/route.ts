import { NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { z } from 'zod';

const ConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['=', '!=', '<', '>', '<=', '>=', 'contains', 'not_contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const ActionSchema = z.object({
  type: z.enum(['email', 'notification', 'webhook', 'log']),
  config: z.record(z.string(), z.string()),
});

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerEvent: z.string().min(1),
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).min(1),
  moduleId: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
});

interface RuleRow {
  id: number;
  name: string;
  trigger_event: string;
  conditions_json: string;
  actions_json: string;
  is_enabled: number;
  module_id: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;

  const rows = await getDb().query<RuleRow>(
    'SELECT id, name, trigger_event, conditions_json, actions_json, is_enabled, module_id, created_at FROM core_workflow_rules ORDER BY created_at DESC',
    []
  );

  return Response.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.name,
      triggerEvent: r.trigger_event,
      conditions: JSON.parse(r.conditions_json || '[]'),
      actions: JSON.parse(r.actions_json || '[]'),
      enabled: !!r.is_enabled,
      moduleId: r.module_id,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'settings.manage');
  if (!auth.valid) return auth.response;
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;

  const body = await request.json();
  const parsed = CreateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, triggerEvent, conditions, actions, moduleId, enabled } = parsed.data;

  const result = await getDb().query<{ id: number }>(
    `INSERT INTO core_workflow_rules (name, trigger_event, conditions_json, actions_json, is_enabled, module_id, created_by)
     OUTPUT INSERTED.id
     VALUES (@p0, @p1, @p2, @p3, @p4, @p5, @p6)`,
    [
      { name: 'p0', type: 'nvarchar', value: name },
      { name: 'p1', type: 'nvarchar', value: triggerEvent },
      { name: 'p2', type: 'nvarchar', value: JSON.stringify(conditions) },
      { name: 'p3', type: 'nvarchar', value: JSON.stringify(actions) },
      { name: 'p4', type: 'bit', value: enabled ? 1 : 0 },
      { name: 'p5', type: 'nvarchar', value: moduleId ?? null },
      { name: 'p6', type: 'int', value: auth.userId },
    ]
  );

  return Response.json({ ok: true, id: result[0]?.id }, { status: 201 });
}
