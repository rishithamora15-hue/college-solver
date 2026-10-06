import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from './env';
import { many, one, tx } from './db';

/** student; admin = administration office; placement = placement cell; faculty = teaching staff (attendance, marks, notes). */
export type Role = 'student' | 'admin' | 'placement' | 'faculty';
export type Actor = {
  userId: string; collegeId: string; collegeName: string; displayName: string;
  roles: Role[]; studentId: string | null;
};

export const SESSION_COOKIE = 'cs_session';
const TTL_S = 8 * 3600;

const mac = (data: string) => createHmac('sha256', env().SESSION_SECRET).update(data).digest('base64url');

/** Opaque signed session: base64url(json{sub,exp}).hmac. Identity provider supplies only `sub`. */
export function signSession(sub: string, ttlS = TTL_S) {
  const data = Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttlS })).toString('base64url');
  return `${data}.${mac(data)}`;
}
export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const want = Buffer.from(mac(data));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(data, 'base64url').toString());
    return typeof sub === 'string' && exp > Date.now() / 1000 ? sub : null;
  } catch {
    return null;
  }
}

/** Server-derived identity + tenant + roles. Only active memberships count; revoked roles vanish immediately. */
export async function resolveActor(subject: string): Promise<Actor | null> {
  const user = await tx((c) => one(c, 'select id, display_name from app_users where auth_subject = $1', [subject]));
  if (!user) return null;
  return tx(async (c) => {
    const rows = await many(c, `select m.college_id, m.role, co.name from memberships m join colleges co on co.id = m.college_id
      where m.user_id = $1 and m.status = 'active' order by m.college_id`, [user.id]);
    if (!rows.length) return null;
    const collegeId = rows[0].college_id; // ponytail: one college per user; add a college switcher when multi-college users exist
    await c.query("select set_config('app.college_id', $1, true)", [collegeId]);
    const roles = rows.filter((r) => r.college_id === collegeId).map((r) => r.role as Role);
    const st = roles.includes('student') ? await one(c, 'select id from students where college_id = $1 and user_id = $2', [collegeId, user.id]) : undefined;
    return { userId: user.id, collegeId, collegeName: rows[0].name, displayName: user.display_name, roles, studentId: st?.id ?? null };
  }, { collegeId: '', userId: user.id });
}

/** Where each kind of account lands after sign-in. */
export const homePath = (a: Actor) => (a.studentId ? '/' : a.roles.includes('admin') ? '/admin' : a.roles.includes('placement') ? '/placement' : a.roles.includes('faculty') ? '/faculty' : '/signin');

const scryptP = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const DUMMY = `scrypt$${'0'.repeat(32)}$${'0'.repeat(64)}`; // unknown email still pays one scrypt => no timing oracle

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scryptP(pw, salt, 32)).toString('hex')}`;
}
export async function checkPassword(pw: string, stored: string | null | undefined) {
  const [, salt, hash] = (stored || DUMMY).split('$');
  const got = await scryptP(pw, Buffer.from(salt, 'hex'), 32);
  return !!stored && timingSafeEqual(got, Buffer.from(hash, 'hex'));
}

/** Local mode: email + password against app_users.password_hash. Returns the auth subject or null. */
export async function localSignIn(email: string, password: string): Promise<string | null> {
  const u = await tx((c) => one(c, 'select auth_subject, password_hash from app_users where lower(email) = lower($1)', [email]));
  return (await checkPassword(password, u?.password_hash)) ? u!.auth_subject : null;
}

export async function supabasePasswordSignIn(email: string, password: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(env().SUPABASE_URL!, env().SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return error || !data.user ? null : data.user.id;
}
