import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = `
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM interview_assignments a
      JOIN users u ON u.id = a.user_id
      WHERE 1 = 1
    `;
    const params: string[] = [];

    if (userId) {
      query += ' AND a.user_id = ?';
      params.push(userId);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    query += ' ORDER BY a.created_at DESC';

    const assignments = db.prepare(query).all(...params);
    return NextResponse.json({ assignments });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { userId, templateId, dueAt } = body;
    let position: string | undefined = body.position;
    let jobDescription: string | undefined = body.jobDescription;

    const db = getDb();

    // One-click assign: resolve position/jobDescription from a saved template.
    if (templateId) {
      const template = db.prepare(
        'SELECT position, job_description FROM position_templates WHERE id = ?'
      ).get(templateId) as { position: string; job_description: string } | undefined;

      if (!template) {
        return NextResponse.json({ error: '找不到職位範本' }, { status: 404 });
      }
      position = template.position;
      jobDescription = template.job_description;
    }

    if (!userId || !position?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: '請填寫使用者、職位與職缺說明' }, { status: 400 });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ error: '找不到使用者' }, { status: 404 });
    }

    const createAssignment = db.transaction(() => {
      db.prepare(`
        UPDATE interview_assignments SET status = 'cancelled', updated_at = datetime('now')
        WHERE user_id = ? AND status = 'active'
      `).run(userId);

      const id = uuidv4();
      db.prepare(`
        INSERT INTO interview_assignments (id, user_id, position, job_description, status, due_at, assigned_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
      `).run(id, userId, position.trim(), jobDescription.trim(), dueAt || null, admin.id);

      return id;
    });

    const id = createAssignment();
    const assignment = db.prepare('SELECT * FROM interview_assignments WHERE id = ?').get(id);

    return NextResponse.json({ assignment });
  } catch {
    return NextResponse.json({ error: '建立指派失敗' }, { status: 500 });
  }
}
