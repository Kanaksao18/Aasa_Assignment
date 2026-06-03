import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const session = await getSession(cookieHeader);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, currentPassword, newPassword } = body;

    // 1. Handle Phone Update
    if (phone !== undefined) {
      await query('UPDATE users SET phone = $1 WHERE id = $2', [phone.trim(), session.id]);
    }

    // 2. Handle Password Update
    if (currentPassword && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      // Fetch user's current password hash
      const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [session.id]);
      if (userRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const user = userRes.rows[0];

      // Verify old password
      const isPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
      }

      // Hash and update new password
      const hashedNew = await hashPassword(newPassword);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNew, session.id]);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
