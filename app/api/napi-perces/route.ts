// =====================================================
// Module disabled — lac-napi-perces is not active
// =====================================================
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    { error: 'Module lac-napi-perces is disabled' },
    { status: 404 }
  );
}
