import { NextResponse } from 'next/server';
import { getAllProvidersHealth } from '@/lib/providers';

export async function GET() {
  try {
    const health = await getAllProvidersHealth();
    return NextResponse.json({ success: true, sources: health });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
