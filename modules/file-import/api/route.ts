import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { checkCsrf } from '@/lib/api-utils';
import { saveUploadedFile, detectFileType, readFileHeaders, processImport, cleanupFile } from '@/lib/import/pipeline';
import { getDb } from '@/lib/db';

// GET /api/modules/file-import/data — list import configs + recent logs
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request, 'file-import.view');
  if (!auth.valid) return auth.response;

  try {
    const db = getDb();
    const configs = await db.query<{id: number; configName: string; fileType: string; targetTable: string}>(
      `SELECT id, config_name AS configName, file_type AS fileType, target_table AS targetTable
       FROM core_import_configs ORDER BY config_name`
    );

    let logs: Record<string, unknown>[] = [];
    try {
      logs = await db.query(
        `SELECT TOP 50 h.id, c.config_name AS configName, h.filename, 
          h.rows_total AS rowsTotal, h.rows_inserted AS rowsInserted, 
          h.rows_skipped AS rowsSkipped, h.status, h.imported_at AS importedAt,
          h.imported_by AS importedBy
          FROM core_import_history h
          LEFT JOIN core_import_configs c ON c.id = h.config_id
          ORDER BY h.imported_at DESC`
      );
    } catch { /* table may not exist yet */ }

    return Response.json({ configs, logs });
  } catch (err) {
    console.error('[file-import] GET error:', err);
    return Response.json({ configs: [], logs: [] });
  }
}

// POST /api/modules/file-import/data — upload, detect, process
export async function POST(request: NextRequest) {
  const csrf = checkCsrf(request);
  if (!csrf.valid) return csrf.response;
  const auth = await checkAuth(request, 'file-import.edit');
  if (!auth.valid) return auth.response;

  const contentType = request.headers.get('content-type') ?? '';

  // Handle file upload (multipart/form-data)
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return Response.json({ error: 'api.error.no_file' }, { status: 400 });
      }
      const filePath = await saveUploadedFile(file);
      return Response.json({ ok: true, filePath, fileName: file.name, fileSize: file.size });
    } catch (err) {
      console.error('[file-import] Upload error:', err);
      return Response.json({ error: 'api.error.file_upload' }, { status: 500 });
    }
  }

  // Handle JSON actions
  const body = await request.json() as { action: string; filePath?: string; configId?: number };
  const { action, filePath, configId } = body;

  if (!action) {
    return Response.json({ error: 'api.error.action_required' }, { status: 400 });
  }

  switch (action) {
    case 'detect': {
      if (!filePath) return Response.json({ error: 'api.error.filepath_required' }, { status: 400 });
      try {
        const result = await detectFileType(filePath);
        return Response.json(result);
      } catch (err) {
        console.error('[file-import] Detect error:', err);
        return Response.json({ error: 'api.error.file_detect' }, { status: 500 });
      }
    }

    case 'headers': {
      if (!filePath) return Response.json({ error: 'api.error.filepath_required' }, { status: 400 });
      try {
        const headers = await readFileHeaders(filePath);
        return Response.json({ headers });
      } catch (err) {
        console.error('[file-import] Headers error:', err);
        return Response.json({ error: 'api.error.file_headers' }, { status: 500 });
      }
    }

    case 'process': {
      if (!filePath || !configId) return Response.json({ error: 'api.error.filepath_configid_required' }, { status: 400 });
      try {
        const result = await processImport(filePath, configId, auth.username);
        cleanupFile(filePath);
        return Response.json(result);
      } catch (err) {
        console.error('[file-import] Process error:', err);
        return Response.json({ error: 'api.error.import_process' }, { status: 500 });
      }
    }

    default:
      return Response.json({ error: 'api.error.unknown_action' }, { status: 400 });
  }
}
