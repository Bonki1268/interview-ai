import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM interview_assignments WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: '找不到指派紀錄' }, { status: 404 });
    }

    if (body.status && !['active', 'cancelled', 'expired'].includes(body.status)) {
      return NextResponse.json({ error: '無效的狀態' }, { status: 400 });
    }

    const status = body.status ?? (existing as { status: string }).status;
    const dueAt = body.dueAt !== undefined ? body.dueAt : (existing as { due_at: string | null }).due_at;

    db.prepare(`
      UPDATE interview_assignments SET status = ?, due_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, dueAt, id);

    const assignment = db.prepare('SELECT * FROM interview_assignments WHERE id = ?').get(id);
    return NextResponse.json({ assignment });
  } catch {
    return NextResponse.json({ error: '更新指派失敗' }, { status: 500 });
  }
}
