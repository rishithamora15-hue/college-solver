// AUTH_MODE=supabase: sign-ins are created in Supabase Auth with exactly the email and password entered, linked by user id,
// verified and changed there. Supabase Auth is stubbed at the network layer (no real project or key is used).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogin, resolveActor, setLoginPassword, supabasePasswordSignIn, verifyLoginPassword } from '../src/server/auth';
import { env } from '../src/server/env';
import { setupCollege } from '../scripts/setup';
import { owner } from './helpers';

/** A tiny in-memory Supabase Auth: users by email, and every request seen (with the key it used). */
function fakeSupabase() {
  const users = new Map<string, { id: string; password: string }>();
  const calls: { method: string; path: string; key: string | null; body: any }[] = [];
  const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  vi.stubGlobal('fetch', async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    const body = init.body ? JSON.parse(String(init.body)) : null;
    const call = { method: init.method ?? 'GET', path: url.pathname, key: new Headers(init.headers).get('apikey'), body };
    calls.push(call);
    if (call.method === 'POST' && url.pathname === '/auth/v1/admin/users') {
      if (users.has(body.email)) return res(422, { error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
      const id = crypto.randomUUID();
      users.set(body.email, { id, password: body.password });
      return res(200, { id, email: body.email, aud: 'authenticated', email_confirmed_at: new Date().toISOString() });
    }
    if (call.method === 'POST' && url.pathname === '/auth/v1/token') {
      const u = users.get(body.email);
      if (!u || u.password !== body.password) return res(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return res(200, { access_token: 'a', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 9e9, user: { id: u.id, email: body.email, aud: 'authenticated' } });
    }
    const m = url.pathname.match(/^\/auth\/v1\/admin\/users\/(.+)$/);
    const entry = m && [...users.entries()].find(([, u]) => u.id === m[1]);
    if (entry && call.method === 'PUT') { entry[1].password = body.password; return res(200, { id: entry[1].id, email: entry[0] }); }
    if (entry && call.method === 'DELETE') { users.delete(entry[0]); return res(200, {}); }
    return res(404, { msg: 'not found' });
  });
  return { users, calls };
}

function supabaseMode() {
  const e = env(), before = { ...e };
  Object.assign(e, { AUTH_MODE: 'supabase', SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'PUBLISHABLE', SUPABASE_SERVICE_ROLE_KEY: 'SECRET' });
  return () => Object.assign(e, before);
}

describe('Supabase Auth sign-ins', () => {
  let restore = () => {};
  afterEach(() => { restore(); vi.unstubAllGlobals(); });

  it('creates the user exactly as entered, links an existing one only with the right password, changes and removes it', async () => {
    restore = supabaseMode();
    const sb = fakeSupabase();

    const l = await createLogin('rao@zeta.test', 'Exact-Pass-123');
    expect(l.hash).toBeNull();
    expect(sb.users.get('rao@zeta.test')).toEqual({ id: l.subject, password: 'Exact-Pass-123' });
    expect(sb.calls[0]).toMatchObject({ method: 'POST', key: 'SECRET', body: { email: 'rao@zeta.test', password: 'Exact-Pass-123', email_confirm: true } });

    // Same email again: linked only when the password matches what is stored in Supabase Auth.
    expect((await createLogin('rao@zeta.test', 'Exact-Pass-123')).subject).toBe(l.subject);
    await expect(createLogin('rao@zeta.test', 'exact-pass-123')).rejects.toMatchObject({ status: 409 });

    const u = { email: 'rao@zeta.test', auth_subject: l.subject, password_hash: null };
    expect(await verifyLoginPassword(u, 'Exact-Pass-123')).toBe(true);
    expect(await verifyLoginPassword(u, 'Exact-Pass-12')).toBe(false);
    expect(await supabasePasswordSignIn('rao@zeta.test', 'Exact-Pass-123')).toBe(l.subject);
    expect(sb.calls.filter((c) => c.path === '/auth/v1/token').every((c) => c.key === 'PUBLISHABLE')).toBe(true); // secret key never used to sign in

    expect(await setLoginPassword(l.subject, 'New-Pass-456')).toBeNull();
    expect(await verifyLoginPassword(u, 'Exact-Pass-123')).toBe(false);
    expect(await verifyLoginPassword(u, 'New-Pass-456')).toBe(true);

    await l.undo();
    expect(sb.users.size).toBe(0);
  });

  it('first-run setup puts the administrator in Supabase Auth and the app resolves them by that id', async () => {
    restore = supabaseMode();
    const sb = fakeSupabase();
    await setupCollege(process.env.DATABASE_URL!, { college: 'Sigma College (test)', email: 'Office@Sigma.test', password: 'Sigma-Office-2026', name: 'Sigma Office' });
    const id = sb.users.get('office@sigma.test')!.id;
    expect(await supabasePasswordSignIn('office@sigma.test', 'Sigma-Office-2026')).toBe(id);
    expect(await resolveActor(id)).toMatchObject({ collegeName: 'Sigma College (test)', roles: ['admin'] });
    const c = await owner();
    try { expect((await c.query('select password_hash from app_users where auth_subject = $1', [id])).rows).toEqual([{ password_hash: null }]); }
    finally { await c.end(); }
  });
});
