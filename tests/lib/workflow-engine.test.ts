import { describe, it, expect } from 'vitest';

// Unit test for workflow condition evaluation (extracted logic)
function evaluateCondition(
  condition: { field: string; operator: string; value: string | number | boolean },
  data: Record<string, unknown>
): boolean {
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

describe('Workflow Engine — Condition Evaluation', () => {
  it('should evaluate equality', () => {
    expect(evaluateCondition({ field: 'status', operator: '=', value: 'error' }, { status: 'error' })).toBe(true);
    expect(evaluateCondition({ field: 'status', operator: '=', value: 'error' }, { status: 'ok' })).toBe(false);
  });

  it('should evaluate numeric comparisons', () => {
    expect(evaluateCondition({ field: 'oee_pct', operator: '<', value: 60 }, { oee_pct: 45 })).toBe(true);
    expect(evaluateCondition({ field: 'oee_pct', operator: '<', value: 60 }, { oee_pct: 75 })).toBe(false);
    expect(evaluateCondition({ field: 'qty', operator: '>=', value: 100 }, { qty: 100 })).toBe(true);
  });

  it('should evaluate contains/not_contains', () => {
    expect(evaluateCondition({ field: 'name', operator: 'contains', value: 'cnc' }, { name: 'CNC-01' })).toBe(true);
    expect(evaluateCondition({ field: 'name', operator: 'not_contains', value: 'press' }, { name: 'CNC-01' })).toBe(true);
  });

  it('should handle null/undefined fields', () => {
    expect(evaluateCondition({ field: 'missing', operator: 'contains', value: 'x' }, {})).toBe(false);
  });
});
