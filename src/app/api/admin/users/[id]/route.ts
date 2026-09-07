import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { name, email, password, role, status } = await request.json();

    const db = getDb();

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ?, role = ?, status = ? WHERE id = ?')
        .run(name, email, passwordHash, role, status, id);
    } else {
      db.prepare('UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?')
        .run(name, email, role, status, id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
