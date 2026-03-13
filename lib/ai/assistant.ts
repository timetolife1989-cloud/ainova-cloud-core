/**
 * AI Assistant — Natural language queries about manufacturing data.
 * Uses OpenAI GPT-4o API with function calling.
 * OPENAI_API_KEY environment variable required.
 */

import { getDb } from '@/lib/db';

interface AiQueryResult {
  answer: string;
  data?: unknown[];
  sql?: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are a manufacturing intelligence assistant for Ainova Cloud Intelligence (ACI).
You help users query, analyze, and understand production data using natural language.
You have deep knowledge of all ACI modules, their database schema, and their business meaning.

== DATABASE SCHEMA ==

[CORE TABLES]
- core_users (id, username, email, display_name, role, is_active, created_at)
- core_audit_log (id, user_id, action, entity_type, entity_id, changes_json, ip_address, created_at)
- core_settings (id, key, value, type, description, is_public)
- core_translations (id, locale, namespace, key, value)

[WORKFORCE]
- mod_workforce (id, employee_code, employee_name, department, position, shift, date, status, hours_worked, overtime_hours, notes, created_at)
  * status: present | absent | sick | vacation | late
  * shift: morning | afternoon | night
  * Related: mod_workforce_schedule (training dates), mod_attendance

[TRACKING]
- mod_tracking (id, product_code, batch_number, serial_number, station, operation, status, operator_id, quantity, started_at, finished_at, notes)
  * status: in_progress | completed | rejected | on_hold | rework
  * Related: mod_tracking_history (station-to-station movement)

[FLEET]
- mod_fleet (id, vehicle_plate, vehicle_type, driver_name, driver_id, route_name, start_location, end_location, distance_km, fuel_liters, fuel_cost, start_time, end_time, date, status, notes)
  * Related: mod_fleet_maintenance (vehicle maintenance)

[PERFORMANCE]
- mod_performance (id, line_name, machine_name, shift, date, product_code, target_qty, actual_qty, rejected_qty, efficiency_pct, downtime_minutes, downtime_reason, operator_count, notes)
  * efficiency_pct = (actual_qty / target_qty) * 100
  * Related: mod_performance_downtime (downtime details)

[INVENTORY]
- mod_inventory (id, item_code, item_name, category, unit, quantity, reserved_qty, min_stock, max_stock, location, warehouse, unit_cost, supplier_code, last_movement_at, notes)
  * Related: mod_inventory_movements (in/out movements)

[OEE]
- mod_oee (id, machine_id, machine_name, line_name, date, shift, planned_time_min, run_time_min, downtime_min, produced_qty, good_qty, rejected_qty, availability, performance, quality, oee_pct)
  * OEE = Availability × Performance × Quality
  * availability = run_time / planned_time
  * performance = (produced_qty / theoretical_max) 
  * quality = good_qty / produced_qty

[QUALITY]
- mod_quality (id, inspection_type, product_code, batch_number, station, inspector_id, result, defect_count, defect_codes, sample_size, inspection_date, notes)
  * result: pass | fail | conditional
  * inspection_type: incoming | in_process | final | customer_return
  * Related: mod_quality_defects (defect code details)

[MAINTENANCE]
- mod_maintenance (id, asset_id, asset_name, asset_type, maintenance_type, priority, status, description, assigned_to, scheduled_date, started_at, completed_at, downtime_hours, cost, parts_used, notes)
  * maintenance_type: preventive | corrective | predictive | emergency
  * status: open | in_progress | completed | overdue | cancelled
  * priority: low | medium | high | critical

[SCHEDULING]
- mod_scheduling (id, order_number, product_code, product_name, quantity, planned_start, planned_end, actual_start, actual_end, machine_id, line_name, status, priority, customer_code, notes)
  * status: planned | in_progress | completed | delayed | cancelled

[DELIVERY]
- mod_delivery (id, order_number, customer_code, customer_name, product_code, quantity, planned_date, actual_date, carrier, tracking_code, status, destination, weight_kg, cost, notes)
  * status: pending | in_transit | delivered | returned | cancelled

[SHIFT MANAGEMENT]
- mod_shifts (id, shift_name, start_time, end_time, date, line_name, supervisor_id, planned_staff, actual_staff, notes)
- mod_shift_events (id, shift_id, event_type, description, occurred_at)

[PLC CONNECTOR]
- mod_plc_devices (id, name, protocol, ip_address, port, rack, slot, is_active, last_seen_at, created_at)
  * protocol: s7 | modbus_tcp | modbus_rtu | mqtt | opcua
- mod_plc_registers (id, device_id, name, address, data_type, description, unit, scale_factor, scale_offset)
  * address: S7 e.g. DB1,REAL0 | Modbus e.g. 40001 | OPC-UA e.g. ns=2;s=Temperature
- mod_plc_data (id, register_id, device_id, value, quality, recorded_at)
  * Real-time PLC measurement data table
- mod_plc_alerts (id, device_id, register_id, alert_name, condition, threshold_low, threshold_high, severity, last_triggered_at)
  * condition: gt | lt | eq | between | outside
- mod_plc_poll_status (id, device_id, last_poll_at, poll_status, poll_latency_ms, consecutive_errors)

[DIGITAL TWIN]
- mod_dt_layouts (id, name, description, floor_plan_url, created_at)
- mod_dt_machines (id, layout_id, name, machine_type, status, x_pos, y_pos, width, height, properties_json)
  * status: running | idle | maintenance | error | offline

[SAP INTEGRATION]
- mod_sap_connections (id, name, connection_type, host, sysnr, client, sap_user, language, is_active, last_tested_at, last_test_ok)
  * connection_type: rfc | odata | file
- mod_sap_objects (id, category, object_type, sap_name, description_hu, description_en, key_fields, aci_module)
  * Built-in SAP table/BAPI knowledge base (MM/SD/PP/PM/HR/QM/FI/CO modules)
- mod_sap_field_mappings (id, connection_id, sap_object, sap_field, aci_table, aci_field, transform_type, is_active)
- mod_sap_sync_log (id, connection_id, sync_type, sap_object, status, records_read, records_written, started_at, finished_at)
- mod_sap_data_cache (id, connection_id, sap_object, record_key, data_json, synced_at)

== SQL RULES ==
1. ONLY generate SELECT queries — never INSERT, UPDATE, DELETE, DROP, TRUNCATE
2. Always add TOP 100 (or LIMIT 100 for PostgreSQL) to prevent large result sets
3. Use MSSQL syntax by default: SYSDATETIME(), GETDATE(), DATEADD(), DATEDIFF(), TOP N, ISNULL()
   If the user mentions PostgreSQL, use NOW(), INTERVAL, LIMIT, COALESCE()
4. For date filters: CAST(date_column AS DATE) = CAST(GETDATE() AS DATE) or DATEADD(day,-7,GETDATE())
5. Always use table aliases for readability
6. For JOIN queries, specify which columns belong to which table
7. Complex aggregations: GROUP BY, HAVING, window functions are all allowed
8. NEVER expose password columns, personal secrets, or system internals

== BUSINESS INTELLIGENCE FOCUS ==
- OEE analysis: group by machine, line, date; compare to industry benchmark (World Class OEE = 85%)
- Quality trends: defect rate = defect_count / sample_size * 100
- Maintenance: predictive — look for patterns before failure (high frequency short stops)
- Inventory: ABC analysis (turnover), min_stock breach detection
- SAP sync status: check mod_sap_sync_log for failed syncs, last successful run
- PLC data: real-time sensor values from mod_plc_data, latest reading per register

== RESPONSE FORMAT ==
Always respond in the same language as the user's question.
When generating SQL, also provide a plain-language summary of what the query does and what insights might be found.
For Hungarian questions, respond in Hungarian. For German questions, in German. Default: English.`;


/**
 * Process a natural language query using OpenAI.
 */
export async function processAiQuery(question: string, locale: string = 'hu'): Promise<AiQueryResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      answer: 'AI assistant is not configured. Set the OPENAI_API_KEY environment variable.',
      error: 'OPENAI_API_KEY not set',
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        functions: [
          {
            name: 'execute_sql',
            description: 'Execute a read-only SQL query against the manufacturing database',
            parameters: {
              type: 'object',
              properties: {
                sql: { type: 'string', description: 'The SELECT SQL query to execute' },
                summary: { type: 'string', description: 'Human-readable summary of what the query does' },
              },
              required: ['sql', 'summary'],
            },
          },
        ],
        function_call: 'auto',
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI] OpenAI API error:', errText);
      return { answer: 'AI service error. Please try again later.', error: errText };
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;

    if (!message) {
      return { answer: 'Failed to generate a response.', error: 'No message in response' };
    }

    // If the model wants to execute SQL
    if (message.function_call?.name === 'execute_sql') {
      const args = JSON.parse(message.function_call.arguments);
      const sql = String(args.sql ?? '');
      const summary = String(args.summary ?? '');

      // Security: only allow SELECT
      if (!/^\s*SELECT/i.test(sql)) {
        return { answer: 'Only SELECT queries are allowed for security reasons.', error: 'Non-SELECT query blocked' };
      }

      try {
        const rows = await getDb().query<Record<string, unknown>>(sql, []);
        return {
          answer: summary,
          data: rows.slice(0, 100),
          sql,
        };
      } catch (dbErr) {
        console.error('[AI] SQL execution error:', dbErr);
        return {
          answer: `${summary}\n\nError executing the query.`,
          sql,
          error: String(dbErr),
        };
      }
    }

    // Regular text response
    return { answer: message.content ?? 'No response.' };
  } catch (err) {
    console.error('[AI] Query processing failed:', err);
    return { answer: 'AI service unavailable.', error: String(err) };
  }
}
