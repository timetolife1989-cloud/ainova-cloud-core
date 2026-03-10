/**
 * Workflow Automation Engine
 * No-code rule engine: IF condition THEN action(s)
 * Rules are stored in core_workflow_rules table.
 */

import { getDb } from '@/lib/db';
import { sendAlertEmail } from '@/lib/notifications/email';
import { emitModuleEvent } from '@/lib/sse/event-bus';

export interface WorkflowCondition {
  field: string;
  operator: '=' | '!=' | '<' | '>' | '<=' | '>=' | 'contains' | 'not_contains';
  value: string | number | boolean;
}

export interface WorkflowAction {
  type: 'email' | 'notification' | 'webhook' | 'log';
  config: Record<string, string>;
}

export interface WorkflowRule {
  id: number;
  name: string;
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  moduleId?: string;
}

interface RuleRow {
  id: number;
  name: string;
  trigger_event: string;
  conditions_json: string;
  actions_json: string;
  is_enabled: number;
  module_id: string | null;
}

/**
 * Evaluate a single condition against data.
 */
function evaluateCondition(condition: WorkflowCondition, data: Record<string, unknown>): boolean {
  const fieldValue = data[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case '=': return fieldValue == targetValue;
    case '!=': return fieldValue != targetValue;
    case '<': return Number(fieldValue) < Number(targetValue);
    case '>': return Number(fieldValue) > Number(targetValue);
    case '<=': return Number(fieldValue) <= Number(targetValue);
    case '>=': return Number(fieldValue) >= Number(targetValue);
    case 'contains': return String(fieldValue ?? '').toLowerCase().includes(String(targetValue).toLowerCase());
    case 'not_contains': return !String(fieldValue ?? '').toLowerCase().includes(String(targetValue).toLowerCase());
    default: return false;
  }
}

/**
 * Execute a workflow action.
 */
async function executeAction(action: WorkflowAction, data: Record<string, unknown>, rule: WorkflowRule): Promise<void> {
  const interpolate = (template: string) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ''));
  };

  switch (action.type) {
    case 'email':
      await sendAlertEmail(
        action.config.to ?? '',
        interpolate(action.config.subject ?? rule.name),
        interpolate(action.config.message ?? ''),
        rule.moduleId
      );
      break;

    case 'notification':
      try {
        await getDb().execute(
          `INSERT INTO core_notifications (user_id, title, message, type, created_at)
           VALUES (@p0, @p1, @p2, @p3, SYSDATETIME())`,
          [
            { name: 'p0', type: 'int', value: parseInt(action.config.userId ?? '0') },
            { name: 'p1', type: 'nvarchar', value: interpolate(action.config.title ?? rule.name) },
            { name: 'p2', type: 'nvarchar', value: interpolate(action.config.message ?? '') },
            { name: 'p3', type: 'nvarchar', value: 'workflow' },
          ]
        );
      } catch (err) {
        console.error('[Workflow] Notification insert failed:', err);
      }
      break;

    case 'webhook':
      try {
        await fetch(action.config.url ?? '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rule: rule.name, trigger: rule.trigger, data }),
        });
      } catch (err) {
        console.error('[Workflow] Webhook failed:', err);
      }
      break;

    case 'log':
      console.log(`[Workflow] ${rule.name}: ${interpolate(action.config.message ?? '')}`);
      break;
  }
}

/**
 * Process a trigger event — finds matching rules and executes actions.
 */
export async function processTrigger(triggerEvent: string, data: Record<string, unknown>): Promise<number> {
  let executed = 0;

  try {
    const rows = await getDb().query<RuleRow>(
      `SELECT id, name, trigger_event, conditions_json, actions_json, is_enabled, module_id
       FROM core_workflow_rules
       WHERE trigger_event = @p0 AND is_enabled = 1`,
      [{ name: 'p0', type: 'nvarchar', value: triggerEvent }]
    );

    for (const row of rows) {
      const rule: WorkflowRule = {
        id: row.id,
        name: row.name,
        trigger: row.trigger_event,
        conditions: JSON.parse(row.conditions_json || '[]'),
        actions: JSON.parse(row.actions_json || '[]'),
        enabled: row.is_enabled === 1,
        moduleId: row.module_id ?? undefined,
      };

      // Evaluate all conditions (AND logic)
      const allMatch = rule.conditions.every(c => evaluateCondition(c, data));
      if (!allMatch) continue;

      // Execute all actions
      for (const action of rule.actions) {
        await executeAction(action, data, rule);
      }

      // Emit SSE event
      emitModuleEvent('workflow', 'created', { ruleId: rule.id, ruleName: rule.name, trigger: triggerEvent });
      executed++;
    }
  } catch (err) {
    console.error('[Workflow] processTrigger failed:', err);
  }

  return executed;
}
