import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
    } | undefined;

    if (!user) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: '帳號已停用，請聯繫管理員' }, { status: 403 });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 });
  }
}
