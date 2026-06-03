import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'aasamedchem-super-secret-key-at-least-32-characters-long';
const key = new TextEncoder().encode(JWT_SECRET);

export interface UserSessionPayload {
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'buyer';
  name: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create JWT token
export async function encryptSession(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

// Decrypt & verify JWT token
export async function decryptSession(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserSessionPayload;
  } catch (error) {
    console.error('Session decryption failed:', error);
    return null;
  }
}

// Extract token from cookie string
export function getTokenFromCookies(cookieString?: string): string | null {
  if (!cookieString) return null;
  const match = cookieString.match(/(?:^|;)\s*session\s*=\s*([^;]+)/);
  return match ? match[1] : null;
}

// Get session from request headers
export async function getSession(cookieHeader?: string): Promise<UserSessionPayload | null> {
  const token = getTokenFromCookies(cookieHeader);
  if (!token) return null;
  return decryptSession(token);
}
