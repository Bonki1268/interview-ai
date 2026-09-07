import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const db = getDb();

    const interview = db.prepare(`
      SELECT * FROM interviews WHERE id = ? AND user_id = ?
    `).get(id, user.id) as Record<string, unknown> | undefined;

    if (!interview) {
      return NextResponse.json({ error: '找不到面試紀錄' }, { status: 404 });
    }

    const questions = db.prepare(`
      SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY question_number
    `).all(id);

    return NextResponse.json({ interview, questions });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
