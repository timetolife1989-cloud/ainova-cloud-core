import { type NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * Setup Wizard API
 * ================
 * Endpoints for the first-time setup wizard.
 * Only accessible when setup_completed setting is not 'true'.
 */

// GET /api/setup — check setup status
export async function GET() {
  try {
    const { getSetting } = await import('@/lib/settings');
    const completed = await getSetting('setup_completed');
    
    if (completed === 'true') {
      return Response.json({ completed: true, step: null });
    }

    // Determine current step
    const dbOk = await checkDbConnection();
    if (!dbOk) return Response.json({ completed: false, step: 'db' });

    const adminExists = await checkAdminExists();
    if (!adminExists) return Response.json({ completed: false, step: 'admin' });

    const branding = await getSetting('app_name');
    if (!branding) return Response.json({ completed: false, step: 'branding' });

    return Response.json({ completed: false, step: 'modules' });
  } catch {
    return Response.json({ completed: false, step: 'db', error: 'Database not reachable' });
  }
}

const StepSchemas = {
  admin: z.object({
    step: z.literal('admin'),
    username: z.string().min(3).max(100),
    password: z.string().min(8).max(200),
    fullName: z.string().max(200).optional(),
    email: z.string().email().optional(),
  }),
  branding: z.object({
    step: z.literal('branding'),
    appName: z.string().min(1).max(200),
    locale: z.enum(['hu', 'en', 'de']).optional(),
  }),
  modules: z.object({
    step: z.literal('modules'),
    activeModules: z.array(z.string()),
  }),
  license: z.object({
    step: z.literal('license'),
    licenseKey: z.string().optional(),
  }),
  complete: z.object({
    step: z.literal('complete'),
  }),
};

// POST /api/setup — process setup step
export async function POST(request: NextRequest) {
  try {
    const { getSetting, setSetting } = await import('@/lib/settings');
    
    // Block if already completed
    const completed = await getSetting('setup_completed');
    if (completed === 'true') {
      return Response.json({ error: 'Setup already completed' }, { status: 403 });
    }

    const body = await request.json() as { step: string };
    
    switch (body.step) {
      case 'admin': {
        const parsed = StepSchemas.admin.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        
        const bcrypt = await import('bcryptjs');
        const { getAuth } = await import('@/lib/auth');
        const hash = await bcrypt.hash(parsed.data.password, 12);
        
        const auth = getAuth();
        try {
          await auth.createUser({
            username: parsed.data.username,
            passwordHash: hash,
            fullName: parsed.data.fullName,
            email: parsed.data.email,
            role: 'admin',
          });
        } catch (err) {
          // User might already exist
          const existing = await auth.getUserByUsername(parsed.data.username);
          if (!existing) throw err;
        }
        
        return Response.json({ ok: true, nextStep: 'branding' });
      }
      
      case 'branding': {
        const parsed = StepSchemas.branding.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        
        await setSetting('app_name', parsed.data.appName, 'setup-wizard');
        if (parsed.data.locale) {
          await setSetting('app_locale', parsed.data.locale, 'setup-wizard');
        }
        
        return Response.json({ ok: true, nextStep: 'modules' });
      }
      
      case 'modules': {
        const parsed = StepSchemas.modules.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        
        await setSetting('active_modules', JSON.stringify(parsed.data.activeModules), 'setup-wizard');
        
        return Response.json({ ok: true, nextStep: 'license' });
      }
      
      case 'license': {
        const parsed = StepSchemas.license.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        
        if (parsed.data.licenseKey) {
          await setSetting('license_key', parsed.data.licenseKey, 'setup-wizard');
        }
        
        return Response.json({ ok: true, nextStep: 'complete' });
      }
      
      case 'complete': {
        await setSetting('setup_completed', 'true', 'setup-wizard');
        return Response.json({ ok: true, completed: true });
      }
      
      default:
        return Response.json({ error: 'Unknown step' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Setup API] Error:', err);
    return Response.json({ error: 'Setup error — check database connection' }, { status: 500 });
  }
}

async function checkDbConnection(): Promise<boolean> {
  try {
    const { getDb } = await import('@/lib/db');
    await getDb().query('SELECT 1 AS test');
    return true;
  } catch {
    return false;
  }
}

async function checkAdminExists(): Promise<boolean> {
  try {
    const { getDb } = await import('@/lib/db');
    const rows = await getDb().query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM core_users WHERE role = 'admin'"
    );
    return (rows[0]?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}
