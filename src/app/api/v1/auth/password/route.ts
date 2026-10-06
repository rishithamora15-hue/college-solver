import { z } from 'zod';
import { AppError, body, json, route } from '@/server/http';
import { homePath, localSignIn, resolveActor, supabasePasswordSignIn } from '@/server/auth';
import { env } from '@/server/env';
import { withSession } from '@/server/session';

// ponytail: per-process failure counter; move to the database if more than one web instance runs.
const fails = new Map<string, { n: number; until: number }>();
const LIMIT = 10, WINDOW_MS = 15 * 60_000;

/** Two portals. Students: college email + roll number. Staff: assigned credentials, routed to admin or placement. */
export const POST = route(async (req) => {
  const i = await body(req, z.object({ portal: z.enum(['student', 'staff']), email: z.email().max(200), password: z.string().trim().min(1).max(200) }).strict());
  const key = i.email.toLowerCase();
  const f = fails.get(key);
  if (f && f.n >= LIMIT && f.until > Date.now()) throw new AppError(429, 'too_many_attempts', 'Too many attempts. Try again in 15 minutes.');
  const attempt = (pw: string) => (env().AUTH_MODE === 'supabase' ? supabasePasswordSignIn(i.email, pw) : localSignIn(i.email, pw));
  const upper = i.password.toUpperCase(); // roll numbers are case-insensitive; as-typed first so a staff password still matches
  const sub = (await attempt(i.password)) ?? (i.portal === 'student' && upper !== i.password ? await attempt(upper) : null);
  const a = sub ? await resolveActor(sub) : null;
  if (!a) {
    fails.set(key, { n: (f && f.until > Date.now() ? f.n : 0) + 1, until: Date.now() + WINDOW_MS });
    throw new AppError(401, 'bad_credentials', i.portal === 'student' ? 'College email or roll number is incorrect.' : 'Email or password is incorrect, or the account has no access.');
  }
  if (i.portal === 'student' && !a.studentId) throw new AppError(401, 'wrong_portal', 'This is a staff account. Use Staff sign-in.');
  if (i.portal === 'staff' && a.studentId) throw new AppError(401, 'wrong_portal', 'This is a student account. Use Student sign-in.');
  fails.delete(key);
  return withSession(json({ next: homePath(a) }), sub);
});
