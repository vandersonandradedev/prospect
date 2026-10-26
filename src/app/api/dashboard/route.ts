import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db';

export async function GET() {
  try {
    const metrics = getDashboardMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
