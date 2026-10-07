import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { env } from './env';
import { many, one, tx } from './db';
import { AppError } from './errors';

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

const supabase = async (key: string) =>
  (await import('@supabase/supabase-js')).createClient(env().SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });

export async function supabasePasswordSignIn(email: string, password: string): Promise<string | null> {
  const { data, error } = await (await supabase(env().SUPABASE_ANON_KEY!)).auth.signInWithPassword({ email, password });
  return error || !data.user ? null : data.user.id;
}

/**
 * Every new sign-in goes through here. Local: password hashed into app_users. Supabase: the account is created in Supabase Auth
 * (email pre-confirmed, exactly the email and password given); an existing Supabase user is linked only if that password signs in.
 * Call `undo` if saving the app_users row fails, so no orphan Supabase user is left behind.
 */
export async function createLogin(email: string, password: string): Promise<{ subject: string; hash: string | null; undo: () => Promise<void> }> {
  if (env().AUTH_MODE !== 'supabase') return { subject: 'local:' + randomUUID(), hash: await hashPassword(password), undo: async () => {} };
  const admin = (await supabase(env().SUPABASE_SERVICE_ROLE_KEY!)).auth.admin;
  const { data, error } = await admin.createUser({ email, password, email_confirm: true });
  if (data?.user) { const id = data.user.id; return { subject: id, hash: null, undo: async () => { await admin.deleteUser(id); } }; }
  if (error?.code === 'email_exists') {
    const id = await supabasePasswordSignIn(email, password);
    if (id) return { subject: id, hash: null, undo: async () => {} };
    throw new AppError(409, 'exists', `${email} already exists in Supabase Auth with a different password`);
  }
  throw new AppError(400, 'auth_provider', `Supabase Auth did not accept ${email}: ${error?.message ?? 'unknown error'}`);
}

/** Checks a user's current password and, if `next` is given, replaces it (wherever the account lives). */
export async function verifyLoginPassword(u: { email: string; auth_subject: string; password_hash: string | null }, pw: string) {
  return env().AUTH_MODE === 'supabase' ? (await supabasePasswordSignIn(u.email, pw)) === u.auth_subject : checkPassword(pw, u.password_hash);
}
export async function setLoginPassword(subject: string, pw: string): Promise<string | null> {
  if (env().AUTH_MODE !== 'supabase') return hashPassword(pw);
  const { error } = await (await supabase(env().SUPABASE_SERVICE_ROLE_KEY!)).auth.admin.updateUserById(subject, { password: pw });
  if (error) throw new AppError(400, 'auth_provider', `Supabase Auth did not accept the new password: ${error.message}`);
  return null;
}
