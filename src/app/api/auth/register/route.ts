import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role, phone } = body;

    // 1. Validation
    if (!name || !email || !password || !role) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }

    if (!['seller', 'buyer'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role selected. Must be Seller or Buyer.' }, { status: 400 });
    }

    const emailClean = email.toLowerCase().trim();
    if (!emailClean.includes('@')) {
      return NextResponse.json({ success: false, error: 'Invalid email address format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // 2. Check if email already exists
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [emailClean]);
    if (emailCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 400 });
    }

    // 3. Hash Password
    const hashedPassword = await hashPassword(password);

    // 4. Insert into database
    const insertRes = await query(`
      INSERT INTO users (name, email, password_hash, role, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, phone, created_at
    `, [name.trim(), emailClean, hashedPassword, role, phone ? phone.trim() : '']);

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully!',
      user: insertRes.rows[0]
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
