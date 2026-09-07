import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDb();

    const interviews = db.prepare(`
      SELECT id, position, total_score, status, started_at, created_at
      FROM interviews
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(user.id);

    return NextResponse.json({ interviews });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
