import { cookies } from 'next/headers';
import { getDb } from './db';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  created_at: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) return null;

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ? AND status = ?').get(sessionToken, 'active') as User | undefined;

  return user || null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}
