import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Query database for the latest user info, including phone number
    const userRes = await query('SELECT id, email, name, role, phone FROM users WHERE id = $1', [session.id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User session invalid' }, { status: 401 });
    }
    const user = userRes.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
      },
    });
  } catch (error) {
    console.error('Session retrieval failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
