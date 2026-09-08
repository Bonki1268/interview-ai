import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDb();

    const assignment = db.prepare(`
      SELECT id, position, job_description, due_at
      FROM interview_assignments
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(user.id) as
      | { id: string; position: string; job_description: string; due_at: string | null }
      | undefined;

    if (!assignment) {
      return NextResponse.json({ assignment: null });
    }

    const isExpired = !!assignment.due_at && new Date(assignment.due_at) < new Date();

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        position: assignment.position,
        jobDescription: assignment.job_description,
        dueAt: assignment.due_at,
        isExpired,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
