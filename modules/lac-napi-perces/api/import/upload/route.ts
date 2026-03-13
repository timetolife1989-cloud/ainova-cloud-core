// =====================================================
// AINOVA - Nagy fájl feltöltés disk-re
// =====================================================
// 1. lépés: Fájl mentése a szerver temp mappájába
// 2. lépés: /api/munkaterv/process feldolgozza streaming módban
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkSession, ApiErrors } from '@/lib/api-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';
export const maxDuration = 300;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), 'ainova-uploads');

// Biztosítjuk, hogy a mappa létezik
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await checkSession(request);
    if (!session.valid) return session.response;

    ensureUploadDir();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'api.error.no_file' }, { status: 400 });
    }

    // Egyedi fájlnév generálás
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(UPLOAD_DIR, `${timestamp}_${safeName}`);

    // Fájl mentése disk-re chunk-okban
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    console.log(`[Upload] File saved: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);

    return NextResponse.json({
      success: true,
      filePath,
      fileName: file.name,
      fileSize: buffer.length,
      fileSizeMB: (buffer.length / 1024 / 1024).toFixed(1),
    });

  } catch (error) {
    return ApiErrors.internal(error, 'File Upload');
  }
}
