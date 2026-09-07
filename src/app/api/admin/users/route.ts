import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();
    const users = db.prepare('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC').all();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: '請填寫所有必要欄位' }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: '此電子郵件已被使用' }, { status: 409 });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
    `).run(id, name, email, passwordHash, role || 'user');

    return NextResponse.json({ id, name, email, role: role || 'user', status: 'active' });
  } catch {
    return NextResponse.json({ error: '新增使用者失敗' }, { status: 500 });
  }
}
