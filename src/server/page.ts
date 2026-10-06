import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveActor, SESSION_COOKIE, verifySession, type Actor } from './auth';
import { tx, type Db } from './db';
import { AppError } from './http';

/** Server-component identity. No session at all -> public home page; expired/invalid session -> sign-in. */
export async function pageActor(): Promise<Actor> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const sub = verifySession(token);
  const a = sub ? await resolveActor(sub) : null;
  if (!a) redirect(token ? '/signin' : '/welcome');
  return a;
}
export const q = <T>(a: Actor, fn: (c: Db) => Promise<T>) => tx(fn, { collegeId: a.collegeId, userId: a.userId });

/** Turns 404/403 from services into a null so pages can render "not found / no access" uniformly. */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try { return await p; } catch (e) { if (e instanceof AppError && [403, 404].includes(e.status)) return null; throw e; }
}
