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
    const { position, jobDescription } = await request.json();

    if (!position?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: '請填寫職位與職缺說明' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM position_templates WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: '找不到職位範本' }, { status: 404 });
    }

    db.prepare(`
      UPDATE position_templates SET position = ?, job_description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(position.trim(), jobDescription.trim(), id);

    const template = db.prepare('SELECT * FROM position_templates WHERE id = ?').get(id);
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: '更新職位範本失敗' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM position_templates WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '刪除職位範本失敗' }, { status: 500 });
  }
}
