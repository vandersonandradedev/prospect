import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/db';

export async function GET() {
  try {
    const jobs = getJobs();
    return NextResponse.json({ success: true, count: jobs.length, jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
