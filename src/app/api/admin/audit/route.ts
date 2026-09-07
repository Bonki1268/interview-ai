import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const interviews = db.prepare(`
      SELECT i.*, u.name as user_name, u.email as user_email
      FROM interviews i
      JOIN users u ON i.user_id = u.id
      WHERE i.status != 'pending'
      ORDER BY i.created_at DESC
    `).all();

    return NextResponse.json({ interviews });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
