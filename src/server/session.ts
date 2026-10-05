import { NextResponse } from 'next/server';
import { SESSION_COOKIE, signSession } from './auth';
import { env } from './env';

export function withSession(res: NextResponse, sub: string | null) {
  if (sub) res.cookies.set(SESSION_COOKIE, signSession(sub), { httpOnly: true, sameSite: 'lax', secure: env().NODE_ENV === 'production', path: '/', maxAge: 8 * 3600 });
  else res.cookies.delete(SESSION_COOKIE);
  return res;
}
