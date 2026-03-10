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

const SYSTEM_PROMPT = `You are a manufacturing data assistant for Ainova Cloud Core.
You help users query production data using natural language.
Available tables and their key columns:
- mod_workforce (id, employee_name, department, date, shift, status, hours_worked)
- mod_tracking (id, product_code, batch_number, station, status, timestamp)
- mod_fleet (id, vehicle_plate, driver_name, distance_km, fuel_liters, date)
- mod_performance (id, line_name, target_qty, actual_qty, efficiency_pct, date)
- mod_inventory (id, item_code, item_name, quantity, unit, location, min_stock)
- mod_oee (id, machine_name, availability, performance, quality, oee_pct, date)
- mod_quality (id, inspection_type, product_code, result, defect_count, date)
- mod_maintenance (id, asset_name, maintenance_type, status, scheduled_date)

Rules:
1. Generate READ-ONLY SQL (SELECT only, never INSERT/UPDATE/DELETE)
2. Use TOP 100 to limit results
3. Use MSSQL syntax (SYSDATETIME, DATEADD, etc.)
4. Return the SQL query and a human-readable summary
5. If the question is unclear, ask for clarification
6. Respond in the same language as the user's question`;

/**
 * Process a natural language query using OpenAI.
 */
export async function processAiQuery(question: string, locale: string = 'hu'): Promise<AiQueryResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      answer: locale === 'hu'
        ? 'Az AI asszisztens nincs konfigurálva. Állítsd be az OPENAI_API_KEY környezeti változót.'
        : 'AI assistant is not configured. Set the OPENAI_API_KEY environment variable.',
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
      return { answer: 'AI szolgáltatás hiba. Próbáld újra később.', error: errText };
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;

    if (!message) {
      return { answer: 'Nem sikerült választ generálni.', error: 'No message in response' };
    }

    // If the model wants to execute SQL
    if (message.function_call?.name === 'execute_sql') {
      const args = JSON.parse(message.function_call.arguments);
      const sql = String(args.sql ?? '');
      const summary = String(args.summary ?? '');

      // Security: only allow SELECT
      if (!/^\s*SELECT/i.test(sql)) {
        return { answer: 'Biztonsági okokból csak SELECT lekérdezések engedélyezettek.', error: 'Non-SELECT query blocked' };
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
          answer: `${summary}\n\nHiba a lekérdezés végrehajtásakor.`,
          sql,
          error: String(dbErr),
        };
      }
    }

    // Regular text response
    return { answer: message.content ?? 'Nincs válasz.' };
  } catch (err) {
    console.error('[AI] Query processing failed:', err);
    return { answer: 'AI szolgáltatás nem elérhető.', error: String(err) };
  }
}
