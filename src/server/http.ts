import { createHash, randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { resolveActor, SESSION_COOKIE, verifySession, type Actor, type Role } from './auth';
import { env } from './env';
import { one, type Db } from './db';

export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) { super(message); }
}
export const notFound = () => new AppError(404, 'not_found', 'Not found'); // same answer whether missing or forbidden

export function route<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    const request_id = randomUUID();
    try {
      if (!['GET', 'HEAD'].includes(req.method)) checkOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof AppError) return NextResponse.json({ error: { code: e.code, message: e.message, request_id, ...e.extra } }, { status: e.status });
      console.error(JSON.stringify({ level: 'error', request_id, path: req.nextUrl.pathname, err: (e as Error).message?.slice(0, 200) }));
      return NextResponse.json({ error: { code: 'internal', message: 'Something went wrong', request_id } }, { status: 500 });
    }
  };
}

/** CSRF defense for cookie-authenticated mutations: Origin must match the configured app origin. */
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!origin || origin !== env().APP_ORIGIN) throw new AppError(403, 'bad_origin', 'Cross-origin request rejected');
}

export async function requireActor(req: NextRequest, role?: Role): Promise<Actor> {
  const sub = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const actor = sub ? await resolveActor(sub) : null;
  if (!actor) throw new AppError(401, 'unauthenticated', 'Sign in required');
  if (role && !actor.roles.includes(role)) throw new AppError(403, 'forbidden', 'Not permitted');
  return actor;
}
export function requireStudent(a: Actor): string {
  if (!a.studentId) throw new AppError(403, 'forbidden', 'Student access only');
  return a.studentId;
}

export async function body<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  const raw = await req.json().catch(() => { throw new AppError(400, 'bad_json', 'Invalid JSON'); });
  const r = schema.safeParse(raw);
  if (!r.success) throw new AppError(400, 'validation', 'Invalid input', { fields: r.error.issues.map((i) => i.path.join('.')) });
  return r.data;
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Idempotent mutation inside the caller's transaction. Concurrent duplicates serialize on an advisory lock;
 * same key + same payload returns the stored response; same key + different payload is 409.
 */
export async function idempotent<T>(c: Db, a: Actor, op: string, key: string | null, payload: unknown, fn: () => Promise<T>): Promise<T> {
  if (!key || key.length > 100) throw new AppError(400, 'idempotency_key_required', 'Idempotency-Key header required');
  const hash = sha256(JSON.stringify(payload));
  await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`${a.collegeId}:${a.userId}:${op}:${key}`]);
  const prev = await one(c, 'select request_hash, response from idempotency_keys where college_id=$1 and user_id=$2 and op=$3 and key=$4', [a.collegeId, a.userId, op, key]);
  if (prev) {
    if (prev.request_hash !== hash) throw new AppError(409, 'idempotency_conflict', 'Key reused with a different request');
    return prev.response as T;
  }
  const res = await fn();
  await c.query('insert into idempotency_keys (college_id, user_id, op, key, request_hash, response) values ($1,$2,$3,$4,$5,$6)', [a.collegeId, a.userId, op, key, hash, JSON.stringify(res)]);
  return res;
}
