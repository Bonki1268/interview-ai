import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const templates = db.prepare(
      'SELECT * FROM position_templates ORDER BY created_at DESC'
    ).all();
    return NextResponse.json({ templates });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const { position, jobDescription } = await request.json();

    if (!position?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: '請填寫職位與職缺說明' }, { status: 400 });
    }

    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO position_templates (id, position, job_description, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, position.trim(), jobDescription.trim(), admin.id);

    const template = db.prepare('SELECT * FROM position_templates WHERE id = ?').get(id);
    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: '建立職位範本失敗' }, { status: 500 });
  }
}
