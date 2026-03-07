// =====================================================
// AINOVA - Munkaterv import progress polling
// =====================================================
// A process route írja a progress fájlt, ez olvassa
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const runtime = 'nodejs';

const PROGRESS_FILE = path.join(os.tmpdir(), 'ainova-munkaterv-progress.json');

export async function GET(_request: NextRequest) {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      return NextResponse.json({ phase: 'idle' });
    }
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ phase: 'idle' });
  }
}
