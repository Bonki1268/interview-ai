import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getUsageSummary, getOpenAIOrgUsage } from '@/lib/apiUsage';

export async function GET() {
  try {
    await requireAdmin();

    const [summary, openaiOrgUsage] = await Promise.all([
      getUsageSummary(),
      getOpenAIOrgUsage(),
    ]);

    return NextResponse.json({ summary, openaiOrgUsage });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
