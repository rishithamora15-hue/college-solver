import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env';
import { many, one, tx } from './db';

export type Role = 'student' | 'finance_staff' | 'content_editor' | 'placement_staff' | 'college_admin';
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

/** Supabase mode: exchange a Supabase access token for its user id (verified by Supabase). Untested without credentials. */
export async function supabaseSubject(accessToken: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(env().SUPABASE_URL!, env().SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(accessToken);
  return error || !data.user ? null : data.user.id;
}

export async function supabasePasswordSignIn(email: string, password: string): Promise<string | null> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(env().SUPABASE_URL!, env().SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return error || !data.user ? null : data.user.id;
}
