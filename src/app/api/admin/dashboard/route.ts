import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    // Total users
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;

    // Total interviews
    const totalInterviews = (db.prepare("SELECT COUNT(*) as count FROM interviews WHERE status != 'pending'").get() as { count: number }).count;

    // Average score
    const avgScore = (db.prepare("SELECT AVG(total_score) as avg FROM interviews WHERE status != 'pending'").get() as { avg: number | null }).avg || 0;

    // User distribution (admin vs user)
    const userDist = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all() as { role: string; count: number }[];

    // Score distribution
    const scoreDist = db.prepare(`
      SELECT
        CASE
          WHEN total_score >= 90 THEN '精通'
          WHEN total_score >= 75 THEN '良好'
          WHEN total_score >= 60 THEN '及格'
          ELSE '待加強'
        END as level,
        COUNT(*) as count
      FROM interviews
      WHERE status != 'pending'
      GROUP BY level
    `).all();

    // Top active users (by interview count)
    const topUsers = db.prepare(`
      SELECT u.name, COUNT(i.id) as interview_count
      FROM users u
      JOIN interviews i ON u.id = i.user_id
      WHERE i.status != 'pending'
      GROUP BY u.id
      ORDER BY interview_count DESC
      LIMIT 5
    `).all();

    // Last 7 days trend
    const trend = db.prepare(`
      SELECT DATE(started_at) as date, COUNT(*) as count
      FROM interviews
      WHERE status != 'pending' AND started_at >= datetime('now', '-7 days')
      GROUP BY DATE(started_at)
      ORDER BY date
    `).all();

    return NextResponse.json({
      totalUsers,
      totalInterviews,
      avgScore: Math.round(avgScore * 10) / 10,
      userDistribution: userDist,
      scoreDistribution: scoreDist,
      topUsers,
      trend,
    });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
