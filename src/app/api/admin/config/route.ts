import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const configs = db.prepare('SELECT * FROM system_config').all() as { key: string; value: string; updated_at: string }[];

    const configObj: Record<string, string> = {};
    for (const c of configs) {
      configObj[c.key] = c.value;
    }

    return NextResponse.json({ config: configObj });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const { configs } = await request.json();

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    for (const [key, value] of Object.entries(configs)) {
      stmt.run(key, String(value));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    const db = getDb();
    db.prepare('DELETE FROM interview_questions').run();
    db.prepare('DELETE FROM interviews').run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '清除失敗' }, { status: 500 });
  }
}
