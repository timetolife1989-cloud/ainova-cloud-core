import { type NextRequest } from 'next/server';
import { checkAuth } from '@/lib/rbac/middleware';
import { saveUploadedFile, detectFileType, readFileHeaders, processImport, cleanupFile } from '@/lib/import/pipeline';

// POST /api/admin/import — unified import endpoint
// action: 'upload' | 'detect' | 'headers' | 'process'
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request, 'data.import');
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

      return Response.json({
        ok: true,
        filePath,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (err) {
      console.error('[Import API] Upload error:', err);
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
      if (!filePath) {
        return Response.json({ error: 'api.error.filepath_required' }, { status: 400 });
      }
      try {
        const result = await detectFileType(filePath);
        return Response.json(result);
      } catch (err) {
        console.error('[Import API] Detect error:', err);
        return Response.json({ error: 'api.error.file_detect' }, { status: 500 });
      }
    }

    case 'headers': {
      if (!filePath) {
        return Response.json({ error: 'api.error.filepath_required' }, { status: 400 });
      }
      try {
        const headers = await readFileHeaders(filePath);
        return Response.json({ headers });
      } catch (err) {
        console.error('[Import API] Headers error:', err);
        return Response.json({ error: 'api.error.file_headers' }, { status: 500 });
      }
    }

    case 'process': {
      if (!filePath || !configId) {
        return Response.json({ error: 'api.error.filepath_configid_required' }, { status: 400 });
      }
      try {
        const result = await processImport(filePath, configId, auth.username);

        // Cleanup file after processing
        cleanupFile(filePath);

        return Response.json(result);
      } catch (err) {
        console.error('[Import API] Process error:', err);
        return Response.json({ error: 'api.error.import_process' }, { status: 500 });
      }
    }

    default:
      return Response.json({ error: 'api.error.unknown_action' }, { status: 400 });
  }
}
