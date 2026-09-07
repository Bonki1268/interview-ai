import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();

    const interview = db.prepare('SELECT * FROM interviews WHERE id = ?').get(id);
    const questions = db.prepare(
      'SELECT * FROM interview_questions WHERE interview_id = ? ORDER BY question_number'
    ).all(id);

    if (!interview) {
      return NextResponse.json({ error: '找不到紀錄' }, { status: 404 });
    }

    return NextResponse.json({ interview, questions });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
